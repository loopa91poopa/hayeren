/* Интервальное повторение.
 * Каждый учебный элемент (слово, выражение, конструкция) имеет несколько «граней»:
 *   recognition — узнать значение;     recall  — вспомнить самостоятельно;
 *   listening   — понять на слух;      context — употребить в предложении;
 *   readCyr — прочитать армянскими буквами, без транскрипции.
 * Грани повторяются независимо: знать слово при чтении ≠ узнавать его на слух.
 *
 * Исходы ответа:
 *   independent — сам, без подсказки;   hinted — с подсказкой (частичный успех);
 *   forgot      — «Не помню»;           wrong  — ошибка.
 * Алгоритм вынесен в SM.srs.algorithm — его можно заменить (например, на FSRS),
 * не трогая остальной код. */
(function (SM) {
  'use strict';

  var DAY = 86400000;
  var FACETS = ['recognition', 'recall', 'listening', 'context', 'readCyr', 'readLat'];
  var FACET_LABELS = {
    recognition: 'узнавание значения', recall: 'самостоятельное воспроизведение',
    listening: 'понимание на слух', context: 'употребление в контексте',
    readCyr: 'чтение без транскрипции', readLat: 'чтение транскрипции'
  };

  function dayKey(t) {
    var d = new Date(t);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function newCard(itemId, facet, now) {
    return {
      item: itemId, facet: facet, interval: 0, ease: 2.3, due: now,
      reps: 0, hinted: 0, forgot: 0, wrong: 0, streak: 0, priority: 0,
      successDays: [], lastSeen: null, created: now, log: []
    };
  }

  /* Простой прозрачный алгоритм в духе SM-2 с поправками на подсказки и «Не помню». */
  var simpleAlgorithm = {
    name: 'simple-adaptive-v1',
    update: function (c, outcome, ctx) {
      var now = ctx.now;
      // Ответ выбором из вариантов мог быть угадан — интервал растёт медленнее.
      var guessFactor = ctx.recognitionOnly ? 0.7 : 1;
      switch (outcome) {
        case 'independent':
          c.reps++; c.streak++;
          if (c.interval < 1) c.interval = 1;
          else if (c.interval < 3) c.interval = 3;
          else c.interval = Math.round(c.interval * c.ease * guessFactor);
          if (ctx.recognitionOnly) c.interval = Math.max(1, Math.min(c.interval, 4 * Math.pow(2, c.reps - 1)));
          c.ease = Math.min(2.8, c.ease + 0.08);
          c.priority = Math.max(0, c.priority - 1);
          var dk = dayKey(now);
          if (c.successDays.indexOf(dk) === -1) c.successDays.push(dk);
          if (c.successDays.length > 10) c.successDays = c.successDays.slice(-10);
          c.due = now + c.interval * DAY;
          break;
        case 'hinted':
          c.hinted++;
          c.interval = c.interval < 1 ? 1 : Math.max(1, Math.round(c.interval * 1.2));
          c.ease = Math.max(1.3, c.ease - 0.05);
          c.priority = Math.max(c.priority, 1);
          c.due = now + c.interval * DAY;
          break;
        case 'wrong':
          c.wrong++; c.streak = 0; c.interval = 0;
          c.ease = Math.max(1.3, c.ease - 0.2);
          c.priority = 2;
          // Сразу попадает в список повторения; внутри одной сессии разнос
          // повторов обеспечивает очередь упражнений (не подряд).
          c.due = now;
          break;
        case 'forgot':
          c.forgot++; c.streak = 0; c.interval = 0;
          c.ease = Math.max(1.3, c.ease - 0.2);
          c.priority = 3;
          c.due = now;
          break;
      }
      return c;
    }
  };

  function key(itemId, facet) { return itemId + '|' + facet; }

  function record(state, itemId, facet, outcome, opts) {
    opts = opts || {};
    var now = opts.now || Date.now();
    var k = key(itemId, facet);
    var c = state.srs[k] || (state.srs[k] = newCard(itemId, facet, now));
    SM.srs.algorithm.update(c, outcome, { now: now, recognitionOnly: !!opts.recognitionOnly });
    c.lastSeen = now;
    c.log.push({ t: now, o: outcome, ex: opts.exType || null });
    if (c.log.length > 25) c.log = c.log.slice(-25);
    if (!state.items[itemId]) state.items[itemId] = { firstSeen: now };
    return c;
  }

  /* Ввести элемент в систему (после первого знакомства в уроке): грани получают
   * срок «сегодня‑завтра», чтобы элемент вернулся в другом контексте. */
  function introduce(state, itemId, facets, now) {
    now = now || Date.now();
    if (!state.items[itemId]) state.items[itemId] = { firstSeen: now };
    (facets || ['recognition', 'recall']).forEach(function (f) {
      var k = key(itemId, f);
      if (!state.srs[k]) {
        var c = newCard(itemId, f, now);
        c.due = now + 8 * 3600000; // вернуть через несколько часов
        state.srs[k] = c;
      }
    });
  }

  function dueCards(state, now) {
    now = now || Date.now();
    // Без армянского голоса задания на слух невозможны — не копим их в долг.
    var noAudio = SM.audio && !SM.audio.hasVoice();
    return Object.keys(state.srs).map(function (k) { return state.srs[k]; })
      .filter(function (c) {
        if (c.due > now) return false;
        if (noAudio && c.facet === 'listening') return false;
        // Чтение в конкретной письменности повторяем отдельно, только если с ним трудности.
        if ((c.facet === 'readCyr' || c.facet === 'readLat') && c.priority < 2) return false;
        return true;
      })
      .sort(function (a, b) {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.due - b.due;
      });
  }

  function cardsOf(state, itemId) {
    return FACETS.map(function (f) { return state.srs[key(itemId, f)]; }).filter(Boolean);
  }

  /* Статус освоения элемента. «Уверенно» требует самостоятельного воспроизведения
   * минимум 3 раза в разные дни, а не одного удачного выбора из вариантов. */
  function itemStatus(state, itemId) {
    var cards = cardsOf(state, itemId);
    if (!cards.length) return 'new';
    var recall = state.srs[key(itemId, 'recall')];
    var recog = state.srs[key(itemId, 'recognition')];
    var trouble = cards.some(function (c) { return c.priority >= 2; });
    if (trouble) return 'difficult';
    if (recall && recall.reps >= 3 && recall.successDays.length >= 2 && recall.interval >= 6) return 'confident';
    if (recall && recall.reps >= 1) return 'familiar';
    if (recog && recog.reps >= 1) return 'recognized';
    return 'learning';
  }

  var STATUS_LABELS = {
    'new': 'ещё не встречалось', learning: 'изучается', recognized: 'узнаётся',
    familiar: 'вспоминается', confident: 'уверенно', difficult: 'требует повторения'
  };

  SM.srs = {
    FACETS: FACETS, FACET_LABELS: FACET_LABELS, STATUS_LABELS: STATUS_LABELS,
    algorithm: simpleAlgorithm,
    key: key, record: record, introduce: introduce, dueCards: dueCards,
    cardsOf: cardsOf, itemStatus: itemStatus, dayKey: dayKey, DAY: DAY
  };
})(window.SM = window.SM || {});
