/* Уроки курса: буквы → слова → предложения.
 * Шаг урока:
 *   {t:'explain', title, body, table?, rawTable?, examples?, contrast?, mistakes?, items?}
 *   {t:'intro', items:[id…]}                — знакомство с буквами и словами, по одной карточке
 *   {t:'ex', type, …}                       — упражнение
 * Упражнение описывается данными:
 *   type: choice | read_choice | listen_choice | dialogue | type | cloze | fix |
 *         transform | listen_type | order | match | write
 *   prompt — задание; sr — армянский стимул; options/optLang/correct — варианты;
 *   accept — допустимые ответы; tokens — фрагменты для сборки; pairs — пары;
 *   groups/model — для короткого текста; hints; explain; items — [[id, грань]]; skills; tag.
 *   forceScript: 'cyr' — показать только армянские буквы, без транскрипции (задания на чтение).
 *   strict — ответ принимается только армянскими буквами.
 * Уроки букв и слов строятся из данных функциями letterLesson и wordLesson, чтобы в каждом
 * были одинаковые шаги. Грамматические уроки написаны вручную.
 * В русском тексте фрагменты {{…}} — армянские. */
(function (SM) {
  'use strict';
  var L = {};
  var byId = SM.content.vocabById;
  function v(id) { return byId[id]; }
  function shortRu(x) { return x.ru.split(';')[0]; }
  function trans(s) { return SM.translit.toLatin(s).replace(/һ/g, 'h').replace(/ғ/g, 'гх'); }

  // Детерминированный «случайный» подбор: уроки одинаковы у всех и проверяются тестами.
  function pickOthers(list, self, n, key) {
    var seen = {}, out = [], start = list.indexOf(self) + 1;
    seen[key(self)] = true;
    for (var i = 0; i < list.length && out.length < n; i++) {
      var c = list[(start + i * 2 + 1) % list.length], k = key(c);
      if (c !== self && !seen[k]) { seen[k] = true; out.push(c); }
    }
    for (i = 0; i < list.length && out.length < n; i++) {
      var d = list[i];
      if (!seen[key(d)]) { seen[key(d)] = true; out.push(d); }
    }
    return out;
  }

  var knownLetters = [];   // буквы из пройденных уроков — для вариантов ответа
  var knownWords = [];

  function letterLesson(d) {
    var letters = d.letters.map(function (k) { return v('l_' + k); });
    var words = d.words.map(v);
    knownLetters = knownLetters.concat(letters);
    knownWords = knownWords.concat(words);
    var steps = [];
    var table = [['Буква', 'Название', 'Звук']].concat(letters.map(function (l) { return [l.sr, l.letterName, l.ru]; }));
    steps.push({ t: 'explain', title: d.head, body: d.body, rawTable: true, table: table, contrast: d.contrast });
    steps.push({ t: 'intro', items: letters.map(function (l) { return l.id; }) });
    steps.push({ t: 'ex', id: d.id + '-m', type: 'match', skills: ['reading'], items: letters.map(function (l) { return [l.id, 'recognition']; }), tag: 'letters',
      prompt: 'Соедините буквы со звуками.', pairs: letters.map(function (l) { return [l.sr, l.ru]; }), leftLang: 'ru', rightLang: 'ru' });
    letters.forEach(function (l, i) {
      var pool = knownLetters.length >= 4 ? knownLetters : SM.content.letters;
      var wrong = pickOthers(pool, l, 2, function (x) { return x.ru; });
      steps.push({ t: 'ex', id: d.id + '-s' + i, type: 'choice', skills: ['reading'], items: [[l.id, 'recognition']], tag: 'letters', forceScript: 'cyr',
        prompt: 'Какой звук передаёт эта буква?', sr: l.lower, options: [l.ru].concat(wrong.map(function (x) { return x.ru; })), optLang: 'ru', correct: 0 });
      var wrong2 = pickOthers(pool, l, 2, function (x) { return x.lower; });
      steps.push({ t: 'ex', id: d.id + '-c' + i, type: 'choice', skills: ['reading'], items: [[l.id, 'recognition']], tag: 'letters', forceScript: 'cyr',
        prompt: 'Какая заглавная буква соответствует строчной?', sr: l.lower, options: [l.upper].concat(wrong2.map(function (x) { return x.upper; })), optLang: 'ru', correct: 0 });
    });
    steps.push({ t: 'explain', title: 'Читаем слова', body: d.wordsBody || 'Теперь из этих букв складываются слова. На карточках есть подпись русскими буквами — но старайтесь прочитать сами, прежде чем смотреть на неё.' });
    steps.push({ t: 'intro', items: d.words });
    words.forEach(function (w, i) {
      var others = pickOthers(knownWords, w, 2, shortRu);
      steps.push({ t: 'ex', id: d.id + '-r' + i, type: 'choice', skills: ['reading', 'vocab'], items: [[w.id, 'recognition']], tag: 'reading-letters', forceScript: 'cyr',
        prompt: 'Прочитайте слово и выберите перевод.', sr: w.sr, options: [shortRu(w)].concat(others.map(shortRu)), optLang: 'ru', correct: 0 });
    });
    words.slice(0, 3).forEach(function (w, i) {
      var chars = w.sr.toLowerCase().split('');
      // ու — один звук и одна фишка
      var tokens = [];
      for (var k = 0; k < chars.length; k++) {
        if (chars[k] === 'ո' && chars[k + 1] === 'ւ') { tokens.push('ու'); k++; } else tokens.push(chars[k]);
      }
      if (tokens.length >= 2) {
        steps.push({ t: 'ex', id: d.id + '-o' + i, type: 'order', skills: ['writing'], items: [[w.id, 'recall']], tag: 'reading-letters', forceScript: 'cyr',
          prompt: 'Соберите слово «' + shortRu(w) + '» [' + trans(w.sr).toLowerCase() + '].', tokens: tokens, accept: [tokens.join(' ')] });
      }
    });
    words.slice(0, 2).forEach(function (w, i) {
      steps.push({ t: 'ex', id: d.id + '-w' + i, type: 'type', skills: ['writing'], items: [[w.id, 'recall']], tag: 'reading-letters', recall: true, strict: true,
        prompt: 'Напишите армянскими буквами: «' + shortRu(w) + '» [' + trans(w.sr).toLowerCase() + '].', accept: [w.sr.toLowerCase()].concat(w.alt || []), hints: ['Первая буква: {{' + w.sr.charAt(0).toLowerCase() + '}}.'] });
    });
    L[d.id] = { id: d.id, title: d.title, ru: d.ru, goal: d.goal, topics: ['letters'], minutes: 12, steps: steps, builds: d.builds };
  }

  // ═══════════════════════ Этап 1: буквы ═══════════════════════
  letterLesson({ id: 'a-1', title: 'Ա Մ Ն Ս Ր', ru: 'Первые пять букв', head: 'Первые буквы',
    goal: 'Узнавать буквы ա, մ, ն, ս, ր и читать первые слова.',
    body: 'В армянском алфавите 39 букв. Его создал Месроп Маштоц в начале V века, и почти все буквы с тех пор не менялись. Хорошая новость: армянский читается почти так, как пишется. Начнём с пяти букв — их уже хватает на настоящие слова.',
    contrast: 'У каждой буквы есть заглавная и строчная форма. Часто они не похожи друг на друга, поэтому учите обе.',
    letters: ['a', 'm', 'n', 's', 'r'], words: ['na', 'sar', 'mas', 'mama', 'aman'] });
  letterLesson({ id: 'a-2', title: 'Ո ՈՒ Ի Տ Կ', ru: 'Гласные о, у, и; согласные т и к', head: 'Гласные и сухие согласные', builds: ['a-1'],
    goal: 'Читать ո, ու, ի, տ, կ и понимать правило начального ո.',
    body: 'Звук [у] пишется двумя буквами вместе: {{ու}}. Буква {{ո}} в начале слова читается [во], а внутри слова — [о]. Звуки {{տ}} и {{կ}} — «сухие»: без лёгкого выдоха после них.',
    contrast: 'Сравните: {{որ}} читается [вор], а {{նոր}} — [нор].',
    letters: ['o', 'u', 'i', 't', 'k'], words: ['tun', 'kin', 'anun', 'katu', 'muk', 'nor', 'sirun', 'tari', 'karmir', 'ur', 'mi'] });
  letterLesson({ id: 'a-3', title: 'Ե Է Բ Գ Դ', ru: 'Два звука «э» и звонкие б, г, д', head: 'Как читать ե и է', builds: ['a-2'],
    goal: 'Различать ե и է, читать բ, գ, դ.',
    body: 'Буква {{ե}} в начале слова читается [е], внутри слова — [э]. Буква {{է}} всегда [э]. Буквы {{բ}}, {{գ}}, {{դ}} звучат как русские «б», «г», «д». На конце слова звонкие не оглушаются: {{գիրք}} и {{դաս}} читаются как написано.',
    contrast: 'Слово {{ես}} значит «я» и читается [ес]. Это же написание — форма «ты есть»: тогда оно читается [эс].',
    letters: ['e', 'ee', 'b', 'g', 'd'], words: ['es', 'du', 'e_is', 'mek', 'erku', 'bari', 'gini', 'das', 'get', 'ser', 'mer'] });
  letterLesson({ id: 'a-4', title: 'Յ Հ Վ Լ Օ', ru: 'Буквы й, h, в, л, о', head: 'Буквы для слова «армянин»', builds: ['a-3'],
    goal: 'Читать յ, հ, վ, լ, օ. Написать слова հայ и Հայաստան.',
    body: 'С этими буквами уже можно написать {{հայ}} — «армянин» и {{Հայաստան}} — «Армения». Буква {{հ}} — лёгкий выдох, в транскрипции он обозначен знаком һ. Буква {{օ}} всегда [о]: она нужна, когда слово начинается с [о] без [в].',
    contrast: 'В транскрипции русскими буквами армянское h показано знаком һ, а горловое ղ — знаком ғ.',
    letters: ['y', 'h', 'v', 'l', 'oo'], words: ['hay', 'hayr', 'mayr', 'ayo', 'or', 'lav', 'hav', 'lusin', 'hing', 'hayeren', 'hayastan', 'ays', 'vard', 'het'] });
  letterLesson({ id: 'a-5', title: 'Ը Շ Ժ Զ Ֆ', ru: 'Короткий [ы] и шипящие', head: 'Короткий гласный и шипящие', builds: ['a-4'],
    goal: 'Читать ը, շ, ժ, զ, ֆ. Понимать, что такое «невидимый» гласный.',
    body: 'Буква {{ը}} — короткий глухой гласный, средний между «ы» и «э». Он часто звучит, хотя не написан: между двумя согласными в начале слова ({{գրել}} [гырэл]) и перед конечными {{ր, ղ, ն, լ}} ({{տետր}} [тэтыр]). Буква {{ը}} пишется в начале некоторых слов и как окончание: {{ընկեր}}, {{տասը}}.',
    contrast: 'На письме {{ը}} видно не всегда — это единственное серьёзное отличие письма от произношения.',
    letters: ['schwa', 'sh', 'zh', 'z', 'f'], words: ['zham', 'shun', 'shat', 'ashun', 'film', 'zang', 'ynker', 'mard', 'tasy'] });
  letterLesson({ id: 'a-6', title: 'Ծ Ց Ձ Ջ Չ', ru: 'Звуки ц, дз, дж, ч', head: 'Семейство «ц» и «ч»', builds: ['a-5'],
    goal: 'Различать ծ и ց, читать ձ, ջ, չ.',
    body: 'В русском одно «ц», а в армянском их два: сухое {{ծ}} и с выдохом {{ց}}. То же с «ч»: {{չ}} — с выдохом, а сухое {{ճ}} будет в следующем уроке. {{ձ}} — слитное «дз», {{ջ}} — слитное «дж».',
    contrast: 'Выдох — это маленькая струя воздуха после звука. Поднесите ладонь ко рту: на {{ց}} она чувствуется, на {{ծ}} — нет.',
    letters: ['ts', 'tsh', 'dz', 'j', 'chh'], words: ['hats', 'jur', 'dzuk', 'dzi', 'tsov', 'mets', 'voch', 'dzyun', 'chors', 'vets', 'dzer'] });
  letterLesson({ id: 'a-7', title: 'Ճ Թ Փ Ք Պ', ru: 'Пары с выдохом и без', head: 'Сухие и с выдохом', builds: ['a-6'],
    goal: 'Различать пары տ–թ, պ–փ, կ–ք, ճ–չ.',
    body: 'Теперь видна вся система. Для русского уха многие из этих звуков похожи, а для армянского — разные: от этого меняется смысл.',
    contrast: 'Пары: {{տ}} — {{թ}}, {{պ}} — {{փ}}, {{կ}} — {{ք}}, {{ծ}} — {{ց}}, {{ճ}} — {{չ}}. Первая буква — сухая, вторая — с лёгким выдохом.',
    letters: ['ch', 'th', 'ph', 'kh2', 'p'], words: ['tey', 'quyr', 'panir', 'girq', 'qar', 'chash', 'poqr', 'ereq', 'ut', 'iny', 'menq', 'duq', 'qo', 'yot'] });
  letterLesson({ id: 'a-8', title: 'Ղ Խ Ռ և', ru: 'Последние буквы', head: 'Последние четыре буквы', builds: ['a-7'],
    goal: 'Читать ղ, խ, ռ, և. Знать весь алфавит.',
    body: 'Осталось четыре буквы. {{ղ}} — горловой звук, близкий к французскому r. {{խ}} — как русское «х», но глубже. {{ռ}} — раскатистое «р», в отличие от мягкого {{ր}}. {{և}} — лигатура: в начале слова и после гласной читается [ев], после согласной [эв]. Сама по себе значит «и».',
    contrast: 'Заглавной буквы {{և}} нет: в начале предложения пишут {{Եվ}}.',
    letters: ['gh', 'x', 'rr', 'ev'], words: ['agh', 'khagh', 'aghjik', 'tgha', 'tsar', 'durr', 'amarr', 'barev', 'arev', 'ev', 'qaghaq', 'russ', 'khndzor', 'eghbayr', 'tsaghik'] });

  L['a-read'] = {
    id: 'a-read', title: 'Կարդում ենք', ru: 'Читаем: правила и знаки', goal: 'Применить правила чтения и узнавать армянские знаки препинания.',
    topics: ['letters'], minutes: 12, builds: ['a-8'],
    steps: [
      { t: 'explain', title: 'Армянская пунктуация', body: 'Знаки препинания в армянском свои. Точка похожа на двоеточие, а вопросительный знак ставится не в конце, а над последней гласной вопросительного слова.',
        rawTable: true, table: [['Знак', 'Название', 'Что значит'], ['։', 'վերջակետ', 'точка'], ['՞', 'հարցական', 'вопрос: над гласной'], ['՛', 'շեշտ', 'восклицание, побуждение'], ['՝', 'բութ', 'короткая пауза'], [',', 'ստորակետ', 'запятая']],
        examples: [{ sr: 'Ինչպե՞ս ես։', ru: 'Как дела?' }, { sr: 'Ես հայ եմ։', ru: 'Я армянин.' }],
        contrast: 'Армянская точка {{։}} похожа на наше двоеточие. Не перепутайте.' },
      { t: 'ex', id: 'rd1', type: 'choice', skills: ['reading'], items: [], tag: 'reading-letters', prompt: 'Что значит знак «։» в конце предложения?', options: ['точка', 'двоеточие', 'вопрос'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'rd2', type: 'choice', skills: ['reading'], items: [], tag: 'reading-letters', forceScript: 'cyr', prompt: 'В каком слове стоит знак вопроса?', options: ['Որտե՞ղ', 'Որտեղ', 'Որտեղ։'], optLang: 'sr', correct: 0 },
      { t: 'explain', title: 'Как читать ո, ե и ու', body: 'Повторим три правила чтения. Они работают почти без исключений.',
        examples: [{ sr: 'որդի', ru: 'ո в начале слова — [во]: [ворди]' }, { sr: 'նոր', ru: 'ո внутри слова — [о]' }, { sr: 'երկու', ru: 'ե в начале — [е]; ու — один звук [у]' }, { sr: 'մեկ', ru: 'ե внутри слова — [э]' }],
        contrast: 'Исключения: {{ով}} (кто) читается [ов], а глагол {{եմ}} (я есть) — [эм].' },
      { t: 'ex', id: 'rd3', type: 'choice', skills: ['reading'], items: [], tag: 'reading-letters', forceScript: 'cyr', prompt: 'Как читается это слово?', sr: 'որ', options: ['[вор]', '[ор]', '[ур]'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'rd4', type: 'choice', skills: ['reading'], items: [['nor', 'recognition']], tag: 'reading-letters', forceScript: 'cyr', prompt: 'Как читается это слово?', sr: 'նոր', options: ['[нор]', '[нвор]', '[нур]'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'rd5', type: 'choice', skills: ['reading'], items: [['erku', 'recognition']], tag: 'reading-letters', forceScript: 'cyr', prompt: 'Как читается это слово?', sr: 'երկու', options: ['[ерку]', '[эркво]', '[ирку]'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'rd6', type: 'choice', skills: ['reading'], items: [['barev', 'recognition']], tag: 'reading-letters', forceScript: 'cyr', prompt: 'Как читается это слово?', sr: 'բարև', options: ['[барэв]', '[бараб]', '[парев]'], optLang: 'ru', correct: 0 },
      { t: 'explain', title: 'Ударение', body: 'Ударение в армянском почти всегда падает на последний слог: {{հայերեն}} — [hайерЭн]. На письме оно не показано, но угадывать почти не приходится.',
        examples: [{ sr: 'Հայաստան', ru: '[hайастАн]' }, { sr: 'երեխա', ru: '[ерэхА]' }],
        contrast: 'Если слово оканчивается на {{ը}}, ударение падает на предыдущий слог: {{տասը}} — [тАсы].' },
      { t: 'ex', id: 'rd7', type: 'choice', skills: ['reading'], items: [], tag: 'reading-letters', prompt: 'На какой слог обычно падает ударение?', options: ['на последний', 'на первый', 'на любой'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'rd8', type: 'read_choice', skills: ['reading'], items: [['hayastan', 'recognition']], tag: 'reading-letters', forceScript: 'cyr', prompt: 'Прочитайте без транскрипции.', text: 'Բարև։ Ես Աննան եմ։ Ես հայ չեմ, բայց սիրում եմ Հայաստանը։',
        gloss: 'բայց — но', question: 'Что Анна говорит об Армении?', options: ['Что она её любит', 'Что она там живёт', 'Что она армянка'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'rd9', type: 'type', skills: ['writing'], items: [['hayastan', 'recall']], tag: 'reading-letters', recall: true, strict: true, prompt: 'Напишите армянскими буквами: «Армения» [hайастан].', accept: ['Հայաստան'], hints: ['Начинается с заглавной {{Հ}}.'] }
    ]
  };

  L['a-check'] = {
    id: 'a-check', title: 'Ստուգում', ru: 'Проверка: весь алфавит', checkpoint: true, goal: 'Проверить, как держатся все 39 букв, перед экзаменом.',
    topics: ['letters'], minutes: 10, builds: ['a-read'],
    steps: [
      { t: 'ex', id: 'ck1', type: 'match', skills: ['reading'], items: [], tag: 'letters', prompt: 'Соедините пары: буква без выдоха — буква с выдохом.', pairs: [['տ', 'թ'], ['պ', 'փ'], ['կ', 'ք'], ['ծ', 'ց'], ['ճ', 'չ']], leftLang: 'ru', rightLang: 'ru' },
      { t: 'ex', id: 'ck2', type: 'match', skills: ['reading'], items: [], tag: 'letters', prompt: 'Соедините заглавные и строчные буквы.', pairs: [['Ա', 'ա'], ['Բ', 'բ'], ['Գ', 'գ'], ['Դ', 'դ'], ['Ե', 'ե'], ['Հ', 'հ']], leftLang: 'ru', rightLang: 'ru' },
      { t: 'ex', id: 'ck3', type: 'match', skills: ['reading'], items: [], tag: 'letters', prompt: 'Соедините заглавные и строчные буквы.', pairs: [['Մ', 'մ'], ['Ն', 'ն'], ['Շ', 'շ'], ['Ռ', 'ռ'], ['Ր', 'ր'], ['Ք', 'ք']], leftLang: 'ru', rightLang: 'ru' },
      { t: 'ex', id: 'ck4', type: 'choice', skills: ['reading'], items: [['l_rr', 'recognition']], tag: 'letters', forceScript: 'cyr', prompt: 'Какая буква — раскатистое [рр]?', options: ['ռ', 'ր', 'ղ'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'ck5', type: 'choice', skills: ['reading'], items: [['tun', 'recognition']], tag: 'reading-letters', forceScript: 'cyr', prompt: 'Выберите перевод.', sr: 'տուն', options: ['дом', 'имя', 'день'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'ck6', type: 'choice', skills: ['reading'], items: [['quyr', 'recognition']], tag: 'reading-letters', forceScript: 'cyr', prompt: 'Выберите перевод.', sr: 'քույր', options: ['сестра', 'брат', 'мать'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'ck7', type: 'choice', skills: ['reading'], items: [['jur', 'recognition']], tag: 'reading-letters', forceScript: 'cyr', prompt: 'Выберите перевод.', sr: 'ջուր', options: ['вода', 'рыба', 'хлеб'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'ck8', type: 'type', skills: ['writing'], items: [['mayr', 'recall']], tag: 'reading-letters', recall: true, strict: true, prompt: 'Напишите армянскими буквами: «мать» [майр].', accept: ['մայր'] },
      { t: 'ex', id: 'ck9', type: 'type', skills: ['writing'], items: [['girq', 'recall']], tag: 'reading-letters', recall: true, strict: true, prompt: 'Напишите армянскими буквами: «книга» [гирк].', accept: ['գիրք'], hints: ['{{к}} здесь с выдохом: буква {{ք}}.'] },
      { t: 'ex', id: 'ck10', type: 'type', skills: ['writing'], items: [['barev', 'recall']], tag: 'reading-letters', recall: true, strict: true, prompt: 'Напишите армянскими буквами: «привет» [барэв].', accept: ['բարև'], hints: ['В конце — лигатура {{և}}.'] }
    ]
  };

  /* Урок слов: карточки, сопоставление, узнавание, письмо; extra — ручные задания в конце. */
  function wordLesson(d) {
    var words = d.words.map(v);
    var steps = [];
    if (d.body) steps.push({ t: 'explain', title: d.head, body: d.body, examples: d.examples, contrast: d.contrast });
    var pool = words.concat(knownWords);
    for (var c = 0; c < words.length; c += 6) {
      var part = words.slice(c, c + 6);
      steps.push({ t: 'intro', items: part.map(function (w) { return w.id; }) });
      steps.push({ t: 'ex', id: d.id + '-m' + c, type: 'match', skills: ['vocab'], items: part.map(function (w) { return [w.id, 'recognition']; }), tag: d.tag,
        prompt: 'Соедините слова с переводами.', pairs: part.map(function (w) { return [w.sr, shortRu(w)]; }) });
      part.forEach(function (w, i) {
        var others = pickOthers(pool, w, 2, shortRu);
        if (i % 2 === 0) steps.push({ t: 'ex', id: d.id + '-r' + (c + i), type: 'choice', skills: ['vocab', 'reading'], items: [[w.id, 'recognition']], tag: d.tag, forceScript: 'cyr',
          prompt: 'Что это значит?', sr: w.sr, options: [shortRu(w)].concat(others.map(shortRu)), optLang: 'ru', correct: 0 });
        else steps.push({ t: 'ex', id: d.id + '-l' + (c + i), type: 'listen_choice', skills: ['listening'], items: [[w.id, 'listening']], tag: d.tag,
          prompt: 'Прослушайте и выберите значение.', sr: w.sr, options: [shortRu(w)].concat(others.map(shortRu)), optLang: 'ru', correct: 0 });
      });
    }
    words.slice(0, 5).forEach(function (w, i) {
      steps.push({ t: 'ex', id: d.id + '-w' + i, type: 'type', skills: ['writing', 'vocab'], items: [[w.id, 'recall']], tag: d.tag, recall: true,
        prompt: 'Как по-армянски «' + shortRu(w) + '»?', accept: [w.sr].concat(w.alt || []) });
    });
    (d.extra || []).forEach(function (e) { steps.push(Object.assign({ t: 'ex' }, e)); });
    knownWords = knownWords.concat(words);
    L[d.id] = { id: d.id, title: d.title, ru: d.ru, goal: d.goal, topics: [d.tag], minutes: 15, steps: steps, builds: d.builds };
  }

  // ═══════════════════════ Этап 2: слова ═══════════════════════
  wordLesson({ id: 'w-greet', title: 'Բարև', ru: 'Приветствия и вежливость', head: 'Без этого никуда',
    goal: 'Здороваться, прощаться, благодарить и просить.', tag: 'greetings',
    body: 'В армянском, как в русском, есть «ты» и «Вы». С незнакомыми говорят на «Вы»: {{Բարև ձեզ}}, с друзьями — просто {{Բարև}}.',
    examples: [{ sr: 'Բարև ձեզ։', ru: 'Здравствуйте.' }, { sr: 'Ինչպե՞ս ես։', ru: 'Как дела? (на «ты»)' }],
    words: ['barev_dzez', 'bari_luys', 'bari_or', 'bari_ereko', 'bari_gisher', 'tstesutyun', 'shnorh', 'mersi', 'khndrem', 'neretseq', 'inchpes_es', 'lav_em'],
    extra: [
      { id: 'wg1', type: 'dialogue', skills: ['pragmatics'], items: [['lav_em', 'context']], tag: 'greetings', prompt: 'Друг спрашивает:', sr: 'Ինչպե՞ս ես։', options: ['Լավ եմ, շնորհակալություն։', 'Բարի գիշեր։', 'Ներեցեք։'], optLang: 'sr', correct: 0 },
      { id: 'wg2', type: 'choice', skills: ['pragmatics'], items: [['barev_dzez', 'context']], tag: 'register', prompt: 'Вы входите в кабинет к незнакомому врачу. Что уместно сказать?', options: ['Բարև ձեզ։', 'Բարև։', 'Ցտեսություն։'], optLang: 'sr', correct: 0 },
      { id: 'wg3', type: 'choice', skills: ['pragmatics'], items: [['khndrem', 'recognition']], tag: 'greetings', prompt: 'Вам сказали {{շնորհակալություն}}. Что ответить?', options: ['Խնդրեմ։', 'Ներեցեք։', 'Բարի լույս։'], optLang: 'sr', correct: 0 }
    ] });
  wordLesson({ id: 'w-intro', title: 'Ծանոթություն', ru: 'Знакомство', head: 'Как познакомиться', builds: ['w-greet'],
    goal: 'Назвать себя, спросить имя, сказать, что вы не поняли.', tag: 'names',
    body: 'Чтобы сказать, как вас зовут, в армянском говорят «моё имя — Анна». Глагол «есть» стоит в конце: {{Իմ անունն Աննա է։}}',
    examples: [{ sr: 'Ի՞նչ է քո անունը։', ru: 'Как тебя зовут?' }, { sr: 'Իմ անունն Աննա է։', ru: 'Меня зовут Анна.' }],
    words: ['im', 'anunn_inch', 'hachelie', 'ruserenk', 'rusastan', 'erevan', 'ayste', 'hasknum', 'krknir'],
    extra: [
      { id: 'wi1', type: 'order', skills: ['grammar'], items: [['anun', 'context']], tag: 'names', prompt: 'Соберите фразу «Меня зовут Анна».', tokens: ['անունն', 'է', 'Իմ', 'Աննա'], accept: ['Իմ անունն Աննա է'] },
      { id: 'wi2', type: 'dialogue', skills: ['pragmatics'], items: [['hachelie', 'context']], tag: 'names', prompt: 'Вам представились:', sr: 'Իմ անունն Արամ է։', options: ['Շատ հաճելի է։', 'Բարի գիշեր։', 'Չեմ ուզում։'], optLang: 'sr', correct: 0 }
    ] });
  wordLesson({ id: 'w-num', title: 'Թվեր', ru: 'Числа и цены', head: 'Считаем', builds: ['w-intro'],
    goal: 'Считать до десяти и дальше, спрашивать цену.', tag: 'numbers',
    body: 'Числа от одного до десяти вы уже читали: {{մեկ}}, {{երկու}}, {{երեք}}, {{չորս}}, {{հինգ}}, {{վեց}}, {{յոթ}}, {{ութ}}, {{ինը}}, {{տասը}}. Числа складываются как в русском: {{քսան հինգ}} — двадцать пять.',
    contrast: 'После числа существительное остаётся в единственном числе: {{երկու գիրք}} — «две книги», буквально «два книга».',
    words: ['qsan', 'haryur', 'hazar', 'dram', 'qani', 'inch_arzhe'],
    extra: [
      { id: 'wn1', type: 'match', skills: ['vocab'], items: [['mek', 'recognition'], ['erku', 'recognition'], ['ereq', 'recognition'], ['chors', 'recognition'], ['hing', 'recognition']], tag: 'numbers', prompt: 'Соедините числа.', pairs: [['մեկ', '1'], ['երկու', '2'], ['երեք', '3'], ['չորս', '4'], ['հինգ', '5']] },
      { id: 'wn2', type: 'match', skills: ['vocab'], items: [['vets', 'recognition'], ['yot', 'recognition'], ['ut', 'recognition'], ['iny', 'recognition'], ['tasy', 'recognition']], tag: 'numbers', prompt: 'Соедините числа.', pairs: [['վեց', '6'], ['յոթ', '7'], ['ութ', '8'], ['ինը', '9'], ['տասը', '10']] },
      { id: 'wn3', type: 'type', skills: ['writing'], items: [['erku', 'recall']], tag: 'numbers', recall: true, prompt: 'Напишите по-армянски: «две книги».', accept: ['երկու գիրք'], hints: ['После числа — единственное число.'] },
      { id: 'wn4', type: 'listen_choice', skills: ['listening'], items: [['dram', 'listening']], tag: 'numbers', prompt: 'Прослушайте. Сколько это стоит?', sr: 'Հինգ հարյուր դրամ։', options: ['500 драмов', '50 драмов', '5000 драмов'], optLang: 'ru', correct: 0 }
    ] });
  wordLesson({ id: 'w-family', title: 'Ընտանիք', ru: 'Семья', head: 'Моя семья', builds: ['w-num'],
    goal: 'Называть родственников.', tag: 'family',
    body: 'Часть слов вы уже знаете: {{մայր}}, {{հայր}}, {{քույր}}, {{եղբայր}}, {{աղջիկ}}. Рода в армянском нет: одно слово {{նա}} значит и «он», и «она», а прилагательные не меняются.',
    examples: [{ sr: 'Սա իմ մայրն է։', ru: 'Это моя мать.' }, { sr: 'Սա իմ հայրն է։', ru: 'Это мой отец.' }],
    words: ['yntaniq', 'vordi', 'tatik', 'papik', 'amusin', 'erekha', 'mayrik', 'hayrik'],
    extra: [
      { id: 'wf1', type: 'order', skills: ['grammar'], items: [['yntaniq', 'context']], tag: 'family', prompt: 'Соберите фразу «Моя семья большая».', tokens: ['մեծ', 'ընտանիքը', 'է', 'Իմ'], accept: ['Իմ ընտանիքը մեծ է'] },
      { id: 'wf2', type: 'type', skills: ['writing'], items: [['quyr', 'recall']], tag: 'family', recall: true, prompt: 'Как по-армянски «сестра»?', accept: ['քույր'] }
    ] });
  wordLesson({ id: 'w-people', title: 'Մարդիկ', ru: 'Люди и работа', head: 'Кто есть кто', builds: ['w-family'],
    goal: 'Называть профессии и людей.', tag: 'people',
    words: ['usanogh', 'usutsich', 'bzhishk', 'varord', 'ashkhatanq', 'ynkeruhi', 'tghamard'],
    extra: [{ id: 'wp1', type: 'order', skills: ['grammar'], items: [['usanogh', 'context']], tag: 'people', prompt: 'Соберите фразу «Я студент».', tokens: ['եմ', 'Ես', 'ուսանող'], accept: ['Ես ուսանող եմ'] }] });
  wordLesson({ id: 'w-home', title: 'Տուն', ru: 'Дом и вещи', head: 'Дома', builds: ['w-people'],
    goal: 'Называть комнаты и предметы.', tag: 'home', words: ['bnakaran', 'senyak', 'patuhan', 'seghan', 'atorr', 'mahchakal', 'herrakhos', 'banali'] });
  wordLesson({ id: 'w-food', title: 'Ուտելիք', ru: 'Еда и напитки', head: 'За столом', builds: ['w-home'],
    goal: 'Называть еду, заказать в кафе.', tag: 'food',
    body: 'Лаваш, шашлык и кофе — важные слова. В кафе помогает простая модель: достаточно назвать блюдо и добавить {{խնդրեմ}}.',
    examples: [{ sr: 'Մի սուրճ, խնդրեմ։', ru: 'Один кофе, пожалуйста.' }, { sr: 'Հաշիվը, խնդրեմ։', ru: 'Счёт, пожалуйста.' }],
    words: ['surch', 'kat', 'mis', 'lavash', 'kartofil', 'shaqar', 'khorovats', 'hamegh', 'hashiv'],
    extra: [{ id: 'wd1', type: 'type', skills: ['writing'], items: [['surch', 'recall']], tag: 'food', recall: true, prompt: 'Закажите: «Один кофе, пожалуйста».', accept: ['Մի սուրճ, խնդրեմ', 'Մեկ սուրճ, խնդրեմ'] }] });
  wordLesson({ id: 'w-city', title: 'Քաղաք', ru: 'Город и дорога', head: 'В городе', builds: ['w-food'],
    goal: 'Спросить дорогу, понять ответ.', tag: 'city',
    body: 'Чтобы спросить, где что-то находится, достаточно одной формулы: {{Որտե՞ղ է…}}. Слово с артиклем стоит в конце: {{Որտե՞ղ է շուկան։}}',
    words: ['poghots', 'khanut', 'shuka', 'dprots', 'hivandanots', 'deghatun', 'kangarr', 'avtobus', 'taqsi', 'metro', 'aj', 'dzakh', 'ughigh', 'vortegh', 'mot', 'herru'],
    extra: [
      { id: 'wc1', type: 'order', skills: ['grammar'], items: [['vortegh', 'context']], tag: 'city', prompt: 'Соберите вопрос «Где аптека?».', tokens: ['է', 'դեղատունը', 'Որտե՞ղ'], accept: ['Որտե՞ղ է դեղատունը'] },
      { id: 'wc2', type: 'listen_choice', skills: ['listening'], items: [['aj', 'listening']], tag: 'city', prompt: 'Прослушайте. Куда идти?', sr: 'Գնացեք ուղիղ, հետո աջ։', options: ['Прямо, потом направо', 'Прямо, потом налево', 'Направо, потом прямо'], optLang: 'ru', correct: 0, explain: '{{հետո}} — потом.' }
    ] });
  wordLesson({ id: 'w-time', title: 'Ժամանակ', ru: 'Время и дни недели', head: 'Когда?', builds: ['w-city'],
    goal: 'Называть дни недели и говорить о времени.', tag: 'time',
    body: 'Посмотрите на дни недели: {{երկուշաբթի}} — это {{երկու}} + {{շաբաթ}}, «второй после субботы». Так же устроены вторник, среда и четверг. Дальше идут {{ուրբաթ}}, {{շաբաթ}} и {{կիրակի}}.',
    words: ['aysor', 'vaghy', 'erek', 'hima', 'arravot', 'ereko', 'gisher', 'erkushabti', 'ereqshabti', 'choreqshabti', 'hingshabti', 'urbat', 'shabat', 'kiraki'] });
  wordLesson({ id: 'w-desc', title: 'Գույներ', ru: 'Цвета и описания', head: 'Какой?', builds: ['w-time'],
    goal: 'Описывать предметы.', tag: 'colors',
    body: 'Прилагательные в армянском не меняются: {{մեծ տուն}} — большой дом, {{մեծ քաղաքներ}} — большие города. Рода и падежного согласования нет.',
    contrast: 'Прилагательное всегда стоит перед существительным: {{կարմիր վարդ}} — красная роза.',
    words: ['spitak', 'sev', 'kapuyt', 'kanach', 'deghin', 'vat', 'hin', 'geghetsik', 'taq', 'sarry'],
    extra: [{ id: 'wk1', type: 'order', skills: ['grammar'], items: [['mets', 'context']], tag: 'colors', prompt: 'Соберите: «Это красивый город».', tokens: ['քաղաք', 'գեղեցիկ', 'Սա', 'է'], accept: ['Սա գեղեցիկ քաղաք է'] }] });
  wordLesson({ id: 'w-verbs', title: 'Բայեր', ru: 'Главные глаголы', head: 'Глаголы в словаре', builds: ['w-desc'],
    goal: 'Знать 14 главных глаголов.', tag: 'verbs',
    body: 'В словаре глагол заканчивается на {{-ել}} или {{-ալ}}: {{գրել}} — писать, {{կարդալ}} — читать. Как их менять, вы узнаете на этапе «Предложения».',
    words: ['gnal', 'gal', 'utel', 'khmel', 'khosel', 'kardal', 'grel', 'sirel', 'uzel', 'ashkhatel', 'sovorel', 'aprel', 'tesnel', 'gitem'] });

  wordLesson({ id: 'w-lands', title: 'Երկրներ և լեզուներ', ru: 'Страны и языки', head: 'Откуда вы и на чём говорите', builds: ['w-intro'],
    goal: 'Называть страны и языки.', tag: 'names',
    body: 'Названия языков заканчиваются на {{-երեն}}: {{հայերեն}}, {{ռուսերեն}}, {{անգլերեն}}. Это слово значит и язык, и «по-армянски», «по-русски».',
    words: ['lezu', 'erkir', 'vrastan', 'fransia', 'germania', 'amerika', 'angleren', 'fransieren', 'germaneren'] });
  wordLesson({ id: 'w-num2', title: 'Թվեր և ժամ', ru: 'Большие числа, порядок и время', head: 'Числа дальше', builds: ['w-num'],
    goal: 'Называть десятки, порядковые числа, возраст и время.', tag: 'numbers',
    body: 'Числа от 11 до 19 пишутся слитно: {{տասն}} + единица: {{տասնմեկ}}, {{տասներկու}}. Десятки запоминаются отдельно. Возраст называют словом {{տարեկան}}.',
    examples: [{ sr: 'Ես քսան տարեկան եմ։', ru: 'Мне двадцать лет.' }, { sr: 'Ժամը հինգն է։', ru: 'Пять часов.' }],
    words: ['n11', 'n12', 'n15', 'n30', 'n40', 'n50', 'n60', 'n70', 'n80', 'n90', 'arrajin', 'erkrord', 'errord', 'chorrord', 'hingerord', 'zhamy_qanisn', 'tarekan'] });
  wordLesson({ id: 'w-feel', title: 'Զգացմունքներ', ru: 'Чувства и состояния', head: 'Как вы себя чувствуете', builds: ['w-people'],
    goal: 'Сказать, что вы устали, голодны, рады.', tag: 'feelings',
    body: 'Здесь работает обычная модель «быть»: {{Ես հոգնած եմ}} — «я уставший». Рода нет, поэтому форма одна и для мужчин, и для женщин.',
    words: ['urakh', 'tkhur', 'hognats', 'hivand', 'qaghtsats', 'tsarav', 'barkatsats', 'vakhenal'],
    extra: [{ id: 'wfe1', type: 'order', skills: ['grammar'], items: [['hognats', 'context']], tag: 'feelings', prompt: 'Соберите: «Я устал».', tokens: ['հոգնած', 'եմ', 'Ես'], accept: ['Ես հոգնած եմ'] }] });
  wordLesson({ id: 'w-body', title: 'Մարմին', ru: 'Тело и здоровье', head: 'У врача', builds: ['w-feel'],
    goal: 'Назвать части тела и сказать, что болит.', tag: 'body',
    body: 'Чтобы сказать, что болит, к слову добавляем суффикс {{-ս}} — «мой» — и глагол {{ցավում է}}.',
    examples: [{ sr: 'Գլուխս ցավում է։', ru: 'У меня болит голова.' }, { sr: 'Ատամս ցավում է։', ru: 'У меня болит зуб.' }],
    words: ['glukh', 'achq', 'akanj', 'beran', 'qit', 'dzerrq', 'votq', 'sirt', 'por', 'atam', 'tsav', 'degh'],
    extra: [{ id: 'wb1', type: 'type', skills: ['writing'], items: [['glukh', 'recall']], tag: 'body', recall: true, prompt: 'Скажите: «У меня болит голова».', accept: ['Գլուխս ցավում է'] }] });
  wordLesson({ id: 'w-clothes', title: 'Հագուստ', ru: 'Одежда', builds: ['w-home'],
    goal: 'Называть одежду.', tag: 'clothes', words: ['hagust', 'shapik', 'tabat', 'koshik', 'bachkon', 'glkharik', 'zgest', 'gulpa'] });
  wordLesson({ id: 'w-market', title: 'Մրգեր և մթերք', ru: 'Фрукты и продукты', builds: ['w-food'],
    goal: 'Покупать продукты на рынке.', tag: 'food', words: ['khaghogh', 'tsiran', 'nurr', 'lolik', 'varung', 'sokh', 'dzu', 'brindz', 'karag', 'meghr'] });
  wordLesson({ id: 'w-rest', title: 'Ռեստորանում', ru: 'В ресторане', head: 'За столом', builds: ['w-market'],
    goal: 'Попросить меню, приборы и заказать.', tag: 'food',
    body: 'Заказ строится как в кафе: блюдо и {{խնդրեմ}}. Чтобы попросить меню, скажите {{Ճաշացանկը, խնդրեմ}}.',
    words: ['chashatsank', 'matutsogh', 'apur', 'aghtsan', 'danak', 'patarraqagh', 'gdal', 'apse', 'bazhak', 'garejur'] });
  wordLesson({ id: 'w-shop', title: 'Գնումներ', ru: 'Покупки', head: 'В магазине', builds: ['w-rest'],
    goal: 'Спросить цену, размер и скидку, заплатить.', tag: 'shopping',
    contrast: 'Глаголы {{գնալ}} (идти) и {{գնել}} (покупать) в настоящем времени совпадают: {{գնում եմ}}.',
    body: 'В магазине пригодятся цена, размер и скидка. Обратите внимание на глагол {{գնել}}.',
    words: ['pogh', 'gin', 'gnel', 'vacharrel', 'chaps', 'zeghch', 'qart', 'vcharel'] });
  wordLesson({ id: 'w-travel', title: 'Ճանապարհորդություն', ru: 'Поездка и гостиница', builds: ['w-city'],
    goal: 'Ориентироваться на вокзале, в аэропорту и в гостинице.', tag: 'travel', words: ['odanavakayan', 'inqnatirr', 'gnatsq', 'kayaran', 'hyuranots', 'toms', 'champruk', 'andznagir', 'meqena'] });
  wordLesson({ id: 'w-months', title: 'Ամիսներ', ru: 'Месяцы', head: 'Месяцы похожи на русские', builds: ['w-time'],
    goal: 'Называть месяцы.', tag: 'time', body: 'Многие названия месяцев вы узнаете сразу: они пришли из тех же языков, что и русские.',
    words: ['hunvar', 'petrvar', 'mart', 'april', 'mayis', 'hunis', 'hulis', 'ogostos', 'september', 'hoktember', 'noyember', 'dektember'] });
  wordLesson({ id: 'w-weather', title: 'Եղանակ', ru: 'Времена года и погода', head: 'Какая погода', builds: ['w-months'],
    goal: 'Говорить о погоде и временах года.', tag: 'weather',
    body: 'О погоде говорят просто: {{Այսօր շոգ է}} — сегодня жарко. А дождь и снег «приходят»: {{Անձրև է գալիս}}.',
    words: ['dzmerr', 'garun', 'yeghanak', 'andzrev', 'qami', 'shog', 'tsurt', 'amp'] });
  wordLesson({ id: 'w-nature', title: 'Բնություն', ru: 'Природа и животные', builds: ['w-weather'],
    goal: 'Называть природу и животных.', tag: 'nature', words: ['kendani', 'trrchun', 'antarr', 'lich', 'dasht', 'erkinq', 'kov', 'vochkhar'] });
  wordLesson({ id: 'w-opp', title: 'Հակադիր բառեր', ru: 'Противоположности', head: 'Слова парами', builds: ['w-desc'],
    goal: 'Описывать предметы словами-противоположностями.', tag: 'colors', body: 'Прилагательные легче запоминать парами: {{երկար}} — {{կարճ}}, {{հեշտ}} — {{դժվար}}.',
    words: ['erkar', 'karch', 'bardzr', 'tsatsr', 'tsanr', 'tetev', 'arag', 'dandagh', 'heshht', 'dzhvar', 'eritasard', 'tser'] });
  wordLesson({ id: 'w-help', title: 'Օգնություն', ru: 'Если что-то случилось', head: 'На всякий случай', builds: ['w-travel'],
    goal: 'Позвать на помощь и объяснить проблему.', tag: 'emergency', body: 'Эти слова нужны редко, но важно знать их заранее.',
    words: ['ognetseq', 'vostikan', 'shtap', 'kortsnel', 'vtang', 'hrdeh', 'molorvel'] });

  // ═══════════════════════ Этап 3: предложения ═══════════════════════
  L['s-biti'] = { id: 's-biti', title: 'Ես հայ եմ', ru: 'Первое предложение: «быть»', goal: 'Составлять предложения типа «Я студент», «Он здесь».', topics: ['biti'], minutes: 15,
    steps: [
      { t: 'explain', title: 'Глагол идёт в конец', body: 'По-русски можно сказать «Я студент». В армянском так нельзя: нужен глагол «быть», и он стоит в самом конце.',
        table: [['ես', 'եմ'], ['դու', 'ես'], ['նա', 'է'], ['մենք', 'ենք'], ['դուք', 'եք'], ['նրանք', 'են']],
        examples: [{ sr: 'Ես ուսանող եմ։', ru: 'Я студент.' }, { sr: 'Դու հայ ես։', ru: 'Ты армянин.' }, { sr: 'Նա բժիշկ է։', ru: 'Она врач.' }, { sr: 'Մենք այստեղ ենք։', ru: 'Мы здесь.' }],
        contrast: 'Местоимение можно опустить: {{Ուսանող եմ}} — форма глагола уже говорит, кто это.', items: ['g_biti', 'nranq'] },
      { t: 'ex', id: 'sb1', type: 'choice', skills: ['grammar'], items: [['g_biti', 'context']], tag: 'biti', prompt: 'Выберите форму.', sr: 'Ես ուսանող ___։', options: ['եմ', 'ես', 'է'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sb2', type: 'choice', skills: ['grammar'], items: [['g_biti', 'context']], tag: 'biti', prompt: 'Выберите форму.', sr: 'Մենք այստեղ ___։', options: ['ենք', 'են', 'եք'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sb3', type: 'choice', skills: ['grammar'], items: [['g_biti', 'context']], tag: 'biti', prompt: 'Выберите форму.', sr: 'Նրանք հայ ___։', options: ['են', 'է', 'ենք'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sb4', type: 'cloze', skills: ['grammar'], items: [['g_biti', 'recall']], tag: 'biti', recall: true, prompt: 'Вставьте форму глагола «быть».', sr: 'Նա բժիշկ ___։', accept: ['է'], hints: ['{{նա}} — третье лицо.'] },
      { t: 'ex', id: 'sb5', type: 'cloze', skills: ['grammar'], items: [['g_biti', 'recall']], tag: 'biti', recall: true, prompt: 'Вставьте форму глагола «быть».', sr: 'Դուք լավ ___։', accept: ['եք'] },
      { t: 'ex', id: 'sb6', type: 'order', skills: ['grammar'], items: [['usanogh', 'context']], tag: 'word-order', prompt: 'Соберите: «Я студент».', tokens: ['ուսանող', 'եմ', 'Ես'], accept: ['Ես ուսանող եմ'] },
      { t: 'ex', id: 'sb7', type: 'order', skills: ['grammar'], items: [['bzhishk', 'context']], tag: 'word-order', prompt: 'Соберите: «Моя мать — врач».', tokens: ['բժիշկ', 'է', 'մայրը', 'Իմ'], accept: ['Իմ մայրը բժիշկ է'] },
      { t: 'ex', id: 'sb8', type: 'order', skills: ['grammar'], items: [['nranq', 'context']], tag: 'word-order', prompt: 'Соберите: «Они здесь».', tokens: ['այստեղ', 'Նրանք', 'են'], accept: ['Նրանք այստեղ են'] },
      { t: 'ex', id: 'sb9', type: 'type', skills: ['writing'], items: [['g_biti', 'recall']], tag: 'biti', recall: true, prompt: 'Напишите: «Ты хороший».', accept: ['Դու լավ ես', 'Լավ ես'], hints: ['{{դու}} + {{լավ}} + форма глагола.'] },
      { t: 'ex', id: 'sb10', type: 'type', skills: ['writing'], items: [['g_biti', 'recall']], tag: 'biti', recall: true, prompt: 'Напишите: «Мы дома».', accept: ['Մենք տանն ենք', 'Տանն ենք', 'Մենք տանը ենք'], hints: ['«Дома» — {{տանը}}, а перед гласной — {{տանն}}.'] }
    ] };

  L['s-neg'] = { id: 's-neg', title: 'Ես հայ չեմ', ru: 'Отрицание: «не»', goal: 'Строить отрицания с глаголом «быть» и отвечать да/нет.', topics: ['negation'], minutes: 12, builds: ['s-biti'],
    steps: [
      { t: 'explain', title: 'Частица չ-', body: 'Отрицание делается просто: перед формой «быть» добавляем {{չ}}. Слово остаётся на том же месте — в конце.',
        table: [['ես', 'չեմ'], ['դու', 'չես'], ['նա', 'չէ'], ['մենք', 'չենք'], ['դուք', 'չեք'], ['նրանք', 'չեն']],
        examples: [{ sr: 'Ես բժիշկ չեմ։', ru: 'Я не врач.' }, { sr: 'Նա այստեղ չէ։', ru: 'Его здесь нет.' }, { sr: 'Մենք հայ չենք։', ru: 'Мы не армяне.' }],
        contrast: 'С существительным и прилагательным по норме {{չէ}}: {{Նա բժիշկ չէ}}, а с глаголом — {{չի}}: {{Նա չի գնում}}. В разговоре часто говорят {{չի}} и в первом случае.', items: ['g_neg_biti'] },
      { t: 'ex', id: 'sn1', type: 'choice', skills: ['grammar'], items: [['g_neg_biti', 'context']], tag: 'negation', prompt: 'Выберите форму.', sr: 'Ես բժիշկ ___։', options: ['չեմ', 'չես', 'չեն'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sn2', type: 'choice', skills: ['grammar'], items: [['g_neg_biti', 'context']], tag: 'negation', prompt: 'Выберите форму.', sr: 'Նրանք այստեղ ___։', options: ['չեն', 'չենք', 'չէ'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sn3', type: 'transform', skills: ['grammar', 'writing'], items: [['g_neg_biti', 'recall']], tag: 'negation', recall: true, prompt: 'Сделайте отрицание.', sr: 'Ես ուսանող եմ։', accept: ['Ես ուսանող չեմ', 'Ուսանող չեմ'] },
      { t: 'ex', id: 'sn4', type: 'transform', skills: ['grammar', 'writing'], items: [['g_neg_biti', 'recall']], tag: 'negation', recall: true, prompt: 'Сделайте отрицание.', sr: 'Դու հայ ես։', accept: ['Դու հայ չես', 'Հայ չես'] },
      { t: 'ex', id: 'sn5', type: 'order', skills: ['grammar'], items: [['g_neg_biti', 'context']], tag: 'word-order', prompt: 'Соберите: «Он не врач».', tokens: ['չէ', 'Նա', 'բժիշկ'], accept: ['Նա բժիշկ չէ'] },
      { t: 'ex', id: 'sn6', type: 'choice', skills: ['vocab'], items: [['ayo', 'recognition'], ['voch', 'recognition']], tag: 'negation', prompt: 'Как вежливо сказать «да»?', options: ['Այո', 'Հա', 'Չէ'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sn7', type: 'type', skills: ['writing'], items: [['voch', 'recall']], tag: 'negation', recall: true, prompt: 'Напишите: «Нет, я не русский».', accept: ['Ոչ, ես ռուս չեմ', 'Չէ, ես ռուս չեմ', 'Ոչ, ռուս չեմ', 'Չէ, ռուս չեմ'] }
    ] };

  L['s-ques'] = { id: 's-ques', title: 'Ի՞նչ է սա', ru: 'Вопросы', goal: 'Задавать вопросы со словами и без них, правильно ставить знак ՞.', topics: ['questions'], minutes: 15, builds: ['s-neg'],
    steps: [
      { t: 'explain', title: 'Вопросительные слова', body: 'Глагол «быть» стоит сразу после вопросительного слова. Знак {{՞}} ставится над последней гласной этого слова, а в конце предложения — обычная точка {{։}}.',
        examples: [{ sr: 'Ո՞վ է նա։', ru: 'Кто он?' }, { sr: 'Ի՞նչ է սա։', ru: 'Что это?' }, { sr: 'Որտե՞ղ ես։', ru: 'Где ты?' }, { sr: 'Ե՞րբ ես գալիս։', ru: 'Когда ты приходишь?' }, { sr: 'Ինչո՞ւ ես այստեղ։', ru: 'Почему ты здесь?' }],
        items: ['g_questions'] },
      { t: 'intro', items: ['ov', 'inch', 'erb', 'inchu', 'sa'] },
      { t: 'ex', id: 'sq1', type: 'match', skills: ['vocab'], items: [['ov', 'recognition'], ['inch', 'recognition'], ['vortegh', 'recognition'], ['erb', 'recognition'], ['inchu', 'recognition']], tag: 'questions', prompt: 'Соедините вопросительные слова с переводом.', pairs: [['ո՞վ', 'кто'], ['ի՞նչ', 'что'], ['որտե՞ղ', 'где'], ['ե՞րբ', 'когда'], ['ինչո՞ւ', 'почему']] },
      { t: 'ex', id: 'sq2', type: 'order', skills: ['grammar'], items: [['inch', 'context']], tag: 'word-order', prompt: 'Соберите: «Что это?».', tokens: ['սա', 'Ի՞նչ', 'է'], accept: ['Ի՞նչ է սա'] },
      { t: 'ex', id: 'sq3', type: 'order', skills: ['grammar'], items: [['ov', 'context']], tag: 'word-order', prompt: 'Соберите: «Кто он?».', tokens: ['նա', 'է', 'Ո՞վ'], accept: ['Ո՞վ է նա'] },
      { t: 'ex', id: 'sq4', type: 'order', skills: ['grammar'], items: [['vortegh', 'context']], tag: 'word-order', prompt: 'Соберите: «Где твоя сестра?».', tokens: ['քույրը', 'Որտե՞ղ', 'քո', 'է'], accept: ['Որտե՞ղ է քո քույրը'] },
      { t: 'ex', id: 'sq5', type: 'choice', skills: ['grammar'], items: [['g_questions', 'context']], tag: 'questions', forceScript: 'cyr', prompt: 'Где правильно стоит вопросительный знак?', options: ['Որտե՞ղ ես։', 'Որտեղ ես՞', 'Ո՞րտեղ ես։'], optLang: 'sr', correct: 0, explain: 'Знак ставится над последней гласной вопросительного слова.' },
      { t: 'explain', title: 'Вопрос без вопросительного слова', body: 'Если вопрос требует ответа «да» или «нет», порядок слов не меняется. Знак {{՞}} ставится над словом, о котором спрашивают.',
        examples: [{ sr: 'Դու ուսանո՞ղ ես։', ru: 'Ты студент?' }, { sr: 'Նա այստե՞ղ է։', ru: 'Он здесь?' }] },
      { t: 'ex', id: 'sq6', type: 'choice', skills: ['reading'], items: [], tag: 'questions', prompt: 'Что значит этот вопрос?', sr: 'Դու հա՞յ ես։', options: ['Ты армянин?', 'Ты здесь?', 'Как дела?'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'sq7', type: 'dialogue', skills: ['pragmatics'], items: [['sa', 'context']], tag: 'questions', prompt: 'Вас спрашивают, показывая на книгу:', sr: 'Ի՞նչ է սա։', options: ['Սա գիրք է։', 'Ես ուսանող եմ։', 'Նա բժիշկ է։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sq8', type: 'type', skills: ['writing'], items: [['inch', 'recall']], tag: 'questions', recall: true, prompt: 'Напишите: «Что это?».', accept: ['Ի՞նչ է սա'] },
      { t: 'ex', id: 'sq9', type: 'type', skills: ['writing'], items: [['vortegh', 'recall']], tag: 'questions', recall: true, prompt: 'Напишите: «Где ты?».', accept: ['Որտե՞ղ ես'] }
    ] };

  L['s-art'] = { id: 's-art', title: 'Գիրքը, գրքեր', ru: 'Артикль и множественное число', goal: 'Использовать артикль -ը/-ն и образовывать множественное число.', topics: ['article'], minutes: 18, builds: ['s-ques'],
    steps: [
      { t: 'explain', title: 'Артикль на конце слова', body: 'Когда понятно, о каком предмете речь, к слову добавляется артикль. В русском его нет, поэтому поначалу это непривычно. После согласной — {{-ը}}, после гласной — {{-ն}}.',
        examples: [{ sr: 'տուն → տունը', ru: 'дом → этот дом' }, { sr: 'շուկա → շուկան', ru: 'рынок → этот рынок' }, { sr: 'Տունը մեծ է։', ru: 'Дом большой.' }, { sr: 'Շուկան մոտ է։', ru: 'Рынок близко.' }],
        contrast: 'По строгой литературной норме перед гласной и перед сочетаниями {{սկ, սպ, ստ}} ставят {{-ն}}: {{Սա իմ տունն է}}, {{Դասն սկսվեց}}. В живой речи обычно говорят {{-ը}}. В приложении примеры даны по норме.', mistakes: ['Артикль обязателен после {{այս, այդ, այն}}, после притяжательных слов и порядковых чисел: {{այս տունը}}, {{իմ գիրքը}}, {{առաջին դասը}}.'], items: ['g_article'] },
      { t: 'ex', id: 'sa1', type: 'choice', skills: ['grammar'], items: [['g_article', 'context']], tag: 'article', prompt: 'Выберите форму с артиклем.', sr: 'շուկա', options: ['շուկան', 'շուկաը', 'շուկայը'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sa2', type: 'choice', skills: ['grammar'], items: [['g_article', 'context']], tag: 'article', prompt: 'Выберите форму с артиклем.', sr: 'տուն', options: ['տունը', 'տունն', 'տունա'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sa3', type: 'choice', skills: ['grammar'], items: [['g_article', 'context']], tag: 'article', prompt: 'Выберите вариант по литературной норме.', options: ['Սա իմ տունն է։', 'Սա իմ տունը է։', 'Սա իմ տուն է։'], optLang: 'sr', correct: 0, explain: 'По норме перед {{է}} артикль {{-ը}} заменяется на {{-ն}}. В разговоре так говорят не всегда.' },
      { t: 'ex', id: 'sa4', type: 'cloze', skills: ['grammar'], items: [['g_article', 'recall']], tag: 'article', recall: true, prompt: 'Добавьте слово «кошка» с артиклем.', sr: '___ տանն է։', accept: ['Կատուն'], hints: ['{{կատու}} оканчивается на гласную.'] },
      { t: 'explain', title: 'Множественное число', body: 'Правило зависит от числа слогов. В слове один слог — {{-եր}}. Больше одного — {{-ներ}}.',
        examples: [{ sr: 'գետ → գետեր', ru: 'река → реки' }, { sr: 'սար → սարեր', ru: 'гора → горы' }, { sr: 'ընկեր → ընկերներ', ru: 'друг → друзья' }, { sr: 'քաղաք → քաղաքներ', ru: 'город → города' }],
        mistakes: ['Некоторые короткие слова меняются внутри: {{տուն → տներ}}, {{շուն → շներ}}, {{գիրք → գրքեր}}.', 'Часть коротких слов получает {{-ներ}}: {{դուռ → դռներ}}, {{ձուկ → ձկներ}}, {{մուկ → մկներ}}, {{նուռ → նռներ}}, {{մատ → մատներ}}.', 'Особые формы: {{մարդ → մարդիկ}}, {{կին → կանայք}}.'], items: ['g_plural'] },
      { t: 'ex', id: 'sa5', type: 'choice', skills: ['grammar'], items: [['g_plural', 'context']], tag: 'plural', prompt: 'Выберите множественное число.', sr: 'սար', options: ['սարեր', 'սարներ', 'սարիկ'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sa6', type: 'choice', skills: ['grammar'], items: [['g_plural', 'context']], tag: 'plural', prompt: 'Выберите множественное число.', sr: 'ընկեր', options: ['ընկերներ', 'ընկերեր', 'ընկերիկ'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sa7', type: 'choice', skills: ['grammar'], items: [['mard', 'recognition']], tag: 'plural', prompt: 'Как будет «люди»?', options: ['մարդիկ', 'մարդեր', 'մարդներ'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sa8', type: 'transform', skills: ['grammar', 'writing'], items: [['g_plural', 'recall']], tag: 'plural', recall: true, prompt: 'Поставьте во множественное число.', sr: 'քաղաք', accept: ['քաղաքներ'] },
      { t: 'ex', id: 'sa9', type: 'transform', skills: ['grammar', 'writing'], items: [['g_plural', 'recall']], tag: 'plural', recall: true, prompt: 'Поставьте во множественное число.', sr: 'գետ', accept: ['գետեր'] },
      { t: 'ex', id: 'sa11', type: 'choice', skills: ['grammar'], items: [['dzuk', 'recognition']], tag: 'plural', prompt: 'Как будет «рыбы»? Это одно из исключений.', options: ['ձկներ', 'ձուկեր', 'ձուկներ'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sa10', type: 'choice', skills: ['grammar'], items: [['g_plural', 'context']], tag: 'plural', prompt: 'Как сказать «три книги»?', options: ['երեք գիրք', 'երեք գրքեր', 'երեք գիրքը'], optLang: 'sr', correct: 0, explain: 'После числа — единственное число.' }
    ] };

  L['s-pres'] = { id: 's-pres', title: 'Ես գրում եմ', ru: 'Настоящее время', goal: 'Спрягать глаголы в настоящем времени и ставить их в предложение.', topics: ['present'], minutes: 18, builds: ['s-art'],
    steps: [
      { t: 'explain', title: 'Глагол из двух частей', body: 'Настоящее время строится одинаково для всех: убираем {{-ել}} или {{-ալ}}, добавляем {{-ում}} и знакомую форму «быть». Меняется только вторая часть.',
        table: [['ես', 'գրում եմ'], ['դու', 'գրում ես'], ['նա', 'գրում է'], ['մենք', 'գրում ենք'], ['դուք', 'գրում եք'], ['նրանք', 'գրում են']],
        examples: [{ sr: 'կարդալ → կարդում եմ', ru: 'читать → я читаю' }, { sr: 'խոսել → խոսում ես', ru: 'говорить → ты говоришь' }, { sr: 'գնալ → գնում է', ru: 'идти → он идёт' }],
        mistakes: ['Глаголы {{գալ}} и {{տալ}} неправильные: {{գալիս եմ}}. А «я знаю» — просто {{գիտեմ}}.'], items: ['g_present'] },
      { t: 'ex', id: 'sp1', type: 'choice', skills: ['grammar'], items: [['g_present', 'context']], tag: 'present', prompt: 'Выберите форму глагола {{գրել}}.', sr: 'Ես ___։', options: ['գրում եմ', 'գրում է', 'գրել եմում'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sp2', type: 'choice', skills: ['grammar'], items: [['g_present', 'context']], tag: 'present', prompt: 'Выберите форму глагола {{կարդալ}}.', sr: 'Մենք ___։', options: ['կարդում ենք', 'կարդալում ենք', 'կարդում են'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sp3', type: 'transform', skills: ['grammar', 'writing'], items: [['g_present', 'recall'], ['khosel', 'context']], tag: 'present', recall: true, prompt: 'Напишите «я говорю» от глагола {{խոսել}}.', accept: ['խոսում եմ', 'ես խոսում եմ'] },
      { t: 'ex', id: 'sp4', type: 'transform', skills: ['grammar', 'writing'], items: [['g_present', 'recall'], ['aprel', 'context']], tag: 'present', recall: true, prompt: 'Напишите «они живут» от глагола {{ապրել}}.', accept: ['ապրում են', 'նրանք ապրում են'] },
      { t: 'explain', title: 'Порядок слов: связка любит прыгать', body: 'Если есть дополнение без артикля, «быть» перескакивает к нему, а глагол остаётся в конце. Если дополнение с артиклем — порядок обычный.',
        examples: [{ sr: 'Ես գիրք եմ կարդում։', ru: 'Я читаю книгу (какую-то).' }, { sr: 'Ես կարդում եմ գիրքը։', ru: 'Я читаю (эту) книгу.' }, { sr: 'Ես թեյ եմ խմում։', ru: 'Я пью чай.' }, { sr: 'Նա հաց է ուտում։', ru: 'Он ест хлеб.' }],
        contrast: 'Связка безударная и примыкает к предыдущему слову. Дополнение или обстоятельство часто стоит перед глаголом, и тогда связка идёт перед ним: {{Նա օպերա շատ է սիրում}}. Если выделить подлежащее — тоже: {{Նա է սովորում}} — «именно он учится».' },
      { t: 'ex', id: 'sp5', type: 'order', skills: ['grammar'], items: [['khmel', 'context']], tag: 'word-order', prompt: 'Соберите: «Я пью чай».', tokens: ['խմում', 'թեյ', 'Ես', 'եմ'], accept: ['Ես թեյ եմ խմում'] },
      { t: 'ex', id: 'sp6', type: 'order', skills: ['grammar'], items: [['utel', 'context']], tag: 'word-order', prompt: 'Соберите: «Он ест хлеб».', tokens: ['ուտում', 'է', 'հաց', 'Նա'], accept: ['Նա հաց է ուտում'] },
      { t: 'ex', id: 'sp7', type: 'order', skills: ['grammar'], items: [['sovorel', 'context']], tag: 'word-order', prompt: 'Соберите: «Я учу армянский».', tokens: ['եմ', 'հայերեն', 'Ես', 'սովորում'], accept: ['Ես սովորում եմ հայերեն', 'Ես հայերեն եմ սովորում'] },
      { t: 'ex', id: 'sp8', type: 'order', skills: ['grammar'], items: [['kardal', 'context']], tag: 'word-order', prompt: 'Соберите: «Мы читаем книгу».', tokens: ['գիրք', 'կարդում', 'Մենք', 'ենք'], accept: ['Մենք գիրք ենք կարդում'] },
      { t: 'ex', id: 'sp9', type: 'type', skills: ['writing'], items: [['khosel', 'recall']], tag: 'present', recall: true, prompt: 'Напишите: «Я говорю по-армянски».', accept: ['Ես խոսում եմ հայերեն', 'Խոսում եմ հայերեն', 'Ես հայերեն եմ խոսում', 'Հայերեն եմ խոսում'] },
      { t: 'ex', id: 'sp10', type: 'listen_choice', skills: ['listening'], items: [['aprel', 'listening']], tag: 'present', prompt: 'Прослушайте. Что сказал человек?', sr: 'Ես ապրում եմ Երևանում։', options: ['Я живу в Ереване.', 'Я работаю в Ереване.', 'Я еду в Ереван.'], optLang: 'ru', correct: 0 }
    ] };

  L['s-negv'] = { id: 's-negv', title: 'Չեմ գրում', ru: 'Отрицание с глаголом', goal: 'Говорить, чего вы не делаете.', topics: ['negation'], minutes: 12, builds: ['s-pres'],
    steps: [
      { t: 'explain', title: 'Части меняются местами', body: 'В утверждении сначала глагол, потом связка: {{գրում եմ}}. В отрицании наоборот: сначала связка с {{չ}}, потом глагол: {{չեմ գրում}}.',
        table: [['ես', 'չեմ գրում'], ['դու', 'չես գրում'], ['նա', 'չի գրում'], ['մենք', 'չենք գրում'], ['դուք', 'չեք գրում'], ['նրանք', 'չեն գրում']],
        examples: [{ sr: 'Ես չեմ գնում։', ru: 'Я не иду.' }, { sr: 'Նա չի խոսում հայերեն։', ru: 'Он не говорит по-армянски.' }],
        contrast: 'Здесь в третьем лице именно {{չի}}, а не {{չէ}}.', items: ['g_neg_verb'] },
      { t: 'ex', id: 'sv1', type: 'choice', skills: ['grammar'], items: [['g_neg_verb', 'context']], tag: 'negation', prompt: 'Выберите отрицание.', sr: 'Ես գրում եմ։', options: ['Ես չեմ գրում։', 'Ես գրում չեմ։', 'Ես չգրում եմ։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sv2', type: 'choice', skills: ['grammar'], items: [['g_neg_verb', 'context']], tag: 'negation', prompt: 'Выберите отрицание.', sr: 'Նա գնում է։', options: ['Նա չի գնում։', 'Նա չէ գնում։', 'Նա գնում չի։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sv3', type: 'transform', skills: ['grammar', 'writing'], items: [['g_neg_verb', 'recall']], tag: 'negation', recall: true, prompt: 'Сделайте отрицание.', sr: 'Մենք աշխատում ենք։', accept: ['Մենք չենք աշխատում', 'Չենք աշխատում'] },
      { t: 'ex', id: 'sv4', type: 'transform', skills: ['grammar', 'writing'], items: [['g_neg_verb', 'recall']], tag: 'negation', recall: true, prompt: 'Сделайте отрицание.', sr: 'Դու խոսում ես։', accept: ['Դու չես խոսում', 'Չես խոսում'] },
      { t: 'ex', id: 'sv5', type: 'order', skills: ['grammar'], items: [['g_neg_verb', 'context']], tag: 'word-order', prompt: 'Соберите: «Я не понимаю».', tokens: ['հասկանում', 'Չեմ'], accept: ['Չեմ հասկանում'] },
      { t: 'ex', id: 'sv6', type: 'order', skills: ['grammar'], items: [['g_neg_verb', 'context']], tag: 'word-order', prompt: 'Соберите: «Он не ест мясо».', tokens: ['միս', 'չի', 'Նա', 'ուտում'], accept: ['Նա միս չի ուտում', 'Նա չի ուտում միս'] },
      { t: 'ex', id: 'sv7', type: 'type', skills: ['writing'], items: [['g_neg_verb', 'recall']], tag: 'negation', recall: true, prompt: 'Напишите: «Я не знаю».', accept: ['Ես չգիտեմ', 'Չգիտեմ'], hints: ['{{գիտեմ}} — особый глагол: {{չ}} пишется слитно.'], explain: 'У {{գիտեմ}} нет {{-ում}}, поэтому отрицание — {{չգիտեմ}}.' }
    ] };

  L['s-poss'] = { id: 's-poss', title: 'Իմ տունը', ru: 'Мой, твой, наш', goal: 'Говорить о принадлежности.', topics: ['possessive'], minutes: 12, builds: ['s-negv'],
    steps: [
      { t: 'explain', title: 'Притяжательные слова', body: 'Слова {{իմ}}, {{քո}}, {{նրա}}, {{մեր}}, {{ձեր}}, {{նրանց}} не меняются и стоят перед существительным. У самого существительного появляется артикль.',
        table: [['իմ', 'мой'], ['քո', 'твой'], ['նրա', 'его, её'], ['մեր', 'наш'], ['ձեր', 'ваш'], ['նրանց', 'их']],
        examples: [{ sr: 'իմ գիրքը', ru: 'моя книга' }, { sr: 'մեր տունը', ru: 'наш дом' }, { sr: 'Սա իմ գիրքն է։', ru: 'Это моя книга.' }],
        contrast: 'В разговоре часто говорят ещё короче, суффиксом: {{գիրքս}} — моя книга, {{գիրքդ}} — твоя книга.', items: ['g_poss', 'nra', 'nrants'] },
      { t: 'ex', id: 'so1', type: 'match', skills: ['vocab'], items: [['im', 'recognition'], ['qo', 'recognition'], ['nra', 'recognition'], ['mer', 'recognition'], ['dzer', 'recognition'], ['nrants', 'recognition']], tag: 'possessive', prompt: 'Соедините слова с переводом.', pairs: [['իմ', 'мой'], ['քո', 'твой'], ['նրա', 'его'], ['մեր', 'наш'], ['ձեր', 'ваш'], ['նրանց', 'их']] },
      { t: 'ex', id: 'so2', type: 'choice', skills: ['grammar'], items: [['g_poss', 'context']], tag: 'possessive', prompt: 'Как сказать «наш дом»?', options: ['մեր տունը', 'մեր տուն է', 'տունը մեր'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'so3', type: 'order', skills: ['grammar'], items: [['g_poss', 'context']], tag: 'word-order', prompt: 'Соберите: «Это твоя книга».', tokens: ['քո', 'է', 'Սա', 'գիրքն'], accept: ['Սա քո գիրքն է'] },
      { t: 'ex', id: 'so4', type: 'order', skills: ['grammar'], items: [['g_poss', 'context']], tag: 'word-order', prompt: 'Соберите: «Их дом большой».', tokens: ['մեծ', 'տունը', 'Նրանց', 'է'], accept: ['Նրանց տունը մեծ է'] },
      { t: 'ex', id: 'so5', type: 'type', skills: ['writing'], items: [['g_poss', 'recall']], tag: 'possessive', recall: true, prompt: 'Напишите: «Это мой дом».', accept: ['Սա իմ տունն է', 'Սա իմ տունը է'], hints: ['{{Սա}} + {{իմ}} + «дом» с артиклем + {{է}}. Перед {{է}} артикль {{-ն}}.'] },
      { t: 'ex', id: 'so6', type: 'type', skills: ['writing'], items: [['anun', 'recall']], tag: 'possessive', recall: true, prompt: 'Спросите на «Вы»: «Как вас зовут?».', accept: ['Ի՞նչ է ձեր անունը'] },
      { t: 'ex', id: 'so7', type: 'write', skills: ['writing'], items: [], tag: 'writing-s', prompt: 'Напишите 2 предложения о своей семье: кто это и кем работает.', groups: [['իմ', 'մեր'], ['է', 'են', 'եմ']], model: 'Իմ մայրը բժիշկ է։ Իմ եղբայրն ուսանող է։' }
    ] };

  L['s-where'] = { id: 's-where', title: 'Երևանում', ru: 'Где, куда, откуда', goal: 'Сказать, где вы, откуда и куда идёте.', topics: ['cases'], minutes: 16, builds: ['s-poss'],
    steps: [
      { t: 'explain', title: 'Окончания вместо предлогов', body: 'Предлогов «в» и «из» в армянском нет — их заменяют окончания. «Где» — {{-ում}}, «откуда» — {{-ից}}. А «куда» — просто слово без окончания.',
        examples: [{ sr: 'Ես Երևանում եմ։', ru: 'Я в Ереване.' }, { sr: 'Ես Ռուսաստանից եմ։', ru: 'Я из России.' }, { sr: 'Գնում եմ Երևան։', ru: 'Еду в Ереван.' }, { sr: 'Գնում եմ խանութ։', ru: 'Иду в магазин.' }],
        mistakes: ['Названия на {{-ա}} получают {{յ}}: {{Մոսկվա → Մոսկվայում}}, {{Մոսկվայից}}.', 'Слова на {{-ու}} часто меняют его на {{վ}}: {{լեզու → լեզվում}}.', 'Слова на {{-ի}} и инфинитивы получают {{-ուց}}, а не {{-ից}}: {{գինի → գինուց}}, {{գրել → գրելուց}}.', 'У слова {{տուն}} особые формы: {{տանը}} — дома, {{տնից}} — из дома.'], items: ['g_loc'] },
      { t: 'intro', items: ['moskva', 'tany'] },
      { t: 'ex', id: 'sw1', type: 'choice', skills: ['grammar'], items: [['g_loc', 'context']], tag: 'cases', prompt: 'Как сказать «в Ереване»?', options: ['Երևանում', 'Երևանից', 'Երևանի'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sw2', type: 'choice', skills: ['grammar'], items: [['g_loc', 'context']], tag: 'cases', prompt: 'Как сказать «из России»?', options: ['Ռուսաստանից', 'Ռուսաստանում', 'Ռուսաստան'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sw3', type: 'choice', skills: ['grammar'], items: [['g_loc', 'context']], tag: 'cases', prompt: 'Выберите правильное.', sr: 'Գնում եմ ___։', options: ['շուկա', 'շուկայում', 'շուկայից'], optLang: 'sr', correct: 0, explain: '«Куда» — слово без окончания.' },
      { t: 'ex', id: 'sw4', type: 'choice', skills: ['grammar'], items: [['moskva', 'context']], tag: 'cases', prompt: 'Как сказать «в Москве»?', options: ['Մոսկվայում', 'Մոսկվաում', 'Մոսկվում'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sw5', type: 'cloze', skills: ['grammar'], items: [['g_loc', 'recall']], tag: 'cases', recall: true, prompt: 'Вставьте: «Я живу в Армении».', sr: 'Ես ապրում եմ ___։', accept: ['Հայաստանում'] },
      { t: 'ex', id: 'sw6', type: 'order', skills: ['grammar'], items: [['g_loc', 'context']], tag: 'word-order', prompt: 'Соберите: «Я из Москвы».', tokens: ['եմ', 'Ես', 'Մոսկվայից'], accept: ['Ես Մոսկվայից եմ'] },
      { t: 'ex', id: 'sw7', type: 'order', skills: ['grammar'], items: [['gnal', 'context']], tag: 'word-order', prompt: 'Соберите: «Мы идём домой».', tokens: ['տուն', 'գնում', 'Մենք', 'ենք'], accept: ['Մենք գնում ենք տուն', 'Մենք տուն ենք գնում'] },
      { t: 'ex', id: 'sw8', type: 'type', skills: ['writing'], items: [['vortegits', 'context']], tag: 'cases', recall: true, prompt: 'Напишите: «Я из России».', accept: ['Ես Ռուսաստանից եմ', 'Ռուսաստանից եմ'] },
      { t: 'ex', id: 'sw9', type: 'type', skills: ['writing'], items: [['aprel', 'recall']], tag: 'cases', recall: true, prompt: 'Напишите: «Я живу в Москве».', accept: ['Ես ապրում եմ Մոսկվայում', 'Ապրում եմ Մոսկվայում', 'Ես Մոսկվայում եմ ապրում'] },
      { t: 'explain', title: 'Ещё два окончания', body: 'Вы встретите их часто. {{-ով}} — на чём или чем: {{ավտոբուսով}} — на автобусе. {{-ի}} — чей: {{Աննայի գիրքը}} — Анина книга. С ним работает слово {{հետ}} — с: {{մայրիկի հետ}} — с мамой.',
        examples: [{ sr: 'Գնում եմ ավտոբուսով։', ru: 'Еду на автобусе.' }, { sr: 'Աննայի հետ։', ru: 'С Анной.' }] },
      { t: 'ex', id: 'sw10', type: 'choice', skills: ['grammar'], items: [['avtobus', 'context']], tag: 'cases', prompt: 'Как сказать «на такси»?', options: ['տաքսիով', 'տաքսիում', 'տաքսիից'], optLang: 'sr', correct: 0 }
    ] };

  L['s-past'] = { id: 's-past', title: 'Երեկ', ru: 'Прошедшее время', goal: 'Рассказывать, что было вчера.', topics: ['past'], minutes: 18, builds: ['s-where'],
    steps: [
      { t: 'explain', title: '«Был» и «сделал»', body: 'Для «был» меняем связку: {{եմ → էի}}. Место в предложении то же.',
        table: [['ես', 'էի'], ['դու', 'էիր'], ['նա', 'էր'], ['մենք', 'էինք'], ['դուք', 'էիք'], ['նրանք', 'էին']],
        examples: [{ sr: 'Երեկ ես տանն էի։', ru: 'Вчера я был дома.' }, { sr: 'Նա Երևանում էր։', ru: 'Он был в Ереване.' }], items: ['g_was'] },
      { t: 'ex', id: 'st1', type: 'choice', skills: ['grammar'], items: [['g_was', 'context']], tag: 'past', prompt: 'Выберите форму.', sr: 'Երեկ ես տանն ___։', options: ['էի', 'էր', 'եմ'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'st2', type: 'choice', skills: ['grammar'], items: [['g_was', 'context']], tag: 'past', prompt: 'Выберите форму.', sr: 'Նրանք այստեղ ___։', options: ['էին', 'էինք', 'էր'], optLang: 'sr', correct: 0 },
      { t: 'explain', title: 'Глаголы в прошедшем', body: 'Глаголы на {{-ել}} получают {{-եցի}}, на {{-ալ}} — {{-ացի}}. Это одно слово, без связки.',
        table: [['', 'գրել', 'կարդալ'], ['ես', 'գրեցի', 'կարդացի'], ['դու', 'գրեցիր', 'կարդացիր'], ['նա', 'գրեց', 'կարդաց'], ['մենք', 'գրեցինք', 'կարդացինք'], ['դուք', 'գրեցիք', 'կարդացիք'], ['նրանք', 'գրեցին', 'կարդացին']],
        mistakes: ['Неправильные глаголы: {{գալ → եկա}}, {{ուտել → կերա}}. Отрицание — приставка {{չ-}}: {{չգրեցի}}, {{չեկա}}.', 'Глаголы с {{-ն-}} и {{-չ-}} их теряют и спрягаются на {{-ա, -ար, -ավ}}: {{մտնել → մտա}} (вошёл), {{տեսնել → տեսա}}, {{փախչել → փախա}}.', 'Глаголы на {{-անալ}}, {{-ենալ}}: {{հասկանալ → հասկացա}}, {{վախենալ → վախեցա}}.'], items: ['g_past'] },
      { t: 'ex', id: 'st3', type: 'choice', skills: ['grammar'], items: [['g_past', 'context']], tag: 'past', prompt: 'Выберите форму «я написал».', options: ['գրեցի', 'գրացի', 'գրում էի'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'st4', type: 'choice', skills: ['grammar'], items: [['g_past', 'context']], tag: 'past', prompt: 'Выберите форму «я прочитал».', options: ['կարդացի', 'կարդեցի', 'կարդում եմ'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'st5', type: 'choice', skills: ['grammar'], items: [['gal', 'context']], tag: 'past', prompt: 'Как сказать «я пришёл»?', options: ['եկա', 'գալեցի', 'գացի'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'st6', type: 'transform', skills: ['grammar', 'writing'], items: [['g_past', 'recall']], tag: 'past', recall: true, prompt: 'Напишите «мы пошли» от глагола {{գնալ}}.', accept: ['գնացինք', 'մենք գնացինք'] },
      { t: 'ex', id: 'st7', type: 'transform', skills: ['grammar', 'writing'], items: [['g_past', 'recall']], tag: 'past', recall: true, prompt: 'Напишите «он говорил» от глагола {{խոսել}} (одним словом).', accept: ['խոսեց', 'նա խոսեց'] },
      { t: 'ex', id: 'st8', type: 'order', skills: ['grammar'], items: [['erek', 'context']], tag: 'word-order', prompt: 'Соберите: «Вчера я пошёл на рынок».', tokens: ['գնացի', 'շուկա', 'Երեկ'], accept: ['Երեկ գնացի շուկա', 'Երեկ շուկա գնացի'] },
      { t: 'ex', id: 'st9', type: 'type', skills: ['writing'], items: [['g_was', 'recall']], tag: 'past', recall: true, prompt: 'Напишите: «Вчера я был дома».', accept: ['Երեկ ես տանն էի', 'Երեկ տանն էի', 'Ես երեկ տանն էի'] },
      { t: 'ex', id: 'st10', type: 'read_choice', skills: ['reading'], items: [['erek', 'recognition']], tag: 'reading-s', prompt: 'Прочитайте и ответьте.', text: 'Երեկ ես գնացի շուկա։ Շուկայում խնձոր և հաց գնեցի։ Հետո եկա տուն և ճաշ կերա։', gloss: 'գնեցի — я купил; հետո — потом', question: 'Что человек сделал после рынка?', options: ['Пришёл домой и поел', 'Пошёл на работу', 'Уехал в Ереван'], optLang: 'ru', correct: 0 }
    ] };

  L['s-fut'] = { id: 's-fut', title: 'Վաղը', ru: 'Будущее время', goal: 'Рассказывать о планах.', topics: ['future'], minutes: 12, builds: ['s-past'],
    steps: [
      { t: 'explain', title: 'Инфинитив + -ու + связка', body: 'Будущее время самое простое: к словарной форме добавляем {{-ու}} и связку.',
        table: [['ես', 'գնալու եմ'], ['դու', 'գնալու ես'], ['նա', 'գնալու է'], ['մենք', 'գնալու ենք'], ['դուք', 'գնալու եք'], ['նրանք', 'գնալու են']],
        examples: [{ sr: 'Վաղը գնալու եմ Երևան։', ru: 'Завтра поеду в Ереван.' }, { sr: 'Ես գրելու եմ։', ru: 'Я буду писать.' }, { sr: 'Չեմ գնալու։', ru: 'Я не пойду.' }],
        contrast: 'В отрицании части опять меняются местами: {{չեմ գնալու}}. В разговоре о ближайшем будущем часто говорят и в настоящем: {{Վաղը գնում եմ}}.', items: ['g_future'] },
      { t: 'ex', id: 'sf1', type: 'choice', skills: ['grammar'], items: [['g_future', 'context']], tag: 'future', prompt: 'Как сказать «я буду читать»?', options: ['կարդալու եմ', 'կարդում եմ', 'կարդացի'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sf2', type: 'choice', skills: ['grammar'], items: [['g_future', 'context']], tag: 'future', prompt: 'Выберите отрицание.', sr: 'Գնալու եմ։', options: ['Չեմ գնալու։', 'Գնալու չեմ եմ։', 'Չգնալու եմ։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sf3', type: 'transform', skills: ['grammar', 'writing'], items: [['g_future', 'recall']], tag: 'future', recall: true, prompt: 'Напишите «мы будем работать» от глагола {{աշխատել}}.', accept: ['աշխատելու ենք', 'մենք աշխատելու ենք'] },
      { t: 'ex', id: 'sf4', type: 'transform', skills: ['grammar', 'writing'], items: [['g_future', 'recall']], tag: 'future', recall: true, prompt: 'Напишите «ты будешь есть» от глагола {{ուտել}}.', accept: ['ուտելու ես', 'դու ուտելու ես'] },
      { t: 'ex', id: 'sf5', type: 'order', skills: ['grammar'], items: [['vaghy', 'context']], tag: 'word-order', prompt: 'Соберите: «Завтра я поеду в Ереван».', tokens: ['եմ', 'Երևան', 'Վաղը', 'գնալու'], accept: ['Վաղը գնալու եմ Երևան', 'Վաղը Երևան եմ գնալու'] },
      { t: 'ex', id: 'sf6', type: 'type', skills: ['writing'], items: [['vaghy', 'recall']], tag: 'future', recall: true, prompt: 'Напишите: «Завтра я буду работать».', accept: ['Վաղը աշխատելու եմ', 'Վաղն աշխատելու եմ', 'Վաղը ես աշխատելու եմ', 'Ես վաղը աշխատելու եմ'] },
      { t: 'ex', id: 'sf7', type: 'choice', skills: ['grammar'], items: [], tag: 'tense-choice', prompt: 'Какое время? Выберите перевод.', sr: 'Երեկ գնացի, վաղը գնալու եմ։', options: ['Вчера пошёл, завтра пойду.', 'Вчера иду, завтра шёл.', 'Сейчас иду, завтра пойду.'], optLang: 'ru', correct: 0 }
    ] };

  L['s-want'] = { id: 's-want', title: 'Ուզում եմ', ru: 'Хочу и могу', goal: 'Говорить о желаниях и возможностях.', topics: ['modal'], minutes: 12, builds: ['s-fut'],
    steps: [
      { t: 'explain', title: 'Два удобных глагола', body: 'После {{ուզում եմ}} и {{կարող եմ}} идёт словарная форма глагола — как в русском «хочу читать».',
        examples: [{ sr: 'Ուզում եմ թեյ։', ru: 'Хочу чаю.' }, { sr: 'Ուզում եմ գնալ Երևան։', ru: 'Хочу поехать в Ереван.' }, { sr: 'Կարող եմ օգնել։', ru: 'Могу помочь.' }, { sr: 'Չեմ կարող գալ։', ru: 'Не могу прийти.' }],
        items: ['g_want', 'karogh_em', 'ognel'] },
      { t: 'ex', id: 'sz1', type: 'choice', skills: ['grammar'], items: [['g_want', 'context']], tag: 'modal', prompt: 'Как сказать «хочу пить»?', options: ['Ուզում եմ խմել։', 'Ուզում եմ խմում։', 'Ուզում խմել եմ։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sz2', type: 'choice', skills: ['grammar'], items: [['karogh_em', 'context']], tag: 'modal', prompt: 'Выберите отрицание.', sr: 'Կարող եմ գալ։', options: ['Չեմ կարող գալ։', 'Կարող չգալ եմ։', 'Կարող եմ չեմ։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sz3', type: 'order', skills: ['grammar'], items: [['uzel', 'context']], tag: 'word-order', prompt: 'Соберите: «Я хочу учить армянский».', tokens: ['սովորել', 'ուզում', 'Ես', 'եմ', 'հայերեն'], accept: ['Ես ուզում եմ սովորել հայերեն', 'Ես ուզում եմ հայերեն սովորել'] },
      { t: 'ex', id: 'sz4', type: 'order', skills: ['grammar'], items: [['karogh_em', 'context']], tag: 'word-order', prompt: 'Соберите: «Мы можем помочь».', tokens: ['կարող', 'օգնել', 'ենք', 'Մենք'], accept: ['Մենք կարող ենք օգնել'] },
      { t: 'ex', id: 'sz5', type: 'type', skills: ['writing'], items: [['uzel', 'recall']], tag: 'modal', recall: true, prompt: 'Напишите: «Я хочу пойти домой».', accept: ['Ես ուզում եմ գնալ տուն', 'Ուզում եմ գնալ տուն', 'Ուզում եմ տուն գնալ', 'Ես ուզում եմ տուն գնալ'] },
      { t: 'ex', id: 'sz6', type: 'type', skills: ['writing'], items: [['karogh_em', 'recall']], tag: 'modal', recall: true, prompt: 'Напишите: «Я могу читать».', accept: ['Ես կարող եմ կարդալ', 'Կարող եմ կարդալ'] },
      { t: 'ex', id: 'sz7', type: 'dialogue', skills: ['pragmatics'], items: [['ognel', 'context']], tag: 'modal', prompt: 'Кто-то несёт тяжёлую сумку. Что сказать?', options: ['Կարո՞ղ եմ օգնել։', 'Չեմ հասկանում։', 'Բարի գիշեր։'], optLang: 'sr', correct: 0 }
    ] };

  L['s-story'] = { id: 's-story', title: 'Իմ մասին', ru: 'Рассказ о себе', checkpoint: true, goal: 'Связно написать о себе: кто вы, откуда, что делаете и чего хотите.', topics: ['writing-s'], minutes: 15, builds: ['s-want'],
    steps: [
      { t: 'explain', title: 'Всё вместе', body: 'Теперь вы умеете собирать предложения. Прочитайте образец: здесь есть всё, что вы прошли, — «быть», настоящее, прошедшее, будущее, «хочу».',
        examples: [{ sr: 'Իմ անունն Աննա է։', ru: 'Меня зовут Анна.' }, { sr: 'Ես Մոսկվայից եմ, բայց հիմա ապրում եմ Երևանում։', ru: 'Я из Москвы, но сейчас живу в Ереване.' }, { sr: 'Ես սովորում եմ հայերեն։', ru: 'Я учу армянский.' }, { sr: 'Երեկ գնացի շուկա։', ru: 'Вчера я ходила на рынок.' }, { sr: 'Վաղը գնալու եմ Սևան։', ru: 'Завтра поеду на Севан.' }] },
      { t: 'ex', id: 'ss1', type: 'order', skills: ['grammar'], items: [], tag: 'word-order', prompt: 'Соберите: «Я живу в Ереване».', tokens: ['Երևանում', 'ապրում', 'Ես', 'եմ'], accept: ['Ես ապրում եմ Երևանում', 'Ես Երևանում եմ ապրում'] },
      { t: 'ex', id: 'ss2', type: 'order', skills: ['grammar'], items: [], tag: 'word-order', prompt: 'Соберите: «Моя сестра не работает».', tokens: ['քույրը', 'Իմ', 'չի', 'աշխատում'], accept: ['Իմ քույրը չի աշխատում'] },
      { t: 'ex', id: 'ss3', type: 'order', skills: ['grammar'], items: [], tag: 'word-order', prompt: 'Соберите: «Где вы живёте?».', tokens: ['եք', 'Որտե՞ղ', 'ապրում'], accept: ['Որտե՞ղ եք ապրում'] },
      { t: 'ex', id: 'ss4', type: 'fix', skills: ['grammar'], items: [], tag: 'word-order', recall: true, prompt: 'Исправьте ошибку: связка потерялась.', sr: 'Ես ուսանող։', accept: ['Ես ուսանող եմ'] },
      { t: 'ex', id: 'ss5', type: 'fix', skills: ['grammar'], items: [], tag: 'cases', recall: true, prompt: 'Исправьте ошибку: нужно окончание «где».', sr: 'Ես ապրում եմ Երևան։', accept: ['Ես ապրում եմ Երևանում'] },
      { t: 'ex', id: 'ss6', type: 'write', skills: ['writing'], items: [], tag: 'writing-s', prompt: 'Напишите 3 предложения о себе: имя, откуда вы и что делаете.', groups: [['անուն'], ['ից եմ', 'եմ'], ['ում եմ', 'ում ես']], minGroups: 2, model: 'Իմ անունն Աննա է։ Ես Մոսկվայից եմ։ Ես սովորում եմ հայերեն։' },
      { t: 'ex', id: 'ss7', type: 'write', skills: ['writing'], items: [], tag: 'writing-s', prompt: 'Напишите 2 предложения: что вы делали вчера и что будете делать завтра.', groups: [['երեկ'], ['վաղը']], model: 'Երեկ գնացի խանութ։ Վաղը գնալու եմ աշխատանքի։' }
    ] };

  L['s-have'] = { id: 's-have', title: 'Ես ունեմ', ru: '«У меня есть» и «здесь есть»', goal: 'Говорить, что у вас есть, и спрашивать, есть ли что-то рядом.', topics: ['have'], minutes: 14, builds: ['s-negv'],
    steps: [
      { t: 'explain', title: '«Я имею»', body: 'По-армянски не говорят «у меня есть» — говорят «я имею»: {{ունեմ}}. Отрицание — {{չունեմ}}, слитно.',
        table: [['ես', 'ունեմ', 'չունեմ'], ['դու', 'ունես', 'չունես'], ['նա', 'ունի', 'չունի'], ['մենք', 'ունենք', 'չունենք'], ['դուք', 'ունեք', 'չունեք'], ['նրանք', 'ունեն', 'չունեն']],
        examples: [{ sr: 'Ես եղբայր ունեմ։', ru: 'У меня есть брат.' }, { sr: 'Փող չունեմ։', ru: 'У меня нет денег.' }], contrast: 'Прошедшее — {{ունեի, ունեիր, ուներ}}: {{Ես շուն ունեի}} — у меня была собака.', items: ['g_have'] },
      { t: 'ex', id: 'sh1', type: 'choice', skills: ['grammar'], items: [['g_have', 'context']], tag: 'have', prompt: 'Выберите форму.', sr: 'Մենք մեքենա ___։', options: ['ունենք', 'ունեմ', 'ունի'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sh2', type: 'choice', skills: ['grammar'], items: [['g_have', 'context']], tag: 'have', prompt: 'Как сказать «у него нет брата»?', options: ['Նա եղբայր չունի։', 'Նա եղբայր չի ունի։', 'Նա չէ եղբայր։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sh3', type: 'order', skills: ['grammar'], items: [['g_have', 'context']], tag: 'word-order', prompt: 'Соберите: «У меня есть сестра».', tokens: ['ունեմ', 'Ես', 'քույր'], accept: ['Ես քույր ունեմ'] },
      { t: 'ex', id: 'sh4', type: 'type', skills: ['writing'], items: [['g_have', 'recall']], tag: 'have', recall: true, prompt: 'Напишите: «У меня нет машины».', accept: ['Ես մեքենա չունեմ', 'Մեքենա չունեմ'] },
      { t: 'explain', title: '«Здесь есть» и «нет»', body: 'Если говорим, что что-то где-то есть, нужно слово {{կա}}, а если нет — {{չկա}}.',
        examples: [{ sr: 'Այստեղ խանութ կա՞։', ru: 'Здесь есть магазин?' }, { sr: 'Այո, կա։', ru: 'Да, есть.' }, { sr: 'Հաց չկա։', ru: 'Хлеба нет.' }, { sr: 'Այստեղ շատ խանութներ կան։', ru: 'Здесь много магазинов.' }], contrast: 'Если предметов много, форма другая: {{կան}}, {{չկան}}.' },
      { t: 'intro', items: ['ka', 'chka'] },
      { t: 'ex', id: 'sh5', type: 'choice', skills: ['grammar'], items: [['ka', 'context']], tag: 'have', prompt: 'Что значит этот вопрос?', sr: 'Այստեղ դեղատուն կա՞։', options: ['Здесь есть аптека?', 'Где аптека?', 'Аптека далеко?'], optLang: 'ru', correct: 0 },
      { t: 'ex', id: 'sh6', type: 'order', skills: ['grammar'], items: [['chka', 'context']], tag: 'word-order', prompt: 'Соберите: «Здесь нет воды».', tokens: ['չկա', 'ջուր', 'Այստեղ'], accept: ['Այստեղ ջուր չկա'] },
      { t: 'ex', id: 'sh7', type: 'type', skills: ['writing'], items: [['ka', 'recall']], tag: 'have', recall: true, prompt: 'Спросите: «Здесь есть рынок?».', accept: ['Այստեղ շուկա կա՞'] }
    ] };

  L['s-gen'] = { id: 's-gen', title: 'Աննայի գիրքը', ru: 'Чей, кому, с кем', goal: 'Говорить о принадлежности и использовать «меня», «тебе», «с нами».', topics: ['genitive'], minutes: 16, builds: ['s-where'],
    steps: [
      { t: 'explain', title: 'Окончания -ի и -ին', body: '«Чей» — окончание {{-ի}}. «Кому» — {{-ին}}. О людях {{-ին}} ставится и вместо «кого»: так армянский показывает, что человек — дополнение.',
        examples: [{ sr: 'Աննայի գիրքը', ru: 'книга Анны' }, { sr: 'Արամի տունը', ru: 'дом Арама' }, { sr: 'Գիրքը տվեցի Արամին։', ru: 'Я дал книгу Араму.' }, { sr: 'Ես տեսնում եմ Աննային։', ru: 'Я вижу Анну.' }],
        mistakes: ['Имена на {{-ա}} получают {{յ}}: {{Աննա → Աննայի}}, {{Աննային}}.', 'Гласная внутри может выпасть: {{պանիր → պանրի}}, {{միս → մսի}}.', '{{-ու}} часто меняется: {{կատու → կատվի}}, {{լեզու → լեզվի}}, {{ձու → ձվի}}.', 'Особые формы: {{մայր → մոր}}, {{հայր → հոր}}, {{եղբայր → եղբոր}}, {{տուն → տան}}, {{շուն → շան}}, {{գինի → գինու}}.'], items: ['g_gen'] },
      { t: 'ex', id: 'sg1', type: 'choice', skills: ['grammar'], items: [['g_gen', 'context']], tag: 'genitive', prompt: 'Как сказать «дом Арама»?', options: ['Արամի տունը', 'Արամում տունը', 'Արամից տունը'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sg2', type: 'choice', skills: ['grammar'], items: [['g_gen', 'context']], tag: 'genitive', prompt: 'Как сказать «я вижу Анну»?', options: ['Ես տեսնում եմ Աննային։', 'Ես տեսնում եմ Աննա։', 'Ես տեսնում եմ Աննայից։'], optLang: 'sr', correct: 0 },
      { t: 'explain', title: 'Послелоги: на, под, для, о', body: 'Вместо предлогов армянский часто использует послелоги. Они стоят после слова в форме на {{-ի}}.',
        examples: [{ sr: 'սեղանի վրա', ru: 'на столе' }, { sr: 'սեղանի տակ', ru: 'под столом' }, { sr: 'սեղանի մոտ', ru: 'у стола' }, { sr: 'երեխայի համար', ru: 'для ребёнка' }, { sr: 'գրքի մասին', ru: 'о книге' }],
        contrast: 'Вместо {{սեղանի վրա}} можно сказать {{սեղանին}}: {{Տետրը սեղանին է}}.' },
      { t: 'ex', id: 'sg7', type: 'choice', skills: ['grammar'], items: [['g_gen', 'context']], tag: 'genitive', prompt: 'Как сказать «для ребёнка»?', options: ['երեխայի համար', 'երեխա համար', 'համար երեխա'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sg8', type: 'choice', skills: ['grammar'], items: [['g_gen', 'context']], tag: 'genitive', prompt: 'Как сказать «на столе»?', options: ['սեղանի վրա', 'վրա սեղան', 'սեղանից վրա'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sg3', type: 'cloze', skills: ['grammar'], items: [['g_gen', 'recall']], tag: 'genitive', recall: true, prompt: 'Вставьте: «книга Анны».', sr: '___ գիրքը', accept: ['Աննայի'] },
      { t: 'explain', title: 'Меня, тебя, нас', body: 'У местоимений одна форма и для «меня», и для «мне». Со словом {{հետ}} получается «со мной».',
        table: [['ես', 'ինձ', 'ինձ հետ'], ['դու', 'քեզ', 'քեզ հետ'], ['նա', 'նրան', 'նրա հետ'], ['մենք', 'մեզ', 'մեզ հետ'], ['դուք', 'ձեզ', 'ձեզ հետ'], ['նրանք', 'նրանց', 'նրանց հետ']],
        examples: [{ sr: 'Ես քեզ սիրում եմ։', ru: 'Я тебя люблю.' }, { sr: 'Արի ինձ հետ։', ru: 'Пойдём со мной.' }], items: ['g_pron'] },
      { t: 'ex', id: 'sg4', type: 'order', skills: ['grammar'], items: [['g_pron', 'context']], tag: 'word-order', prompt: 'Соберите: «Я тебя люблю».', tokens: ['սիրում', 'քեզ', 'եմ', 'Ես'], accept: ['Ես քեզ սիրում եմ'] },
      { t: 'ex', id: 'sg5', type: 'choice', skills: ['grammar'], items: [['g_pron', 'context']], tag: 'genitive', prompt: 'Как сказать «с нами»?', options: ['մեզ հետ', 'մենք հետ', 'մեր հետ'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sg6', type: 'type', skills: ['writing'], items: [['g_pron', 'recall']], tag: 'genitive', recall: true, prompt: 'Напишите: «со мной».', accept: ['ինձ հետ'] }
    ] };

  L['s-must'] = { id: 's-must', title: 'Պետք է', ru: 'Надо, нужно, можно', goal: 'Говорить, что надо, что нужно и что можно.', topics: ['must'], minutes: 15, builds: ['s-want'],
    steps: [
      { t: 'explain', title: '«Надо» + глагол', body: 'После {{պետք է}} глагол теряет {{-ել}}/{{-ալ}} и получает короткое личное окончание. Это условная форма: она нужна и после {{որ}}, {{թող}}.',
        table: [['', 'գնալ', 'գրել'], ['ես', 'գնամ', 'գրեմ'], ['դու', 'գնաս', 'գրես'], ['նա', 'գնա', 'գրի'], ['մենք', 'գնանք', 'գրենք'], ['դուք', 'գնաք', 'գրեք'], ['նրանք', 'գնան', 'գրեն']],
        examples: [{ sr: 'Պետք է գնամ։', ru: 'Мне надо идти.' }, { sr: 'Պետք է աշխատեմ։', ru: 'Мне надо работать.' }], items: ['g_must'] },
      { t: 'ex', id: 'sm1', type: 'choice', skills: ['grammar'], items: [['g_must', 'context']], tag: 'must', prompt: 'Как сказать «мне надо читать»?', options: ['Պետք է կարդամ։', 'Պետք է կարդում եմ։', 'Պետք է կարդացի։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sm2', type: 'cloze', skills: ['grammar'], items: [['g_must', 'recall']], tag: 'must', recall: true, prompt: 'Вставьте форму глагола {{գնալ}}: «Нам надо идти».', sr: 'Պետք է ___։', accept: ['գնանք'] },
      { t: 'explain', title: '«Мне нужно» и «можно»', body: 'Если нужен предмет, говорят: кому + что + {{է պետք}}. Разрешение — {{կարելի է}}, запрет — {{չի կարելի}}. После них идёт словарная форма глагола.',
        examples: [{ sr: 'Ինձ ջուր է պետք։', ru: 'Мне нужна вода.' }, { sr: 'Պետք է գրել։', ru: 'Нужно писать (вообще).' }, { sr: 'Պետք չէ։', ru: 'Не нужно.' }, { sr: 'Կարելի՞ է նստել։', ru: 'Можно сесть?' }, { sr: 'Այստեղ չի կարելի ծխել։', ru: 'Здесь нельзя курить.' }], contrast: 'Отрицание — {{չպետք է գնամ}}: мне не следует идти. В книгах встретится и {{պիտի}}, но сам по себе он сейчас редок: обычно говорят {{պետք է}}.' },
      { t: 'ex', id: 'sm3', type: 'order', skills: ['grammar'], items: [['g_must', 'context']], tag: 'word-order', prompt: 'Соберите: «Мне нужен врач».', tokens: ['բժիշկ', 'պետք', 'Ինձ', 'է'], accept: ['Ինձ բժիշկ է պետք'] },
      { t: 'ex', id: 'sm4', type: 'choice', skills: ['pragmatics'], items: [], tag: 'must', prompt: 'Вы хотите войти в кабинет. Что сказать?', options: ['Կարելի՞ է։', 'Պետք է։', 'Չի կարելի։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sm5', type: 'type', skills: ['writing'], items: [['g_must', 'recall']], tag: 'must', recall: true, prompt: 'Напишите: «Мне надо идти».', accept: ['Պետք է գնամ', 'Ես պետք է գնամ'] },
      { t: 'ex', id: 'sm6', type: 'type', skills: ['writing'], items: [['g_must', 'recall']], tag: 'must', recall: true, prompt: 'Напишите: «Мне нужна вода».', accept: ['Ինձ ջուր է պետք'] }
    ] };

  L['s-imper'] = { id: 's-imper', title: 'Գրի՛ր', ru: 'Просьбы и приказы', goal: 'Просить и советовать: «пиши», «идите», «не ходи».', topics: ['imperative'], minutes: 12, builds: ['s-must'],
    steps: [
      { t: 'explain', title: 'Повелительная форма', body: 'На письме над последней гласной ставится знак {{՛}}. Глаголы на {{-ել}} и {{-ալ}} меняются по-разному.',
        table: [['', 'на «ты»', 'на «Вы»'], ['գրել', 'գրի՛ր', 'գրե՛ք, գրեցե՛ք'], ['խոսել', 'խոսի՛ր', 'խոսե՛ք, խոսեցե՛ք'], ['կարդալ', 'կարդա՛', 'կարդացե՛ք'], ['գնալ', 'գնա՛', 'գնացե՛ք']],
        examples: [{ sr: 'Խոսե՛ք դանդաղ։', ru: 'Говорите медленно.' }, { sr: 'Գնացե՛ք ուղիղ։', ru: 'Идите прямо.' }],
        mistakes: ['Неправильные: {{գալ → արի՛, եկե՛ք}}, {{տալ → տո՛ւր, տվե՛ք}}.'], contrast: 'На «Вы» у глаголов на {{-ել}} по норме {{-եցե՛ք}}: {{փակեցե՛ք}} — закройте, а в устной речи чаще короткая форма {{փակե՛ք}}. Запрет — слово {{մի՛}} перед глаголом: {{Մի՛ գնա}} — не ходи, {{Մի՛ գրեք}} — не пишите.', items: ['g_imper'] },
      { t: 'ex', id: 'si1', type: 'choice', skills: ['grammar'], items: [['g_imper', 'context']], tag: 'imperative', prompt: 'Как вежливо сказать «читайте»?', options: ['Կարդացե՛ք։', 'Կարդա՛։', 'Կարդում եք։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'si2', type: 'choice', skills: ['grammar'], items: [['g_imper', 'context']], tag: 'imperative', prompt: 'Как сказать другу «иди сюда»?', options: ['Արի՛։', 'Եկե՛ք։', 'Գալիս եմ։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'si3', type: 'choice', skills: ['grammar'], items: [['g_imper', 'context']], tag: 'imperative', prompt: 'Как сказать «не ходи»?', options: ['Մի՛ գնա։', 'Չգնա։', 'Չես գնում։'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'si4', type: 'transform', skills: ['grammar', 'writing'], items: [['g_imper', 'recall']], tag: 'imperative', recall: true, prompt: 'Напишите «пиши» на «ты».', accept: ['գրի՛ր'] },
      { t: 'ex', id: 'si5', type: 'transform', skills: ['grammar', 'writing'], items: [['g_imper', 'recall']], tag: 'imperative', recall: true, prompt: 'Напишите «идите» на «Вы».', accept: ['գնացե՛ք'] },
      { t: 'ex', id: 'si6', type: 'type', skills: ['writing'], items: [['dandagh', 'recall']], tag: 'imperative', recall: true, prompt: 'Попросите: «Говорите медленно, пожалуйста».', accept: ['Խոսե՛ք դանդաղ, խնդրեմ', 'Դանդաղ խոսե՛ք, խնդրեմ', 'Խոսեցե՛ք դանդաղ, խնդրեմ', 'Դանդաղ խոսեցե՛ք, խնդրեմ'] }
    ] };

  L['s-comp'] = { id: 's-comp', title: 'Ավելի մեծ', ru: 'Сравнение', goal: 'Сравнивать: больше, меньше, самый.', topics: ['comparison'], minutes: 10, builds: ['s-imper'],
    steps: [
      { t: 'explain', title: '«Более» и «самый»', body: 'Прилагательное не меняется: перед ним ставится {{ավելի}} (более) или {{պակաս}} (менее). То, с чем сравниваем, получает окончание {{-ից}} — то же, что и «откуда». «Самый» — приставка {{ամենա-}} или, реже, суффикс {{-գույն}}: {{լավագույն}} — лучший.',
        examples: [{ sr: 'Երևանն ավելի մեծ է։', ru: 'Ереван больше.' }, { sr: 'Մոսկվան Երևանից մեծ է։', ru: 'Москва больше Еревана.' }, { sr: 'Սա ամենալավ սուրճն է։', ru: 'Это самый лучший кофе.' }], items: ['g_comp'] },
      { t: 'ex', id: 'sc1', type: 'choice', skills: ['grammar'], items: [['g_comp', 'context']], tag: 'comparison', prompt: 'Как сказать «лучше»?', options: ['ավելի լավ', 'լավում', 'շատ լավեր'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sc2', type: 'choice', skills: ['grammar'], items: [['g_comp', 'context']], tag: 'comparison', prompt: 'Как сказать «самый большой»?', options: ['ամենամեծ', 'շատմեծ', 'մեծից'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sc3', type: 'order', skills: ['grammar'], items: [['g_comp', 'context']], tag: 'word-order', prompt: 'Соберите: «Чай лучше кофе».', tokens: ['լավ', 'Թեյը', 'է', 'սուրճից'], accept: ['Թեյը սուրճից լավ է'] },
      { t: 'ex', id: 'sc4', type: 'type', skills: ['writing'], items: [['g_comp', 'recall']], tag: 'comparison', recall: true, prompt: 'Напишите: «более красивый».', accept: ['ավելի գեղեցիկ'] }
    ] };

  L['s-conj'] = { id: 's-conj', title: 'Որովհետև', ru: 'Сложные предложения', goal: 'Соединять предложения: но, или, потому что, если, что.', topics: ['conj'], minutes: 14, builds: ['s-comp'],
    steps: [
      { t: 'explain', title: 'Союзы соединяют мысли', body: 'Союзы работают почти как в русском. Слово {{որ}} значит «что» и «который», {{եթե}} — «если». В каждой части остаётся свой глагол.',
        examples: [{ sr: 'Տանն եմ, որովհետև հիվանդ եմ։', ru: 'Я дома, потому что болею.' }, { sr: 'Գիտեմ, որ նա այստեղ է։', ru: 'Я знаю, что он здесь.' }, { sr: 'Եթե ուզում ես, արի։', ru: 'Если хочешь, приходи.' }, { sr: 'Հետո տուն եմ գնում։', ru: 'Потом иду домой.' }], items: ['g_conj'] },
      { t: 'intro', items: ['bayts', 'kam', 'vorovhetev', 'yete', 'heto'] },
      { t: 'ex', id: 'sj1', type: 'match', skills: ['vocab'], items: [['bayts', 'recognition'], ['kam', 'recognition'], ['vorovhetev', 'recognition'], ['yete', 'recognition']], tag: 'conj', prompt: 'Соедините союзы с переводом.', pairs: [['բայց', 'но'], ['կամ', 'или'], ['որովհետև', 'потому что'], ['եթե', 'если']] },
      { t: 'ex', id: 'sj2', type: 'choice', skills: ['grammar'], items: [['bayts', 'context']], tag: 'conj', prompt: 'Выберите союз: «Я не армянин, но учу армянский».', sr: 'Ես հայ չեմ, ___ հայերեն եմ սովորում։', options: ['բայց', 'կամ', 'եթե'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sj3', type: 'choice', skills: ['grammar'], items: [['vorovhetev', 'context']], tag: 'conj', prompt: 'Выберите союз: «Я дома, потому что устал».', sr: 'Տանն եմ, ___ հոգնած եմ։', options: ['որովհետև', 'բայց', 'կամ'], optLang: 'sr', correct: 0 },
      { t: 'ex', id: 'sj4', type: 'order', skills: ['grammar'], items: [['g_conj', 'context']], tag: 'word-order', prompt: 'Соберите: «Я знаю, что он здесь».', tokens: ['որ', 'Գիտեմ', 'է', 'այստեղ', 'նա'], accept: ['Գիտեմ որ նա այստեղ է'] },
      { t: 'ex', id: 'sj5', type: 'type', skills: ['writing'], items: [['kam', 'recall']], tag: 'conj', recall: true, prompt: 'Напишите: «чай или кофе».', accept: ['թեյ կամ սուրճ'] },
      { t: 'ex', id: 'sj6', type: 'write', skills: ['writing'], items: [], tag: 'writing-s', prompt: 'Напишите предложение с союзом: почему вы учите армянский?', groups: [['որովհետև', 'որ', 'բայց']], model: 'Ես սովորում եմ հայերեն, որովհետև սիրում եմ Հայաստանը։' }
    ] };

  SM.content = SM.content || {};
  SM.content.lessons = L;
})(window.SM = window.SM || {});
