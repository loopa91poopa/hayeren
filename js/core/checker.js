/* Проверка ответов. Отдельная логика для каждого режима:
 *  text      — ввод: допустимые варианты, нормализация регистра/пробелов/пунктуации
 *  exact     — ввод: точное совпадение (с учётом регистра и знаков)
 *  choice    — выбранный вариант
 *  order     — последовательность фрагментов
 *  match     — пары
 *  keywords  — короткий текст: наличие обязательных элементов (не оценка качества!)
 * Похожие буквы никогда не приравниваются молча: տ ≠ թ, կ ≠ ք, ր ≠ ռ. Такая ошибка
 * даёт вердикт near с объяснением. Ответ русскими или латинскими буквами засчитывается,
 * кроме заданий strict, где проверяется именно написание армянскими буквами. */
(function (SM) {
  'use strict';
  var T = SM.translit;

  function basic(s) {
    return String(s || '').normalize('NFC')
      .replace(/[՞՛՜]/g, '')          // вопросительный и другие знаки стоят внутри слова
      .replace(/[’‘`´]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalize(s, opts) {
    opts = opts || {};
    var r = basic(s);
    if (!opts.caseSensitive) r = r.toLowerCase();
    if (opts.ignorePunct !== false) {
      r = r.replace(/[։՝.,!?;:"«»„“”()…]/g, ' ').replace(/\s[-–—]\s/g, ' ');
      r = r.replace(/\s+/g, ' ').trim();
    }
    // և можно набрать двумя буквами: եւ, а отдельное слово — и как եվ.
    return r.replace(/եւ/g, 'և').replace(/(^| )եվ(?= |$)/g, '$1և');
  }

  /* Пары букв, которые легко спутать: одна группа — один «условный» знак. */
  var FOLD = { 'թ': 'տ', 'փ': 'պ', 'ք': 'կ', 'ց': 'ծ', 'չ': 'ճ', 'ռ': 'ր', 'է': 'ե', 'օ': 'ո', 'ը': '', 'ղ': 'խ', 'ձ': 'ծ', 'ջ': 'ճ' };
  function stripDiacritics(s) {
    return s.split('').map(function (c) { return FOLD[c] !== undefined ? FOLD[c] : c; }).join('');
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length, prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  /* Какие буквы эталона заменены похожими (для объяснения). */
  function diacriticDiff(given, expected) {
    var out = [];
    for (var i = 0; i < Math.min(given.length, expected.length); i++) {
      if (given[i] !== expected[i] && out.indexOf(given[i] + ' → ' + expected[i]) === -1) out.push(given[i] + ' → ' + expected[i]);
    }
    return out;
  }

  function checkText(input, accepted, opts) {
    opts = opts || {};
    var norm = opts.mode === 'exact'
      ? function (s) { return basic(s); }
      : function (s) { return normalize(s, opts); };
    var given = norm(input);
    if (!given) return { verdict: 'empty', correct: false };
    var list = accepted.map(function (a) { return { raw: a, n: norm(a) }; });

    for (var i = 0; i < list.length; i++) {
      if (list[i].n === given) return { verdict: 'correct', correct: true, matched: list[i].raw };
    }
    var result = { verdict: 'wrong', correct: false, expected: accepted[0] };

    // Ответ без армянских букв: сравниваем по звучанию.
    if (!T.hasArmenian(input)) {
      var key = T.looseKey(input);
      for (i = 0; i < list.length; i++) {
        if (T.looseKey(list[i].raw) === key) {
          if (opts.strict) { result.verdict = 'near'; result.issue = 'need-armenian'; result.expected = list[i].raw; return result; }
          return { verdict: 'correct', correct: true, matched: list[i].raw, viaTranslit: true };
        }
      }
      return result;
    }
    for (i = 0; i < list.length; i++) {
      var e = list[i].n;
      if (stripDiacritics(e) === stripDiacritics(given)) {
        result.verdict = 'near';
        result.issue = 'diacritics';
        result.letters = e.length === given.length ? diacriticDiff(given, e) : [];
        result.expected = list[i].raw;
        return result;
      }
    }
    for (i = 0; i < list.length; i++) {
      var exp = list[i].n;
      if (exp.length >= 5 && levenshtein(exp, given) === 1) {
        result.verdict = 'near'; result.issue = result.issue || 'typo'; result.expected = list[i].raw;
        return result;
      }
    }
    return result;
  }

  function checkChoice(selected, correctIndex) {
    var ok = selected === correctIndex;
    return { verdict: ok ? 'correct' : 'wrong', correct: ok };
  }

  function checkOrder(tokens, acceptedOrders) {
    var given = normalize(tokens.join(' '));
    for (var i = 0; i < acceptedOrders.length; i++) {
      var exp = acceptedOrders[i];
      if (normalize(Array.isArray(exp) ? exp.join(' ') : exp) === given) {
        return { verdict: 'correct', correct: true, matched: exp };
      }
    }
    return { verdict: 'wrong', correct: false, expected: acceptedOrders[0] };
  }

  /* pairs: {leftId: rightId}; solution: {leftId: rightId} */
  function checkMatch(pairs, solution) {
    var keys = Object.keys(solution), wrong = [];
    keys.forEach(function (k) { if (pairs[k] !== solution[k]) wrong.push(k); });
    return { verdict: wrong.length ? 'wrong' : 'correct', correct: !wrong.length, wrong: wrong };
  }

  /* groups: [[вариант1, вариант2], ...] — каждый элемент должен встретиться в тексте
   * в одной из форм. Это проверка выполнения задачи, а не оценка текста. */
  function checkKeywords(input, groups, minGroups) {
    var armenian = T.hasArmenian(input);
    var given = ' ' + (armenian ? normalize(input) : T.looseKey(input)) + ' ';
    var found = [], missing = [];
    groups.forEach(function (g, idx) {
      var hit = g.some(function (v) { return given.indexOf(armenian ? normalize(v) : T.looseKey(v)) !== -1; });
      (hit ? found : missing).push(idx);
    });
    var need = minGroups || groups.length;
    var words = normalize(input).split(' ').filter(Boolean).length;
    var ok = found.length >= need;
    return { verdict: ok ? 'correct' : (found.length ? 'partial' : 'wrong'), correct: ok, found: found, missing: missing, words: words };
  }

  function check(spec, answer) {
    switch (spec.mode) {
      case 'choice': return checkChoice(answer, spec.correct);
      case 'order': return checkOrder(answer, spec.accepted);
      case 'match': return checkMatch(answer, spec.solution);
      case 'keywords': return checkKeywords(answer, spec.groups, spec.minGroups);
      case 'exact': return checkText(answer, spec.accepted, { mode: 'exact' });
      default: return checkText(answer, spec.accepted, spec.options);
    }
  }

  SM.checker = {
    check: check, normalize: normalize, stripDiacritics: stripDiacritics,
    checkText: checkText, checkOrder: checkOrder, checkChoice: checkChoice,
    checkMatch: checkMatch, checkKeywords: checkKeywords, levenshtein: levenshtein
  };
})(window.SM = window.SM || {});
