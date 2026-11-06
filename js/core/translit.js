/* Армянское письмо → транскрипция русскими буквами (восточноармянское произношение).
 * Учебный контент хранится армянскими буквами. Режимы показа (settings.script):
 *   cyr  — только армянские буквы (имя режима осталось от общего движка);
 *   lat  — только транскрипция;
 *   both — армянские буквы и транскрипция под ними.
 * Транскрипция — подсказка, а не точная запись: придыхание (թ, փ, ք, ց, չ) в ней не показано.
 * Невидимый [ы] восстанавливается по правилам самоучителя Тиоян, Григорян, Урутян (2007, с. 43):
 * между двумя начальными согласными (գրել [гырэл]) и перед конечными ր, ղ, ն, լ (տետր [тэтыр]).
 * Особые знаки: һ = հ (лёгкий выдох), ғ = ղ (горловое «г»). */
(function (SM) {
  'use strict';

  var MAP = {
    'ա': 'а', 'բ': 'б', 'գ': 'г', 'դ': 'д', 'ե': 'е', 'զ': 'з', 'է': 'э', 'ը': 'ы', 'թ': 'т', 'ժ': 'ж',
    'ի': 'и', 'լ': 'л', 'խ': 'х', 'ծ': 'ц', 'կ': 'к', 'հ': 'һ', 'ձ': 'дз', 'ղ': 'ғ', 'ճ': 'ч', 'մ': 'м',
    'յ': 'й', 'ն': 'н', 'շ': 'ш', 'ո': 'о', 'չ': 'ч', 'պ': 'п', 'ջ': 'дж', 'ռ': 'р', 'ս': 'с', 'վ': 'в',
    'տ': 'т', 'ր': 'р', 'ց': 'ц', 'ւ': 'в', 'փ': 'п', 'ք': 'к', 'օ': 'о', 'ֆ': 'ф', 'և': 'ев'
  };
  var ARM = /[Ա-Ֆա-և]/;
  // Слова, где начальное ո читается [о], а не [во].
  var O_WORDS = ['ով', 'ովքեր'];

  function isArm(c) { return !!c && ARM.test(c); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function wordAt(s, i) {
    var w = '';
    for (var k = i; k < s.length && (isArm(s[k]) || /[՞՛՜]/.test(s[k])); k++) if (isArm(s[k])) w += s[k];
    return w.toLowerCase();
  }

  /* ե: внутри слова [э], в начале слова [е]. Формы глагола «быть» читаются с [э];
   * ես в начале предложения — это «я» [ес], дальше в предложении — «ты есть» [эс]. */
  function eSound(s, i) {
    if (isArm(s[i - 1])) return 'э';
    var w = wordAt(s, i);
    if (['եմ', 'ենք', 'եք', 'են'].indexOf(w) !== -1) return 'э';
    if (w === 'ես' && !/(^|[։.!?՞]\s*)$/.test(s.slice(0, i).trim())) return 'э';
    return 'е';
  }

  /* Невидимый [ы]. Начальные сочетания ск, сп, ст и подобные его не получают, а перед յ его нет. */
  var VOWEL = /[աեէըիոօւև]/;
  var NO_SCHWA_START = ['սկ', 'սպ', 'ստ', 'սթ', 'սփ', 'զբ', 'զգ', 'շտ', 'հր', 'ֆր'];
  function addSchwa(word) {
    var w = word.toLowerCase();
    if (!VOWEL.test(w)) return word;
    var cons = function (c) { return !!c && isArm(c) && !VOWEL.test(c); };
    var out = word;
    if (cons(w[0]) && cons(w[1]) && w[1] !== 'յ' && NO_SCHWA_START.indexOf(w.slice(0, 2)) === -1) out = out[0] + 'ը' + out.slice(1);
    var last = w[w.length - 1], prev = w[w.length - 2];
    if ('րղնլ'.indexOf(last) !== -1 && cons(prev) && prev !== 'յ') out = out.slice(0, -1) + 'ը' + out.slice(-1);
    return out;
  }

  function toLatin(text) {
    if (!text) return '';
    // ՞ стоит внутри слова, а в транскрипции вопрос виден по знаку в конце предложения.
    var s = String(text).normalize('NFC').replace(/[\u0531-\u0556\u0561-\u0587՞՛՜]+/g, addSchwa).replace(/([^։]*՞[^։]*)(։|$)/g, function (m, body, end) { return body.trim() ? body.replace(/\s+$/, '') + '?' : m; });
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i], low = ch.toLowerCase();
      if (ch === '։') { out += '.'; continue; }
      if (ch === '՝') { out += ','; continue; }
      if (ch === '՞' || ch === '՛' || ch === '՜') continue;
      if (!isArm(ch)) { out += ch; continue; }
      var upper = ch !== low;
      var r;
      var nxt = s[i + 1] === '՞' ? s[i + 2] : s[i + 1];
      if (low === 'ո' && nxt && nxt.toLowerCase() === 'ւ') { r = 'у'; i = s[i + 1] === '՞' ? i + 2 : i + 1; }
      else if (low === 'ո' && !isArm(s[i - 1]) && O_WORDS.indexOf(wordAt(s, i)) === -1) r = 'во';
      else if (low === 'ե') r = eSound(s, i);
      else if (low === 'և') r = isArm(s[i - 1]) && !VOWEL.test(s[i - 1].toLowerCase()) ? 'эв' : 'ев';
      else r = MAP[low] !== undefined ? MAP[low] : ch;
      out += upper ? cap(r) : r;
    }
    return out;
  }

  function hasCyrillic(text) { return ARM.test(text || ''); } // имя из общего движка: «есть ли исходное письмо»
  function hasArmenian(text) { return ARM.test(text || ''); }

  function render(text, script) {
    if (script === 'lat') return toLatin(text);
    if (script === 'both' && hasArmenian(text)) return String(text) + ' / ' + toLatin(text);
    return String(text || '');
  }

  /* Ответ, набранный русскими или латинскими буквами, приводится к той же форме,
   * что и транскрипция эталона: так можно ответить и без армянской клавиатуры. */
  var LAT = [['shch', 'щ'], ['zh', 'ж'], ['kh', 'х'], ['gh', 'г'], ['sh', 'ш'], ['ch', 'ч'], ['ts', 'ц'], ['dz', 'дз'], ['ev', 'ев'],
    ['a', 'а'], ['b', 'б'], ['c', 'ц'], ['d', 'д'], ['e', 'е'], ['f', 'ф'], ['g', 'г'], ['h', 'х'], ['i', 'и'], ['j', 'дж'], ['k', 'к'], ['l', 'л'], ['m', 'м'],
    ['n', 'н'], ['o', 'о'], ['p', 'п'], ['q', 'к'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'], ['v', 'в'], ['w', 'в'], ['x', 'х'], ['y', 'й'], ['z', 'з']];

  function looseKey(text) {
    var s = (hasArmenian(text) ? toLatin(text) : String(text || '')).toLowerCase();
    LAT.forEach(function (p) { s = s.split(p[0]).join(p[1]); });
    return s.replace(/һ/g, 'х').replace(/ғ/g, 'г').replace(/э/g, 'е').replace(/ё/g, 'о').replace(/[ыьъ]/g, '')
      .replace(/я/g, 'йа').replace(/ю/g, 'йу').replace(/[^а-я0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  SM.translit = {
    toLatin: toLatin, render: render, hasCyrillic: hasCyrillic, hasArmenian: hasArmenian, looseKey: looseKey,
    containsRussianOnlyLetters: function () { return false; }
  };
})((typeof window !== 'undefined' ? window : self).SM = (typeof window !== 'undefined' ? window : self).SM || {});
