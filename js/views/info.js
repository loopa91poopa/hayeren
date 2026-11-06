/* Словарь, карточка слова, прогресс, настройки. */
(function (SM) {
  'use strict';
  var h = SM.ui.h, sr = SM.ui.sr, rich = SM.ui.rich;
  var V = SM.views = SM.views || {};
  function st() { return SM.store.get(); }
  function fmtDate(t) { return t ? new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—'; }
  function fmtDue(t) {
    if (!t) return '—';
    var d = t - Date.now();
    if (d <= 0) return 'сейчас';
    var hrs = Math.round(d / 3600000);
    if (hrs < 24) return 'через ' + Math.max(1, hrs) + ' ч';
    return fmtDate(t);
  }
  var STATUS_CLS = { 'new': 'muted', learning: 'info', recognized: 'info', familiar: 'ok', confident: 'ok', difficult: 'warn' };

  // ═════════════════════════ Словарь ═════════════════════════
  V.dictionary = {
    render: function (main) {
      // По умолчанию — только встреченные слова; весь словарь курса открывается по желанию.
      var query = '', filter = 'met';
      var listBox = h('div');
      function matches(v) {
        if (!query) return true;
        var q = SM.checker.normalize(query);
        var qr = query.toLowerCase().trim();
        return SM.checker.normalize(v.sr).indexOf(q) !== -1 || SM.checker.stripDiacritics(SM.checker.normalize(v.sr)).indexOf(SM.checker.stripDiacritics(q)) !== -1 ||
          v.ru.toLowerCase().indexOf(qr) !== -1;
      }
      function isMet(s, v) { return !!s.items[v.id]; }
      function isDue(s, v) { return SM.srs.itemStatus(s, v.id) === 'difficult' || SM.srs.cardsOf(s, v.id).some(function (c) { return c.due <= Date.now(); }); }
      function pass(s, v, f) { return f === 'all' ? true : f === 'met' ? isMet(s, v) : isMet(s, v) && isDue(s, v); }
      function drawList() {
        SM.ui.clear(listBox);
        var s = st();
        var rows = SM.content.vocab.filter(function (v) { return pass(s, v, filter) && matches(v); });
        // Встреченные — сначала самые свежие.
        if (filter !== 'all') rows.sort(function (a, b) { return (s.items[b.id].firstSeen || 0) - (s.items[a.id].firstSeen || 0); });
        if (!rows.length) {
          var elsewhere = query ? SM.content.vocab.filter(function (v) { return !isMet(s, v) && matches(v); }).length : 0;
          if (filter === 'met' && !query) {
            listBox.appendChild(h('div.card.center', SM.ui.mascot('sleep', 'Здесь появятся слова из ваших уроков, диалогов и игр. Пока их нет — начните первый урок.'),
              h('div.actions.center', h('a.btn.primary', { href: '#/route' }, 'К урокам'), h('button.btn.ghost', { type: 'button', on: { click: function () { filter = 'all'; draw(); } } }, 'Посмотреть все слова курса'))));
          } else {
            listBox.appendChild(h('p.muted', 'Среди ' + (filter === 'all' ? 'слов курса' : 'ваших слов') + ' ничего не найдено.'));
            if (elsewhere && filter !== 'all') listBox.appendChild(h('button.btn.ghost', { type: 'button', on: { click: function () { filter = 'all'; draw(); } } }, 'Нашлось в остальных словах курса: ' + elsewhere + ' — показать'));
          }
          return;
        }
        var ul = h('ul.dict-list');
        rows.forEach(function (v) {
          var status = SM.srs.itemStatus(s, v.id);
          var other = s.settings.script === 'cyr' ? 'lat' : 'cyr';
          ul.appendChild(h('li', h('a.dict-row', { href: '#/word/' + v.id },
            h('span.dict-sr', sr(v.sr, { cls: 'strong' }), s.settings.script !== 'both' ? h('span.muted.small', ' ', sr(v.sr, { script: other })) : null),
            h('span.dict-ru', v.kind === 'grammar' ? 'конструкция: ' + v.ru : v.ru),
            h('span.badge.' + STATUS_CLS[status], SM.srs.STATUS_LABELS[status]))));
        });
        listBox.appendChild(h('p.muted.small', 'Записей: ' + rows.length));
        listBox.appendChild(ul);
        if (filter !== 'all') listBox.appendChild(h('div.actions', h('button.btn.ghost', { type: 'button', on: { click: function () { filter = 'all'; draw(); } } }, 'Показать все слова курса')));
      }
      function draw() {
        SM.ui.clear(main);
        var s = st();
        var met = SM.content.vocab.filter(function (v) { return isMet(s, v); }).length;
        var due = SM.content.vocab.filter(function (v) { return isMet(s, v) && isDue(s, v); }).length;
        main.appendChild(h('h1', 'Словарь'));
        main.appendChild(h('p.lead', filter === 'all' ? 'Все слова и выражения курса, в том числе ещё не пройденные.' : 'Слова и выражения, которые уже встречались в занятиях. Поиск — по-армянски, транскрипцией или по-русски.'));
        var input = h('input.search', { type: 'search', placeholder: 'Поиск: здраво, zdravo, привет…', 'aria-label': 'Поиск по словарю', value: query,
          on: { input: function () { query = input.value; drawList(); } } });
        main.appendChild(h('div.search-row', SM.ui.icon('search'), input));
        main.appendChild(h('div.chips', [['met', 'Мои слова · ' + met], ['review', 'На повторение · ' + due], ['all', 'Все слова курса · ' + SM.content.vocab.length]].map(function (f) {
          return h('button.chip-toggle' + (filter === f[0] ? '.on' : ''), { type: 'button', 'aria-pressed': String(filter === f[0]), on: { click: function () { filter = f[0]; draw(); } } }, f[1]);
        })));
        main.appendChild(listBox);
        drawList();
      }      draw();
      return { rerender: draw };
    }
  };

  V.word = {
    render: function (main, args) {
      function draw() {
        SM.ui.clear(main);
        var v = SM.content.vocabById[args[0]];
        if (!v) { main.appendChild(h('p', 'Запись не найдена.')); return; }
        var s = st();
        var other = s.settings.script === 'cyr' ? 'lat' : 'cyr';
        var status = SM.srs.itemStatus(s, v.id);
        var cards = SM.srs.cardsOf(s, v.id);
        var l = SM.content.lessons[v.lesson] || SM.content.dialogueById[v.lesson];
        var box = h('div.narrow');
        box.appendChild(h('a.btn-link', { href: '#/dictionary' }, SM.ui.icon('back'), 'Словарь'));
        box.appendChild(h('div.card.word-card',
          h('div.word-main', sr(v.sr, { cls: 'word-big' }), SM.ui.audioButtons(v.sr)),
          s.settings.script !== 'both' ? h('p.word-other', sr(v.sr, { script: other }), h('span.muted', other === 'lat' ? ' транскрипция' : ' армянскими буквами')) : null,
          h('p.word-ru', v.ru),
          h('p.muted', [v.pos, v.reg && SM.content.REG[v.reg]].filter(Boolean).join(' · ')),
          v.gram ? h('p.word-gram', h('span.muted', 'Формы: '), SM.ui.gram(v.gram)) : null,
          v.note ? h('p.word-note', rich(v.note)) : null,
          h('span.badge.' + STATUS_CLS[status], SM.srs.STATUS_LABELS[status])));
        if (v.ex && v.ex.length) {
          box.appendChild(h('div.card', h('h2', 'Примеры'), h('ul.examples', v.ex.map(function (e) {
            return h('li', h('span.ex-sr', sr(e.sr), SM.ui.audioButtons(e.sr, { slow: false })), h('span.ex-ru', e.ru));
          }))));
        }
        var usages = SM.review.lessonExercisesFor(v.id).filter(function (x) { return x.ex.sr || x.ex.text; }).slice(0, 4);
        if (usages.length) {
          box.appendChild(h('div.card', h('h2', 'В упражнениях курса'), h('ul.plain', usages.map(function (x) {
            return h('li', sr(x.ex.text || x.ex.sr));
          }))));
        }
        var tbl = h('table.facet-table', h('tr', h('th', 'Навык'), h('th', 'Самостоятельно'), h('th', 'С подсказкой'), h('th', 'Не помню / ошибки'), h('th', 'Следующее повторение')));
        cards.forEach(function (c) {
          // data-label — подписи колонок для узкого экрана, где таблица превращается в карточки.
          tbl.appendChild(h('tr', h('td', SM.srs.FACET_LABELS[c.facet]), h('td', { 'data-label': 'Самостоятельно' }, String(c.reps)), h('td', { 'data-label': 'С подсказкой' }, String(c.hinted)),
            h('td', { 'data-label': 'Не помню / ошибки' }, c.forgot + ' / ' + c.wrong), h('td', { 'data-label': 'Следующее повторение' }, fmtDue(c.due))));
        });
        box.appendChild(h('div.card', h('h2', 'Как идёт освоение'),
          cards.length ? h('div.table-wrap', tbl) : h('p.muted', 'Это слово ещё не встречалось в занятиях.'),
          s.items[v.id] ? h('p.muted.small', 'Впервые: ' + fmtDate(s.items[v.id].firstSeen)) : null,
          h('p.muted.small', '«Уверенно» — не меньше трёх самостоятельных ответов в разные дни; один удачный выбор из вариантов не считается освоением.'),
          l ? h('p.small', 'Из урока: ', h('a', { href: SM.content.lessons[v.lesson] ? '#/lesson/' + v.lesson : '#/dialogue/' + v.lesson }, SM.translit.render(l.title, s.settings.script))) : null));
        main.appendChild(box);
      }
      draw();
      return { rerender: draw };
    }
  };

  // ═════════════════════════ Прогресс ═════════════════════════
  V.progress = {
    render: function (main) {
      function draw() {
        SM.ui.clear(main);
        var s = st();
        var diag = SM.progress.latestDiagnostic(s);
        var prof = SM.progress.skillProfile(s);
        main.appendChild(h('h1', 'Прогресс'));
        main.appendChild(h('p.lead', 'Здесь — то, что показано в заданиях, а не время в приложении. Проценты «владения языком» не считаются: таких надёжных цифр не бывает.'));

        main.appendChild(h('div.card',
          h('h2', 'Предварительный уровень'),
          diag && !diag.skipped ? h('p.big-level', diag.label) : h('p', 'Не определён — диагностика не пройдена.'),
          diag && !diag.skipped ? h('p.muted.small', 'Диагностика от ' + fmtDate(diag.date) + '. ', h('a', { href: '#/diagnostic/result' }, 'Подробнее'), ' · ', h('a', { href: '#/diagnostic' }, 'пройти заново')) :
            h('a.btn.ghost', { href: '#/diagnostic' }, 'Пройти диагностику')));

        var rows = h('div.skill-list');
        prof.forEach(function (p) {
          var d = p.diag;
          var diagText = !d ? '—' : d.status === 'untested' ? 'не проверено' : (d.atLeast ? 'не ниже ' : '') + d.label;
          var prac = p.practiceN >= 5 ? Math.round(p.recentScore * 100) + '% самостоятельно в последних ' + Math.min(40, p.practiceN) + ' заданиях' + (p.trend === 'up' ? ' · ↑ лучше' : p.trend === 'down' ? ' · ↓ труднее' : '')
            : p.practiceN ? 'мало данных (' + p.practiceN + ' зад.)' : 'нет данных';
          rows.appendChild(h('div.skill-row', h('span.skill-name', p.label), h('span.skill-lvl', diagText), h('span.muted.small', prac)));
        });
        main.appendChild(h('div.card', h('h2', 'Навыки'), h('p.muted.small', 'Слева — оценка диагностики, справа — доля самостоятельных ответов в занятиях (подсказка = половина).'), rows));

        var ins = SM.progress.insights(s);
        if (ins.length) main.appendChild(h('div.card', h('h2', 'Наблюдения'), h('ul', ins.map(function (t) { return h('li', t); }))));

        var lessonsDone = SM.content.lessonOrder.filter(function (id) { return s.lessons[id] && s.lessons[id].status === 'done'; });
        var modulesDone = SM.content.modules.filter(function (m) { return m.lessons.every(function (id) { return lessonsDone.indexOf(id) !== -1; }); });
        var counts = {};
        Object.keys(s.items).forEach(function (id) { var stt = SM.srs.itemStatus(s, id); counts[stt] = (counts[stt] || 0) + 1; });
        main.appendChild(h('div.card', h('h2', 'Курс и словарь'),
          h('p', 'Уроков пройдено: ' + lessonsDone.length + ' из ' + SM.content.lessonOrder.length + '. Модулей полностью: ' + modulesDone.filter(function (m) { return m.lessons.length; }).length + '.'),
          h('ul.exam-summary', SM.content.stages.map(function (stg) {
            var e = SM.planner.examInfo(s, stg);
            return h('li', h('strong', e.exam.title + ': '), e.passed ? 'сдан (' + Math.round(e.best * 100) + '%)' : e.attempts ? 'не сдан, лучший результат ' + Math.round(e.best * 100) + '%' : e.open ? 'ещё не сдавали' : 'этап закрыт', ' ', e.open ? h('a', { href: '#/exam/' + e.id }, e.passed ? 'подробнее' : 'к экзамену') : null);
          })),
          h('ul.status-counts', ['confident', 'familiar', 'recognized', 'learning', 'difficult'].map(function (k) {
            return h('li', h('span.badge.' + STATUS_CLS[k], SM.srs.STATUS_LABELS[k]), ' ' + (counts[k] || 0));
          })),
          h('p', h('a', { href: '#/review' }, 'На повторение сейчас: ' + SM.planner.dueCount(s)))));

        // Динамика за 14 дней
        var days = [];
        for (var i = 13; i >= 0; i--) { var t = Date.now() - i * SM.srs.DAY; var k = SM.srs.dayKey(t); days.push({ k: k, d: s.days[k] || { answers: 0, independent: 0 }, t: t }); }
        var max = Math.max.apply(null, days.map(function (x) { return x.d.answers; }).concat([1]));
        var chart = h('div.bars', { role: 'img', 'aria-label': 'Ответы по дням за две недели' });
        days.forEach(function (x) {
          chart.appendChild(h('div.bar-col', { title: x.k + ': ответов ' + x.d.answers + ', самостоятельно ' + x.d.independent },
            h('div.bar', { style: 'height:' + Math.round(x.d.answers / max * 100) + '%' }, h('div.bar-ind', { style: 'height:' + (x.d.answers ? Math.round(x.d.independent / x.d.answers * 100) : 0) + '%' })),
            h('span.bar-label', new Date(x.t).getDate())));
        });
        main.appendChild(h('div.card', h('h2', 'Динамика'), chart, h('p.muted.small', 'Высота — количество ответов за день; тёмная часть — самостоятельные ответы.')));

        var errs = SM.progress.topErrors(s, 6);
        main.appendChild(h('div.card', h('h2', 'Типичные ошибки'),
          errs.length ? h('ul', errs.map(function (e) {
            var lid = SM.content.topicMap[e.tag];
            return h('li', (SM.content.topicLabels[e.tag] || e.tag) + ' — ' + e.count, lid && SM.content.lessons[lid] ? h('span', ' · ', h('a', { href: '#/lesson/' + lid }, 'повторить урок')) : null);
          })) : h('p.muted', 'Пока нет данных.')));

        var rec = SM.planner.recommendation(s);
        main.appendChild(h('div.card.soft', h('h2', 'Следующий шаг'), h('p', rec.reason || ''),
          rec.kind === 'lesson' ? h('a.btn.primary', { href: '#/lesson/' + rec.lesson.id }, 'Открыть урок') : rec.kind === 'review' ? h('a.btn.primary', { href: '#/review' }, 'К повторению') : null));
      }
      draw();
      return { rerender: draw };
    }
  };

  // ═════════════════════════ Настройки ═════════════════════════
  V.settings = {
    render: function (main) {
      function draw() {
        SM.ui.clear(main);
        var s = st();
        main.appendChild(h('h1', 'Настройки'));
        var sc = s.settings.script;
        var scriptCard = function (id, title, sample) {
          return h('button.choice-card.compact' + (sc === id ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(sc === id), on: { click: function () { SM.app.setScript(id); } } },
            h('strong', title), sr(sample, { script: id }));
        };
        main.appendChild(h('div.card', h('h2', 'Письменность'),
          h('p', 'Влияет только на показ текста. Отвечать можно любой письменностью, прогресс не меняется.'),
          h('div.choice-cards.three', { role: 'radiogroup', 'aria-label': 'Письменность' },
            scriptCard('both', 'Буквы и транскрипция', 'Բարև'), scriptCard('cyr', 'Только буквы', 'Բարև'), scriptCard('lat', 'Только транскрипция', 'Բարև'))));

        var th = s.settings.theme || 'auto';
        var themeCard = function (id, title, note) {
          return h('button.choice-card.compact' + (th === id ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(th === id), on: { click: function () { SM.app.setTheme(id); draw(); } } },
            h('strong', title), h('span', note));
        };
        main.appendChild(h('div.card', h('h2', 'Тема'),
          h('div.choice-cards.three', { role: 'radiogroup', 'aria-label': 'Тема оформления' },
            themeCard('auto', 'Как в системе', 'Меняется вместе с устройством'), themeCard('light', 'Светлая', 'Молочный фон'), themeCard('dark', 'Тёмная', 'Ночное небо')),
          h('p.muted.small', 'Быстро переключить тему можно кнопкой с луной или солнцем в шапке.')));

        if (SM.install) main.appendChild(SM.install.settingsCard());
        if (SM.daily) main.appendChild(SM.daily.settingsCard(draw));

        var voice = SM.audio.voiceName();
        var rate = s.settings.audioRate;
        main.appendChild(h('div.card', h('h2', 'Аудио'),
          voice ? h('p', 'Используется синтез речи браузера: ', h('strong', voice), '. Это не запись носителя языка.')
            : h('p.note.warn', 'В этом браузере не найден армянский голос синтеза речи, поэтому кнопки прослушивания скрыты, а задания на слух заменяются чтением. Армянский голос есть не на всех устройствах; там, где добавлены записи из папки audio, звук будет и без него.'),
          voice ? h('div.field', h('label.field-label', { for: 'rate' }, 'Скорость обычного воспроизведения: ' + rate + '×'),
            h('input#rate', { type: 'range', min: '0.6', max: '1.2', step: '0.1', value: String(rate), on: { change: function (e) { var v = Number(e.target.value); SM.store.update(function (x) { x.settings.audioRate = v; }); draw(); } } }),
            h('div.actions', h('button.btn.ghost', { type: 'button', on: { click: function () { SM.audio.play({ text: 'Բարև ձեզ։ Ինչպե՞ս եք։' }); } } }, SM.ui.icon('play'), 'Проверить голос'))) : null));

        main.appendChild(h('div.card', h('h2', 'Мопс'),
          h('label.switch', h('input', { type: 'checkbox', checked: s.settings.mascot, on: { change: function (e) { var v = e.target.checked; SM.store.update(function (x) { x.settings.mascot = v; }); draw(); } } }),
            h('span', 'Показывать мопса рядом с подсказками и отзывами')),
          h('p.muted.small', 'Если выключить, реплики останутся, но без картинки.')));

        var GOALS = ['общение с родными', 'работа', 'учёба', 'чтение книг и прессы', 'путешествия', 'жизнь в Армении', 'культура и кино', 'свободное владение'];
        main.appendChild(h('div.card', h('h2', 'Цели'), h('p.muted.small', 'Помогают расставлять акценты в будущих модулях.'),
          h('div.chips', GOALS.map(function (g) {
            var on = s.settings.goals.indexOf(g) !== -1;
            return h('button.chip-toggle' + (on ? '.on' : ''), { type: 'button', 'aria-pressed': String(on), on: { click: function () {
              SM.store.update(function (x) { var i = x.settings.goals.indexOf(g); if (i === -1) x.settings.goals.push(g); else x.settings.goals.splice(i, 1); }); draw();
            } } }, g);
          }))));

        main.appendChild(h('div.card', h('h2', 'Маршрут и прогресс'),
          h('div.actions', h('a.btn.ghost', { href: '#/route' }, 'Мой маршрут'), h('a.btn.ghost', { href: '#/progress' }, 'Прогресс'), h('a.btn.ghost', { href: '#/diagnostic' }, 'Пройти диагностику заново'))));

        var fileInput = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', on: { change: function (e) {
          var f = e.target.files[0]; if (!f) return;
          var rd = new FileReader();
          rd.onload = function () {
            try { SM.store.importJSON(String(rd.result)); SM.ui.toast('Прогресс загружен.'); SM.app.route(); }
            catch (err) { SM.ui.toast('Не удалось загрузить: ' + err.message); }
          };
          rd.readAsText(f, 'utf-8');
        } } });
        main.appendChild(h('div.card', h('h2', 'Данные'),
          h('p', SM.store.isPersistent() ? 'Прогресс хранится в этом браузере (localStorage) на этом устройстве. Чтобы перенести его, сохраните файл и загрузите на другом устройстве.' :
            'Браузер не разрешает сохранять данные — прогресс пропадёт после закрытия вкладки.'),
          h('div.actions',
            h('button.btn.ghost', { type: 'button', on: { click: function () {
              var blob = new Blob([SM.store.exportJSON()], { type: 'application/json;charset=utf-8' });
              var a = h('a', { href: URL.createObjectURL(blob), download: 'hayeren-mopsi-het-progress.json' });
              document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
            } } }, 'Сохранить прогресс в файл'),
            h('button.btn.ghost', { type: 'button', on: { click: function () { fileInput.click(); } } }, 'Загрузить из файла'), fileInput,
            h('button.btn.danger', { type: 'button', on: { click: function () {
              SM.ui.confirm({ title: 'Сбросить весь прогресс?', text: 'Удалятся уроки, повторения, результаты диагностики и настройки. Это нельзя отменить. Если нужна копия, сначала сохраните прогресс в файл.',
                ok: 'Сбросить', cancel: 'Оставить', danger: true, mascot: 'sad' }).then(function (ok) {
                if (!ok) return;
                SM.store.reset(); document.documentElement.setAttribute('data-script', SM.store.get().settings.script); SM.app.go('onboarding');
              });
            } } }, 'Сбросить прогресс'))));

        main.appendChild(h('div.card.soft', h('h2', 'О приложении'),
          h('p', SM.texts.appName + ' — учебный MVP. Язык курса — восточноармянский литературный стандарт (реформированная орфография, как в Армении). Устная речь пока не оценивается; аудио — записи, если они добавлены, или синтез речи, если он есть в браузере.'),
          h('p.muted.small', 'Учебные материалы составлены для этого приложения и нуждаются в проверке носителем-преподавателем (список — в файле CONTENT_REVIEW.md).')));
      }
      draw();
      return { rerender: draw };
    }
  };
})(window.SM = window.SM || {});
