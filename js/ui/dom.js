/* Мелкие помощники для построения DOM без фреймворка. */
(function (SM) {
  'use strict';

  /* h('div.card#id', {attrs, on: {click}}, children…) */
  function h(tag, attrs) {
    var parts = tag.split(/(?=[.#])/);
    var el = document.createElement(parts[0] || 'div');
    parts.slice(1).forEach(function (p) {
      if (p[0] === '.') el.classList.add(p.slice(1)); else if (p[0] === '#') el.id = p.slice(1);
    });
    var children = Array.prototype.slice.call(arguments, 2);
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
        else if (k === 'class') String(v).split(' ').filter(Boolean).forEach(function (c) { el.classList.add(c); });
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style') el.setAttribute('style', v);
        else if (k in el && typeof v !== 'string') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    append(el, children);
    return el;
  }
  function append(el, children) {
    children.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) return append(el, c);
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    });
  }

  function script() { return SM.store.get().settings.script; }

  /* Армянский текст в выбранной (или заданной) письменности, с атрибутом lang. */
  function sr(text, opts) {
    opts = opts || {};
    var sc = opts.script || script();
    var el = document.createElement(opts.tag || 'span');
    el.className = 'sr' + (opts.cls ? ' ' + opts.cls : '');
    if (sc === 'both' && SM.translit.hasCyrillic(text)) {
      // Армянские буквы — основная строка, транскрипция — подпись под ней (или в скобках внутри фразы).
      el.classList.add('sr-both');
      var main = document.createElement('span'); main.className = 'sr-main'; main.lang = 'hy'; main.textContent = String(text);
      var alt = document.createElement('span'); alt.className = 'sr-alt'; alt.lang = 'ru'; alt.textContent = SM.translit.toLatin(text);
      el.appendChild(main); el.appendChild(alt);
      return el;
    }
    el.lang = sc === 'lat' ? 'ru' : 'hy';
    el.textContent = SM.translit.render(text, sc === 'both' ? 'cyr' : sc);
    return el;
  }

  /* Русский текст с вкраплениями {{армянского}}. */
  function rich(text, tag, cls) {
    var el = document.createElement(tag || 'span');
    if (cls) el.className = cls;
    String(text || '').split(/(\{\{[^}]*\}\})/).forEach(function (part) {
      var m = part.match(/^\{\{([^}]*)\}\}$/);
      if (m) el.appendChild(sr(m[1], { cls: 'sr-inline' }));
      else if (part) el.appendChild(document.createTextNode(part));
    });
    return el;
  }

  /* Грамматическая справка: целиком армянская, если в ней нет разметки {{…}}. */
  function gram(text) { return rich(String(text).indexOf('{{') === -1 ? '{{' + text + '}}' : text); }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  function icon(name) {
    var paths = {
      play: 'M8 5v14l11-7z',
      slow: 'M8 5v14l11-7z',
      stop: 'M7 7h10v10H7z',
      home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
      route: 'M6 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm12 12a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6 9v3a4 4 0 0 0 4 4h4',
      book: 'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h9',
      repeat: 'M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4',
      game: 'M7 9h4M9 7v4M15 10h.01M18 8h.01M6 5h12a3 3 0 0 1 3 3v7a3 3 0 0 1-5 2l-1.5-1.5h-5L8 17a3 3 0 0 1-5-2V8a3 3 0 0 1 3-3z',
      chat: 'M4 5h16v11H9l-5 4z',
      dict: 'M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zM9 8h6M9 12h6',
      chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
      // Шестерёнка с зубцами — чтобы не путать с «солнышком» переключателя темы.
      gear: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
      sun: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 1.5v2M12 20.5v2M4.6 4.6 6 6M18 18l1.4 1.4M1.5 12h2M20.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
      moon: 'M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z',
      bell: 'M18 8.5a6 6 0 0 0-12 0c0 6.5-3 8.5-3 8.5h18s-3-2-3-8.5M13.7 21a2 2 0 0 1-3.4 0',
      undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
      rules: 'M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2zM12 6.5v14',
      more: 'M5 12h.01M12 12h.01M19 12h.01',
      check: 'M5 12l5 5 9-10',
      close: 'M6 6l12 12M18 6 6 18',
      back: 'M15 5l-7 7 7 7',
      bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10.5c-.7.7-1 1.4-1 2.5H9c0-1.1-.3-1.8-1-2.5A6 6 0 0 1 12 3z',
      listen: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2zM20 15a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2z',
      eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
      search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-5-5'
    };
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'icon');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', paths[name] || '');
    if (name === 'play' || name === 'slow' || name === 'stop') { p.setAttribute('fill', 'currentColor'); }
    else { p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.8'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); }
    svg.appendChild(p);
    return svg;
  }

  /* Кнопка прослушивания. Возвращает null, если воспроизвести нечем —
   * тогда на экране нет неработающей кнопки. */
  function audioButtons(text, opts) {
    opts = opts || {};
    var entry = { text: text, audio: opts.audio };
    if (!SM.audio.canPlay(entry)) return null;
    var wrap = h('span.audio-btns');
    var play = h('button.btn-audio', { type: 'button', 'aria-label': 'Прослушать', title: SM.audio.hasFile(text, opts.audio) ? 'Прослушать (запись)' : 'Прослушать (синтез речи)', on:{ click: function () { SM.audio.play(entry); if (opts.onPlay) opts.onPlay(); } } }, icon('play'), opts.label ? h('span', opts.label) : null);
    wrap.appendChild(play);
    if (opts.slow !== false) {
      wrap.appendChild(h('button.btn-audio.slow', { type: 'button', 'aria-label': 'Прослушать медленно', title: 'Медленно', on: { click: function () { SM.audio.play(entry, { slow: true }); if (opts.onPlay) opts.onPlay(); } } }, '0.65×'));
    }
    return wrap;
  }

  /* Честная подпись под аудио. texts — фраза или список фраз, которые звучат. */
  function synthNote(texts) {
    var list = texts == null ? [] : [].concat(texts);
    var withFile = list.filter(function (t) { return SM.audio.hasFile(t); }).length;
    if (list.length && withFile === list.length) return h('p.synth-note', 'Аудио — запись из папки audio/ приложения.');
    var synthText = 'синтез речи браузера (' + (SM.audio.voiceName() || 'голос') + '), не запись носителя языка';
    if (withFile) return h('p.synth-note', 'Аудио: часть реплик — записи из папки audio/, остальное — ' + synthText + '.');
    return h('p.synth-note', 'Аудио — ' + synthText + '.');
  }

  function toast(msg) {
    var t = h('div.toast', { role: 'status' }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 2600);
  }

  /* Собственное окно подтверждения. Системный confirm() в некоторых окружениях
   * (встроенные браузеры, установленные PWA) блокируется и молча возвращает false. */
  function confirmDialog(o) {
    return new Promise(function (resolve) {
      var prev = document.activeElement;
      function done(v) { dlg.remove(); document.removeEventListener('keydown', onKey, true); if (prev && prev.focus) prev.focus(); resolve(v); }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); done(false); }
        if (e.key === 'Tab') { // фокус не выходит за пределы окна
          var f = dlg.querySelectorAll('button'); if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      }
      var titleId = 'dlg-' + Math.random().toString(36).slice(2, 7);
      var dlg = h('div.modal', { on: { click: function (e) { if (e.target === dlg) done(false); } } },
        h('div.modal-box.confirm', { role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
          o.mascot ? h('div.confirm-pug', { html: SM.ui.mascotImg(o.mascot, { decorative: true }) }) : null,
          h('h2', { id: titleId }, o.title),
          o.text ? h('p', o.text) : null,
          h('div.actions',
            h('button.btn.ghost', { type: 'button', on: { click: function () { done(false); } } }, o.cancel || 'Отмена'),
            h('button.btn' + (o.danger ? '.danger' : '.primary'), { type: 'button', on: { click: function () { done(true); } } }, o.ok || 'Да'))));
      document.body.appendChild(dlg);
      document.addEventListener('keydown', onKey, true);
      dlg.querySelector('.btn.ghost').focus();
    });
  }

  SM.ui = SM.ui || {};
  SM.ui.confirm = confirmDialog;
  SM.ui.h = h; SM.ui.sr = sr; SM.ui.rich = rich; SM.ui.gram = gram; SM.ui.clear = clear; SM.ui.icon = icon;
  SM.ui.audioButtons = audioButtons; SM.ui.synthNote = synthNote; SM.ui.toast = toast;
})(window.SM = window.SM || {});
