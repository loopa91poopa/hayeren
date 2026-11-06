/* Service worker: офлайн-режим и фоновая «фраза дня».
 * После первого открытия всё приложение берётся из кэша — сервер и интернет не нужны.
 * Стратегия «сначала сеть»: при работающем сервере файлы всегда свежие.
 * VERSION стоит менять, когда меняется список файлов ASSETS. */
'use strict';
var VERSION = 'hayeren-v3';
var META = 'hayeren-meta';
var ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'js/core/translit.js', 'js/core/checker.js', 'js/core/storage.js', 'js/core/srs.js', 'js/core/progress.js', 'js/core/audio.js', 'audio/index.js',
  'js/content/texts.js', 'js/content/vocab.js', 'js/content/lessons.js', 'js/content/dialogues.js',
  'js/content/course.js', 'js/content/exams.js', 'js/content/rules.js', 'js/content/diagnostic-bank.js', 'js/content/phrases.js',
  'js/core/diagnostic.js', 'js/core/planner.js', 'js/core/review.js',
  'js/ui/dom.js', 'js/ui/charpanel.js', 'js/ui/mascot.js', 'js/ui/player.js', 'js/ui/daily.js', 'js/ui/install.js',
  'js/views/start.js', 'js/views/learn.js', 'js/views/course.js', 'js/views/rules.js', 'js/views/info.js', 'js/app.js',
  'images/pug/celebrate.png', 'images/pug/eat.png', 'images/pug/explain.png', 'images/pug/greet.png', 'images/pug/joy.png', 'images/pug/laptop.png', 'images/pug/listen.png', 'images/pug/overwhelmed.png', 'images/pug/proud.png', 'images/pug/run.png', 'images/pug/sad.png', 'images/pug/shy.png', 'images/pug/sleep.png', 'images/pug/support.png', 'images/pug/surprised.png', 'images/pug/think.png', 'images/pug/travel.png', 'images/pug/writing.png'
];

self.window = self; // phrases.js и translit.js рассчитаны на window.SM
importScripts('js/core/translit.js', 'js/content/phrases.js');
try { importScripts('audio/index.js'); } catch (e) { /* записей нет — не страшно */ }

/* Свои аудиозаписи кэшируем по одной: отсутствующий файл не должен ломать установку. */
function audioFiles() {
  var idx = (self.SM && self.SM.audioIndex) || {};
  return Object.keys(idx).map(function (k) { return idx[k]; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ASSETS).then(function () {
      return Promise.all(audioFiles().map(function (u) { return c.add(u).catch(function () {}); }));
    }); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== META; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Сначала сеть (свежие файлы, если сервер доступен), без сети — кэш.
 * Если сервер не отвечает 3 секунды, тоже берём кэш, чтобы приложение не «висело». */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (cache) {
    var fromCache = function () {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return cache.match('index.html');
        return new Response('Нет сети, а этого файла нет в кэше.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      });
    };
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 3000); });
    var net = fetch(req).then(function (res) {
      if (res && res.status === 200) cache.put(req, res.clone()).catch(function () {});
      return res;
    }).catch(function () { return null; });
    return Promise.race([net, timeout]).then(function (res) { return res || fromCache(); });
  }));
});

// ── Фраза дня ─────────────────────────────────────────────────────────
function readMeta() {
  return caches.open(META).then(function (c) { return c.match('daily'); })
    .then(function (r) { return r ? r.json() : {}; }).catch(function () { return {}; });
}
function writeMeta(m) {
  return caches.open(META).then(function (c) { return c.put('daily', new Response(JSON.stringify(m), { headers: { 'Content-Type': 'application/json' } })); });
}
function todayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'daily-settings') {
    e.waitUntil(readMeta().then(function (m) {
      m.enabled = e.data.enabled; m.time = e.data.time; m.script = e.data.script;
      if (e.data.lastNotified) m.lastNotified = e.data.lastNotified;
      return writeMeta(m);
    }));
  }
});

function maybeNotify() {
  return readMeta().then(function (m) {
    if (!m.enabled) return;
    var parts = (m.time || '09:00').split(':');
    var now = new Date(), at = new Date();
    at.setHours(Number(parts[0]) || 9, Number(parts[1]) || 0, 0, 0);
    if (now < at || m.lastNotified === todayKey()) return;
    var p = self.SM.content.phraseOfDay(now);
    var lat = self.SM.translit.toLatin(p.sr);
    var title = 'Фраза дня: ' + (m.script === 'lat' ? lat : m.script === 'both' ? p.sr + ' · ' + lat : p.sr);
    m.lastNotified = todayKey();
    return writeMeta(m).then(function () {
      return self.registration.showNotification(title, {
        body: p.ru + (p.note ? '\n' + p.note.replace(/\{\{|\}\}/g, '') : ''),
        icon: 'icons/icon-192.png', tag: 'phrase-of-day', data: { url: './#/home' }
      });
    });
  });
}

self.addEventListener('periodicsync', function (e) {
  if (e.tag === 'phrase-of-day') e.waitUntil(maybeNotify());
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) { list[i].navigate(url); return list[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
