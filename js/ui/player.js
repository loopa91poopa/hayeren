/* Проигрыватель учебной сессии: один шаг (объяснение, карточка слова или
 * упражнение) на экране. Используется уроками, повторением и диалогами.
 *
 * Исходы ответа (передаются в прогресс и SRS):
 *   independent — сам и без подсказок; hinted — с подсказками (частичный успех);
 *   forgot — «Не помню» или показан полный ответ; wrong — ошибка. */
(function (SM) {
  'use strict';
  var h = SM.ui.h, sr = SM.ui.sr, rich = SM.ui.rich, T = SM.texts;

  var CHOICE_TYPES = ['choice', 'read_choice', 'listen_choice', 'dialogue'];
  var TEXT_TYPES = ['type', 'cloze', 'fix', 'transform', 'listen_type'];

  function script() { return SM.store.get().settings.script; }
  function phrase(key) { return SM.ui.pickPhrase(T.mascot[key], key); }
  function vocab(id) { return SM.content.vocabById[id]; }

  /* Разворачиваем шаги: карточки intro — по одной на экран. */
  function expand(steps) {
    var out = [];
    steps.forEach(function (s) {
      if (s.t === 'intro') s.items.forEach(function (id, i) { out.push({ t: 'card', item: id, n: i + 1, of: s.items.length }); });
      else if (s.t === 'ex' || !s.t) out.push(Object.assign({ t: 'ex' }, s));
      else out.push(s);
    });
    return out;
  }

  /* Подсказки: из данных упражнения + автоматические опоры из ответа. */
  function hintLadder(ex) {
    var given = (ex.hints || []).map(function (x) { return { kind: 'text', text: x }; });
    if (TEXT_TYPES.indexOf(ex.type) !== -1) {
      var ans = ex.accept[0];
      if (given.length < 2) given.push({ kind: 'text', text: 'Начало ответа: {{' + firstLetters(ans) + '}}' });
      given.push({ kind: 'text', text: 'Часть ответа: {{' + maskHalf(ans) + '}}' });
      given.push({ kind: 'full', text: 'Полный ответ: {{' + ans + '}}' });
    } else if (CHOICE_TYPES.indexOf(ex.type) !== -1) {
      if (ex.type === 'listen_choice' && !ex._noAudio) given = [{ kind: 'slow', text: 'Прослушай медленнее — кнопка «0.65×».' }, { kind: 'transcript', text: 'Транскрипт:' }].concat(given);
      if (ex.options.length > 2) given.push({ kind: 'eliminate', text: 'Один неверный вариант убран.' });
    } else if (ex.type === 'order') {
      given.push({ kind: 'order1', text: 'Первое слово поставлено.' });
      given.push({ kind: 'order2', text: 'Первые два слова поставлены.' });
    } else if (ex.type === 'write') {
      given.push({ kind: 'text', text: 'Образец начала: {{' + ex.model.split(' ').slice(0, 3).join(' ') + '…}}' });
    }
    return given;
  }
  function firstLetters(s) {
    return s.split(' ').map(function (w) { return w.length > 2 ? w.slice(0, 1) + '…' : w; }).join(' ');
  }
  function maskHalf(s) {
    return s.split(' ').map(function (w) {
      var k = Math.ceil(w.length / 2);
      return w.slice(0, k) + w.slice(k).replace(/[^\s,.!?]/g, '·');
    }).join(' ');
  }

  function create(opts) {
    var steps = expand(opts.steps);
    var st = {
      i: 0, steps: steps,
      stats: { total: 0, independent: 0, hinted: 0, forgot: 0, wrong: 0 },
      retried: {}, lastExplain: null, wrongStreak: 0,
      missed: [], finished: false,
      examAns: {}   // режим экзамена: id задания → {ex, score, outcome}
    };
    var root = h('div.player');

    function cur() { return st.steps[st.i]; }
    function stepState(s) { if (!s._st) s._st = { hints: 0, value: '', tokens: null, selected: null, checked: false, near: false, eliminated: [], transcript: false, matched: {}, matchErrors: {}, sel: null }; return s._st; }

    function record(ex, outcome, extra) {
      extra = extra || {};
      var s = stepState(ex);
      var items = (ex.items || []).map(function (p) {
        var facet = p[1];
        if (ex._noAudio && facet === 'listening') facet = 'recognition';
        return { id: p[0], facet: facet };
      });
      if (extra.items) items = extra.items;
      // Повтор в той же сессии идёт сразу после показа ответа — это ещё не
      // самостоятельное воспроизведение, поэтому для SRS он считается «с опорой».
      var srsOutcome = ex._retry && outcome === 'independent' ? 'hinted' : outcome;
      var skills = (ex.skills || []).slice();
      if (ex._noAudio) skills = skills.map(function (k) { return k === 'listening' ? 'reading' : k; });
      SM.store.update(function (state) {
        SM.progress.recordAnswer(state, {
          exId: ex.id, type: ex.type, skills: skills, items: items, outcome: srsOutcome, hints: s.hints,
          errorTag: ex.tag, source: opts.source, lessonId: opts.lessonId, transcriptOpened: s.transcript,
          recognitionOnly: CHOICE_TYPES.indexOf(ex.type) !== -1 || ex.type === 'match'
        });
      });
      // Результат урока считается по его собственным заданиям (без разминки и повторов).
      if (!ex._retry && !ex._noStats && !ex.warmup) {
        st.stats.total++; st.stats[outcome]++;
      }
      if (outcome === 'wrong' || outcome === 'forgot') {
        st.wrongStreak++;
        (ex.items || []).forEach(function (p) { if (st.missed.indexOf(p[0]) === -1) st.missed.push(p[0]); });
        // Вернуть задание позже в этой же сессии (не подряд, не больше одного раза).
        // Разминка не дублируется в уроке: её элементы и так вернутся в повторении.
        if (opts.requeue !== false && !ex.warmup && !st.retried[ex.id] && ex.type !== 'write' && ex.type !== 'match') {
          st.retried[ex.id] = true;
          var copy = Object.assign({}, ex, { _retry: true, _st: null });
          var pos = Math.min(st.steps.length, st.i + 4);
          st.steps.splice(pos, 0, copy);
        }
      } else if (outcome === 'independent') st.wrongStreak = 0;
    }

    function render() {
      SM.ui.clear(root);
      if (st.finished) { root.appendChild(renderSummary()); return; }
      var s = cur();
      root.appendChild(renderHeader());
      var body;
      if (s.t === 'explain') { st.lastExplain = s; st.wrongStreak = 0; body = renderExplain(s); }
      else if (s.t === 'card') body = renderCard(s);
      else body = renderExercise(s);
      root.appendChild(body);
      // Фокус переносим только при смене состояния шага, а не при каждом клике.
      var ss = s._st || {};
      var key = st.i + ':' + (ss.checked ? 'c' : 'u') + (ss.near ? 'n' : '') + (ss.focusCheck ? 'k' + ss.selected : '');
      if (key !== st.focusKey) {
        st.focusKey = key;
        var focusable = ss.focusCheck && !ss.checked ? root.querySelector('[data-check]') : root.querySelector('[data-autofocus]');
        if (focusable) setTimeout(function () { try { focusable.focus({ preventScroll: true }); } catch (e) { focusable.focus(); } }, 30);
      }
    }

    function renderHeader() {
      var pct = Math.round((st.i / st.steps.length) * 100);
      return h('div.player-head',
        h('button.btn-icon', { type: 'button', 'aria-label': 'Выйти из занятия', title: 'Выйти (прогресс сохранится)', on: { click: function () { SM.audio.stop(); opts.onExit && opts.onExit(); } } }, SM.ui.icon('close')),
        h('button.btn-icon', { type: 'button', 'aria-label': 'Предыдущий шаг', title: 'Назад', disabled: st.i === 0, on: { click: prev } }, SM.ui.icon('back')),
        h('div.pbar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': 'Прогресс занятия' }, h('div.pbar-fill', { style: 'width:' + pct + '%' })),
        h('span.pcount', (st.i + 1) + ' / ' + st.steps.length));
    }

    /* Назад к предыдущему шагу: объяснение и карточки можно перечитать; уже проверенное
     * задание показывается с разбором (менять ответ после показа правильного нельзя),
     * а непроверенное можно доделать. */
    function prev() {
      if (st.i === 0) return;
      SM.audio.stop();
      st.i--;
      render();
      window.scrollTo(0, 0);
    }

    function next() {
      SM.audio.stop();
      st.i++;
      st.maxI = Math.max(st.maxI || 0, st.i);
      if (st.i >= st.steps.length) {
        st.finished = true;
        // Экзамен: итоги показывает экран экзамена, а не проигрыватель.
        if (opts.exam) { if (opts.onExamDone) opts.onExamDone(st.examAns); return; }
        if (opts.onFinish) opts.onFinish(st.stats, st);
      }
      render();
      window.scrollTo(0, 0);
    }

    // ── Объяснение ──────────────────────────────────────────────────────
    function explainBody(s) {
      var box = h('div.explain');
      if (s.title) box.appendChild(rich(s.title, 'h2'));
      if (s.body) box.appendChild(rich(s.body, 'p'));
      if (s.table) {
        var tbl = h('table.gtable');
        s.table.forEach(function (row, ri) {
          var tr = h('tr');
          row.forEach(function (cell) { tr.appendChild(h(ri === 0 && (s.table[0][0] === '' || s.rawTable) ? 'th' : 'td', s.rawTable ? cell : sr(cell))); });
          tbl.appendChild(tr);
        });
        box.appendChild(h('div.table-wrap', tbl));
      }
      if (s.examples) {
        box.appendChild(h('ul.examples', s.examples.map(function (e) {
          return h('li', h('span.ex-sr', sr(e.sr), SM.ui.audioButtons(e.sr, { slow: false })), h('span.ex-ru', e.ru));
        })));
      }
      if (s.contrast) box.appendChild(h('div.note', h('strong', 'Обратите внимание. '), rich(s.contrast)));
      if (s.mistakes) box.appendChild(h('div.note.warn', h('strong', 'Типичная ошибка. '), s.mistakes.map(function (m) { return rich(m); })));
      return box;
    }
    function renderExplain(s) {
      if (s.items) {
        SM.store.update(function (state) { s.items.forEach(function (id) { SM.srs.introduce(state, id, ['recognition', 'context']); }); });
      }
      return h('div.step',
        SM.ui.mascot('explain', null, { small: true }),
        explainBody(s),
        h('div.actions', h('button.btn.primary', { type: 'button', 'data-autofocus': '1', on: { click: next } }, 'Понятно, дальше')));
    }

    // ── Карточка нового слова ──────────────────────────────────────────
    function renderCard(s) {
      var v = vocab(s.item);
      SM.store.update(function (state) {
        var facets = ['recognition', 'recall'];
        if (SM.audio.hasVoice() && v.kind !== 'letter') facets.push('listening');
        if (v.ex && v.ex.some(function (e) { return e.gap; })) facets.push('context');
        SM.srs.introduce(state, v.id, facets);
      });
      var other = script() === 'cyr' ? 'lat' : 'cyr';
      var card = h('div.word-card',
        h('p.card-count', 'Новое: ' + s.n + ' из ' + s.of),
        h('div.word-main', sr(v.sr, { cls: 'word-big' }), SM.ui.audioButtons(v.sr)),
        script() !== 'both' ? h('p.word-other', sr(v.sr, { script: other }), h('span.muted', other === 'lat' ? ' транскрипция' : ' армянскими буквами')) : null,
        h('p.word-ru', v.ru),
        v.gram ? h('p.word-gram', SM.ui.gram(v.gram)) : null,
        v.reg && SM.content.REG[v.reg] ? h('span.tag', SM.content.REG[v.reg]) : null,
        v.ex && v.ex[0] ? h('div.word-ex', sr(v.ex[0].sr), SM.ui.audioButtons(v.ex[0].sr, { slow: false }), h('span.ex-ru', v.ex[0].ru)) : null,
        v.note ? h('p.word-note', rich(v.note)) : null);
      return h('div.step', card, h('div.actions', h('button.btn.primary', { type: 'button', 'data-autofocus': '1', on: { click: next } }, 'Дальше')));
    }

    // ── Упражнение ─────────────────────────────────────────────────────
    function renderExercise(ex) {
      var s = stepState(ex);
      var needsAudio = ex.type === 'listen_choice' || ex.type === 'listen_type';
      // Решение фиксируется при первом показе задания, чтобы оно не менялось посреди ответа.
      if (ex._noAudio === undefined) ex._noAudio = needsAudio && !SM.audio.canPlay({ text: ex.sr, audio: ex.audio });
      if (ex.type === 'listen_type' && ex._noAudio) {
        if (opts.exam) delete st.examAns[ex.id];
        // Диктант без звука превратился бы в переписывание — пропускаем честно, без записи результата.
        return h('div.step.exercise',
          h('h2.ex-prompt', 'Диктант пропущен'),
          h('p.note.warn', 'Это задание на слух, а в браузере нет армянского голоса. Оно не засчитывается и не влияет на прогресс.'),
          h('div.actions', h('button.btn.primary', { type: 'button', 'data-autofocus': '1', on: { click: next } }, 'Дальше')));
      }
      var wrap = h('div.step.exercise', { 'data-type': ex.type });
      if (ex.warmup) wrap.appendChild(h('p.badge', 'Разминка: повторение'));
      if (ex._retry) wrap.appendChild(h('p.badge', 'Ещё раз, уже спокойнее'));
      if (s.checked && !s.near && st.i < (st.maxI || 0)) wrap.appendChild(h('p.badge.info', 'Вы вернулись назад: ответ уже проверен, ниже разбор'));
      if (opts.exam && st.examAns[ex.id]) wrap.appendChild(h('p.badge.info', 'Ответ сохранён — его можно изменить'));
      wrap.appendChild(rich(ex._noAudio ? noAudioPrompt(ex) : ex.prompt, 'h2', 'ex-prompt'));
      if (ex._noAudio) wrap.appendChild(h('p.note.warn.small', 'Аудио недоступно (в браузере нет армянского голоса), поэтому фраза показана текстом. Ответ засчитается как чтение, а не как аудирование.'));
      if (ex.ctx) wrap.appendChild(rich(ex.ctx, 'p', 'ex-ctx'));
      wrap.appendChild(renderStimulus(ex, s));
      var answerArea = renderAnswer(ex, s);
      wrap.appendChild(answerArea);
      if (!opts.exam) wrap.appendChild(renderHints(ex, s));
      if (s.checked && !opts.exam) wrap.appendChild(renderFeedback(ex, s));
      wrap.appendChild(renderActions(ex, s));
      if (!opts.exam && st.wrongStreak >= 3 && !s.checked && st.lastExplain) {
        wrap.appendChild(h('div.trouble', SM.ui.mascot('support', phrase('streakTrouble'), { small: true }),
          h('button.btn.ghost', { type: 'button', on: { click: function () { openExplainDialog(); } } }, 'Открыть объяснение')));
      }
      return wrap;
    }

    function noAudioPrompt(ex) {
      var q = ex.question || ex.prompt.replace(/^Прослушайте[^.]*\.\s*/, '');
      if (q) return q;
      return ex.type === 'listen_type' ? 'Перепишите фразу.' : 'Что значит эта фраза?';
    }

    function renderStimulus(ex, s) {
      var box = h('div.stimulus');
      var sc = ex.forceScript || null;
      if (ex.type === 'listen_choice' || ex.type === 'listen_type') {
        if (ex._noAudio) { box.appendChild(sr(ex.sr, { cls: 'stim-text', tag: 'p' })); return box; }
        var btns = SM.ui.audioButtons(ex.sr, { audio: ex.audio, label: 'Слушать' });
        box.appendChild(h('div.listen-box', btns, SM.ui.synthNote(ex.sr)));
        if (s.transcript || s.checked) {
          box.appendChild(h('div.transcript', h('span.muted', 'Транскрипт: '), sr(ex.sr)));
        }
        return box;
      }
      if (ex.text) {
        box.appendChild(h('div.reading', sr(ex.text, { tag: 'p', script: sc })));
        if (ex.gloss) box.appendChild(h('p.gloss', rich('Слова: {{' + ex.gloss.split(';').map(function (g) { return g.trim(); }).join('}}; {{') + '}}')));
        if (ex.question) box.appendChild(rich(ex.question, 'p', 'question'));
        return box;
      }
      if (ex.sr) {
        var line = h('div.stim-line', sr(ex.sr, { cls: 'stim-text', script: sc }));
        if (!ex.forceScript && (ex.type === 'choice' || ex.type === 'dialogue')) { var ab = SM.ui.audioButtons(ex.sr, { slow: false }); if (ab) line.appendChild(ab); }
        box.appendChild(line);
      }
      return box;
    }

    function renderAnswer(ex, s) {
      if (CHOICE_TYPES.indexOf(ex.type) !== -1) return renderChoice(ex, s);
      if (TEXT_TYPES.indexOf(ex.type) !== -1) return renderTextInput(ex, s);
      if (ex.type === 'order') return renderOrder(ex, s);
      if (ex.type === 'match') return renderMatch(ex, s);
      if (ex.type === 'write') return renderWrite(ex, s);
      return h('p', 'Неизвестный тип задания: ' + ex.type);
    }

    // Выбор варианта
    function renderChoice(ex, s) {
      var list = h('div.options', { role: 'radiogroup', 'aria-label': 'Варианты ответа' });
      if (!s.order) s.order = ex.shuffle === false ? ex.options.map(function (_, i) { return i; }) : SM.review.shuffle(ex.options.map(function (_, i) { return i; }));
      s.order.forEach(function (oi, pos) {
        var text = ex.options[oi];
        var hidden = s.eliminated.indexOf(oi) !== -1;
        var cls = 'opt';
        if (s.checked) { if (oi === ex.correct) cls += ' correct'; else if (oi === s.selected) cls += ' wrong'; }
        else if (oi === s.selected) cls += ' selected';
        var b = h('button.' + cls.split(' ').join('.'), {
          type: 'button', role: 'radio', 'aria-checked': String(oi === s.selected), disabled: s.checked || hidden,
          'data-autofocus': pos === 0 && !s.checked ? '1' : null,
          on: { click: function () { s.selected = oi; s.focusCheck = true; render(); } }
        }, h('span.opt-key', String(pos + 1)), ex.optLang === 'sr' ? sr(text, { script: ex.forceScript }) : rich(text));
        if (hidden) b.classList.add('eliminated');
        list.appendChild(b);
      });
      return list;
    }

    // Ввод текста
    function renderTextInput(ex, s) {
      var box = h('div.answer');
      if (ex.type === 'cloze' && !ex.sr) box.appendChild(h('p', ''));
      var field = SM.ui.armenianInput({
        value: s.value, placeholder: ex.type === 'cloze' ? 'Пропущенное слово' : 'Ответ по-армянски', strict: ex.strict,
        disabled: s.checked && !s.near,
        onInput: function (v) { s.value = v; },
        onEnter: function () { doCheck(ex, s); }
      });
      if (!s.checked || s.near) field.input.setAttribute('data-autofocus', '1');
      box.appendChild(field.el);
      return box;
    }

    // Сборка предложения
    function renderOrder(ex, s) {
      if (!s.tokens) { s.pool = SM.review.shuffle(ex.tokens.map(function (t, i) { return { t: t, i: i }; })); s.tokens = []; }
      var line = h('div.order-line', { 'aria-label': 'Собранное предложение', role: 'list' });
      if (!s.tokens.length) line.appendChild(h('span.placeholder', 'Нажимайте на слова по порядку'));
      s.tokens.forEach(function (tok, k) {
        line.appendChild(h('button.chip.placed', { type: 'button', role: 'listitem', disabled: s.checked || tok.fixed, 'aria-label': 'Убрать ' + tok.t,
          on: { click: function () { s.tokens.splice(k, 1); s.pool.push(tok); render(); } } }, sr(tok.t, { script: ex.forceScript })));
      });
      var pool = h('div.order-pool');
      s.pool.forEach(function (tok, k) {
        pool.appendChild(h('button.chip', { type: 'button', disabled: s.checked, 'data-autofocus': k === 0 ? '1' : null,
          on: { click: function () { s.pool.splice(k, 1); s.tokens.push(tok); render(); } } }, sr(tok.t, { script: ex.forceScript })));
      });
      return h('div.order', line, pool);
    }

    // Соотнесение
    function renderMatch(ex, s) {
      if (!s.rightOrder) s.rightOrder = SM.review.shuffle(ex.pairs.map(function (_, i) { return i; }));
      if (!s.leftOrder) s.leftOrder = SM.review.shuffle(ex.pairs.map(function (_, i) { return i; }));
      var left = h('div.match-col'), right = h('div.match-col');
      s.leftOrder.forEach(function (i) {
        var done = s.matched[i];
        left.appendChild(h('button.match-item' + (done ? '.done' : '') + (s.sel === i ? '.selected' : ''), {
          type: 'button', disabled: done, 'aria-pressed': String(s.sel === i),
          on: { click: function () { s.sel = i; render(); } }
        }, ex.leftLang === 'ru' ? ex.pairs[i][0] : sr(ex.pairs[i][0])));
      });
      s.rightOrder.forEach(function (j) {
        var done = s.matched[j];
        var b = h('button.match-item' + (done ? '.done' : '') + (s.flash === j ? '.flash' : ''), {
          type: 'button', disabled: done || s.sel === null,
          on: { click: function () {
            if (s.sel === null) return;
            if (s.sel === j) { s.matched[j] = true; s.sel = null; s.flash = null; }
            else { s.matchErrors[s.sel] = (s.matchErrors[s.sel] || 0) + 1; s.flash = j; }
            if (Object.keys(s.matched).length === ex.pairs.length) finishMatch(ex, s);
            render();
          } }
        }, ex.rightLang === 'sr' ? sr(ex.pairs[j][1]) : ex.pairs[j][1]);
        right.appendChild(b);
      });
      return h('div.match', h('p.muted.small', 'Выберите слово слева, затем перевод справа.'), h('div.match-cols', left, right));
    }
    function finishMatch(ex, s) {
      if (opts.exam) {
        var errs = Object.keys(s.matchErrors).length;
        saveExamAnswer(ex, Math.max(0, 1 - errs / ex.pairs.length));
        return next();
      }
      s.checked = true;
      var errors = Object.keys(s.matchErrors).length;
      s.outcome = errors === 0 ? (s.hints ? 'hinted' : 'independent') : 'wrong';
      s.verdictText = errors === 0 ? 'Все пары найдены с первого раза.' : 'Все пары найдены. Ошибок по парам: ' + errors + ' — эти слова вернутся в повторении.';
      var perPair = ex.items && ex.items.length === ex.pairs.length;
      if (perPair) {
        var items = ex.items.map(function (p, i) { return { id: p[0], facet: p[1], o: s.matchErrors[i] ? 'wrong' : 'independent' }; });
        // Записываем по каждой паре отдельно.
        items.forEach(function (it) { record(Object.assign({}, ex, { items: [[it.id, it.facet]], _noStats: true }), it.o); });
        st.stats.total++; st.stats[s.outcome]++;
        if (s.outcome !== 'wrong') st.wrongStreak = 0;
      } else record(ex, s.outcome);
    }

    // Короткий текст
    function renderWrite(ex, s) {
      var field = SM.ui.armenianInput({ multiline: true, value: s.value, disabled: s.checked, placeholder: 'Напишите по-армянски…',
        onInput: function (v) { s.value = v; }, onEnter: function () { doCheck(ex, s); } });
      if (!s.checked) field.input.setAttribute('data-autofocus', '1');
      return h('div.answer', field.el, h('p.muted.small', 'Ctrl+Enter — проверить. Приложение проверяет, есть ли в тексте нужные конструкции; качество текста целиком автоматически не оценивается.'));
    }

    // ── Подсказки ──────────────────────────────────────────────────────
    function renderHints(ex, s) {
      var ladder = hintLadder(ex);
      var box = h('div.hints', { 'aria-live': 'polite' });
      ladder.slice(0, s.hints).forEach(function (hh) {
        if (hh.kind === 'transcript') box.appendChild(h('p.hint', 'Транскрипт открыт — ответ будет засчитан как понимание с опорой на текст.'));
        else box.appendChild(rich(hh.text, 'p', 'hint'));
      });
      return box;
    }
    function useHint(ex, s) {
      var ladder = hintLadder(ex);
      if (s.hints >= ladder.length) return;
      var hh = ladder[s.hints];
      s.hints++;
      if (hh.kind === 'eliminate') {
        var wrongs = ex.options.map(function (_, i) { return i; }).filter(function (i) { return i !== ex.correct && s.eliminated.indexOf(i) === -1; });
        if (wrongs.length) s.eliminated.push(wrongs[Math.floor(Math.random() * wrongs.length)]);
        if (s.eliminated.indexOf(s.selected) !== -1) s.selected = null;
      }
      if (hh.kind === 'slow') SM.audio.play({ text: ex.sr, audio: ex.audio }, { slow: true });
      if (hh.kind === 'transcript') s.transcript = true;
      if (hh.kind === 'order1' || hh.kind === 'order2') {
        var need = hh.kind === 'order1' ? 1 : 2;
        var target = ex.accept[0].split(' ');
        s.pool = s.pool.concat(s.tokens.filter(function (t) { return !t.fixed; }));
        s.tokens = s.tokens.filter(function (t) { return t.fixed; });
        for (var k = s.tokens.length; k < need; k++) {
          var idx = s.pool.findIndex(function (t) { return t.t === target[k]; });
          if (idx !== -1) { var tok = s.pool.splice(idx, 1)[0]; tok.fixed = true; s.tokens.push(tok); }
        }
      }
      render();
    }

    // ── Действия ───────────────────────────────────────────────────────
    function renderActions(ex, s) {
      var bar = h('div.actions');
      if (opts.exam) {
        // Экзамен: без подсказок и разбора; «Не знаю» — честный ответ, лучше угадывания.
        bar.appendChild(h('button.btn.ghost', { type: 'button', on: { click: function () { saveExamAnswer(ex, 0, true); next(); } } }, 'Не знаю'));
        if (ex.type !== 'match') bar.appendChild(h('button.btn.primary', { type: 'button', 'data-check': '1', disabled: !canCheck(ex, s), on: { click: function () { doCheck(ex, s); } } }, 'Ответить'));
        return bar;
      }
      if (!s.checked || s.near) {
        var ladder = hintLadder(ex);
        // Кнопка подсказки показывается, только если подсказка действительно есть.
        if (ex.type !== 'match' && ladder.length) {
          bar.appendChild(h('button.btn.ghost', { type: 'button', disabled: s.hints >= ladder.length,
            on: { click: function () { useHint(ex, s); } } }, SM.ui.icon('bulb'), s.hints >= ladder.length ? 'Подсказок больше нет' : s.hints ? 'Ещё подсказка' : 'Нужна подсказка'));
        }
        if (ex.recall || TEXT_TYPES.indexOf(ex.type) !== -1) {
          bar.appendChild(h('button.btn.ghost', { type: 'button', on: { click: function () { forgot(ex, s); } } }, 'Не помню'));
        } else if (ex.type === 'write') {
          // Свободный текст: если не получается начать, можно посмотреть образец (не засчитывается как свой ответ).
          bar.appendChild(h('button.btn.ghost', { type: 'button', on: { click: function () { forgot(ex, s); } } }, 'Показать образец'));
        }
        if (ex.type !== 'match') {
          bar.appendChild(h('button.btn.primary', { type: 'button', 'data-check': '1', disabled: !canCheck(ex, s), on: { click: function () { doCheck(ex, s); } } }, 'Проверить'));
        }
      } else {
        bar.appendChild(h('button.btn.primary', { type: 'button', 'data-autofocus': '1', on: { click: next } }, 'Дальше'));
      }
      return bar;
    }
    function canCheck(ex, s) {
      if (CHOICE_TYPES.indexOf(ex.type) !== -1) return s.selected !== null;
      if (ex.type === 'order') return s.tokens && s.tokens.length > 0;
      return true; // для текста пустой ввод обрабатывается сообщением
    }

    function forgot(ex, s) {
      s.checked = true; s.near = false; s.outcome = 'forgot'; s.forgotShown = true;
      record(ex, 'forgot');
      render();
    }

    function saveExamAnswer(ex, score, dontKnow) {
      st.examAns[ex.id] = { ex: ex, score: score, outcome: dontKnow ? 'forgot' : score >= 1 ? 'independent' : score > 0 ? 'hinted' : 'wrong' };
    }

    /* Экзамен: ответ проверяется сразу, но результат не показывается — только в итогах. */
    function examCheck(ex, s) {
      var score = 0, res;
      if (CHOICE_TYPES.indexOf(ex.type) !== -1) {
        if (s.selected === null) return;
        score = s.selected === ex.correct ? 1 : 0;
      } else if (TEXT_TYPES.indexOf(ex.type) !== -1) {
        res = SM.checker.check({ mode: 'text', accepted: ex.accept, options: { strict: ex.strict } }, s.value);
        if (res.verdict === 'empty') { SM.ui.toast('Напишите ответ или нажмите «Не знаю».'); return; }
        score = res.correct ? 1 : 0; // «почти верно» на экзамене не засчитывается
      } else if (ex.type === 'order') {
        if (!s.tokens || !s.tokens.length) return;
        score = SM.checker.check({ mode: 'order', accepted: ex.accept }, s.tokens.map(function (t) { return t.t; })).correct ? 1 : 0;
      } else if (ex.type === 'write') {
        if (!s.value.trim()) { SM.ui.toast('Напишите текст или нажмите «Не знаю».'); return; }
        res = SM.checker.check({ mode: 'keywords', groups: ex.groups, minGroups: ex.minGroups }, s.value);
        score = res.correct ? 1 : res.verdict === 'partial' ? 0.5 : 0;
      }
      saveExamAnswer(ex, score, false);
      next();
    }

    function doCheck(ex, s) {
      if (opts.exam) return examCheck(ex, s);
      if (s.checked && !s.near) return;
      var res;
      if (CHOICE_TYPES.indexOf(ex.type) !== -1) {
        if (s.selected === null) return;
        res = SM.checker.check({ mode: 'choice', correct: ex.correct }, s.selected);
      } else if (TEXT_TYPES.indexOf(ex.type) !== -1) {
        res = SM.checker.check({ mode: 'text', accepted: ex.accept, options: { strict: ex.strict } }, s.value);
        if (res.verdict === 'empty') { s.emptyWarn = true; SM.ui.toast('Сначала напишите ответ — или нажмите «Не помню».'); return; }
        if (res.verdict === 'near' && !s.near) {
          // Одна попытка исправить без штрафа, но ответ уже не «чистый».
          s.near = true; s.nearRes = res; s.checked = true; render(); return;
        }
      } else if (ex.type === 'order') {
        res = SM.checker.check({ mode: 'order', accepted: ex.accept }, s.tokens.map(function (t) { return t.t; }));
      } else if (ex.type === 'write') {
        if (!s.value.trim()) { SM.ui.toast('Сначала напишите текст.'); return; }
        res = SM.checker.check({ mode: 'keywords', groups: ex.groups, minGroups: ex.minGroups }, s.value);
      }
      var wasNear = s.near;
      s.near = false; s.checked = true; s.res = res;
      var outcome;
      if (res.correct) {
        if (s.hints >= hintLadder(ex).length && TEXT_TYPES.indexOf(ex.type) !== -1) outcome = 'forgot';
        else outcome = (s.hints || wasNear) ? 'hinted' : 'independent';
      } else if (ex.type === 'write' && res.verdict === 'partial') outcome = 'hinted';
      else outcome = 'wrong';
      s.outcome = outcome;
      record(ex, outcome);
      render();
    }

    // ── Обратная связь ─────────────────────────────────────────────────
    function renderFeedback(ex, s) {
      var box = h('div.feedback', { role: 'status', 'aria-live': 'polite' });
      if (s.near) {
        var nr = s.nearRes;
        var msg = T.near[nr.issue] || T.near.typo;
        msg = msg.replace('{{letters}}', nr.letters && nr.letters.length ? ': ' + nr.letters.join(', ') : '');
        box.classList.add('near');
        box.appendChild(SM.ui.mascot('think', msg, { small: true }));
        box.appendChild(h('p.muted.small', 'Исправьте ответ в поле и нажмите «Проверить» ещё раз.'));
        return box;
      }
      var o = s.outcome;
      box.classList.add(o);
      // Эмоции мопса: на слух — в наушниках; вспомнил сам — косточка; ошибка — поддержка с цветком.
      var isListen = (ex.type === 'listen_choice' || ex.type === 'listen_type') && !ex._noAudio;
      var mood = o === 'independent' ? (isListen ? 'listen' : ex.type === 'write' ? 'writing' : TEXT_TYPES.indexOf(ex.type) !== -1 ? 'proud' : 'joy')
        : o === 'hinted' ? 'shy' : 'support';
      var text;
      if (o === 'independent') text = TEXT_TYPES.indexOf(ex.type) !== -1 ? phrase('correctRecall') : (ex.type === 'listen_choice' && !ex._noAudio ? phrase('correctListening') : phrase('correctPlain'));
      else if (o === 'hinted') text = ex.type === 'write' ? 'Часть нужных элементов есть. Сравните с образцом ниже.' : phrase('correctHinted');
      else if (o === 'forgot') text = phrase('forgot');
      else text = phrase('wrong');
      if (s.verdictText) text = s.verdictText;
      box.appendChild(SM.ui.mascot(mood, text, { small: true }));

      // Правильный ответ с транскрипцией
      var answerText = correctAnswerText(ex, s);
      if (answerText && (o !== 'independent' || (s.res && s.res.matched && SM.checker.normalize(s.res.matched) !== SM.checker.normalize(ex.accept ? ex.accept[0] : '')))) {
        var other = script() === 'cyr' ? 'lat' : 'cyr';
        var isSr = TEXT_TYPES.indexOf(ex.type) !== -1 || ex.type === 'order' || ex.type === 'write' || ex.optLang === 'sr';
        box.appendChild(h('div.answer-show',
          h('span.muted', o === 'independent' ? 'Основной вариант: ' : ex.type === 'write' ? 'Образец: ' : 'Правильно: '),
          isSr ? sr(answerText, { cls: 'strong' }) : h('strong', answerText),
          isSr && script() !== 'both' ? h('span.muted.small', ' · ', sr(answerText, { script: other })) : null,
          isSr ? SM.ui.audioButtons(answerText, { slow: true }) : null));
      }
      if ((o === 'wrong') && TEXT_TYPES.indexOf(ex.type) !== -1 && s.value) {
        box.appendChild(h('p.small', h('span.muted', 'Ваш ответ: '), sr(s.value)));
      }
      if (ex.type === 'write' && s.res) {
        var labels = ex.groups.map(function (g) { return g[0]; });
        box.appendChild(h('p.small', 'Найдено: ', s.res.found.length ? rich(s.res.found.map(function (i) { return '{{' + labels[i] + '}}'; }).join(', ')) : 'нет',
          s.res.missing.length ? h('span', ' · Не хватает: ', rich(s.res.missing.map(function (i) { return '{{' + labels[i] + '}}'; }).join(', '))) : null));
      }
      // Перевод слова при «Не помню»
      if (o === 'forgot' || o === 'wrong') {
        (ex.items || []).slice(0, 2).forEach(function (p) {
          var v = vocab(p[0]);
          if (v && v.kind !== 'grammar') box.appendChild(h('p.small', sr(v.sr, { cls: 'strong' }), ' — ', v.ru));
        });
      }
      if (ex.explain) box.appendChild(rich(ex.explain, 'p', 'fb-explain'));
      else if (o !== 'independent') {
        var gv = (ex.items || []).map(function (p) { return vocab(p[0]); }).filter(function (v) { return v && v.note; })[0];
        if (gv) box.appendChild(rich(gv.note, 'p', 'fb-explain'));
      }
      if (o === 'wrong' || o === 'forgot') box.appendChild(h('p.muted.small', 'Это задание вернётся позже, а элемент — в повторении.'));
      if ((ex.type === 'listen_choice' || ex.type === 'listen_type') && !ex._noAudio && !s.transcript) {
        box.appendChild(h('p.muted.small', 'Транскрипт открыт после ответа — на оценку понимания на слух это не влияет.'));
      }
      return box;
    }

    function correctAnswerText(ex, s) {
      if (CHOICE_TYPES.indexOf(ex.type) !== -1) return ex.options[ex.correct];
      if (TEXT_TYPES.indexOf(ex.type) !== -1) return ex.accept[0];
      if (ex.type === 'order') return ex.accept[0];
      if (ex.type === 'write') return ex.model;
      return null;
    }

    function openExplainDialog() {
      var dlg = h('div.modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Объяснение' },
        h('div.modal-box', explainBody(st.lastExplain),
          h('div.actions', h('button.btn.primary', { type: 'button', 'data-autofocus': '1', on: { click: function () { dlg.remove(); st.wrongStreak = 0; render(); } } }, 'Вернуться к заданию'))));
      document.body.appendChild(dlg);
      dlg.querySelector('button').focus();
    }

    // ── Итог ───────────────────────────────────────────────────────────
    function renderSummary() {
      var s = st.stats;
      var score = s.total ? (s.independent + 0.5 * s.hinted) / s.total : 1;
      var box = h('div.step.summary',
        SM.ui.mascot(opts.source === 'review' ? 'joy' : 'proud', opts.source === 'review' ? phrase('reviewDone') : phrase('lessonDone')),
        h('h2', (typeof opts.summaryTitle === 'function' ? opts.summaryTitle() : opts.summaryTitle) || 'Итог'),
        s.total ? h('ul.stats',
          h('li', h('strong', String(s.independent)), ' самостоятельно'),
          h('li', h('strong', String(s.hinted)), ' с подсказкой'),
          h('li', h('strong', String(s.forgot)), ' «не помню»'),
          h('li', h('strong', String(s.wrong)), ' с ошибкой')) : null);
      if (opts.checkpoint && s.total) {
        box.appendChild(h('p', score >= SM.planner.PASS
          ? 'Проверка пройдена: ' + Math.round(score * 100) + '% ответов самостоятельно или с небольшой опорой. Это значит, что материал модуля работает в новых ситуациях — но не значит, что весь этап уже освоен.'
          : 'Результат ' + Math.round(score * 100) + '%. Стоит вернуться к урокам, где было трудно, — маршрут подскажет, к каким.'));
      }
      if (st.missed.length) {
        box.appendChild(h('div.note', h('strong', 'Вернутся в повторении: '),
          st.missed.map(function (id, i) { var v = vocab(id); return v ? h('span', i ? ', ' : '', sr(v.kind === 'grammar' ? v.ru : v.sr)) : null; })));
      }
      var acts = h('div.actions');
      (opts.finishActions || []).forEach(function (a) {
        acts.appendChild(h('button.btn' + (a.primary ? '.primary' : '.ghost'), { type: 'button', 'data-autofocus': a.primary ? '1' : null, on: { click: a.onClick } }, a.label));
      });
      box.appendChild(acts);
      return box;
    }

    render();
    return { el: root, render: render, state: st, score: function () { var s = st.stats; return s.total ? (s.independent + 0.5 * s.hinted) / s.total : 1; } };
  }

  // Клавиши 1–9 выбирают вариант ответа.
  document.addEventListener('keydown', function (e) {
    if (/^[1-9]$/.test(e.key) && !/input|textarea/i.test((document.activeElement || {}).tagName || '')) {
      var opts = document.querySelectorAll('.player .options .opt:not([disabled])');
      var all = document.querySelectorAll('.player .options .opt');
      var target = all[Number(e.key) - 1];
      if (target && !target.disabled && opts.length) target.click();
    }
  });

  SM.ui.player = { create: create, hintLadder: hintLadder, expand: expand };
})(window.SM = window.SM || {});
