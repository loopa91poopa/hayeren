/* Аудио. Два источника, по приоритету:
 *  1. Свои записи из папки audio/ (список строит tools/build-audio-index.js
 *     в audio/index.js: «нормализованный текст → файл»). Подходит для озвучки
 *     голосами Edge, своих записей или записей носителя с его согласия.
 *  2. Синтез речи браузера (Web Speech API) — только если в системе есть
 *     армянский голос. Интерфейс помечает такое аудио как синтетическое.
 * Если нет ни файла, ни голоса, кнопки прослушивания не показываются.
 * У элемента контента может быть и явное поле audio: 'путь/к/файлу.mp3'. */
(function (SM) {
  'use strict';

  var synth = window.speechSynthesis || null;
  var voice = null;
  var readyCbs = [];
  var checked = false;

  function pickVoice() {
    if (!synth) return null;
    var voices = synth.getVoices() || [];
    var sr = voices.filter(function (v) { return /^hy(-|_|$)/i.test(v.lang); });
    if (!sr.length) return null;
    // Предпочитаем «естественные» онлайн‑голоса и вариант для Армении.
    sr.sort(function (a, b) { return score(b) - score(a); });
    return sr[0];
  }
  function score(v) {
    var s = 0;
    if (/AM/i.test(v.lang)) s += 2;
    if (/natural|online|neural/i.test(v.name)) s += 3;
    return s;
  }

  function refresh() {
    voice = pickVoice();
    checked = true;
    var cbs = readyCbs; readyCbs = [];
    cbs.forEach(function (cb) { cb(!!voice); });
  }

  if (synth) {
    if (synth.addEventListener) synth.addEventListener('voiceschanged', refresh);
    else synth.onvoiceschanged = refresh;
    refresh();
    // В некоторых браузерах список голосов появляется с задержкой.
    setTimeout(refresh, 600);
    setTimeout(refresh, 2000);
  } else {
    checked = true;
  }

  /* Ключ для поиска записи: армянский текст, нижний регистр, без знаков препинания.
   * Тот же ключ строит tools/build-audio-index.js. */
  function key(text) {
    return String(text || '').normalize('NFC').toLowerCase().replace(/[՞՛՜]/g, '').replace(/[^0-9\u0561-\u0587]+/g, ' ').trim();
  }
  function fileFor(entry) {
    if (!entry) return null;
    if (entry.audio) return entry.audio;
    var idx = SM.audioIndex || {};
    return idx[key(entry.text)] || null;
  }

  var currentAudio = null;

  function stop() {
    if (synth) synth.cancel();
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  }

  function speak(entry, opts) {
    if (!voice) { if (opts.onend) opts.onend(new Error('no-voice')); return false; }
    try {
      var u = new SpeechSynthesisUtterance(entry.text);
      u.voice = voice; u.lang = voice.lang;
      var baseRate = (SM.store && SM.store.get().settings.audioRate) || 1;
      u.rate = opts.slow ? 0.65 : baseRate;
      u.onend = function () { if (opts.onend) opts.onend(); };
      u.onerror = function (e) { if (opts.onend) opts.onend(e); };
      synth.speak(u);
      return true;
    } catch (e) {
      console.warn('Синтез речи не сработал', e);
      if (opts.onend) opts.onend(e);
      return false;
    }
  }

  /* entry: {text (армянскими буквами), audio?: url}; opts: {slow, onend} */
  function play(entry, opts) {
    opts = opts || {};
    stop();
    var file = fileFor(entry);
    if (file) {
      var a = currentAudio = new Audio(file);
      var failed = false;
      // Файл не открылся (удалён, нет в кэше) — пробуем синтез, если он есть.
      var fail = function () { if (failed) return; failed = true; if (currentAudio === a) currentAudio = null; if (voice) speak(entry, opts); else if (opts.onend) opts.onend(new Error('audio')); };
      a.playbackRate = opts.slow ? 0.75 : 1;
      a.onended = function () { if (opts.onend) opts.onend(); };
      a.onerror = fail;
      var p = a.play();
      if (p && p.catch) p.catch(function (e) { if (e && e.name === 'NotAllowedError') { if (opts.onend) opts.onend(e); } else fail(); });
      return true;
    }
    return speak(entry, opts);
  }

  /* Последовательное воспроизведение (диалог целиком). opts: {slow, gap, onItem, onDone} */
  function playSequence(entries, opts) {
    opts = opts || {};
    var i = 0, cancelled = false;
    function next() {
      if (cancelled || i >= entries.length) { if (opts.onDone && !cancelled) opts.onDone(); return; }
      if (opts.onItem) opts.onItem(i);
      var e = entries[i++];
      play(e, { slow: opts.slow, onend: function () { if (!cancelled) setTimeout(next, opts.gap || 350); } });
    }
    next();
    return { cancel: function () { cancelled = true; stop(); } };
  }

  SM.audio = {
    /* Есть ли способ воспроизвести этот элемент. */
    canPlay: function (entry) { return !!(entry && (fileFor(entry) || voice)); },
    /* Есть ли для текста своя запись (не синтез). */
    hasFile: function (text, explicit) { return !!fileFor({ text: text, audio: explicit }); },
    hasVoice: function () { return !!voice; },
    voiceName: function () { return voice ? voice.name + ' (' + voice.lang + ')' : null; },
    onReady: function (cb) { if (checked) cb(!!voice); else readyCbs.push(cb); },
    onVoicesChanged: function (cb) { if (synth && synth.addEventListener) synth.addEventListener('voiceschanged', function () { setTimeout(function () { cb(!!voice); }, 0); }); },
    fileCount: function () { return Object.keys(SM.audioIndex || {}).length; },
    key: key, play: play, playSequence: playSequence, stop: stop
  };
})(window.SM = window.SM || {});
