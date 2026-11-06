/* Маршрут по этапам, список уроков, урок и экзамен этапа. */
(function (SM) {
  'use strict';
  var h = SM.ui.h, sr = SM.ui.sr, rich = SM.ui.rich;
  var V = SM.views = SM.views || {};
  function st() { return SM.store.get(); }
  function lesson(id) { return SM.content.lessons[id]; }
  function pct(x) { return Math.round((x || 0) * 100) + '%'; }

  var STATUS = {
    done: { label: 'пройден', cls: 'ok' }, weak: { label: 'стоит повторить', cls: 'warn' },
    gap: { label: 'пробел по диагностике', cls: 'warn' }, skip: { label: 'можно пропустить', cls: 'muted' },
    started: { label: 'начат', cls: 'info' }, open: { label: 'доступен', cls: 'muted' }, locked: { label: 'закрыт', cls: 'muted' }
  };

  /* Состояние экзамена этапа — одной фразой. */
  function examState(ex) {
    if (ex.passed) return { cls: 'ok', label: 'сдан · ' + pct(ex.best), text: 'Экзамен сдан. Следующий этап открыт.' };
    if (!ex.open) return { cls: 'muted', label: 'закрыт', text: 'Станет доступен, когда откроется этап.' };
    if (ex.ready) return { cls: 'info', label: 'можно сдавать', text: 'Все готовые уроки этапа пройдены.' };
    if (ex.diagReady) return { cls: 'info', label: 'можно сдать сразу', text: 'Диагностика показала этот уровень — можно не проходить знакомые уроки.' };
    return { cls: 'muted', label: 'досрочно', text: 'Обычно экзамен сдают после всех уроков этапа (пройдено ' + ex.lessonsDone + ' из ' + ex.lessonsWritten + ' готовых), но можно попробовать и раньше.' };
  }

  function stepper(r) {
    var nodes = [h('li.step-node.done', h('span.step-dot', '0'), h('span.step-label', 'старт'))];
    r.stages.forEach(function (sv) {
      var cls = sv.exam.passed ? '.done' : sv.open ? '.current' : '';
      nodes.push(h('li.step-node' + cls, h('span.step-dot', sv.stage.dot), h('span.step-label', sv.exam.passed ? 'сдан' : sv.open ? 'сейчас' : 'впереди')));
    });
    return h('ol.stage-stepper', { 'aria-label': 'Этапы курса' }, nodes);
  }

  function programBlock(m) {
    return h('div.program',
      h('div.program-col', h('h4', 'Лексика'), h('ul', m.vocab.map(function (x) { return h('li', x); }))),
      h('div.program-col', h('h4', 'Грамматика'), h('ul', m.grammar.map(function (x) { return h('li', x); }))),
      h('div.program-col', h('h4', 'После модуля вы сможете'), h('ul', m.outcomes.map(function (x) { return h('li', x); }))));
  }

  function lessonRow(row) {
    var stt = STATUS[row.status];
    var title = h('span.lesson-title', h('span.lesson-n', String(row.lesson.n)), sr(row.lesson.title), h('span.title-ru', row.lesson.ru));
    var badge = h('span.badge.' + stt.cls, row.isNext ? 'рекомендовано сейчас' : stt.label);
    return h('li.lesson-row' + (row.isNext ? '.next' : '') + (row.status === 'locked' ? '.locked' : ''),
      row.status === 'locked' ? h('div.lesson-link', title, badge) : h('a.lesson-link', { href: '#/lesson/' + row.lesson.id }, title, badge),
      row.reason && row.status !== 'locked' ? h('p.small.muted.reason', row.reason) : null);
  }

  function examCard(ex) {
    var es = examState(ex);
    return h('div.exam-card' + (ex.passed ? '.passed' : ''),
      h('div.exam-pug', { html: SM.ui.mascotImg(ex.passed ? 'celebrate' : 'laptop', { decorative: true }) }),
      h('div.exam-body',
        h('h3', ex.exam.title, h('span.badge.' + es.cls, es.label)),
        h('p.small', es.text, ex.stage.index < 2 ? ' Сдача открывает этап «' + SM.content.stages[ex.stage.index + 1].title + '».' : ' Это завершение курса.'),
        ex.open ? h('a.btn' + (ex.ready || ex.diagReady ? '.primary' : '.ghost'), { href: '#/exam/' + ex.id }, ex.passed ? 'Пересдать для практики' : ex.attempts ? 'Сдать ещё раз' : 'К экзамену') : null));
  }

  // ═════════════════════════ Маршрут ═════════════════════════
  V.route = {
    render: function (main) {
      function draw() {
        SM.ui.clear(main);
        var s = st();
        var r = SM.planner.route(s);
        var d = SM.progress.latestDiagnostic(s);
        main.appendChild(h('div.page-title', h('h1', 'Мой маршрут'), h('span.page-pug', { html: SM.ui.mascotImg('run', { decorative: true }) })));
        main.appendChild(h('p.lead', 'Курс идёт в три шага: буквы → слова → предложения. В конце каждого этапа — экзамен. Следующий этап открывается, когда экзамен сдан.'));
        main.appendChild(stepper(r));
        main.appendChild(d && !d.skipped
          ? h('p.small', 'Диагностика: уверенно освоено — ', h('strong', d.label), '. ', h('a', { href: '#/diagnostic/result' }, 'Результаты'), ' · ', h('a', { href: '#/diagnostic' }, 'пройти заново'))
          : h('p.small', 'Если армянский для вас не совсем новый, ', h('a', { href: '#/diagnostic' }, 'пройдите диагностику'), ': знакомые уроки можно будет пропустить и сразу сдать экзамен этапа.'));

        r.stages.forEach(function (sv) {
          var stage = sv.stage, isCurrent = r.currentStage === sv;
          var written = sv.exam.lessonsWritten;
          var sec = h('section.stage' + (sv.open ? '' : '.locked') + (isCurrent ? '.current' : ''),
            h('div.stage-head',
              h('div', h('p.stage-kicker', 'Этап ' + (stage.index + 1) + ' · ' + stage.from + ' → ' + stage.to), h('h2', stage.title)),
              h('span.badge.' + (sv.exam.passed ? 'ok' : sv.open ? 'info' : 'muted'), sv.exam.passed ? 'пройден' : sv.open ? 'открыт' : 'закрыт')),
            h('p.muted', stage.desc),
            h('p.small', 'В программе ' + stage.lessonsTotal + ' уроков, готово ' + written + ', пройдено ' + sv.exam.lessonsDone + '.'),
            !sv.open ? h('p.note', 'Этап откроется после экзамена «' + SM.content.stages[stage.index - 1].level + '». Посмотреть программу можно уже сейчас.') : null);
          sv.modules.forEach(function (mv) {
            var m = mv.module;
            var det = h('details.module-block', { open: isCurrent && mv.rows.some(function (x) { return x.status !== 'done'; }) ? true : null },
              h('summary', h('span.module-range', 'Модуль ' + m.n + ' · ' + m.range), h('span.module-title', sr(m.title), h('span.title-ru', m.ru)),
                h('span.small.muted', mv.rows.length ? mv.rows.filter(function (x) { return x.status === 'done'; }).length + ' из ' + mv.rows.length : 'в разработке')),
              programBlock(m),
              mv.rows.length ? h('ol.lesson-list', mv.rows.map(lessonRow)) : null,
              m.planned ? h('p.small.muted.planned-note', (mv.rows.length ? 'Ещё ' : '') + m.planned + ' ' + plural(m.planned, 'урок', 'урока', 'уроков') + ' этого модуля в разработке.') : null,
              m.dialogues ? h('p.small', 'Диалоги модуля: ', m.dialogues.map(function (did, i) {
                var dd = SM.content.dialogueById[did]; return h('span', i ? ', ' : '', sv.open ? h('a', { href: '#/dialogue/' + did }, SM.translit.render(dd.title, s.settings.script)) : SM.translit.render(dd.title, s.settings.script));
              })) : null);
            sec.appendChild(det);
          });
          sec.appendChild(examCard(sv.exam));
          main.appendChild(sec);
        });
      }
      draw();
      return { rerender: draw };
    }
  };

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  // ═════════════════════════ Уроки ═════════════════════════
  V.lessons = {
    render: function (main) {
      function draw() {
        SM.ui.clear(main);
        var s = st();
        var r = SM.planner.route(s);
        main.appendChild(h('h1', 'Уроки'));
        main.appendChild(h('p.lead', 'Уроки открытого этапа доступны в любом порядке. Рекомендованный порядок и экзамены — в разделе «Мой маршрут».'));
        r.stages.forEach(function (sv) {
          var sec = h('section.card.module', h('p.eyebrow', 'Этап ' + (sv.stage.index + 1) + ' · ' + sv.stage.from + ' → ' + sv.stage.to), h('h2', sv.stage.title),
            !sv.open ? h('p.note', 'Откроется после экзамена «' + SM.content.stages[sv.stage.index - 1].level + '».') : null);
          sv.modules.forEach(function (mv) {
            if (!mv.rows.length) { sec.appendChild(h('p.small.muted', 'Модуль ' + mv.module.n + ' «' + mv.module.ru + '» — в разработке.')); return; }
            sec.appendChild(h('h3.module-sub', 'Модуль ' + mv.module.n + ' · ', sr(mv.module.title)));
            var grid = h('div.lesson-grid');
            mv.rows.forEach(function (row) {
              var l = row.lesson, rec = s.lessons[l.id];
              var meta = row.status === 'locked' ? 'закрыт' : rec && rec.status === 'done' ? 'пройден · ' + pct(rec.best) : rec && rec.status === 'started' ? 'начат' : '~' + l.minutes + ' мин';
              var inner = [h('span.tile-n', l.checkpoint ? '✓' : String(l.n)), h('span.tile-body', sr(l.title, { cls: 'tile-title' }), h('span.tile-ru', l.ru), h('span.tile-meta', meta))];
              grid.appendChild(row.status === 'locked' ? h('div.lesson-tile.locked', { 'aria-disabled': 'true' }, inner) : h('a.lesson-tile', { href: '#/lesson/' + l.id }, inner));
            });
            sec.appendChild(grid);
          });
          sec.appendChild(examCard(sv.exam));
          main.appendChild(sec);
        });
      }
      draw();
      return { rerender: draw };
    }
  };

  // ═════════════════════════ Урок ═════════════════════════
  V.lesson = {
    focusMode: function () { return true; },
    render: function (main, args) {
      var l = lesson(args[0]);
      if (!l) { main.appendChild(h('div.card', h('p', 'Урок не найден.'), h('a.btn.primary', { href: '#/lessons' }, 'К урокам'))); return {}; }
      var player = null;
      var box = h('div.narrow');
      main.appendChild(box);
      var stage = SM.content.stageById[l.stage];

      function locked() {
        SM.ui.clear(box);
        var prev = SM.content.stages[stage.index - 1];
        box.appendChild(h('div.card.center',
          SM.ui.mascot('think', 'Этот урок из этапа «' + stage.title + '». Он откроется, когда будет сдан экзамен «' + prev.level + '».'),
          h('h1', sr(l.title)), h('p.lead', l.ru),
          h('div.actions.center', h('a.btn.ghost', { href: '#/route' }, 'К маршруту'), h('a.btn.primary', { href: '#/exam/' + prev.exam }, 'К экзамену «' + prev.level + '»'))));
      }

      function intro() {
        SM.ui.clear(box);
        var s = st();
        var due = SM.planner.dueCount(s);
        var rec = s.lessons[l.id];
        var row = SM.planner.route(s).rows.filter(function (x) { return x.lesson.id === l.id; })[0];
        var m = SM.content.moduleById[l.module];
        box.appendChild(h('div.card',
          h('p.eyebrow', stage.title + ' · модуль ' + m.n + ' · урок ' + l.n),
          h('h1', sr(l.title)), h('p.lead', l.ru),
          h('p', h('strong', 'Цель: '), l.goal),
          l.builds && lesson(l.builds[0]) ? h('p.muted', 'Опирается на: ' + l.builds.map(function (b) { return '«' + lesson(b).ru + '»'; }).join(', ') + '.') : null,
          row && row.status === 'skip' ? h('p.note', row.reason) : null,
          rec && rec.status === 'done' ? h('p.muted', 'Уже пройден: лучший результат ' + pct(rec.best) + '. Можно пройти ещё раз — это тоже повторение.') : null,
          due >= SM.planner.REVIEW_FIRST ? h('div.note.warn', 'Накопилось ' + due + ' повторений. Новый материал лучше усваивается, когда старый закреплён. ', h('a', { href: '#/review' }, 'Сначала повторить')) : null,
          h('p.muted.small', 'Около ' + l.minutes + ' минут. В начале — короткая разминка из ранее изученного (если есть что повторить).'),
          h('div.actions', h('a.btn.ghost', { href: '#/route' }, 'К маршруту'),
            h('button.btn.primary', { type: 'button', 'data-autofocus': '1', on: { click: begin } }, rec && rec.status === 'started' ? 'Продолжить' : 'Начать урок'))));
        box.querySelector('[data-autofocus]').focus();
      }

      function begin() {
        var s = st();
        var warm = SM.review.warmup(s, l.id, 3);
        SM.store.update(function (x) {
          var r = x.lessons[l.id] || (x.lessons[l.id] = { status: 'started', best: 0, attempts: 0 });
          if (r.status !== 'done') r.status = 'started';
          r.startedAt = Date.now();
        });
        SM.ui.clear(box);
        player = SM.ui.player.create({
          steps: warm.concat(l.steps), source: 'lesson', lessonId: l.id, checkpoint: l.checkpoint,
          summaryTitle: function () { return 'Урок «' + SM.translit.render(l.title, st().settings.script) + '» завершён'; },
          onExit: function () { SM.app.go('home'); },
          onFinish: function () {
            var score = player.score();
            var fresh = SM.rules ? SM.rules.newFor(st(), l.id) : [];
            SM.store.update(function (x) {
              var r = x.lessons[l.id];
              r.status = 'done'; r.attempts = (r.attempts || 0) + 1; r.best = Math.max(r.best || 0, score); r.last = score; r.completedAt = Date.now();
            });
            if (fresh.length) SM.ui.toast('В разделе «Правила» появилось: ' + fresh.map(function (x) { return '«' + x.title + '»'; }).join(', ') + '.');
          },
          finishActions: [
            { label: 'Что дальше', primary: true, onClick: function () { SM.app.go('home'); } },
            { label: 'Мой маршрут', onClick: function () { SM.app.go('route'); } }
          ]
        });
        box.appendChild(player.el);
      }

      if (stage && !SM.planner.stageOpen(st(), stage)) { locked(); return { rerender: locked }; }
      intro();
      return { rerender: function () { if (player) player.render(); else intro(); } };
    }
  };

  // ═════════════════════════ Экзамен ═════════════════════════
  var SKILL_ORDER = ['reading', 'listening', 'grammar', 'vocab', 'writing', 'pragmatics'];

  /* Подсчёт результата. Задания на слух без голоса засчитываются как чтение,
   * диктанты без голоса не учитываются вовсе. */
  function scoreExam(exam, answers, hasVoice) {
    var total = 0, n = 0, bySkill = {}, weakTags = [], skipped = 0;
    exam.tasks.forEach(function (t) {
      if (t.type === 'listen_type' && !hasVoice) { skipped++; return; }
      var a = answers[t.id];
      var score = a ? a.score : 0;
      var skills = (t.type === 'listen_choice' && !hasVoice) ? ['reading'] : t.skills;
      total += score; n++;
      skills.forEach(function (k) { var b = bySkill[k] || (bySkill[k] = { sum: 0, n: 0 }); b.sum += score; b.n++; });
      if (score < 1 && t.tag && weakTags.indexOf(t.tag) === -1) weakTags.push(t.tag);
    });
    var overall = n ? total / n : 0;
    var skills = {};
    Object.keys(bySkill).forEach(function (k) { skills[k] = bySkill[k].sum / bySkill[k].n; });
    var weakSkills = Object.keys(skills).filter(function (k) { return skills[k] < SM.content.EXAM_SKILL_MIN; });
    return {
      score: overall, bySkill: skills, weakTags: weakTags, weakSkills: weakSkills, skipped: skipped, counted: n,
      passed: overall >= SM.content.EXAM_PASS && weakSkills.length === 0
    };
  }

  V.exam = {
    focusMode: function () { return true; },
    render: function (main, args) {
      var exam = SM.content.exams[args[0]];
      var box = h('div.narrow');
      main.appendChild(box);
      if (!exam) { box.appendChild(h('div.card', h('p', 'Экзамен не найден.'), h('a.btn.primary', { href: '#/route' }, 'К маршруту'))); return {}; }
      var stage = SM.content.stageById[exam.stage];
      var player = null, result = null;

      function intro() {
        SM.ui.clear(box);
        var s = st();
        var info = SM.planner.examInfo(s, stage);
        if (!info.open) {
          var prev = SM.content.stages[stage.index - 1];
          box.appendChild(h('div.card.center', SM.ui.mascot('think', 'Этот экзамен станет доступен, когда откроется этап «' + stage.title + '» — после экзамена ' + prev.level + '.'),
            h('div.actions.center', h('a.btn.primary', { href: '#/exam/' + prev.exam }, 'К экзамену «' + prev.level + '»'))));
          return;
        }
        var es = examState(info);
        var counts = {};
        exam.tasks.forEach(function (t) { t.skills.forEach(function (k) { counts[k] = (counts[k] || 0) + 1; }); });
        var hasVoice = SM.audio.hasVoice();
        box.appendChild(h('div.card.exam-intro',
          h('div.diag-hero', h('div.diag-hero-pug', { html: SM.ui.mascotImg('laptop', { decorative: true }) }),
            h('div', h('p.stage-kicker', 'Этап «' + stage.title + '»'), h('h1', exam.title), h('p.lead', exam.desc))),
          h('ul.facts',
            h('li', h('strong', exam.tasks.length + ' заданий, одно на экран.'), ' Подсказок и разбора во время экзамена нет — всё в итогах.'),
            h('li', h('strong', 'Сдан, если 70% и больше'), ' и не меньше 50% по каждому навыку. ' + (stage.index < 2 ? 'Откроется этап «' + SM.content.stages[stage.index + 1].title + '».' : '')),
            h('li', h('strong', '«Не знаю» — честный ответ,'), ' а «Назад» позволяет исправить ответ до конца экзамена.')),
          h('p.small.muted', 'Навыки: ' + SKILL_ORDER.filter(function (k) { return counts[k]; }).map(function (k) { return SM.progress.SKILL_LABELS[k].toLowerCase() + ' — ' + counts[k]; }).join(', ') + '.'),
          !hasVoice ? h('p.note.warn.small', 'В браузере нет армянского голоса: задания на слух будут показаны текстом и засчитаны как чтение, диктант не учитывается.') : null,
          h('p.note' + (info.ready || info.diagReady || info.passed ? '' : '.warn'), es.text),
          info.attempts ? h('p.small', 'Попыток: ' + info.attempts + ', лучший результат ' + pct(info.best) + (info.passed ? ' — экзамен сдан.' : '.')) : null,
          h('div.actions', h('a.btn.ghost', { href: '#/route' }, 'К маршруту'),
            h('button.btn.primary', { type: 'button', 'data-autofocus': '1', on: { click: begin } }, info.attempts ? 'Сдать ещё раз' : 'Начать экзамен'))));
        var af = box.querySelector('[data-autofocus]'); if (af) af.focus();
      }

      async function exit() {
        var ok = await SM.ui.confirm({ title: 'Выйти из экзамена?', text: 'Ответы этой попытки не сохранятся. Сдать экзамен можно в любой момент.', ok: 'Выйти', cancel: 'Продолжить', mascot: 'sad' });
        if (ok) { player = null; intro(); }
      }

      function begin() {
        SM.ui.clear(box);
        result = null;
        var steps = exam.tasks.map(function (t) { return Object.assign({ t: 'ex' }, t); });
        player = SM.ui.player.create({
          steps: steps, source: 'exam', exam: true, requeue: false,
          onExit: exit,
          onExamDone: function (answers) { finish(answers); }
        });
        box.appendChild(player.el);
      }

      function finish(answers) {
        var hasVoice = SM.audio.hasVoice();
        result = scoreExam(exam, answers, hasVoice);
        SM.store.update(function (s) {
          // Ответы экзамена тоже идут в повторение: ошибки вернутся, верные ответы закрепятся.
          Object.keys(answers).forEach(function (id) {
            var a = answers[id], t = a.ex;
            var skills = (t.type === 'listen_choice' && !hasVoice) ? ['reading'] : t.skills;
            SM.progress.recordAnswer(s, { exId: t.id, type: t.type, skills: skills, outcome: a.outcome, errorTag: t.tag, source: 'exam',
              items: (t.items || []).map(function (p) { return { id: p[0], facet: (p[1] === 'listening' && !hasVoice) ? 'recognition' : p[1] }; }) });
          });
          SM.planner.recordExam(s, exam.id, result);
        });
        player = null;
        showResult();
      }

      function showResult() {
        SM.ui.clear(box);
        var r = result;
        var next = stage.index < 2 ? SM.content.stages[stage.index + 1] : null;
        var msg = r.passed
          ? (next ? 'Экзамен сдан! Открыт этап «' + next.title + '». Уровень ' + exam.level + ' подтверждён экзаменом приложения.' : 'Экзамен сдан! Курс до B1 пройден.')
          : 'Пока не хватило немного. Это не провал, а карта: видно, какие темы подтянуть. Повторите их — и попробуйте снова.';
        var bars = h('div.skill-list');
        SKILL_ORDER.forEach(function (k) {
          if (r.bySkill[k] === undefined) return;
          var v = r.bySkill[k];
          bars.appendChild(h('div.skill-row', h('span.skill-name', SM.progress.SKILL_LABELS[k]),
            h('span.meter', h('span.meter-fill' + (v < SM.content.EXAM_SKILL_MIN ? '.low' : ''), { style: 'width:' + Math.round(v * 100) + '%' })),
            h('span.skill-lvl', pct(v))));
        });
        var topics = r.weakTags.map(function (tag) {
          var lid = SM.content.topicMap[tag];
          var label = SM.content.topicLabels[tag] || tag;
          var target = lid && (SM.content.lessons[lid] ? '#/lesson/' + lid : SM.content.dialogueById[lid] ? '#/dialogue/' + lid : null);
          return h('li', label, target ? h('span', ' — ', h('a', { href: target }, 'повторить урок')) : null);
        });
        box.appendChild(h('div.card.exam-result' + (r.passed ? '.passed' : ''),
          SM.ui.mascot(r.passed ? 'celebrate' : 'support', msg, { large: r.passed }),
          h('p.big-level', pct(r.score)),
          h('p.small.muted', 'Нужно не меньше 70% всего и 50% по каждому навыку.' + (r.skipped ? ' Без звука не учтено заданий: ' + r.skipped + '.' : '')),
          h('h2', 'По навыкам'), bars,
          r.weakSkills.length ? h('p.note.warn', 'Ниже 50%: ' + r.weakSkills.map(function (k) { return SM.progress.SKILL_LABELS[k].toLowerCase(); }).join(', ') + '.') : null,
          topics.length ? h('div', h('h2', r.passed ? 'Что стоит повторить' : 'Что подтянуть перед пересдачей'), h('ul', topics)) : h('p', 'Все задания выполнены верно.'),
          h('p.small.muted', 'Ответы экзамена попали в повторение: ошибки вернутся в ближайших занятиях.'),
          h('div.actions',
            r.passed
              ? h('a.btn.primary', { href: '#/route' }, next ? 'К этапу «' + next.title + '»' : 'К маршруту')
              : h('a.btn.primary', { href: '#/review' }, 'Повторить'),
            !r.passed ? h('button.btn.ghost', { type: 'button', on: { click: begin } }, 'Пересдать') : h('a.btn.ghost', { href: '#/home' }, 'На главную'))));
      }

      intro();
      return { rerender: function () { if (player) player.render(); else if (result) showResult(); else intro(); } };
    }
  };

  SM.views._scoreExam = scoreExam;
})(window.SM = window.SM || {});
