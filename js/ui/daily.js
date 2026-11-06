/* Фраза дня и напоминание в заданное время (по умолчанию 9:00).
 *
 * Как это работает (честно об ограничениях браузера):
 *  1. Приложение открыто (вкладка или установленное приложение) — уведомление
 *     показывается ровно в заданное время.
 *  2. Приложение закрыто, но установлено как PWA в Chrome/Edge — service worker
 *     получает фоновую синхронизацию (periodicSync). Браузер сам решает, когда её
 *     запускать, поэтому время примерное.
 *  3. Пропущенное уведомление показывается при следующем открытии приложения в тот же день.
 */
(function (SM) {
  'use strict';
  var h = SM.ui.h, sr = SM.ui.sr, rich = SM.ui.rich;
  var timer = null;

  function settings() { return SM.store.get().settings.dailyPhrase || { enabled: false, time: '09:00' }; }
  function todayKey() { return SM.srs.dayKey(Date.now()); }
  function supported() { return 'Notification' in window; }
  function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function isPhone() { return isIOS() || /Android/i.test(navigator.userAgent); }

  function plain(text) { return String(text || '').replace(/\{\{|\}\}/g, ''); }

  function notificationText(p) {
    var sc = SM.store.get().settings.script;
    var srText = sc === 'lat' ? SM.translit.toLatin(p.sr) : sc === 'both' ? p.sr + ' · ' + SM.translit.toLatin(p.sr) : p.sr;
    return { title: 'Фраза дня: ' + srText, body: p.ru + (p.note ? '\n' + plain(p.note) : '') };
  }

  function show(force) {
    var cfg = settings();
    if (!force && (!cfg.enabled || cfg.lastNotified === todayKey())) return Promise.resolve(false);
    if (!supported() || Notification.permission !== 'granted') return Promise.resolve(false);
    var t = notificationText(SM.content.phraseOfDay());
    var opts = { body: t.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'phrase-of-day', data: { url: './#/home' } };
    var done = function () {
      if (!force) { SM.store.update(function (s) { s.settings.dailyPhrase.lastNotified = todayKey(); }); syncWorker(); }
      return true;
    };
    var reg = SM.app && SM.app.swRegistration;
    if (reg && reg.showNotification) return reg.showNotification(t.title, opts).then(done);
    try { new Notification(t.title, opts); return Promise.resolve(done()); } catch (e) { return Promise.resolve(false); }
  }

  function msUntil(time) {
    var parts = (time || '09:00').split(':');
    var now = new Date(), at = new Date();
    at.setHours(Number(parts[0]) || 9, Number(parts[1]) || 0, 0, 0);
    return at - now;
  }

  function schedule() {
    clearTimeout(timer);
    var cfg = settings();
    if (!cfg.enabled) return;
    var ms = msUntil(cfg.time);
    if (ms <= 0) {
      show(false); // время уже прошло сегодня — покажем, если ещё не показывали
      ms += 86400000;
    }
    timer = setTimeout(function () { show(false); schedule(); }, Math.min(ms, 2147483000));
  }

  /* Передаём настройки service worker'у: он не видит localStorage. */
  function syncWorker(reg) {
    reg = reg || (SM.app && SM.app.swRegistration);
    if (!reg) return;
    var cfg = settings();
    var target = reg.active || reg.waiting || reg.installing;
    if (target) target.postMessage({ type: 'daily-settings', enabled: !!cfg.enabled, time: cfg.time, script: SM.store.get().settings.script, lastNotified: cfg.lastNotified || null });
    if (cfg.enabled && reg.periodicSync) {
      reg.periodicSync.register('phrase-of-day', { minInterval: 6 * 3600 * 1000 }).catch(function () { /* без установки PWA браузер откажет — это нормально */ });
    }
  }

  function init() { schedule(); }

  function onServiceWorker(reg) {
    if (reg.active) syncWorker(reg);
    else navigator.serviceWorker.ready.then(syncWorker);
  }

  function setEnabled(v) {
    SM.store.update(function (s) { s.settings.dailyPhrase.enabled = v; });
    schedule(); syncWorker();
  }

  // ── Интерфейс ─────────────────────────────────────────────────────────
  function homeCard() {
    var p = SM.content.phraseOfDay();
    var cfg = settings();
    return h('section.card.phrase-card',
      h('div.phrase-head', h('h2', 'Фраза дня'), cfg.enabled ? h('span.muted.small', SM.ui.icon('bell'), ' напомню в ' + cfg.time) : h('a.small', { href: '#/settings' }, 'Напоминать каждый день')),
      h('div.phrase-main', sr(p.sr, { cls: 'phrase-sr' }), SM.ui.audioButtons(p.sr)),
      h('p.phrase-ru', p.ru),
      p.note ? rich(p.note, 'p', 'muted small') : null);
  }

  function settingsCard(redraw) {
    var cfg = settings();
    var perm = supported() ? Notification.permission : 'unsupported';
    var timeInput = h('input#daily-time', { type: 'time', value: cfg.time, on: { change: function (e) {
      var v = e.target.value || '09:00';
      SM.store.update(function (s) { s.settings.dailyPhrase.time = v; s.settings.dailyPhrase.lastNotified = null; });
      schedule(); syncWorker(); redraw();
    } } });
    var status;
    if (perm === 'unsupported') status = h('p.note.warn', isIOS() && !(SM.install && SM.install.standalone())
      ? 'На iPhone уведомления доступны только после установки на экран «Домой» (iOS 16.4 и новее). Фраза дня всё равно будет на главной.'
      : 'Этот браузер не умеет показывать уведомления. Фраза дня всё равно будет на главной.');
    else if (perm === 'denied') status = h('p.note.warn', 'Уведомления запрещены в настройках браузера для этого сайта. Разрешите их там, и напоминание заработает.');
    else if (cfg.enabled && perm === 'granted') status = h('p.note', 'Напоминание включено. Ровно в ' + cfg.time + ' — пока приложение открыто. Если оно закрыто, но установлено как приложение, браузер покажет фразу примерно в это время. Пропущенная фраза появится при следующем открытии.');
    else status = null;

    return h('div.card', h('h2', 'Фраза дня'),
      h('p', 'Каждый день — одна живая фраза с переводом. Она всегда есть на главной, а ещё может приходить уведомлением.'),
      h('label.switch', h('input', { type: 'checkbox', checked: cfg.enabled && perm !== 'denied', disabled: perm === 'unsupported' || perm === 'denied', on: { change: function (e) {
        var want = e.target.checked;
        if (!want) { setEnabled(false); redraw(); return; }
        Notification.requestPermission().then(function (p) {
          if (p === 'granted') { setEnabled(true); SM.ui.toast('Готово: фраза дня будет приходить в ' + settings().time + '.'); }
          else { setEnabled(false); SM.ui.toast('Без разрешения на уведомления напоминание не сработает.'); }
          redraw();
        });
      } } }), h('span', 'Присылать уведомление каждый день')),
      h('div.field.inline-field', h('label.field-label', { for: 'daily-time' }, 'Время'), timeInput),
      status,
      cfg.enabled && perm === 'granted' ? h('div.actions', h('button.btn.ghost', { type: 'button', on: { click: function () { show(true); } } }, SM.ui.icon('bell'), 'Показать сейчас')) : null,
      isPhone() ? h('details.more', h('summary', 'Почему уведомление может не прийти вовремя'),
        h('p.small', isIOS()
          ? 'На iPhone и iPad приложение без своего сервера не может присылать уведомления по расписанию: фраза придёт, только пока приложение открыто. Пропущенная фраза дня всегда ждёт на главной.'
          : 'На Android уведомление приходит ровно в заданное время, пока приложение открыто. Если оно закрыто, но установлено на главный экран, телефон покажет фразу примерно в это время — иногда позже, чтобы беречь батарею. Пропущенная фраза появится при следующем открытии.'))
      : h('details.more', h('summary', 'Чтобы уведомление приходило в 9:00, даже когда браузер закрыт'),
        h('p.small', 'Браузер не может гарантировать уведомление по расписанию, если он закрыт. Фраза дня всё равно меняется каждый день и ждёт на главной.')));
  }

  SM.daily = { init: init, onServiceWorker: onServiceWorker, show: show, homeCard: homeCard, settingsCard: settingsCard, notificationText: notificationText };
})(window.SM = window.SM || {});
