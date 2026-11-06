/* Сборка упражнений для повторения из карточек SRS.
 * Для каждой грани подбирается свой тип задания, а по возможности —
 * разные контексты: генерируемые задания чередуются с упражнениями из уроков. */
(function (SM) {
  'use strict';

  function vocab(id) { return SM.content.vocabById[id]; }

  function shuffle(a, rnd) {
    a = a.slice(); rnd = rnd || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* Все упражнения уроков и диалогов, где встречается элемент. */
  var exIndex = null;
  function buildIndex() {
    exIndex = {};
    function add(ex, source) {
      (ex.items || []).forEach(function (pair) {
        (exIndex[pair[0]] = exIndex[pair[0]] || []).push({ ex: ex, source: source, facet: pair[1] });
      });
    }
    Object.keys(SM.content.lessons).forEach(function (lid) {
      SM.content.lessons[lid].steps.forEach(function (s) { if (s.t === 'ex' && s.type !== 'write' && s.type !== 'match') add(s, lid); });
    });
    SM.content.dialogues.forEach(function (d) { d.exercises.forEach(function (e) { add(e, d.id); }); });
  }
  function lessonExercisesFor(itemId) {
    if (!exIndex) buildIndex();
    return exIndex[itemId] || [];
  }

  function distractors(item, n) {
    var pool = SM.content.vocab.filter(function (v) {
      return v.id !== item.id && v.kind !== 'grammar' && v.ru !== item.ru && v.pos === item.pos;
    });
    if (pool.length < n) pool = SM.content.vocab.filter(function (v) { return v.id !== item.id && v.kind !== 'grammar' && v.ru !== item.ru; });
    var same = pool.filter(function (v) { return v.lesson === item.lesson; });
    var picked = shuffle(same).slice(0, n);
    if (picked.length < n) picked = picked.concat(shuffle(pool.filter(function (v) { return picked.indexOf(v) === -1; })).slice(0, n - picked.length));
    return picked;
  }

  function shortRu(item) { return item.ru.split(';')[0]; }

  function genRecognition(item, facet) {
    var ds = distractors(item, 3);
    var opts = shuffle([item].concat(ds));
    var ex = {
      id: 'gen-rec-' + item.id + '-' + facet, type: 'choice', generated: true,
      prompt: item.kind === 'letter' ? 'Какой звук передаёт эта буква?' : facet === 'readCyr' ? 'Прочитайте и выберите значение.' : 'Что это значит?',
      sr: item.sr, forceScript: item.kind === 'letter' || facet === 'readCyr' ? 'cyr' : null,
      options: opts.map(shortRu), optLang: 'ru', correct: opts.indexOf(item),
      items: [[item.id, facet]], skills: ['vocab', 'reading'], tag: 'vocab-review'
    };
    return ex;
  }

  function genRecall(item) {
    if (item.kind === 'letter') {
      return { id: 'gen-recall-' + item.id, type: 'type', generated: true, recall: true, strict: true,
        prompt: 'Напишите строчную букву. Звук: ' + item.ru + '.', accept: [item.lower], hints: ['Название буквы: {{' + item.letterName + '}}.'],
        items: [[item.id, 'recall']], skills: ['reading', 'writing'], tag: 'letters' };
    }
    return {
      id: 'gen-recall-' + item.id, type: 'type', generated: true, recall: true,
      prompt: 'Напишите по-армянски: «' + shortRu(item) + '»' + (item.reg === 'formal' ? ' (вежливо, на «Вы»)' : item.reg === 'informal' ? ' (на «ты»)' : '') + '.',
      accept: [item.sr].concat(item.alt || []),
      items: [[item.id, 'recall']], skills: ['vocab', 'writing'], tag: 'vocab-review',
      explain: item.note || ''
    };
  }

  function genContext(item) {
    var ex = (item.ex || []).filter(function (e) { return e.gap && e.sr.indexOf(e.gap) !== -1; })[0];
    if (!ex) return null;
    return {
      id: 'gen-ctx-' + item.id, type: 'cloze', generated: true, recall: true,
      prompt: 'Вставьте пропущенное слово. Перевод: «' + ex.ru + '»',
      sr: ex.sr.replace(ex.gap, '___'), accept: [ex.gap],
      items: [[item.id, 'context']], skills: ['vocab', 'grammar'], tag: 'vocab-review'
    };
  }

  function genListening(item) {
    var ds = distractors(item, 2);
    var opts = shuffle([item].concat(ds));
    return {
      id: 'gen-listen-' + item.id, type: 'listen_choice', generated: true,
      prompt: 'Прослушайте и выберите значение.', sr: item.sr,
      options: opts.map(shortRu), optLang: 'ru', correct: opts.indexOf(item),
      items: [[item.id, 'listening']], skills: ['listening'], tag: 'vocab-review'
    };
  }

  function fromLesson(item, facet, avoid) {
    var list = lessonExercisesFor(item.id).filter(function (x) {
      if (avoid && avoid.indexOf(x.ex.id) !== -1) return false;
      if (x.ex.type.indexOf('listen') === 0 && !SM.audio.canPlay({ text: x.ex.sr, audio: x.ex.audio })) return false;
      return facet === 'recall' ? x.ex.recall : true;
    });
    if (!list.length) return null;
    var pick = list[Math.floor(Math.random() * list.length)];
    // Оставляем в упражнении только те элементы, которые оно действительно проверяет.
    return Object.assign({}, pick.ex, { fromLesson: pick.source });
  }

  function exerciseForCard(card, avoid) {
    var item = vocab(card.item);
    if (!item) return null;
    var f = card.facet;
    var isGrammar = item.kind === 'grammar';
    var ex = null;
    if (isGrammar) ex = fromLesson(item, f, avoid) || fromLesson(item, 'any', null);
    else if (f === 'recognition' || f === 'readCyr' || f === 'readLat') ex = Math.random() < 0.75 ? genRecognition(item, f) : (fromLesson(item, f, avoid) || genRecognition(item, f));
    else if (f === 'recall') ex = Math.random() < 0.7 ? genRecall(item) : (fromLesson(item, f, avoid) || genRecall(item));
    else if (f === 'context') ex = genContext(item) || fromLesson(item, f, avoid) || genRecall(item);
    else if (f === 'listening') ex = item.kind !== 'letter' && SM.audio.canPlay({ text: item.sr }) ? genListening(item) : null;
    return ex;
  }

  /* Сессия повторения: не больше max заданий, один элемент — не подряд. */
  function buildSession(state, max) {
    max = max || 15;
    var due = SM.srs.dueCards(state);
    var out = [], seenItems = {}, used = [];
    due.forEach(function (c) {
      if (out.length >= max) return;
      if (seenItems[c.item] >= 2) return;
      var ex = exerciseForCard(c, used);
      if (!ex) return;
      used.push(ex.id);
      seenItems[c.item] = (seenItems[c.item] || 0) + 1;
      out.push(ex);
    });
    return spread(out);
  }

  /* Разносим задания с одинаковым элементом. */
  function spread(list) {
    var res = [];
    var rest = list.slice();
    while (rest.length) {
      var lastItem = res.length ? (res[res.length - 1].items[0] || [])[0] : null;
      var idx = rest.findIndex(function (e) { return (e.items[0] || [])[0] !== lastItem; });
      if (idx === -1) idx = 0;
      res.push(rest.splice(idx, 1)[0]);
    }
    return res;
  }

  /* Разминка перед уроком: 3 карточки из ранее изученного (не из этого урока). */
  function warmup(state, lessonId, n) {
    var due = SM.srs.dueCards(state).filter(function (c) {
      var v = vocab(c.item); return v && v.lesson !== lessonId;
    });
    var out = [], used = [];
    for (var i = 0; i < due.length && out.length < (n || 3); i++) {
      var ex = exerciseForCard(due[i], used);
      if (ex && !out.some(function (e) { return e.items[0][0] === ex.items[0][0]; })) { used.push(ex.id); out.push(Object.assign({ warmup: true }, ex)); }
    }
    return out;
  }

  SM.review = { buildSession: buildSession, warmup: warmup, exerciseForCard: exerciseForCard, shuffle: shuffle, lessonExercisesFor: lessonExercisesFor };
})(window.SM = window.SM || {});
