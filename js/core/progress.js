/* Пользовательский прогресс: журнал ответов, статистика по навыкам,
 * типичные ошибки и человекочитаемые выводы. Не считает «проценты владения
 * языком» — только то, что пользователь показал в заданиях. */
(function (SM) {
  'use strict';

  var SKILLS = ['reading', 'listening', 'grammar', 'vocab', 'writing', 'speaking', 'pragmatics'];
  var SKILL_LABELS = {
    reading: 'Чтение', listening: 'Аудирование', grammar: 'Грамматика', vocab: 'Лексика',
    writing: 'Письмо', speaking: 'Устная речь', pragmatics: 'Уместность и регистр'
  };
  var LEVELS = ['Новичок', 'Буквы', 'Слова', 'Предложения'];

  function ensure(state) {
    if (!state.practice) state.practice = {};
    SKILLS.forEach(function (s) {
      if (!state.practice[s]) state.practice[s] = { n: 0, independent: 0, hinted: 0, forgot: 0, wrong: 0, recent: [] };
    });
  }

  /* ev: {exId, type, skills, items:[{id, facet}], outcome, hints, errorTag,
   *      source: 'lesson'|'review'|'game'|'dialogue', lessonId, transcriptOpened, recognitionOnly} */
  function recordAnswer(state, ev) {
    ensure(state);
    var now = Date.now();
    state.history.push({
      t: now, ex: ev.exId || null, type: ev.type, skills: ev.skills || [],
      items: (ev.items || []).map(function (i) { return i.id; }), o: ev.outcome,
      h: ev.hints || 0, src: ev.source || 'lesson', l: ev.lessonId || null,
      tr: ev.transcriptOpened ? 1 : 0, sc: state.settings.script
    });
    (ev.items || []).forEach(function (it) {
      SM.srs.record(state, it.id, it.facet, ev.outcome, { now: now, exType: ev.type, recognitionOnly: ev.recognitionOnly });
      // Узнавание при чтении отдельно учитывается для каждой письменности.
      // Чтение засчитывается, только когда транскрипции на экране нет.
      var sc = ev.script || state.settings.script;
      if (it.facet === 'recognition' && sc === 'cyr') {
        SM.srs.record(state, it.id, 'readCyr', ev.outcome, { now: now, exType: ev.type, recognitionOnly: true });
      }
    });
    (ev.skills || []).forEach(function (s) {
      var p = state.practice[s]; if (!p) return;
      p.n++; p[ev.outcome] = (p[ev.outcome] || 0) + 1;
      p.recent.push(ev.outcome === 'independent' ? 1 : ev.outcome === 'hinted' ? 0.5 : 0);
      if (p.recent.length > 40) p.recent = p.recent.slice(-40);
    });
    if ((ev.outcome === 'wrong' || ev.outcome === 'forgot') && ev.errorTag) {
      state.errors[ev.errorTag] = (state.errors[ev.errorTag] || 0) + 1;
    }
    var dk = SM.srs.dayKey(now);
    var d = state.days[dk] || (state.days[dk] = { answers: 0, independent: 0 });
    d.answers++; if (ev.outcome === 'independent') d.independent++;
  }

  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }

  function latestDiagnostic(state) {
    var runs = state.diagnostic.runs;
    return runs.length ? runs[runs.length - 1] : null;
  }

  /* Профиль навыка: уровень по диагностике + данные практики. */
  function skillProfile(state) {
    ensure(state);
    var diag = latestDiagnostic(state);
    return SKILLS.map(function (s) {
      var p = state.practice[s];
      var r = p.recent;
      var d = diag && diag.skills[s];
      var trend = null;
      if (r.length >= 16) {
        var half = Math.floor(r.length / 2);
        var a = avg(r.slice(0, half)), b = avg(r.slice(half));
        trend = b - a > 0.12 ? 'up' : a - b > 0.12 ? 'down' : 'flat';
      }
      return {
        skill: s, label: SKILL_LABELS[s],
        diag: d || null,
        practiceN: p.n, recentScore: avg(r), trend: trend,
        hinted: p.hinted, forgot: p.forgot
      };
    });
  }

  /* Выводы в понятных формулировках — только при достаточном количестве данных. */
  function insights(state) {
    ensure(state);
    var out = [];
    var listenEvents = state.history.filter(function (h) { return h.skills.indexOf('listening') !== -1; });
    if (listenEvents.length >= 4) {
      var opened = listenEvents.filter(function (h) { return h.tr; }).length / listenEvents.length;
      var ok = listenEvents.filter(function (h) { return h.o === 'independent' && !h.tr; }).length / listenEvents.length;
      if (ok >= 0.6) out.push('Знакомые фразы на слух понимаются без транскрипта — это хороший знак.');
      else if (opened >= 0.5) out.push('Знакомые фразы на слух понятны, но транскрипт пока открывается часто. Попробуй сначала прослушать дважды.');
    }
    var prof = skillProfile(state);
    prof.forEach(function (p) {
      if (p.trend === 'up') out.push(p.label + ': последние ответы заметно увереннее, чем раньше.');
      if (p.trend === 'down') out.push(p.label + ': в последних заданиях стало больше трудностей — возможно, стоит вернуться к объяснению.');
    });
    var g = state.practice.grammar;
    if (g && g.n >= 10 && g.hinted / g.n > 0.35) out.push('Грамматические конструкции пока часто требуют подсказки. Это нормально: вернёмся к ним в повторении.');
    if (!state.practice.speaking.n) out.push('Для оценки устной речи пока недостаточно данных: в этой версии она не проверяется автоматически.');
    return out;
  }

  function topErrors(state, n) {
    return Object.keys(state.errors).map(function (k) { return { tag: k, count: state.errors[k] }; })
      .sort(function (a, b) { return b.count - a.count; }).slice(0, n || 5);
  }

  SM.progress = {
    SKILLS: SKILLS, SKILL_LABELS: SKILL_LABELS, LEVELS: LEVELS,
    ensure: ensure, recordAnswer: recordAnswer, skillProfile: skillProfile,
    insights: insights, topErrors: topErrors, latestDiagnostic: latestDiagnostic
  };
})(window.SM = window.SM || {});
