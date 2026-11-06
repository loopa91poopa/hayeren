/* Повторение, игры, диалоги. */
(function (SM) {
  'use strict';
  var h = SM.ui.h, sr = SM.ui.sr, rich = SM.ui.rich, T = SM.texts;
  var V = SM.views = SM.views || {};
  function st() { return SM.store.get(); }
  function lesson(id) { return SM.content.lessons[id]; }

  // Маршрут, список уроков, урок и экзамен — в views/course.js.

  // ═════════════════════════ Повторение ═════════════════════════
  V.review = {
    focusMode: function (args) { return args[0] === 'go'; },
    render: function (main, args) {
      var player = null;
      function overview() {
        SM.ui.clear(main);
        var s = st();
        var due = SM.srs.dueCards(s);
        main.appendChild(h('h1', 'Повторение'));
        if (!Object.keys(s.srs).length) {
          main.appendChild(h('div.card.center', SM.ui.mascot('sleep', T.mascot.empty[0]), h('a.btn.primary', { href: '#/lessons' }, 'К урокам')));
          return;
        }
        var soon = Object.keys(s.srs).map(function (k) { return s.srs[k]; }).filter(function (c) { return c.due > Date.now() && c.due < Date.now() + SM.srs.DAY; }).length;
        var priority = due.filter(function (c) { return c.priority >= 2; });
        main.appendChild(h('div.card',
          due.length ? SM.ui.mascot('explain', 'Сейчас пора повторить ' + due.length + '. За одно занятие — до 15 заданий, остальное подождёт.', { small: true })
            : SM.ui.mascot('sleep', T.mascot.empty[1], { small: true }),
          h('p', 'В течение суток станут доступны ещё: ' + soon + '.'),
          h('p.muted.small', 'Каждый элемент повторяется по отдельности для узнавания, самостоятельного вспоминания, употребления в контексте и понимания на слух. Ошибки и «Не помню» поднимают приоритет.'),
          due.length ? h('div.actions', h('button.btn.primary', { type: 'button', on: { click: startSession } }, 'Начать повторение')) : null));
        // Трудные элементы, которые вернутся скоро (после ошибок, «Не помню», подсказок).
        var upcoming = Object.keys(s.srs).map(function (k) { return s.srs[k]; })
          .filter(function (c) { return c.due > Date.now() && c.priority >= 2 && c.facet.indexOf('read') !== 0; })
          .sort(function (a, b) { return a.due - b.due; });
        if (upcoming.length) {
          var ul2 = h('ul.due-list');
          upcoming.slice(0, 12).forEach(function (c) {
            var v = SM.content.vocabById[c.item]; if (!v) return;
            var hrs = Math.max(1, Math.round((c.due - Date.now()) / 3600000));
            ul2.appendChild(h('li', sr(v.sr, { cls: 'strong' }), ' — ', v.ru, h('span.badge.info', hrs < 24 ? 'через ' + hrs + ' ч' : 'через ' + Math.round(hrs / 24) + ' дн.'), h('span.muted.small', ' · ' + SM.srs.FACET_LABELS[c.facet])));
          });
          main.appendChild(h('div.card', h('h2', 'Скоро вернутся'), h('p.muted.small', 'Эти элементы вызывали трудности. Их повторение назначено с повышенным приоритетом: сразу повторять нет смысла — память лучше закрепляется с небольшим перерывом.'), ul2));
        }
        if (priority.length) {
          var ul = h('ul.due-list');
          priority.slice(0, 12).forEach(function (c) {
            var v = SM.content.vocabById[c.item]; if (!v) return;
            var last = c.log[c.log.length - 1];
            ul.appendChild(h('li', sr(v.kind === 'grammar' ? v.sr : v.sr, { cls: 'strong' }), ' — ', v.ru, h('span.badge.warn', last && last.o === 'forgot' ? '«не помню»' : 'ошибка'), h('span.muted.small', ' · ' + SM.srs.FACET_LABELS[c.facet])));
          });
          main.appendChild(h('div.card', h('h2', 'В первую очередь'), ul));
        }
      }
      function startSession() {
        var exs = SM.review.buildSession(st(), 15);
        if (!exs.length) { SM.ui.toast('Сейчас нечего повторять.'); return; }
        SM.ui.clear(main);
        var box = h('div.narrow');
        main.appendChild(box);
        document.body.classList.add('focus-mode');
        player = SM.ui.player.create({
          steps: exs, source: 'review', summaryTitle: 'Повторение завершено',
          onExit: function () { document.body.classList.remove('focus-mode'); player = null; overview(); },
          finishActions: [
            { label: 'На главную', primary: true, onClick: function () { SM.app.go('home'); } },
            { label: 'Ещё повторение', onClick: function () { document.body.classList.remove('focus-mode'); player = null; overview(); } }
          ]
        });
        box.appendChild(player.el);
      }
      if (args[0] === 'go') startSession(); else overview();
      return { rerender: function () { if (player) player.render(); else overview(); }, destroy: function () { document.body.classList.remove('focus-mode'); } };
    }
  };

  // ═════════════════════════ Игры ═════════════════════════
  function learnedVocab(s) {
    var ids = Object.keys(s.items).filter(function (id) { var v = SM.content.vocabById[id]; return v && v.kind !== 'grammar'; });
    return ids.map(function (id) { return SM.content.vocabById[id]; });
  }

  function matchRounds(s) {
    var pool = learnedVocab(s);
    var note = null;
    if (pool.length < 5) {
      pool = SM.content.vocab.filter(function (v) { return v.lesson === 'a1-1-l1'; });
      note = 'Изученных слов пока мало, поэтому здесь слова первого урока — с переводом, как знакомство.';
    }
    // Приоритет — трудным и давно не виденным.
    pool = SM.review.shuffle(pool).sort(function (a, b) {
      var pa = Math.max.apply(null, SM.srs.cardsOf(s, a.id).map(function (c) { return c.priority; }).concat([0]));
      var pb = Math.max.apply(null, SM.srs.cardsOf(s, b.id).map(function (c) { return c.priority; }).concat([0]));
      return pb - pa;
    });
    var rounds = [];
    for (var r = 0; r < 2 && pool.length >= (r + 1) * 4; r++) {
      var chunk = pool.slice(r * 5, r * 5 + 5);
      if (chunk.length < 4) break;
      rounds.push({ t: 'ex', id: 'game-match-' + r, type: 'match', skills: ['vocab'], tag: 'game-match',
        prompt: 'Раунд ' + (r + 1) + ': соедините армянские слова с переводами.',
        pairs: chunk.map(function (v) { return [v.sr, v.ru.split(';')[0]]; }),
        items: chunk.map(function (v) { return [v.id, 'recognition']; }) });
    }
    return { steps: rounds, note: note };
  }

  function orderRounds(s) {
    var learned = {};
    Object.keys(s.items).forEach(function (id) { learned[id] = true; });
    var cands = [];
    SM.content.vocab.forEach(function (v) {
      if (!learned[v.id] || v.kind === 'grammar') return;
      (v.ex || []).forEach(function (e) {
        if (/[—/]/.test(e.sr)) return;
        var words = e.sr.replace(/[.!?…]+$/, '').replace(/,/g, '').split(' ');
        if (words.length >= 3 && words.length <= 7) cands.push({ v: v, e: e, words: words });
      });
    });
    var note = null;
    if (cands.length < 4) {
      note = 'Изученных предложений пока мало, поэтому здесь фразы из первых уроков — с переводом.';
      SM.content.vocab.filter(function (v) { return v.lesson === 'a1-1-l1' || v.lesson === 'a1-1-l2'; }).forEach(function (v) {
        (v.ex || []).forEach(function (e) {
          if (/[—/]/.test(e.sr)) return;
          var words = e.sr.replace(/[.!?…]+$/, '').replace(/,/g, '').split(' ');
          if (words.length >= 3) cands.push({ v: v, e: e, words: words });
        });
      });
    }
    var steps = SM.review.shuffle(cands).slice(0, 6).map(function (c, i) {
      return { t: 'ex', id: 'game-order-' + c.v.id + '-' + i, type: 'order', skills: ['grammar'], tag: 'word-order',
        prompt: 'Соберите предложение: «' + c.e.ru + '»', tokens: c.words, accept: [c.words.join(' ')],
        items: [[c.v.id, 'context']] };
    });
    return { steps: steps, note: note };
  }

  V.games = {
    render: function (main) {
      SM.ui.clear(main);
      var s = st();
      main.appendChild(h('h1', 'Игры'));
      main.appendChild(h('p.lead', 'Игры построены на словах и фразах из ваших уроков. Скорость не важна; результаты попадают в повторение.'));
      var hist = s.games.slice(-5).reverse();
      main.appendChild(h('div.grid2',
        h('a.card.game-card', { href: '#/game/match' }, h('h2', 'Сопоставление'), h('p', 'Соединить армянские слова и выражения с переводами.')),
        h('a.card.game-card', { href: '#/game/order' }, h('h2', 'Сборка предложения'), h('p', 'Собрать предложение из слов по переводу.'))));
      if (hist.length) {
        main.appendChild(h('div.card', h('h2', 'Последние результаты'), h('ul', hist.map(function (g) {
          return h('li', (g.game === 'match' ? 'Сопоставление' : 'Сборка предложения') + ': ' + g.independent + ' из ' + g.total + ' без ошибок · ' + new Date(g.t).toLocaleDateString('ru-RU'));
        }))));
      }
      return {};
    }
  };

  V.game = {
    focusMode: function () { return true; },
    render: function (main, args) {
      var kind = args[0] === 'order' ? 'order' : 'match';
      var built = kind === 'match' ? matchRounds(st()) : orderRounds(st());
      var box = h('div.narrow');
      main.appendChild(box);
      if (!built.steps.length) { box.appendChild(h('div.card', h('p', 'Пока недостаточно материала для игры.'), h('a.btn.primary', { href: '#/lessons' }, 'К урокам'))); return {}; }
      var steps = built.steps;
      if (built.note) steps = [{ t: 'explain', title: kind === 'match' ? 'Сопоставление' : 'Сборка предложения', body: built.note }].concat(steps);
      var player = SM.ui.player.create({
        steps: steps, source: 'game', requeue: false, summaryTitle: 'Игра окончена',
        onExit: function () { SM.app.go('games'); },
        onFinish: function (stats) {
          SM.store.update(function (s) { s.games.push({ t: Date.now(), game: kind, total: stats.total, independent: stats.independent, hinted: stats.hinted, wrong: stats.wrong }); });
        },
        finishActions: [
          { label: 'Сыграть ещё', primary: true, onClick: function () { SM.app.route(); } },
          { label: 'К играм', onClick: function () { SM.app.go('games'); } }
        ]
      });
      box.appendChild(player.el);
      return { rerender: player.render };
    }
  };

  // ═════════════════════════ Диалоги ═════════════════════════
  V.dialogues = {
    render: function (main) {
      function draw() {
        SM.ui.clear(main);
        main.appendChild(h('h1', 'Диалоги'));
        main.appendChild(h('p.lead', 'Живые ситуации с переводом, прослушиванием по репликам и заданиями. Режим «Три прохода» помогает тренировать аудирование.'));
        var s = st();
        ['Первые фразы', 'Предложения'].forEach(function (lvl) {
          var group = SM.content.dialogues.filter(function (d) { return d.level === lvl; });
          if (!group.length) return;
          var done = group.filter(function (d) { return s.lessons[d.id] && s.lessons[d.id].status === 'done'; }).length;
          main.appendChild(h('h2.rules-stage', lvl + ' ', h('span.muted.small', '· пройдено ' + done + ' из ' + group.length)));
          var grid = h('div.dlg-grid');
          group.forEach(function (d) {
            var isDone = s.lessons[d.id] && s.lessons[d.id].status === 'done';
            grid.appendChild(h('a.card.dlg-card' + (isDone ? '.done' : ''), { href: '#/dialogue/' + d.id },
              h('p.eyebrow', d.level + (isDone ? ' · пройден ✓' : '')), h('h2', sr(d.title), h('span.title-ru', d.ru)), rich(d.context, 'p')));
          });
          main.appendChild(grid);
        });
      }
      draw();
      return { rerender: draw };
    }
  };

  V.dialogue = {
    focusMode: function (args) { return args[1] === 'practice'; },
    render: function (main, args) {
      var d = SM.content.dialogueById[args[0]];
      if (!d) { main.appendChild(h('div.card', h('p', 'Диалог не найден.'))); return {}; }
      // Диалог можно слушать, если есть армянский голос или свои записи всех реплик.
      function audioOk() { return SM.audio.hasVoice() || d.lines.every(function (l) { return SM.audio.hasFile(l.sr, l.audio); }); }
      var hasAudio = audioOk();
      var ui = { transcript: !hasAudio, translation: false, playing: -1, seq: null, pass: 0, passDone: false };
      var player = null;
      var box = h('div.narrow');
      main.appendChild(box);

      /* «Три прохода»: медленно без текста → по репликам с текстом и переводом,
       * с паузой для повторения → в обычном темпе. */
      var PASSES = [
        { title: 'Проход 1 из 3: медленно, без текста', hint: 'Постарайтесь понять общий смысл: кто говорит, где и о чём договорились.', slow: true, transcript: false, translation: false, gap: 700 },
        { title: 'Проход 2 из 3: по репликам, с текстом и переводом', hint: 'Следите за текстом. После каждой реплики — пауза: повторите её вслух.', slow: true, transcript: true, translation: true, gap: 2600 },
        { title: 'Проход 3 из 3: в обычном темпе', hint: 'Слушайте в обычном темпе. Скройте текст, если хотите проверить себя.', slow: false, transcript: true, translation: false, gap: 350 }
      ];
      function stopSeq() { if (ui.seq) { ui.seq.cancel(); ui.seq = null; } ui.playing = -1; }
      function playLines(opts, onDone) {
        stopSeq();
        ui.seq = SM.audio.playSequence(d.lines.map(function (l) { return { text: l.sr, audio: l.audio }; }), {
          slow: opts.slow, gap: opts.gap,
          onItem: function (i) { ui.playing = i; highlight(); },
          onDone: function () { ui.seq = null; ui.playing = -1; if (onDone) onDone(); draw(); }
        });
        draw();
      }
      function startPass(n) {
        stopSeq();
        ui.pass = n; ui.passDone = false;
        var p = PASSES[n - 1];
        ui.transcript = p.transcript; ui.translation = p.translation;
        playLines(p, function () { ui.passDone = true; });
      }
      function passPanel() {
        var p = PASSES[ui.pass - 1];
        var acts = h('div.actions');
        acts.appendChild(h('button.btn' + (ui.passDone ? '.ghost' : '.primary'), { type: 'button', on: { click: function () {
          if (ui.seq) { stopSeq(); draw(); } else startPass(ui.pass);
        } } }, SM.ui.icon(ui.seq ? 'stop' : 'play'), ui.seq ? 'Остановить' : (ui.passDone ? 'Ещё раз' : 'Слушать')));
        if (ui.pass < 3) acts.appendChild(h('button.btn' + (ui.passDone ? '.primary' : '.ghost'), { type: 'button', on: { click: function () { startPass(ui.pass + 1); } } }, 'Проход ' + (ui.pass + 1) + ' →'));
        else if (ui.passDone) acts.appendChild(h('button.btn.primary', { type: 'button', on: { click: function () { ui.pass = 0; practice(); } } }, 'К заданиям'));
        acts.appendChild(h('button.btn.ghost', { type: 'button', on: { click: function () { stopSeq(); ui.pass = 0; draw(); } } }, 'Выйти из режима'));
        var steps = h('div.pass-steps', PASSES.map(function (_, i) { return h('span.pass-dot' + (i + 1 < ui.pass || (i + 1 === ui.pass && ui.passDone) ? '.done' : i + 1 === ui.pass ? '.now' : ''), String(i + 1)); }));
        return h('div.card.pass-panel', { role: 'region', 'aria-label': 'Режим «Три прохода»' }, steps, h('h3', p.title), h('p.small', p.hint),
          ui.pass === 3 && ui.passDone ? h('p.small', h('strong', 'Готово! '), 'Вы прослушали диалог трижды. Теперь проверьте себя заданиями.') : null, acts);
      }

      function draw() {
        if (player) { player.render(); return; }
        // Голоса синтеза могут появиться позже первой отрисовки.
        if (audioOk() !== hasAudio) { hasAudio = audioOk(); ui.transcript = !hasAudio; }
        SM.ui.clear(box);
        box.appendChild(h('a.btn-link', { href: '#/dialogues' }, SM.ui.icon('back'), 'Все диалоги'));
        box.appendChild(h('h1', sr(d.title), h('span.title-ru', d.ru)));
        box.appendChild(rich(d.context, 'p', 'ex-ctx'));
        var controls = h('div.dlg-controls');
        if (hasAudio && !ui.pass) {
          controls.appendChild(h('button.btn.primary', { type: 'button', title: 'Медленно без текста → с текстом и переводом → в обычном темпе', on: { click: function () { startPass(1); } } }, SM.ui.icon('listen'), 'Три прохода'));
          controls.appendChild(h('button.btn.ghost', { type: 'button', on: { click: function () {
            if (ui.seq) { stopSeq(); draw(); return; }
            playLines({ slow: false });
          } } }, SM.ui.icon(ui.seq ? 'stop' : 'play'), ui.seq ? 'Остановить' : 'Слушать весь диалог'));
        }
        if (hasAudio) controls.appendChild(h('button.btn.ghost', { type: 'button', 'aria-pressed': String(ui.transcript), on: { click: function () { ui.transcript = !ui.transcript; draw(); } } }, SM.ui.icon('eye'), ui.transcript ? 'Скрыть текст' : 'Показать текст'));
        controls.appendChild(h('button.btn.ghost', { type: 'button', 'aria-pressed': String(ui.translation), on: { click: function () { ui.translation = !ui.translation; draw(); } } }, ui.translation ? 'Скрыть перевод' : 'Показать перевод'));
        box.appendChild(controls);
        if (ui.pass) box.appendChild(passPanel());
        if (hasAudio) box.appendChild(SM.ui.synthNote(d.lines.map(function (l) { return l.sr; })));
        else box.appendChild(h('p.note.warn', 'В этом браузере нет армянского голоса, поэтому диалог доступен только как текст. Когда в приложение будут добавлены записи, он зазвучит.'));
        if (hasAudio && !ui.transcript && !ui.pass) box.appendChild(h('p.muted.small', 'Сначала попробуйте послушать без текста. Транскрипт можно открыть в любой момент.'));

        var list = h('ol.dlg-lines');
        d.lines.forEach(function (line, i) {
          var li = h('li.dlg-line.side-' + (line.s === Object.keys(d.speakers)[0] ? 'a' : 'b') + (ui.playing === i ? '.playing' : ''), { 'data-i': String(i) },
            h('span.speaker', SM.translit.render(d.speakers[line.s], st().settings.script)),
            h('div.line-body',
              ui.transcript ? sr(line.sr, { cls: 'line-sr' }) : h('span.line-hidden', 'Реплика ' + (i + 1)),
              ui.translation ? h('span.line-ru', line.ru) : null),
            SM.ui.audioButtons(line.sr, { audio: line.audio }));
          list.appendChild(li);
        });
        box.appendChild(list);
        if (d.notes) box.appendChild(h('div.card.soft', h('h3', 'Пояснения'), h('ul', d.notes.map(function (n) { return h('li', rich(n)); }))));
        box.appendChild(h('div.card.soft', h('h3', 'Слова из диалога'), h('ul.word-chips', d.items.map(function (id) {
          var v = SM.content.vocabById[id]; return h('li', h('a', { href: '#/word/' + id }, sr(v.sr)), ' — ', v.ru);
        }))));
        box.appendChild(h('div.actions', h('button.btn.primary', { type: 'button', on: { click: practice } }, 'Задания к диалогу (' + d.exercises.length + ')')));
      }
      function highlight() {
        box.querySelectorAll('.dlg-line').forEach(function (el) { el.classList.toggle('playing', Number(el.getAttribute('data-i')) === ui.playing); });
      }
      function practice() {
        stopSeq(); ui.pass = 0;
        SM.store.update(function (s) { d.items.forEach(function (id) { SM.srs.introduce(s, id, ['recognition', 'recall']); }); });
        document.body.classList.add('focus-mode');
        SM.ui.clear(box);
        player = SM.ui.player.create({
          steps: d.exercises.map(function (e) { return Object.assign({ t: 'ex' }, e); }), source: 'dialogue', lessonId: d.id,
          summaryTitle: 'Задания к диалогу выполнены',
          onExit: function () { player = null; document.body.classList.remove('focus-mode'); draw(); },
          onFinish: function () { SM.store.update(function (s) { s.lessons[d.id] = { status: 'done', best: player.score(), attempts: ((s.lessons[d.id] || {}).attempts || 0) + 1, completedAt: Date.now() }; }); },
          finishActions: [
            { label: 'Вернуться к диалогу', primary: true, onClick: function () { player = null; document.body.classList.remove('focus-mode'); draw(); } },
            { label: 'На главную', onClick: function () { SM.app.go('home'); } }
          ]
        });
        box.appendChild(player.el);
      }
      draw();
      return { rerender: draw, destroy: function () { if (ui.seq) ui.seq.cancel(); document.body.classList.remove('focus-mode'); } };
    }
  };
})(window.SM = window.SM || {});
