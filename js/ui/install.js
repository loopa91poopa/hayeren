/* «Добавить на главный экран».
 *  — Android (Chrome, Edge, Samsung Internet): браузер присылает событие beforeinstallprompt,
 *    и наша кнопка открывает системное окно установки — человеку остаётся нажать «Установить».
 *  — iPhone/iPad: Apple не даёт сайтам устанавливать себя кнопкой. Кнопка открывает подсказку
 *    со стрелкой к «Поделиться» и тремя шагами.
 *  — Встроенный браузер Telegram/Instagram и т. п.: установка оттуда невозможна, подсказываем
 *    открыть ссылку в обычном браузере. */
(function (SM) {
  'use strict';
  var h = SM.ui.h;
  var deferred = null;
  var KEY = 'hayeren-install-dismissed';

  function changed() { if (SM.app && SM.app.rerender) SM.app.rerender(); }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; changed(); });
  window.addEventListener('appinstalled', function () { deferred = null; closeSheet(); SM.ui.toast('Готово! Мопс теперь на главном экране телефона.'); changed(); });

  var ua = navigator.userAgent;
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function ios() { return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function android() { return /Android/i.test(ua); }
  function mobile() { return ios() || android(); }
  function inApp() { return /Telegram|Instagram|FBAN|FBAV|FB_IAB|Line\/|WhatsApp|VKClient|; wv\)/i.test(ua); }
  function iosOtherBrowser() { return ios() && /CriOS|FxiOS|EdgiOS|YaBrowser|OPiOS/.test(ua); }
  function dismissed() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function dismiss() { try { localStorage.setItem(KEY, '1'); } catch (e) {} }

  /* Можно ли что-то предложить на этом устройстве. */
  function available() { return !standalone() && (!!deferred || mobile()); }

  // ── Подсказка (нижний лист) ─────────────────────────────────────────
  var sheet = null;
  function closeSheet() { if (sheet) { sheet.remove(); sheet = null; document.removeEventListener('keydown', onKey); } }
  function onKey(e) { if (e.key === 'Escape') closeSheet(); }

  function steps() {
    if (inApp()) return {
      title: 'Откройте ссылку в браузере',
      text: 'Сейчас страница открыта внутри мессенджера — отсюда приложение не установить.',
      list: [ios() ? 'Нажмите ⋯ или значок компаса и выберите «Открыть в Safari».' : 'Нажмите ⋮ в углу и выберите «Открыть в браузере» (Chrome).', 'В браузере снова нажмите «Добавить на главный экран».'] };
    if (ios()) return {
      title: 'Добавьте мопса на экран «Домой»',
      text: iosOtherBrowser() ? 'Надёжнее всего это работает в Safari — откройте ссылку там.' : 'На iPhone это делается в три касания:',
      list: ['Нажмите «Поделиться» — квадрат со стрелкой вверх ' + (/iPad/.test(ua) ? 'вверху справа.' : 'внизу экрана (если его не видно — сначала нажмите «⋯»).'),
        'Прокрутите список и выберите «На экран „Домой“».', 'Нажмите «Добавить» — иконка появится на главном экране.'],
      arrow: !/iPad/.test(ua) && !iosOtherBrowser() };
    return {
      title: 'Установите приложение',
      text: 'Браузер не предложил установку сам. Это делается так:',
      list: ['Откройте меню браузера — ⋮ справа вверху.', 'Выберите «Установить приложение» или «Добавить на главный экран».', 'Подтвердите — иконка появится на главном экране.'] };
  }

  function openSheet() {
    closeSheet();
    var s = steps();
    sheet = h('div.install-sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': s.title, on: { click: function (e) { if (e.target === sheet) closeSheet(); } } },
      h('div.install-sheet-box',
        h('div.install-sheet-head', h('span.install-pug', { html: SM.ui.mascotImg('explain', { decorative: true }) }), h('h2', s.title)),
        h('p.small', s.text),
        h('ol', s.list.map(function (t) { return h('li', t); })),
        h('div.actions', h('button.btn.primary', { type: 'button', 'data-autofocus': '1', on: { click: closeSheet } }, 'Понятно'))),
      s.arrow ? h('div.install-arrow', { 'aria-hidden': 'true' }, '↓') : null);
    document.body.appendChild(sheet);
    document.addEventListener('keydown', onKey);
    var b = sheet.querySelector('[data-autofocus]'); if (b) b.focus();
  }

  /* Главное действие: системное окно установки, если браузер его дал, иначе подсказка. */
  function install() {
    if (deferred) {
      var d = deferred;
      d.prompt();
      d.userChoice.then(function (r) { deferred = null; if (r && r.outcome === 'dismissed') SM.ui.toast('Хорошо, можно установить позже — кнопка есть в настройках.'); changed(); });
      return;
    }
    openSheet();
  }

  function button(label, cls) {
    return h('button.btn' + (cls || '.primary'), { type: 'button', on: { click: install } }, label || 'Добавить на главный экран');
  }

  /* Блок для первого экрана: заметная кнопка и одна строка пояснения. */
  function welcomeBlock() {
    if (!available()) return null;
    return h('div.install-welcome', button('📲 Добавить на главный экран', '.secondary'),
      h('p.small.muted', 'Иконка на телефоне, работает без интернета.'));
  }

  /* Карточка для главной: только если ещё не установлено и не скрыто. */
  function homeCard(redraw) {
    if (!available() || dismissed()) return null;
    return h('section.card.install-card', h('span.install-pug', { html: SM.ui.mascotImg('joy', { decorative: true }) }),
      h('div', h('h2', 'Добавьте на главный экран'), h('p.small', 'Иконка на телефоне, работает без интернета, прогресс сохраняется на телефоне.'),
        h('div.actions', button(), h('button.btn.ghost', { type: 'button', on: { click: function () { dismiss(); redraw(); } } }, 'Не сейчас'))));
  }

  function settingsCard() {
    if (standalone()) return h('div.card', h('h2', 'Приложение'), h('p.small', 'Приложение установлено. Прогресс хранится на этом устройстве — для переноса используйте сохранение в файл.'));
    return h('div.card', h('h2', 'Установить на телефон или компьютер'),
      h('p.small', 'Иконка на главном экране, приложение открывается без адресной строки и работает без интернета.'),
      h('div.actions', button()));
  }

  SM.install = { welcomeBlock: welcomeBlock, homeCard: homeCard, settingsCard: settingsCard, standalone: standalone, install: install, available: available };
})(window.SM = window.SM || {});
