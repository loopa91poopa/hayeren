/* Персональный маршрут и рекомендации. Каждое решение сопровождается
 * объяснением «почему», которое показывается пользователю.
 *
 * Правило этапов: первый этап открыт; следующий открывается, когда сдан экзамен
 * предыдущего. Внутри открытого этапа доступны все уроки (рекомендуется порядок).
 * Экзамен можно сдавать после всех уроков этапа или досрочно — например, если
 * диагностика показала, что уровень уже есть: проходить знакомые темы не обязательно. */
(function (SM) {
  'use strict';

  var LVL = { 'Буквы': 1, 'Слова': 2, 'Предложения': 3 };
  var REVIEW_FIRST = 20;   // столько просроченных повторений → сначала повторение
  var PASS = 0.7;

  function exams(state) { return state.exams || {}; }
  function examRecord(state, examId) { return exams(state)[examId] || null; }
  function examPassed(state, examId) { var r = examRecord(state, examId); return !!(r && r.passed); }

  function stageOpen(state, stage) {
    if (stage.index === 0) return true;
    var prev = SM.content.stages[stage.index - 1];
    return examPassed(state, prev.exam);
  }
  function lessonStage(lessonId) { return SM.content.stageById[SM.content.stageOfLesson[lessonId]]; }
  function lessonAvailable(state, lessonId) {
    var st = lessonStage(lessonId);
    return !st || stageOpen(state, st);
  }

  function diagTop(state) {
    var d = SM.progress.latestDiagnostic(state);
    return d && !d.skipped ? d.top : 0;
  }

  function gapLessons(state) {
    var d = SM.progress.latestDiagnostic(state);
    var map = SM.content.topicMap, out = {};
    (d && !d.skipped ? d.gaps : []).forEach(function (tag) {
      var l = map[tag];
      if (l && SM.content.lessons[l]) (out[l] = out[l] || []).push(tag);
    });
    return out;
  }

  /* Статус экзамена этапа. */
  function examInfo(state, stage) {
    var written = [];
    stage.modules.forEach(function (m) { m.lessons.forEach(function (lid) { if (SM.content.lessons[lid]) written.push(lid); }); });
    var done = written.filter(function (lid) { return state.lessons[lid] && state.lessons[lid].status === 'done'; });
    var rec = examRecord(state, stage.exam);
    return {
      id: stage.exam, exam: SM.content.exams[stage.exam], stage: stage,
      open: stageOpen(state, stage),
      passed: !!(rec && rec.passed), best: rec ? rec.best : null, attempts: rec ? rec.attempts : 0,
      lessonsWritten: written.length, lessonsDone: done.length,
      ready: written.length > 0 && done.length === written.length,
      diagReady: diagTop(state) >= LVL[stage.level]
    };
  }

  function route(state) {
    var top = diagTop(state);
    var gaps = gapLessons(state);
    var rows = [], stages = [];
    SM.content.stages.forEach(function (stage) {
      var open = stageOpen(state, stage);
      var sv = { stage: stage, open: open, modules: [], exam: examInfo(state, stage) };
      stage.modules.forEach(function (m) {
        var mv = { module: m, rows: [] };
        m.lessons.forEach(function (lid) {
          var l = SM.content.lessons[lid];
          if (!l) return;
          var rec = state.lessons[lid] || {};
          var row = { lesson: l, module: m, stage: stage, status: 'open', reason: '' };
          if (!open) {
            row.status = 'locked';
            row.reason = 'Откроется после экзамена «' + SM.content.stages[stage.index - 1].level + '».';
          } else if (rec.status === 'done') {
            if (rec.best < PASS) { row.status = 'weak'; row.reason = 'Урок пройден, но результат ' + Math.round(rec.best * 100) + '% — стоит вернуться к нему.'; }
            else { row.status = 'done'; row.reason = 'Пройден: ' + Math.round(rec.best * 100) + '% самостоятельных ответов.'; }
          } else if (gaps[lid]) {
            row.status = 'gap';
            row.reason = 'Диагностика показала пробел: ' + gaps[lid].map(function (t) { return SM.content.topicLabels[t] || t; }).join(', ') + '.';
          } else if (LVL[stage.level] <= top) {
            row.status = 'skip';
            row.reason = 'Этап «' + stage.level + '» подтверждён диагностикой — урок можно пропустить или пройти для повторения.';
          } else if (rec.status === 'started') {
            row.status = 'started'; row.reason = 'Урок начат.';
          }
          rows.push(row); mv.rows.push(row);
        });
        sv.modules.push(mv);
      });
      stages.push(sv);
    });
    // Следующий урок: сначала пробелы, затем начатый, затем первый непройденный по порядку.
    var next = rows.filter(function (r) { return r.status === 'gap'; })[0] ||
      rows.filter(function (r) { return r.status === 'started'; })[0] ||
      rows.filter(function (r) { return r.status === 'open'; })[0] || null;
    if (next) {
      next.isNext = true;
      if (next.status === 'open') {
        next.reason = next.lesson.builds && next.lesson.builds.length && SM.content.lessons[next.lesson.builds[0]]
          ? 'Опирается на уже изученное: «' + SM.content.lessons[next.lesson.builds[0]].ru + '».'
          : (next.lesson.n === 1 && next.stage.index > 0 ? 'Первый урок нового этапа.' : 'Следующий урок по порядку.');
      }
    }
    // Текущий этап: открытый, экзамен ещё не сдан.
    var currentStage = stages.filter(function (s) { return s.open && !s.exam.passed; })[0] || null;
    return { rows: rows, stages: stages, next: next, top: top, currentStage: currentStage };
  }

  function dueCount(state) { return SM.srs.dueCards(state).length; }

  function recommendation(state) {
    if (!state.onboarding.done) return { kind: 'onboarding' };
    var due = dueCount(state);
    var r = route(state);
    var cur = r.currentStage;
    if (due >= REVIEW_FIRST) {
      return { kind: 'review', due: due, title: 'Повторение',
        reason: 'Накопилось ' + due + ' элементов для повторения. Новый материал подождёт: сначала закрепим то, что уже начато.' };
    }
    // Диагностика показала уровень этапа — знакомые уроки можно не проходить, а сразу сдать экзамен.
    if (cur && cur.exam.diagReady && !cur.exam.ready && !cur.exam.attempts) {
      return { kind: 'exam', exam: cur.exam, due: due, title: cur.exam.exam.title,
        reason: 'Диагностика подтвердила этап «' + cur.stage.level + '». Знакомые уроки этапа «' + cur.stage.title + '» можно не проходить: сдайте экзамен, и откроется следующий этап.' };
    }
    var weak = r.rows.filter(function (x) { return x.status === 'weak'; })[0];
    if (r.next && (r.next.status === 'gap' || r.next.status === 'started')) {
      return { kind: 'lesson', lesson: r.next.lesson, title: r.next.lesson.title, reason: r.next.reason, due: due };
    }
    if (weak) return { kind: 'lesson', lesson: weak.lesson, title: weak.lesson.title, reason: weak.reason, due: due };
    if (cur && cur.exam.ready) {
      return { kind: 'exam', exam: cur.exam, due: due, title: cur.exam.exam.title,
        reason: 'Все уроки этапа «' + cur.stage.title + '» пройдены. Экзамен покажет, готовы ли вы к следующему этапу' + (cur.exam.attempts ? ' (попыток: ' + cur.exam.attempts + ')' : '') + '.' };
    }
    if (due >= 6) {
      return { kind: 'review', due: due, title: 'Повторение',
        reason: 'Есть ' + due + ' элементов, которые пора повторить. Это займёт несколько минут, потом — новый урок.' };
    }
    if (r.next && cur && r.next.stage === cur.stage) {
      return { kind: 'lesson', lesson: r.next.lesson, title: r.next.lesson.title, reason: r.next.reason, due: due };
    }
    if (cur) {
      return { kind: 'exam', exam: cur.exam, due: due, title: cur.exam.exam.title,
        reason: 'Готовые уроки этапа «' + cur.stage.title + '» пройдены, остальные ещё в разработке. Экзамен можно сдать уже сейчас.' };
    }
    if (due) return { kind: 'review', due: due, title: 'Повторение', reason: 'Все этапы пройдены. Самое полезное сейчас — повторение.' };
    return { kind: 'practice', due: 0, title: 'Практика', reason: 'Все экзамены сданы, повторений нет. Можно потренироваться в играх и диалогах.' };
  }

  /* Сохранение результата экзамена. */
  function recordExam(state, examId, result) {
    if (!state.exams) state.exams = {};
    var rec = state.exams[examId] || (state.exams[examId] = { attempts: 0, best: 0, passed: false });
    rec.attempts++;
    rec.best = Math.max(rec.best || 0, result.score);
    rec.last = { score: result.score, bySkill: result.bySkill, at: Date.now(), passed: result.passed };
    if (result.passed && !rec.passed) { rec.passed = true; rec.passedAt = Date.now(); }
    return rec;
  }

  SM.planner = {
    route: route, recommendation: recommendation, dueCount: dueCount, examInfo: examInfo,
    stageOpen: stageOpen, lessonAvailable: lessonAvailable, examPassed: examPassed, recordExam: recordExam,
    PASS: PASS, REVIEW_FIRST: REVIEW_FIRST, LVL: LVL
  };
})(window.SM = window.SM || {});
