/* Каркас приложения: шапка, навигация, роутер (hash), письменность, тема, офлайн. */
(function (SM) {
  'use strict';
  var h = SM.ui.h, T = SM.texts;

  SM.views = SM.views || {};
  var app = { current: null, params: null, view: null };

  function parseHash() {
    var parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
    return { name: parts[0] || 'home', args: parts.slice(1).map(decodeURIComponent) };
  }

  function go(path) { location.hash = '#/' + path; }

  function rerenderCurrent() {
    if (app.view && app.view.rerender) app.view.rerender();
    else route();
  }

  /* Установленное приложение на телефоне может висеть открытым несколько дней.
   * Когда его снова показывают после полуночи, главная перерисовывается с новой фразой дня. */
  var shownDay = new Date().toDateString();
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    var today = new Date().toDateString();
    if (today !== shownDay) { shownDay = today; if (parseHash().name === 'home') rerenderCurrent(); }
  });

  // ── Письменность: cyr | lat | both ───────────────────────────────────
  function setScript(sc) {
    SM.store.update(function (s) { s.settings.script = sc; });
    document.documentElement.setAttribute('data-script', sc);
    renderChrome();
    rerenderCurrent(); // текущий экран перерисовывается с сохранением состояния
  }

  var SCRIPTS = [
    { id: 'cyr', label: 'Հայ', title: 'Только армянские буквы', lang: 'hy' },
    { id: 'lat', label: 'Рус', title: 'Только транскрипция русскими буквами', lang: 'ru' },
    { id: 'both', label: 'Обе', title: 'Армянские буквы и транскрипция вместе' }
  ];
  function scriptToggle() {
    var sc = SM.store.get().settings.script;
    return h('div.script-toggle', { role: 'group', 'aria-label': 'Письменность' }, SCRIPTS.map(function (o) {
      return h('button', { type: 'button', 'aria-pressed': String(sc === o.id), class: sc === o.id ? 'on' : '', lang: o.lang || null, title: o.title,
        on: { click: function () { setScript(o.id); } } }, o.label);
    }));
  }

  // ── Тема: auto | light | dark ───────────────────────────────────────
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolvedTheme() {
    var t = SM.store.get().settings.theme || 'auto';
    if (t === 'auto') return darkQuery && darkQuery.matches ? 'dark' : 'light';
    return t;
  }
  function applyTheme() {
    var t = resolvedTheme();
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#111621' : '#F8F7F3');
  }
  function setTheme(t) {
    SM.store.update(function (s) { s.settings.theme = t; });
    applyTheme(); renderChrome();
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', function () { applyTheme(); renderChrome(); });

  function themeButton() {
    var dark = resolvedTheme() === 'dark';
    return h('button.btn-icon', { type: 'button', 'aria-label': dark ? 'Включить светлую тему' : 'Включить тёмную тему', title: dark ? 'Светлая тема' : 'Тёмная тема',
      on: { click: function () { setTheme(dark ? 'light' : 'dark'); } } }, SM.ui.icon(dark ? 'sun' : 'moon'));
  }

  function renderChrome() {
    var header = document.getElementById('app-header');
    SM.ui.clear(header);
    var sc = SM.store.get().settings.script;
    header.appendChild(h('a.brand', { href: '#/home', 'aria-label': T.appName + ' — на главную' },
      h('span.brand-pug', { html: SM.ui.mascotHead() }),
      h('span.brand-name', sc === 'cyr' ? T.appNameCyr : T.appName)));
    header.appendChild(h('div.header-right', scriptToggle(), themeButton(),
      h('a.btn-icon', { href: '#/settings', 'aria-label': 'Настройки', title: 'Настройки' }, SM.ui.icon('gear'))));

    var cur = parseHash().name;
    var side = document.getElementById('app-nav');
    SM.ui.clear(side);
    T.nav.forEach(function (n) {
      side.appendChild(h('a.nav-item' + (isActive(n.id, cur) ? '.active' : ''), { href: '#/' + n.id, 'aria-current': isActive(n.id, cur) ? 'page' : null },
        SM.ui.icon(n.icon), h('span', n.label)));
    });
    var bottom = document.getElementById('app-bottom');
    SM.ui.clear(bottom);
    T.nav.filter(function (n) { return n.mobile; }).forEach(function (n) {
      bottom.appendChild(h('a.bnav-item' + (isActive(n.id, cur) ? '.active' : ''), { href: '#/' + n.id, 'aria-current': isActive(n.id, cur) ? 'page' : null }, SM.ui.icon(n.icon), h('span', n.label.replace('Мой ', ''))));
    });
    bottom.appendChild(h('button.bnav-item', { type: 'button', 'aria-label': 'Другие разделы', on: { click: openMore } }, SM.ui.icon('more'), h('span', 'Ещё')));
  }

  function isActive(id, cur) {
    var map = { lesson: 'lessons', dialogue: 'dialogues', word: 'dictionary', game: 'games', diagnostic: 'route', exam: 'route' };
    return id === cur || map[cur] === id;
  }

  function openMore() {
    var close = function () { sheet.remove(); document.removeEventListener('keydown', onKey); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    var sheet = h('div.sheet-backdrop', { on: { click: function (e) { if (e.target === sheet) close(); } } },
      h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Разделы' },
        h('div.sheet-grid', T.nav.filter(function (n) { return !n.mobile; }).map(function (n) {
          return h('a.sheet-item', { href: '#/' + n.id, on: { click: close } }, SM.ui.icon(n.icon), h('span', n.label));
        })),
        h('button.btn.ghost.block', { type: 'button', on: { click: close } }, 'Закрыть')));
    document.body.appendChild(sheet);
    document.addEventListener('keydown', onKey);
    var first = sheet.querySelector('a'); if (first) first.focus();
  }

  function route() {
    var r = parseHash();
    var state = SM.store.get();
    // Первый запуск: всё ведёт на приветствие, кроме настроек.
    if (!state.onboarding.done && ['onboarding', 'diagnostic', 'settings'].indexOf(r.name) === -1) { go('onboarding'); return; }
    var view = SM.views[r.name] || SM.views.home;
    if (app.view && app.view.destroy) app.view.destroy();
    SM.audio.stop();
    app.current = r.name;
    var main = document.getElementById('app-main');
    SM.ui.clear(main);
    var focusMode = view.focusMode && view.focusMode(r.args);
    document.body.classList.toggle('focus-mode', !!focusMode);
    try {
      app.view = view.render(main, r.args) || {};
    } catch (e) {
      console.error(e);
      main.appendChild(h('div.card.error', h('h2', 'Экран не открылся'), h('p', 'Прогресс сохранён. Вернитесь на главную и попробуйте снова.'), h('pre.small', String(e && e.message)), h('a.btn.primary', { href: '#/home' }, 'На главную')));
      app.view = {};
    }
    renderChrome();
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // ── Офлайн: service worker кэширует всё приложение ──────────────────
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      SM.app.swRegistration = reg;
      if (SM.daily) SM.daily.onServiceWorker(reg);
    }).catch(function (e) { console.warn('Офлайн-режим недоступен:', e); });
  }

  function start() {
    var s = SM.store.get();
    SM.progress.ensure(s);
    applyTheme();
    document.documentElement.setAttribute('data-script', s.settings.script);
    window.addEventListener('hashchange', route);
    route();
    if (!SM.store.isPersistent()) SM.ui.toast('Браузер не разрешает сохранять данные: прогресс будет потерян после закрытия вкладки.');
    // Голоса синтеза появляются асинхронно — обновим экран, когда станет ясно, есть ли аудио.
    var hadVoice = SM.audio.hasVoice();
    SM.audio.onVoicesChanged(function (has) {
      if (has !== hadVoice) { hadVoice = has; rerenderCurrent(); }
    });
    registerServiceWorker();
    // Просим браузер не удалять данные сайта при нехватке места: в них хранится прогресс.
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    if (SM.daily) SM.daily.init();
  }

  SM.app = { go: go, route: route, setScript: setScript, setTheme: setTheme, resolvedTheme: resolvedTheme, start: start, scriptToggle: scriptToggle, rerender: rerenderCurrent };
  document.addEventListener('DOMContentLoaded', start);
})(window.SM = window.SM || {});
