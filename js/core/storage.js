/* Хранилище состояния пользователя. Сейчас — localStorage (в пределах браузера).
 * Весь доступ идёт через SM.store, поэтому позже его можно заменить на
 * серверную базу, реализовав те же load/save. */
(function (SM) {
  'use strict';

  var KEY = 'hayeren-mopsi-het:v1';
  var SCHEMA = 1;
  var HISTORY_CAP = 3000;
  var memoryFallback = null;
  var available = true;

  function fresh() {
    return {
      schema: SCHEMA,
      createdAt: Date.now(),
      // script: cyr | lat | both (по умолчанию обе — выбирать не обязательно); theme: auto | light | dark
      settings: { script: 'both', theme: 'auto', audioRate: 1, showTranslation: true, mascot: true, goals: [],
        dailyPhrase: { enabled: false, time: '09:00', lastNotified: null } },
      onboarding: { done: false, startChoice: null },
      diagnostic: { runs: [] },     // результаты диагностик, последний — актуальный
      lessons: {},                  // lessonId → {status, best, attempts, completedAt}
      exams: {},                    // examId → {attempts, best, passed, passedAt, last}
      srs: {},                      // cardKey → карточка (см. srs.js)
      items: {},                    // itemId → {firstSeen}
      history: [],                  // журнал ответов
      games: [],                    // результаты игр
      errors: {},                   // тег ошибки → счётчик
      days: {}                      // 'YYYY-MM-DD' → {answers, newItems}
    };
  }

  function migrate(data) {
    if (!data || typeof data !== 'object') return fresh();
    var base = fresh();
    // Добавляем недостающие поля, не трогая существующие данные.
    Object.keys(base).forEach(function (k) {
      if (data[k] === undefined) data[k] = base[k];
    });
    Object.keys(base.settings).forEach(function (k) {
      if (data.settings[k] === undefined) data.settings[k] = base.settings[k];
    });
    data.schema = SCHEMA;
    return data;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return migrate(raw ? JSON.parse(raw) : null);
    } catch (e) {
      available = false;
      return migrate(memoryFallback);
    }
  }

  var state = load();
  var listeners = [];

  function saveNow() {
    if (state.history.length > HISTORY_CAP) state.history = state.history.slice(-HISTORY_CAP);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      available = true;
    } catch (e) {
      available = false;
      memoryFallback = JSON.parse(JSON.stringify(state));
    }
  }

  SM.store = {
    get: function () { return state; },
    /* Изменение состояния: fn(state). Сохраняется сразу — потеря прогресса хуже лишней записи. */
    update: function (fn) {
      fn(state);
      saveNow();
      listeners.forEach(function (l) { try { l(state); } catch (e) { console.error(e); } });
    },
    onChange: function (l) { listeners.push(l); },
    isPersistent: function () { return available; },
    exportJSON: function () { return JSON.stringify(state, null, 2); },
    importJSON: function (text) {
      var data = JSON.parse(text);
      if (!data || typeof data !== 'object' || !data.settings) throw new Error('Файл не похож на сохранение приложения');
      state = migrate(data);
      saveNow();
      listeners.forEach(function (l) { l(state); });
    },
    reset: function () {
      state = fresh();
      saveNow();
      listeners.forEach(function (l) { l(state); });
    },
    _fresh: fresh
  };
})(window.SM = window.SM || {});
