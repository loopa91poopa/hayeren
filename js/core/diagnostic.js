/* Адаптивная входная диагностика.
 * Работает блоками по этапам курса: буквы, слова, предложения. В блоке 4 задания разных навыков.
 *   ≥ 3 из 4 верно → уровень подтверждён, переходим выше;
 *   ≤ 1 из 4      → уровень не подтверждён, спускаемся ниже (если ниже не проверяли);
 *   2 из 4        → ещё 2 уточняющих задания; затем нужно ≥ 4 из 6.
 * Останавливаемся, когда найдена граница «подтверждён / не подтверждён».
 * «Не знаю» считается неверным ответом — это честнее, чем угадывать. */
(function (SM) {
  'use strict';

  var LEVELS = ['Новичок', 'Буквы', 'Слова', 'Предложения'];
  var MAX = LEVELS.length - 1;
  var SKILL_ORDER = ['grammar', 'vocab', 'reading', 'listening', 'writing', 'pragmatics'];

  function bank() { return SM.content.diagnosticBank; }

  function create(startLvl, opts) {
    opts = opts || {};
    return {
      startLvl: Math.max(1, Math.min(MAX, startLvl || 1)),
      audio: !!opts.audio,
      cur: Math.max(1, Math.min(MAX, startLvl || 1)),
      blocks: {},
      answers: [],
      done: false,
      startedAt: Date.now()
    };
  }

  function itemsFor(session, lvl) {
    var pool = bank().filter(function (it) {
      return it.lvl === lvl && (session.audio || it.skill !== 'listening');
    });
    // Разнообразие навыков: сначала по одному заданию каждого навыка.
    var bySkill = {};
    pool.forEach(function (it) { (bySkill[it.skill] = bySkill[it.skill] || []).push(it); });
    var ordered = [], round = 0, added = true;
    while (added) {
      added = false;
      SKILL_ORDER.forEach(function (s) {
        var list = bySkill[s];
        if (list && list[round]) { ordered.push(list[round]); added = true; }
      });
      round++;
    }
    return ordered;
  }

  function openBlock(session, lvl) {
    var items = itemsFor(session, lvl);
    session.blocks[lvl] = { lvl: lvl, pool: items.map(function (i) { return i.id; }), asked: [], correct: 0, status: 'open', target: 4 };
    return session.blocks[lvl];
  }

  function byId(id) { return bank().filter(function (i) { return i.id === id; })[0]; }

  function topPassed(session) {
    var passed = Object.keys(session.blocks).map(function (k) { return session.blocks[k]; })
      .filter(function (b) { return b.status === 'pass' && !b.verify; }).map(function (b) { return b.lvl; });
    return passed.length ? Math.max.apply(null, passed) : 0;
  }

  function next(session) {
    if (session.done && !session.verified) {
      // Контрольный блок уровнем ниже найденного: ищем пробелы в основах,
      // если сами основы не проверялись (например, старт сразу с предложений).
      session.verified = true;
      var top = topPassed(session);
      if (top >= 2 && !session.blocks[top - 1] && session.answers.length < 14) {
        var vb = openBlock(session, top - 1);
        vb.verify = true; vb.target = 3;
        session.cur = top - 1;
        session.done = false;
      }
    }
    if (session.done) return null;
    var b = session.blocks[session.cur] || openBlock(session, session.cur);
    if (b.asked.length < Math.min(b.target, b.pool.length)) {
      return byId(b.pool[b.asked.length]);
    }
    decide(session, b);
    return next(session);
  }

  function decide(session, b) {
    var n = b.asked.length, c = b.correct;
    if (b.verify) {
      // Контрольный блок не меняет найденный уровень — только показывает пробелы.
      b.status = c === n ? 'pass' : 'checked'; b.score = n ? c / n : 0;
      session.done = true;
      return;
    }
    if (b.target === 4 && n === 4 && c === 2 && b.pool.length > 4) {
      b.target = Math.min(6, b.pool.length);
      return; // уточняющие задания
    }
    var score = n ? c / n : 0;
    var pass = b.target > 4 ? c >= 4 : score >= 0.75 || (n < 4 && score >= 0.67);
    b.status = pass ? 'pass' : 'fail';
    b.score = score;
    var L = b.lvl;
    if (pass) {
      if (L >= MAX || (session.blocks[L + 1] && session.blocks[L + 1].status === 'fail')) session.done = true;
      else session.cur = L + 1;
    } else {
      if (L <= 1 || (session.blocks[L - 1] && session.blocks[L - 1].status === 'pass')) session.done = true;
      else session.cur = L - 1;
    }
  }

  function answer(session, itemId, correct, meta) {
    var it = byId(itemId);
    var b = session.blocks[it.lvl];
    b.asked.push(itemId);
    if (correct) b.correct++;
    session.answers.push({ id: itemId, lvl: it.lvl, skill: it.skill, tag: it.tag, correct: !!correct, dontKnow: !!(meta && meta.dontKnow) });
  }

  /* Сколько всего будет заданий. Диагностика адаптивная, точное число заранее
   * неизвестно: прогоняем копию сессии с разными вариантами дальнейших ответов
   * (все верно, все неверно, через один) и берём наибольшее — оценку сверху. */
  function estimateTotal(session) {
    var patterns = [function () { return true; }, function () { return false; }, function (k) { return k % 2 === 0; }, function (k) { return k % 2 === 1; }];
    var best = session.answers.length + 1;
    patterns.forEach(function (fn) {
      var s = JSON.parse(JSON.stringify(session));
      var k = 0, item;
      while ((item = next(s)) && k < 60) { answer(s, item.id, fn(k)); k++; }
      best = Math.max(best, s.answers.length);
    });
    return best;
  }

  function progressInfo(session) {
    return { answered: session.answers.length, current: session.answers.length + 1, total: estimateTotal(session), level: LEVELS[session.cur] };
  }

  function skillEstimate(answers, skill) {
    var list = answers.filter(function (a) { return a.skill === skill; });
    if (!list.length) return null;
    var levels = list.map(function (a) { return a.lvl; }).sort(function (a, b) { return a - b; });
    var best = null;
    levels.forEach(function (L) {
      var upTo = list.filter(function (a) { return a.lvl <= L; });
      var acc = upTo.filter(function (a) { return a.correct; }).length / upTo.length;
      var hasCorrectAtL = list.some(function (a) { return a.lvl === L && a.correct; });
      if (hasCorrectAtL && acc >= 0.5) best = L;
    });
    var highestTested = levels[levels.length - 1];
    var highestItemCorrect = list.filter(function (a) { return a.lvl === highestTested; }).every(function (a) { return a.correct; });
    if (best === null) best = Math.max(0, levels[0] - 1);
    return {
      level: best, label: LEVELS[best], n: list.length,
      correct: list.filter(function (a) { return a.correct; }).length,
      atLeast: best === highestTested && highestItemCorrect && best < MAX,
      confidence: list.length <= 1 ? 'low' : list.length <= 3 ? 'medium' : 'higher'
    };
  }

  function result(session) {
    var blocks = Object.keys(session.blocks).map(function (k) { return session.blocks[k]; });
    var top = topPassed(session);
    var above = session.blocks[top + 1];
    var upper = (above && above.status === 'fail' && above.score >= 0.5) ? top + 1 : null;
    if (top === 0 && session.blocks[1] && session.blocks[1].score >= 0.4) upper = 1;

    var skills = {};
    ['reading', 'listening', 'grammar', 'vocab', 'writing', 'pragmatics'].forEach(function (s) {
      var est = skillEstimate(session.answers, s);
      if (est) skills[s] = est;
      else skills[s] = { status: 'untested', reason: s === 'listening' && !session.audio ? 'no-audio' : 'no-items' };
    });
    skills.speaking = { status: 'untested', reason: 'not-supported' };

    // Пробелы — ошибки на уровнях, которые в целом подтверждены (или этап «Буквы» у новичка);
    // ошибки уровнем выше — это темы следующего шага, а не пробелы.
    var gapTags = [], nextTags = [];
    session.answers.forEach(function (a) {
      if (a.correct) return;
      var list = a.lvl <= Math.max(top, 1) ? gapTags : a.lvl === top + 1 ? nextTags : null;
      if (list && list.indexOf(a.tag) === -1) list.push(a.tag);
    });
    var strengths = Object.keys(skills).filter(function (s) {
      var e = skills[s];
      return e.level !== undefined && e.n >= 2 && e.correct === e.n;
    });
    var lvls = blocks.map(function (b) { return b.lvl; });

    return {
      date: Date.now(),
      top: top,
      label: upper ? LEVELS[top] + '–' + LEVELS[upper] : LEVELS[top],
      upper: upper,
      skills: skills,
      gaps: gapTags,
      nextTopics: nextTags,
      strengths: strengths,
      answered: session.answers.length,
      testedRange: [LEVELS[Math.min.apply(null, lvls)], LEVELS[Math.max.apply(null, lvls)]],
      audio: session.audio,
      approximate: false,
      blocks: blocks.map(function (b) { return { lvl: b.lvl, asked: b.asked.length, correct: b.correct, status: b.status }; })
    };
  }

  /* Короткий диагностический результат, если человек начал с нуля без теста. */
  function skippedResult() {
    return { date: Date.now(), top: 0, label: 'не определён', skipped: true, skills: {}, gaps: [], strengths: [], answered: 0 };
  }

  SM.diagnostic = {
    LEVELS: LEVELS, create: create, next: next, answer: answer, result: result,
    progressInfo: progressInfo, skippedResult: skippedResult, _skillEstimate: skillEstimate
  };
})(window.SM = window.SM || {});
