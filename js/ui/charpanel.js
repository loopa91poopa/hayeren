/* Поле ввода армянского текста со встроенной клавиатурой из всех букв.
 * Символ вставляется в позицию курсора (заменяя выделение), фокус остаётся в поле,
 * системная клавиатура работает как обычно. На телефоне своя клавиатура прячется:
 * inputmode="none" включается, когда ответ набирают только нашими кнопками. */
(function (SM) {
  'use strict';
  var h = SM.ui.h;

  // Буквы идут рядами в порядке алфавита: так их легче искать, пока раскладка незнакома.
  var ROWS = [
    ['ա', 'բ', 'գ', 'դ', 'ե', 'զ', 'է', 'ը', 'թ', 'ժ'],
    ['ի', 'լ', 'խ', 'ծ', 'կ', 'հ', 'ձ', 'ղ', 'ճ', 'մ'],
    ['յ', 'ն', 'շ', 'ո', 'չ', 'պ', 'ջ', 'ռ', 'ս', 'վ'],
    ['տ', 'ր', 'ց', 'ու', 'փ', 'ք', 'և', 'օ', 'ֆ']
  ];
  var MARKS = [['՞', 'Вопросительный знак — ставится над последней гласной вопросительного слова'], ['։', 'Точка'], ['՝', 'Короткая пауза'], ['՛', 'Восклицание, побуждение'], ['՜', 'Восклицательный знак']];

  function upperOf(ch) {
    if (ch === 'ու') return 'Ու';
    if (ch === 'և') return 'Եվ';
    return ch.toUpperCase();
  }

  function insertAtCursor(input, text) {
    var start = input.selectionStart, end = input.selectionEnd;
    if (typeof start !== 'number') { start = end = input.value.length; }
    if (input.setRangeText) {
      input.setRangeText(text, start, end, 'end');
    } else {
      input.value = input.value.slice(0, start) + text + input.value.slice(end);
      input.selectionStart = input.selectionEnd = start + text.length;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function backspace(input) {
    var start = input.selectionStart, end = input.selectionEnd;
    if (typeof start !== 'number') start = end = input.value.length;
    if (start === end && start > 0) start--;
    if (input.setRangeText) input.setRangeText('', start, end, 'end');
    else { input.value = input.value.slice(0, start) + input.value.slice(end); input.selectionStart = input.selectionEnd = start; }
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function keepFocus(btn) {
    // mousedown/pointerdown + preventDefault: поле не теряет фокус и выделение.
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') e.preventDefault(); });
  }

  /* opts: {value, multiline, placeholder, label, onInput(value), onEnter(), disabled, strict} */
  function armenianInput(opts) {
    opts = opts || {};
    var upper = false;
    var id = 'in-' + Math.random().toString(36).slice(2, 8);
    var common = { id: id, spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', lang: 'hy', placeholder: opts.placeholder || '' };
    var input = opts.multiline
      ? h('textarea.sr-input', Object.assign({ rows: 4 }, common))
      : h('input.sr-input', Object.assign({ type: 'text', autocorrect: 'off', enterkeyhint: 'done' }, common));
    input.value = opts.value || '';
    if (opts.disabled) input.disabled = true;
    // На телефоне системная клавиатура закрывала бы нашу: прячем её, пока человек сам не попросит.
    var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    var ownKeys = !!touch;
    function applyKeyboard() { if (touch) input.setAttribute('inputmode', ownKeys ? 'none' : 'text'); }
    applyKeyboard();
    input.addEventListener('input', function () { if (opts.onInput) opts.onInput(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !opts.multiline && opts.onEnter) { e.preventDefault(); opts.onEnter(); }
      if (e.key === 'Enter' && opts.multiline && (e.ctrlKey || e.metaKey) && opts.onEnter) { e.preventDefault(); opts.onEnter(); }
    });

    var caseBtn = h('button.char-key.case', { type: 'button', 'aria-pressed': 'false', title: 'Заглавные буквы', 'aria-label': 'Заглавные буквы' }, '⇧');
    var delBtn = h('button.char-key.case', { type: 'button', title: 'Стереть', 'aria-label': 'Стереть букву' }, '⌫');
    var spaceBtn = h('button.char-key.space', { type: 'button', 'aria-label': 'Пробел' }, 'пробел');
    [caseBtn, delBtn, spaceBtn].forEach(keepFocus);
    delBtn.addEventListener('click', function () { if (!input.disabled) { if (document.activeElement !== input) input.focus(); backspace(input); } });
    spaceBtn.addEventListener('click', function () { if (!input.disabled) { if (document.activeElement !== input) input.focus(); insertAtCursor(input, ' '); } });
    var rowsBox = h('div.charpanel-rows');

    function key(text, label, title) {
      var b = h('button.char-key', { type: 'button', 'aria-label': label, title: title || null, lang: 'hy' }, text);
      keepFocus(b);
      b.addEventListener('click', function () {
        if (input.disabled) return;
        if (document.activeElement !== input) input.focus();
        insertAtCursor(input, text);
        if (upper) setUpper(false);
      });
      return b;
    }

    function renderRows() {
      SM.ui.clear(rowsBox);
      ROWS.forEach(function (row) {
        var keys = h('div.charpanel-keys', { role: 'group', 'aria-label': 'Армянские буквы' });
        row.forEach(function (ch) { var out = upper ? upperOf(ch) : ch; keys.appendChild(key(out, 'Вставить ' + out)); });
        rowsBox.appendChild(keys);
      });
      var marks = h('div.charpanel-keys', { role: 'group', 'aria-label': 'Знаки и управление' }, caseBtn);
      MARKS.forEach(function (m) { marks.appendChild(key(m[0], m[1], m[1])); });
      marks.appendChild(spaceBtn); marks.appendChild(delBtn);
      rowsBox.appendChild(marks);
    }
    function setUpper(v) {
      upper = v; caseBtn.setAttribute('aria-pressed', String(v)); caseBtn.classList.toggle('on', v); renderRows();
    }
    caseBtn.addEventListener('click', function () { setUpper(!upper); });
    renderRows();

    var panel = h('div.charpanel', { role: 'group', 'aria-label': 'Армянская клавиатура' }, rowsBox);
    var hint = opts.strict ? 'Здесь нужны армянские буквы.' : 'Пишите армянскими буквами. Если совсем никак — ответ русскими буквами тоже засчитается.';
    var swap = touch ? h('button.btn-link.small', { type: 'button', on: { click: function () {
      ownKeys = !ownKeys; applyKeyboard(); swap.textContent = ownKeys ? 'Открыть клавиатуру телефона' : 'Только кнопки с буквами'; input.blur(); input.focus();
    } } }, 'Открыть клавиатуру телефона') : null;
    var wrap = h('div.sr-field',
      opts.label ? h('label.field-label', { for: id }, opts.label) : null,
      input, panel,
      h('p.field-hint', hint, ' ', swap));
    return {
      el: wrap, input: input,
      focus: function () { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } },
      value: function () { return input.value; },
      disable: function () { input.disabled = true; panel.classList.add('disabled'); }
    };
  }

  SM.ui.armenianInput = armenianInput;
  SM.ui._insertAtCursor = insertAtCursor;
})(window.SM = window.SM || {});
