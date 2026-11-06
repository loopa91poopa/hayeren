/* Первый запуск, главная, диагностика. */
(function (SM) {
  'use strict';
  var h = SM.ui.h, sr = SM.ui.sr, rich = SM.ui.rich, T = SM.texts;
  var V = SM.views = SM.views || {};
  function st() { return SM.store.get(); }

  // ═════════════════════════ Первый запуск ═════════════════════════
  var GOALS = ['общение с родными', 'работа', 'учёба', 'чтение книг и прессы', 'путешествия', 'жизнь в Армении', 'культура и кино', 'свободное владение'];

  V.onboarding = {
    focusMode: function () { return true; },
    render: function (main) {
      var step = 0;
      var box = h('div.narrow');
      main.appendChild(box);
      function draw() {
        SM.ui.clear(box);
        var s = st();
        if (step === 0) {
          box.appendChild(h('div.card.center',
            SM.ui.mascot('greet', T.mascot.welcome[0], { large: true }),
            h('h1', T.appName), h('p.lead', T.tagline),
            h('p', 'Здесь можно выучить восточноармянский язык с нуля: сначала буквы, потом слова, потом предложения. Короткие уроки, повторение в нужный момент, диалоги и игры.'),
            h('div.actions.center', h('button.btn.primary', { type: 'button', 'data-autofocus': '1', on: { click: function () { step = 1; draw(); } } }, 'Начать')),
            SM.install ? SM.install.welcomeBlock() : null));
        } else if (step === 1) {
          var sc = s.settings.script;
          var pick = function (v) { return function () { SM.app.setScript(v); draw(); }; };
          box.appendChild(h('div.card',
            h('h2', 'Как показывать армянский текст?'),
            h('p', 'Пока буквы незнакомы, помогает транскрипция — подпись русскими буквами. Её можно отключить в любой момент. В заданиях на чтение букв она скрыта.'),
            h('div.choice-cards.stack',
              h('button.choice-card' + (sc === 'both' ? '.on' : ''), { type: 'button', 'aria-pressed': String(sc === 'both'), on: { click: pick('both') } },
                h('strong', 'Буквы и транскрипция'), sr('Բարև ձեզ։ Ինչպե՞ս եք։', { script: 'both', tag: 'span' })),
              h('button.choice-card' + (sc === 'cyr' ? '.on' : ''), { type: 'button', 'aria-pressed': String(sc === 'cyr'), on: { click: pick('cyr') } },
                h('strong', 'Только армянские буквы'), sr('Բարև ձեզ։ Ինչպե՞ս եք։', { script: 'cyr', tag: 'span' })),
              h('button.choice-card' + (sc === 'lat' ? '.on' : ''), { type: 'button', 'aria-pressed': String(sc === 'lat'), on: { click: pick('lat') } },
                h('strong', 'Только транскрипция'), sr('Բարև ձեզ։ Ինչպե՞ս եք։', { script: 'lat', tag: 'span' }))),
            h('p.muted.small', 'Переключатель «Հայ · Рус · Обе» всегда в шапке.'),
            h('div.actions', h('button.btn.ghost', { type: 'button', on: { click: function () { step = 0; draw(); } } }, 'Назад'),
              h('button.btn.primary', { type: 'button', on: { click: function () { step = 2; draw(); } } }, 'Дальше'))));
        } else if (step === 2) {
          var goals = s.settings.goals || [];
          box.appendChild(h('div.card',
            h('h2', 'Зачем вам армянский?'),
            h('p.muted', 'Необязательно. Можно выбрать несколько и изменить потом в настройках.'),
            h('div.chips', GOALS.map(function (g) {
              var on = goals.indexOf(g) !== -1;
              return h('button.chip-toggle' + (on ? '.on' : ''), { type: 'button', 'aria-pressed': String(on), on: { click: function () {
                SM.store.update(function (x) { var i = x.settings.goals.indexOf(g); if (i === -1) x.settings.goals.push(g); else x.settings.goals.splice(i, 1); });
                draw();
              } } }, g);
            })),
            h('div.actions', h('button.btn.ghost', { type: 'button', on: { click: function () { step = 1; draw(); } } }, 'Назад'),
              h('button.btn.primary', { type: 'button', on: { click: function () { step = 3; draw(); } } }, 'Дальше'))));
        } else {
          box.appendChild(h('div.card',
            SM.ui.mascot('explain', 'Чтобы не заставлять повторять то, что уже известно, сначала стоит понять уровень.', { small: true }),
            h('h2', 'С чего начнём?'),
            h('div.choice-cards.stack',
              h('button.choice-card', { type: 'button', 'data-autofocus': '1', on: { click: function () { finish('diagnostic'); } } },
                h('strong', 'Пройти диагностику'), h('span', 'Около 10 минут, задания подстраиваются под ответы. В итоге — профиль по навыкам и личный маршрут.')),
              h('button.choice-card', { type: 'button', on: { click: function () { finish('zero'); } } },
                h('strong', 'Начать с самого начала'), h('span', 'Подходит, если армянские буквы пока незнакомы. Начнём с первых пяти.'))),
            h('div.actions', h('button.btn.ghost', { type: 'button', on: { click: function () { step = 2; draw(); } } }, 'Назад'))));
        }
        var af = box.querySelector('[data-autofocus]'); if (af) af.focus();
      }
      function finish(choice) {
        SM.store.update(function (x) { x.onboarding.done = true; x.onboarding.startChoice = choice; });
        SM.app.go(choice === 'diagnostic' ? 'diagnostic' : 'lesson/a-1');
      }
      draw();
      return { rerender: draw };
    }
  };

  // ═════════════════════════ Главная ═════════════════════════
  V.home = {
    render: function (main) {
      function draw() {
        SM.ui.clear(main);
        var s = st();
        var rec = SM.planner.recommendation(s);
        var due = SM.planner.dueCount(s);
        var diag = SM.progress.latestDiagnostic(s);
        var lessonsDone = SM.content.lessonOrder.filter(function (k) { return s.lessons[k] && s.lessons[k].status === 'done'; }).length;
        var totalLessons = SM.content.lessonOrder.length;
        var itemIds = Object.keys(s.items);
        var confident = itemIds.filter(function (id) { return SM.srs.itemStatus(s, id) === 'confident'; }).length;
        var hasHistory = s.history.length > 0;

        var greet = hasHistory ? SM.ui.pickPhrase(T.mascot.homeBack, 'homeBack') : 'Первый урок ждёт. Начнём с букв: их 39, и первые пять уже складываются в слова.';
        var mood = rec.kind === 'review' && rec.due >= SM.planner.REVIEW_FIRST ? 'overwhelmed' : rec.kind === 'exam' ? 'laptop' : hasHistory ? 'greet' : 'explain';
        main.appendChild(h('div.page-head', SM.ui.mascot(mood, greet)));

        var cta;
        if (rec.kind === 'lesson') cta = { href: '#/lesson/' + rec.lesson.id, label: (s.lessons[rec.lesson.id] && s.lessons[rec.lesson.id].status === 'started') ? 'Продолжить урок' : 'Начать урок' };
        else if (rec.kind === 'review') cta = { href: '#/review', label: 'Начать повторение' };
        else if (rec.kind === 'exam') cta = { href: '#/exam/' + rec.exam.id, label: rec.exam.attempts ? 'Сдать экзамен ещё раз' : 'К экзамену' };
        else cta = { href: '#/dialogues', label: 'Открыть диалоги' };

        main.appendChild(h('section.card.hero',
          h('p.eyebrow', 'Рекомендованный шаг'),
          rec.kind === 'lesson'
            ? h('h2', sr(rec.lesson.title), h('span.title-ru', rec.lesson.ru))
            : h('h2', rec.title),
          h('p', rec.reason),
          rec.kind === 'lesson' ? h('p.muted.small', SM.content.stageById[rec.lesson.stage].title + ', модуль ' + SM.content.moduleById[rec.lesson.module].n + ', урок ' + rec.lesson.n + ' · около ' + rec.lesson.minutes + ' мин') : null,
          h('div.actions', h('a.btn.primary', { href: cta.href }, cta.label),
            h('a.btn.ghost', { href: '#/route' }, 'Почему это? Мой маршрут'))));

        if (SM.daily) main.appendChild(SM.daily.homeCard());
        var inst = SM.install && SM.install.homeCard(draw); if (inst) main.appendChild(inst);

        if (!diag) {
          main.appendChild(h('section.card.soft',
            h('h3', 'Уровень ещё не определён'),
            h('p', 'Если армянский для вас не совсем новый, пройдите диагностику — маршрут перестроится, и знакомые темы можно будет пропустить.'),
            h('a.btn.ghost', { href: '#/diagnostic' }, 'Пройти диагностику')));
        }

        main.appendChild(h('section.grid3',
          h('a.stat-card', { href: '#/review' }, h('span.stat-num', String(due)), h('span.stat-label', due === 1 ? 'элемент пора повторить' : 'элементов пора повторить')),
          h('a.stat-card', { href: '#/lessons' }, h('span.stat-num', lessonsDone + '/' + totalLessons), h('span.stat-label', 'уроков пройдено')),
          h('a.stat-card', { href: '#/dictionary' }, h('span.stat-num', String(itemIds.length)), h('span.stat-label', 'слов и конструкций встречено, ' + confident + ' уверенно'))));

        if (diag && !diag.skipped) {
          main.appendChild(h('p.muted.small', 'Освоено по диагностике: ', h('strong', diag.label), '. ', h('a', { href: '#/progress' }, 'Профиль навыков')));
        }
      }
      draw();
      return { rerender: draw };
    }
  };

  // ═════════════════════════ Диагностика ═════════════════════════
  V.diagnostic = {
    focusMode: function (args) { return args[0] !== 'result'; },
    render: function (main, args) {
      if (args[0] === 'result') return renderResult(main);
      // answer: индекс варианта; text: введённый текст; tokens/pool: сборка предложения
      var session = null, item = null, answer = null, text = '', tokens = null, pool = null, phase = 'intro', lastListen = null;
      var history = []; // снимки до каждого ответа — для кнопки «Назад»
      var selfLevel = 1;
      var box = h('div.narrow');
      main.appendChild(box);

      function draw() {
        SM.ui.clear(box);
        if (phase === 'intro') return drawIntro();
        if (phase === 'listen-after') return drawListenAfter();
        drawItem();
      }

      function drawIntro() {
        var hasAudio = SM.audio.hasVoice();
        var opts = [
          { key: 1, label: 'Только начинаю разбирать буквы' },
          { key: 2, label: 'Читаю и знаю отдельные слова' },
          { key: 3, label: 'Могу составить простое предложение' }
        ];
        box.appendChild(h('div.card.diag-intro',
          h('div.diag-hero', h('div.diag-hero-pug', { html: SM.ui.mascotImg('laptop') }),
            h('div', h('h1', 'Диагностика уровня'), h('p.lead', 'Около 10 минут. Задания подстраиваются под ваши ответы.'))),
          h('ul.facts',
            h('li', h('strong', 'Одно задание на экран.'), ' Правильные ответы во время теста не показываются.'),
            h('li', h('strong', '«Не знаю» — нормальный ответ.'), ' Угадывать не нужно, так оценка точнее.'),
            h('li', h('strong', 'Можно вернуться назад'), ' и исправить ответ, если нажали не то.')),
          h('p.diag-audio' + (hasAudio ? '' : '.warn'), SM.ui.icon(hasAudio ? 'play' : 'bell'),
            hasAudio ? 'Аудирование: синтез речи браузера, не запись носителя.' : 'Аудирование не проверим: в этом браузере нет армянского голоса.'),
          h('h2.diag-q', 'Как вы оцениваете свой армянский?'),
          h('p.muted.small', 'Это только точка старта. Уровень определят ответы.'),
          h('div.choice-cards.stack', { role: 'radiogroup', 'aria-label': 'Самооценка' }, opts.map(function (o) {
            return h('button.choice-card.compact' + (selfLevel === o.key ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(selfLevel === o.key),
              on: { click: function () { selfLevel = o.key; draw(); } } }, o.label);
          })),
          h('div.actions',
            h('a.btn.ghost', { href: '#/home' }, 'Не сейчас'),
            h('button.btn.primary', { type: 'button', on: { click: begin } }, 'Начать диагностику')),
          h('details.more',
            h('summary', 'Как считается уровень'),
            h('p.small', 'Задания идут блоками по этапам курса — буквы, слова, предложения: чтение, грамматика, лексика, письмо, уместность фраз' + (hasAudio ? ' и аудирование' : '') + '. Три верных ответа из четырёх — уровень подтверждён, и задания усложняются. Если трудно — упрощаются.'),
            h('p.small', 'Устная речь в этой версии не оценивается: надёжного автоматического способа нет. В результатах она будет помечена как «не проверено».'))));
      }

      function begin() {
        var startLvl = selfLevel;
        session = SM.diagnostic.create(startLvl, { audio: SM.audio.hasVoice() });
        history = [];
        phase = 'item';
        nextItem();
      }

      function resetAnswer() {
        answer = null; text = ''; tokens = null; pool = null;
        if (item && item.type === 'order') { pool = SM.review.shuffle(item.tokens.slice()); tokens = []; }
      }

      function nextItem() {
        item = SM.diagnostic.next(session);
        resetAnswer();
        if (!item) return finish();
        draw();
        focusFirst();
      }

      function focusFirst() {
        setTimeout(function () {
          var el = box.querySelector('.sr-input') || box.querySelector('.opt') || box.querySelector('.chip');
          if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
        }, 30);
      }

      function goBack() {
        if (!history.length) return;
        var prev = history.pop();
        session = JSON.parse(prev.snap);
        item = SM.diagnostic.next(session);
        answer = prev.answer; text = prev.text || '';
        tokens = prev.tokens ? prev.tokens.slice() : null; pool = prev.pool ? prev.pool.slice() : null;
        phase = 'item';
        draw();
        SM.ui.toast('Можно изменить ответ.');
      }

      async function abort() {
        var ok = await SM.ui.confirm({
          title: 'Прервать диагностику?', mascot: 'sad',
          text: 'Ответы этой попытки не сохранятся. Пройти диагностику можно позже из раздела «Мой маршрут».',
          ok: 'Прервать', cancel: 'Продолжить'
        });
        if (ok) SM.app.go(st().onboarding.done ? 'home' : 'onboarding');
      }

      function drawItem() {
        var pi = SM.diagnostic.progressInfo(session);
        var card = h('div.card.diag-item');
        card.appendChild(h('div.diag-top',
          h('button.btn-link', { type: 'button', disabled: !history.length, on: { click: goBack }, 'aria-label': 'Назад, к предыдущему заданию' }, SM.ui.icon('back'), 'Назад'),
          h('span.diag-count', { title: 'Диагностика подстраивается под ответы, поэтому общее число заданий — оценка сверху. Может закончиться раньше.' },
            h('strong', String(pi.current)), ' / ' + pi.total),
          h('button.btn-link', { type: 'button', on: { click: abort } }, 'Прервать')));
        card.appendChild(h('div.pbar.diag-bar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(pi.total), 'aria-valuenow': String(pi.answered),
          'aria-label': 'Задание ' + pi.current + ' из примерно ' + pi.total }, h('div.pbar-fill', { style: 'width:' + Math.round(pi.answered / pi.total * 100) + '%' })));
        card.appendChild(rich(item.prompt, 'h2', 'ex-prompt'));
        if (item.type === 'listen_choice') {
          card.appendChild(h('div.listen-box', SM.ui.audioButtons(item.sr, { label: 'Слушать' }), SM.ui.synthNote(item.sr)));
        } else if (item.text) {
          card.appendChild(h('div.reading', sr(item.text, { tag: 'p' })));
          card.appendChild(rich(item.question, 'p', 'question'));
        } else if (item.sr) {
          card.appendChild(h('div.stim-line', sr(item.sr, { cls: 'stim-text', script: item.forceScript })));
        }
        if (item.options) {
          var list = h('div.options', { role: 'radiogroup', 'aria-label': 'Варианты ответа' });
          item.options.forEach(function (o, i) {
            list.appendChild(h('button.opt' + (answer === i ? '.selected' : ''), { type: 'button', role: 'radio', 'aria-checked': String(answer === i),
              on: { click: function () { answer = i; draw(); var c = box.querySelector('[data-check]'); if (c) c.focus(); } } },
              h('span.opt-key', String(i + 1)), item.optLang === 'sr' ? sr(o) : rich(o)));
          });
          card.appendChild(list);
        } else if (item.type === 'order') {
          var line = h('div.order-line');
          if (!tokens.length) line.appendChild(h('span.placeholder', 'Нажимайте на слова по порядку'));
          tokens.forEach(function (t, k) { line.appendChild(h('button.chip.placed', { type: 'button', on: { click: function () { tokens.splice(k, 1); pool.push(t); draw(); } } }, sr(t))); });
          var pl = h('div.order-pool');
          pool.forEach(function (t, k) { pl.appendChild(h('button.chip', { type: 'button', on: { click: function () { pool.splice(k, 1); tokens.push(t); draw(); } } }, sr(t))); });
          card.appendChild(h('div.order', line, pl));
        } else {
          var field = SM.ui.armenianInput({ multiline: item.type === 'write', value: text, onEnter: submit, placeholder: 'Ответ по-армянски',
            onInput: function (v) { text = v; } });
          card.appendChild(field.el);
        }
        card.appendChild(h('div.actions',
          h('button.btn.ghost', { type: 'button', on: { click: function () { record(false, true); } } }, 'Не знаю'),
          h('button.btn.primary', { type: 'button', 'data-check': '1', on: { click: submit } }, 'Ответить')));
        box.appendChild(card);
      }

      function submit() {
        var correct;
        if (item.options) { if (answer === null) { SM.ui.toast('Выберите вариант или нажмите «Не знаю».'); return; } correct = answer === item.correct; }
        else if (item.type === 'order') { if (!tokens.length) { SM.ui.toast('Соберите предложение или нажмите «Не знаю».'); return; } correct = SM.checker.checkOrder(tokens, item.accept).correct; }
        else if (item.type === 'write') { if (!text.trim()) { SM.ui.toast('Напишите ответ или нажмите «Не знаю».'); return; } correct = SM.checker.checkKeywords(text, item.groups).correct; }
        else { if (!text.trim()) { SM.ui.toast('Напишите ответ или нажмите «Не знаю».'); return; } correct = SM.checker.checkText(text, item.accept).correct; }
        record(correct, false);
      }

      function record(correct, dontKnow) {
        // Снимок «до ответа» — по нему «Назад» вернёт задание вместе с выбранным ответом.
        history.push({ snap: JSON.stringify(session), answer: dontKnow ? null : answer, text: text,
          tokens: tokens && tokens.slice(), pool: pool && pool.slice() });
        SM.diagnostic.answer(session, item.id, correct, { dontKnow: dontKnow });
        if (item.type === 'listen_choice') { lastListen = item; phase = 'listen-after'; draw(); return; }
        nextItem();
      }

      function drawListenAfter() {
        var shown = false;
        var tr = h('div.transcript-slot');
        box.appendChild(h('div.card',
          h('div.diag-top', h('button.btn-link', { type: 'button', on: { click: goBack } }, SM.ui.icon('back'), 'Изменить ответ'), h('span'), h('button.btn-link', { type: 'button', on: { click: abort } }, 'Прервать')),
          h('h2', 'Ответ принят'),
          h('p', 'Теперь можно посмотреть, что звучало. На оценку это уже не влияет.'),
          tr,
          h('div.actions',
            h('button.btn.ghost', { type: 'button', on: { click: function () {
              if (shown) return; shown = true;
              tr.appendChild(h('div.transcript', sr(lastListen.sr)));
            } } }, SM.ui.icon('eye'), 'Показать транскрипт'),
            h('button.btn.primary', { type: 'button', 'data-autofocus': '1', on: { click: function () { phase = 'item'; nextItem(); } } }, 'Дальше'))));
        box.querySelector('[data-autofocus]').focus();
      }

      function finish() {
        var res = SM.diagnostic.result(session);
        SM.store.update(function (s) { s.diagnostic.runs.push(res); s.onboarding.done = true; });
        SM.app.go('diagnostic/result');
      }

      draw();
      return { rerender: draw };
    }
  };

  function levelBar(level) {
    var bar = h('div.lvlbar', { 'aria-hidden': 'true' });
    for (var i = 1; i <= 3; i++) bar.appendChild(h('span' + (i <= level ? '.on' : '')));
    return bar;
  }

  function renderResult(main) {
    var s = st();
    var r = SM.progress.latestDiagnostic(s);
    if (!r || r.skipped) { main.appendChild(h('div.card', h('p', 'Результатов диагностики пока нет.'), h('a.btn.primary', { href: '#/diagnostic' }, 'Пройти диагностику'))); return {}; }
    var L = SM.progress.SKILL_LABELS;
    var box = h('div.narrow');
    main.appendChild(box);
    var rt = SM.planner.route(s);

    box.appendChild(h('div.card',
      SM.ui.mascot('celebrate', 'Готово! Вот что получилось. Это предварительная оценка — она будет уточняться по ходу занятий.', { small: true }),
      h('p.eyebrow', 'Уверенно освоено'),
      h('p.big-level', r.label),
      r.top === 0 ? h('p', 'Пока даже буквы даются с трудом — значит, начнём с самого начала. Это нормально.') : null,
      h('p.small.muted', 'Здесь нет уровней A1–C2: приложение проверяет три этапа своего курса — буквы, слова, предложения.')));

    var skillList = h('div.skill-list');
    ['reading', 'listening', 'grammar', 'vocab', 'writing', 'pragmatics', 'speaking'].forEach(function (k) {
      var e = r.skills[k];
      if (!e || e.status === 'untested') {
        var why = e && e.reason === 'no-audio' ? 'не проверено: в браузере нет армянского голоса'
          : e && e.reason === 'not-supported' ? 'не проверено: в этой версии устная речь не оценивается'
          : 'недостаточно данных';
        skillList.appendChild(h('div.skill-row.untested', h('span.skill-name', L[k]), h('span.muted', why)));
      } else {
        skillList.appendChild(h('div.skill-row', h('span.skill-name', L[k]), levelBar(e.level),
          h('span.skill-lvl', (e.atLeast ? 'не ниже ' : '') + e.label),
          h('span.muted.small', e.correct + ' из ' + e.n + (e.confidence === 'low' ? ' · мало данных' : ''))));
      }
    });
    box.appendChild(h('div.card', h('h2', 'Профиль по навыкам'), skillList,
      h('p.muted.small', '«Не ниже» — самое сложное задание по этому навыку решено, верхняя граница не найдена.')));

    var strong = r.strengths.map(function (k) { return L[k]; });
    function topicRows(tags) {
      return tags.map(function (tag) {
        var lid = SM.content.topicMap[tag];
        var label = SM.content.topicLabels[tag] || tag;
        var target = lid && (SM.content.lessons[lid] ? '#/lesson/' + lid : SM.content.dialogueById[lid] ? '#/dialogue/' + lid : null);
        return h('li', label, target ? h('span', ' — ', h('a', { href: target }, 'урок в курсе')) : h('span.muted', ' — модуль в разработке'));
      });
    }
    var gapRows = topicRows(r.gaps), nextRows = topicRows(r.nextTopics || []);
    box.appendChild(h('div.card',
      h('h2', 'Сильные стороны и что подтянуть'),
      strong.length ? h('p', h('strong', 'Уверенно: '), strong.join(', ') + '.') : h('p.muted', 'Явных сильных сторон по этим данным не выделить — заданий по каждому навыку было немного.'),
      gapRows.length ? h('div', h('strong', 'Пробелы в уже освоенном — стоит подтянуть:'), h('ul', gapRows)) : h('p', 'Пробелов на подтверждённых этапах не обнаружено.'),
      nextRows.length ? h('div', h('strong', 'Темы следующего этапа (пока трудные — это нормально):'), h('ul', nextRows)) : null));

    box.appendChild(h('div.card',
      h('h2', 'Стартовый маршрут'),
      rt.next ? h('p', 'Начнём с урока ', h('strong', sr(rt.next.lesson.title)), ' («' + rt.next.lesson.ru + '»). ', rt.next.reason)
        : h('p', 'Все этапы курса подтверждены. Полезны диалоги и повторение.'),
      rt.rows.some(function (x) { return x.status === 'skip'; }) ? h('p.muted', 'Уроки этапов, подтверждённых диагностикой, отмечены как «можно пропустить» — они остаются доступными.') : null,
      h('details', h('summary', 'На чём основана оценка'),
        h('p.small', 'Выполнено заданий: ' + r.answered + '. Проверенные этапы: ' + r.testedRange.join('–') + '. На каждом этапе — блок из 4 заданий разных навыков; этап считается подтверждённым при 3 верных из 4 (при 2 из 4 даются уточняющие задания, нужно 4 из 6).'),
        h('p.small', 'Задания составлены для этого приложения и пока не откалиброваны на большой группе учащихся, поэтому оценка ориентировочная.')),
      h('div.actions', h('a.btn.ghost', { href: '#/route' }, 'Посмотреть маршрут'),
        rt.next ? h('a.btn.primary', { href: '#/lesson/' + rt.next.lesson.id }, 'Начать обучение') : h('a.btn.primary', { href: '#/dialogues' }, 'К диалогам'))));
    return {};
  }
})(window.SM = window.SM || {});
