/* Экзамены в конце этапов. Экзамен «Буквы» открывает этап «Слова», экзамен «Слова» —
 * этап «Предложения», экзамен «Предложения» завершает курс.
 * Задания — в формате упражнений уроков. Правило сдачи:
 *   всего не меньше 70% и не меньше 50% по каждому проверенному навыку.
 * Во время экзамена нет подсказок и разбора — результаты в конце. */
(function (SM) {
  'use strict';

  var EXAMS = {};

  // ════════════════════════════ Буквы ════════════════════════════
  EXAMS['exam-letters'] = {
    id: 'exam-letters', stage: 's1', level: 'Буквы', title: 'Экзамен «Буквы»', opens: 's2',
    desc: 'Проверка алфавита: узнать буквы и звуки, прочитать слова без транскрипции, написать слова армянскими буквами.',
    tasks: [
      { id: 'xl1', type: 'match', skills: ['reading'], tag: 'letters', items: [], prompt: 'Соедините заглавные и строчные буквы.', pairs: [['Գ', 'գ'], ['Ե', 'ե'], ['Թ', 'թ'], ['Հ', 'հ'], ['Շ', 'շ'], ['Ք', 'ք']], leftLang: 'ru', rightLang: 'ru' },
      { id: 'xl2', type: 'match', skills: ['reading'], tag: 'letters', items: [], prompt: 'Соедините буквы со звуками.', pairs: [['ա', '[а]'], ['շ', '[ш]'], ['ժ', '[ж]'], ['ջ', '[дж]'], ['ձ', '[дз]'], ['ֆ', '[ф]']], leftLang: 'ru', rightLang: 'ru' },
      { id: 'xl3', type: 'choice', skills: ['reading'], tag: 'letters', items: [['l_rr', 'recognition']], forceScript: 'cyr', prompt: 'Какая буква читается раскатистым [рр]?', options: ['ռ', 'ր', 'լ'], optLang: 'ru', correct: 0 },
      { id: 'xl4', type: 'choice', skills: ['reading'], tag: 'letters', items: [['l_kh2', 'recognition']], forceScript: 'cyr', prompt: 'Какая буква читается [к] с выдохом?', options: ['ք', 'կ', 'գ'], optLang: 'ru', correct: 0 },
      { id: 'xl5', type: 'choice', skills: ['reading'], tag: 'letters', items: [['l_o', 'recognition']], forceScript: 'cyr', prompt: 'Как читается ո в начале слова?', options: ['[во]', '[о]', '[у]'], optLang: 'ru', correct: 0 },
      { id: 'xl6', type: 'choice', skills: ['reading'], tag: 'reading-letters', items: [['hayr', 'recognition']], forceScript: 'cyr', prompt: 'Выберите перевод.', sr: 'հայր', options: ['отец', 'мать', 'день'], optLang: 'ru', correct: 0 },
      { id: 'xl7', type: 'choice', skills: ['reading'], tag: 'reading-letters', items: [['hats', 'recognition']], forceScript: 'cyr', prompt: 'Выберите перевод.', sr: 'հաց', options: ['хлеб', 'вода', 'чай'], optLang: 'ru', correct: 0 },
      { id: 'xl8', type: 'choice', skills: ['reading'], tag: 'reading-letters', items: [['shun', 'recognition']], forceScript: 'cyr', prompt: 'Выберите перевод.', sr: 'շուն', options: ['собака', 'кошка', 'лошадь'], optLang: 'ru', correct: 0 },
      { id: 'xl9', type: 'choice', skills: ['reading'], tag: 'reading-letters', items: [['tey', 'recognition']], forceScript: 'cyr', prompt: 'Выберите перевод.', sr: 'թեյ', options: ['чай', 'кофе', 'вино'], optLang: 'ru', correct: 0 },
      { id: 'xl10', type: 'choice', skills: ['reading'], tag: 'reading-letters', items: [['qaghaq', 'recognition']], forceScript: 'cyr', prompt: 'Выберите перевод.', sr: 'քաղաք', options: ['город', 'камень', 'дерево'], optLang: 'ru', correct: 0 },
      { id: 'xl11', type: 'read_choice', skills: ['reading'], tag: 'reading-letters', items: [], forceScript: 'cyr', prompt: 'Прочитайте без транскрипции.', text: 'Ես հայ չեմ։ Իմ մայրը հայ է։', gloss: 'չեմ — не (есть)', question: 'Кто армянка?', options: ['Мать', 'Сестра', 'Подруга'], optLang: 'ru', correct: 0 },
      { id: 'xl12', type: 'choice', skills: ['reading'], tag: 'reading-letters', items: [], prompt: 'Что значит знак «՞»?', options: ['вопрос', 'точка', 'запятая'], optLang: 'ru', correct: 0 },
      { id: 'xl13', type: 'type', skills: ['writing'], tag: 'reading-letters', items: [['tun', 'recall']], strict: true, prompt: 'Напишите армянскими буквами: «дом» [тун].', accept: ['տուն'] },
      { id: 'xl14', type: 'type', skills: ['writing'], tag: 'reading-letters', items: [['mayr', 'recall']], strict: true, prompt: 'Напишите армянскими буквами: «мать» [майр].', accept: ['մայր'] },
      { id: 'xl15', type: 'type', skills: ['writing'], tag: 'reading-letters', items: [['jur', 'recall']], strict: true, prompt: 'Напишите армянскими буквами: «вода» [джур].', accept: ['ջուր'] },
      { id: 'xl16', type: 'type', skills: ['writing'], tag: 'reading-letters', items: [['hayastan', 'recall']], strict: true, prompt: 'Напишите армянскими буквами: «Армения» [hайастан].', accept: ['Հայաստան'] }
    ]
  };

  // ════════════════════════════ Слова ════════════════════════════
  EXAMS['exam-words'] = {
    id: 'exam-words', stage: 's2', level: 'Слова', title: 'Экзамен «Слова»', opens: 's3',
    desc: 'Проверка словаря этапа: узнать, вспомнить и написать слова, понять готовые фразы.',
    tasks: [
      { id: 'xw1', type: 'match', skills: ['vocab'], tag: 'greetings', items: [], prompt: 'Соедините с переводами.', pairs: [['Բարի լույս', 'доброе утро'], ['Բարի գիշեր', 'спокойной ночи'], ['ցտեսություն', 'до свидания'], ['ներեցեք', 'извините'], ['խնդրեմ', 'пожалуйста']] },
      { id: 'xw2', type: 'match', skills: ['vocab'], tag: 'family', items: [], prompt: 'Соедините с переводами.', pairs: [['մայր', 'мать'], ['եղբայր', 'брат'], ['որդի', 'сын'], ['տատիկ', 'бабушка'], ['երեխա', 'ребёнок']] },
      { id: 'xw3', type: 'match', skills: ['vocab'], tag: 'colors', items: [], prompt: 'Соедините с переводами.', pairs: [['սպիտակ', 'белый'], ['սև', 'чёрный'], ['կարմիր', 'красный'], ['կանաչ', 'зелёный'], ['կապույտ', 'синий']] },
      { id: 'xw4', type: 'choice', skills: ['vocab'], tag: 'time', items: [['urbat', 'recognition']], prompt: 'Что значит это слово?', sr: 'ուրբաթ', options: ['пятница', 'суббота', 'понедельник'], optLang: 'ru', correct: 0 },
      { id: 'xw5', type: 'choice', skills: ['vocab'], tag: 'food', items: [['hamegh', 'recognition']], prompt: 'Что значит это слово?', sr: 'համեղ', options: ['вкусный', 'горячий', 'дорогой'], optLang: 'ru', correct: 0 },
      { id: 'xw6', type: 'choice', skills: ['vocab'], tag: 'city', items: [['deghatun', 'recognition']], prompt: 'Что значит это слово?', sr: 'դեղատուն', options: ['аптека', 'больница', 'школа'], optLang: 'ru', correct: 0 },
      { id: 'xw7', type: 'choice', skills: ['vocab'], tag: 'verbs', items: [['sovorel', 'recognition']], prompt: 'Что значит этот глагол?', sr: 'սովորել', options: ['учить', 'читать', 'работать'], optLang: 'ru', correct: 0 },
      { id: 'xw8', type: 'listen_choice', skills: ['listening'], tag: 'numbers', items: [['dram', 'listening']], prompt: 'Прослушайте. Сколько это стоит?', sr: 'Հազար դրամ։', options: ['1000 драмов', '100 драмов', '10 драмов'], optLang: 'ru', correct: 0 },
      { id: 'xw9', type: 'listen_choice', skills: ['listening'], tag: 'city', items: [['dzakh', 'listening']], prompt: 'Прослушайте. Куда идти?', sr: 'Գնացեք ձախ։', options: ['Налево', 'Направо', 'Прямо'], optLang: 'ru', correct: 0 },
      { id: 'xw10', type: 'read_choice', skills: ['reading'], tag: 'food', items: [], prompt: 'Прочитайте меню и ответьте.', text: 'Սուրճ — 500 դրամ։ Թեյ — 300 դրամ։ Խորոված — 2500 դրամ։', question: 'Что самое дешёвое?', options: ['Чай', 'Кофе', 'Шашлык'], optLang: 'ru', correct: 0 },
      { id: 'xw11', type: 'choice', skills: ['pragmatics'], tag: 'register', items: [['barev_dzez', 'context']], prompt: 'Вы обращаетесь к пожилому незнакомому человеку. Что сказать?', options: ['Բարև ձեզ։', 'Բարև։', 'Ինչպե՞ս ես։'], optLang: 'sr', correct: 0 },
      { id: 'xw12', type: 'dialogue', skills: ['pragmatics'], tag: 'greetings', items: [], prompt: 'Вам сказали:', sr: 'Շնորհակալություն։', options: ['Խնդրեմ։', 'Բարև։', 'Ցտեսություն։'], optLang: 'sr', correct: 0 },
      { id: 'xw13', type: 'type', skills: ['writing'], tag: 'greetings', items: [['shnorh', 'recall']], prompt: 'Как по-армянски «спасибо»?', accept: ['շնորհակալություն', 'մերսի'] },
      { id: 'xw14', type: 'type', skills: ['writing'], tag: 'numbers', items: [['hing', 'recall']], prompt: 'Напишите число 5 словом.', accept: ['հինգ'] },
      { id: 'xw15', type: 'type', skills: ['writing'], tag: 'food', items: [['surch', 'recall']], prompt: 'Как по-армянски «кофе»?', accept: ['սուրճ'] },
      { id: 'xw16', type: 'type', skills: ['writing'], tag: 'city', items: [['vortegh', 'recall']], prompt: 'Как спросить «где?»', accept: ['որտե՞ղ', 'որտեղ'] }
    ]
  };

  // ════════════════════════════ Предложения ════════════════════════════
  var STORY = 'Իմ անունն Արամ է։ Ես Երևանից եմ, բայց հիմա ապրում եմ Մոսկվայում։ Ես բժիշկ եմ։ Երեկ շատ աշխատեցի։ Վաղը գնալու եմ Երևան։';
  EXAMS['exam-sentences'] = {
    id: 'exam-sentences', stage: 's3', level: 'Предложения', title: 'Экзамен «Предложения»',
    desc: 'Итог курса: чтение, аудирование, грамматика, письмо и уместные фразы.',
    tasks: [
      { id: 'xs1', type: 'read_choice', skills: ['reading'], tag: 'reading-s', items: [], prompt: 'Прочитайте текст и ответьте.', text: STORY, question: 'Где Арам живёт сейчас?', options: ['В Москве', 'В Ереване', 'На Севане'], optLang: 'ru', correct: 0 },
      { id: 'xs2', type: 'read_choice', skills: ['reading'], tag: 'reading-s', items: [], prompt: 'Тот же текст.', text: STORY, question: 'Что Арам будет делать завтра?', options: ['Поедет в Ереван', 'Будет работать', 'Пойдёт в больницу'], optLang: 'ru', correct: 0 },
      { id: 'xs3', type: 'listen_choice', skills: ['listening'], tag: 'present', items: [], prompt: 'Прослушайте. Что сказал человек?', sr: 'Ես չեմ խոսում ռուսերեն։', options: ['Я не говорю по-русски.', 'Я говорю по-русски.', 'Я учу русский.'], optLang: 'ru', correct: 0 },
      { id: 'xs4', type: 'listen_choice', skills: ['listening'], tag: 'past', items: [], prompt: 'Прослушайте. Когда это было?', sr: 'Երեկ գնացի շուկա։', options: ['Вчера', 'Сегодня', 'Завтра'], optLang: 'ru', correct: 0 },
      { id: 'xs5', type: 'choice', skills: ['grammar'], tag: 'biti', items: [['g_biti', 'context']], prompt: 'Выберите форму.', sr: 'Մենք ուսանող ___։', options: ['ենք', 'եք', 'են'], optLang: 'sr', correct: 0 },
      { id: 'xs6', type: 'choice', skills: ['grammar'], tag: 'article', items: [['g_article', 'context']], prompt: 'Выберите вариант по литературной норме.', options: ['Սա իմ գիրքն է։', 'Սա իմ գիրքը է։', 'Սա գիրքն իմ է։'], optLang: 'sr', correct: 0 },
      { id: 'xs7', type: 'choice', skills: ['grammar'], tag: 'plural', items: [['g_plural', 'context']], prompt: 'Выберите множественное число от {{ուսանող}}.', options: ['ուսանողներ', 'ուսանողեր', 'ուսանողիկ'], optLang: 'sr', correct: 0 },
      { id: 'xs8', type: 'choice', skills: ['grammar'], tag: 'negation', items: [['g_neg_verb', 'context']], prompt: 'Выберите отрицание.', sr: 'Նա կարդում է։', options: ['Նա չի կարդում։', 'Նա կարդում չէ։', 'Նա չկարդում է։'], optLang: 'sr', correct: 0 },
      { id: 'xs9', type: 'choice', skills: ['grammar'], tag: 'cases', items: [['g_loc', 'context']], prompt: 'Выберите форму.', sr: 'Ես ապրում եմ ___։', options: ['Երևանում', 'Երևանից', 'Երևան'], optLang: 'sr', correct: 0 },
      { id: 'xs10', type: 'choice', skills: ['grammar'], tag: 'past', items: [['g_past', 'context']], prompt: 'Как сказать «вчера я прочитал»?', options: ['Երեկ կարդացի։', 'Երեկ կարդում եմ։', 'Երեկ կարդալու եմ։'], optLang: 'sr', correct: 0 },
      { id: 'xs11', type: 'order', skills: ['grammar'], tag: 'word-order', items: [['g_present', 'context']], prompt: 'Соберите: «Я пью воду».', tokens: ['եմ', 'ջուր', 'խմում', 'Ես'], accept: ['Ես ջուր եմ խմում'] },
      { id: 'xs12', type: 'order', skills: ['grammar'], tag: 'word-order', items: [['g_questions', 'context']], prompt: 'Соберите: «Где ты живёшь?».', tokens: ['ես', 'ապրում', 'Որտե՞ղ'], accept: ['Որտե՞ղ ես ապրում'] },
      { id: 'xs13', type: 'order', skills: ['grammar'], tag: 'word-order', items: [['g_future', 'context']], prompt: 'Соберите: «Завтра я не пойду».', tokens: ['գնալու', 'Վաղը', 'չեմ'], accept: ['Վաղը չեմ գնալու'] },
      { id: 'xs14', type: 'type', skills: ['writing'], tag: 'biti', items: [], prompt: 'Напишите: «Я не врач».', accept: ['Ես բժիշկ չեմ', 'Բժիշկ չեմ'] },
      { id: 'xs15', type: 'type', skills: ['writing'], tag: 'modal', items: [['uzel', 'context']], prompt: 'Напишите: «Я хочу чай».', accept: ['Ես թեյ եմ ուզում', 'Թեյ եմ ուզում', 'Ես ուզում եմ թեյ', 'Ուզում եմ թեյ'] },
      { id: 'xs16', type: 'write', skills: ['writing'], tag: 'writing-s', items: [], prompt: 'Напишите 3 предложения о себе: где вы живёте, что делаете, что будете делать завтра.', groups: [['ապրում'], ['վաղը', 'ու եմ']], minGroups: 2, model: 'Ես ապրում եմ Մոսկվայում։ Ես սովորում եմ հայերեն։ Վաղը գնալու եմ խանութ։' },
      { id: 'xs17', type: 'dialogue', skills: ['pragmatics'], tag: 'register', items: [], prompt: 'Незнакомый человек спрашивает, как вас зовут. Что он сказал?', options: ['Ի՞նչ է ձեր անունը։', 'Անունդ ի՞նչ է, ախպեր։', 'Ո՞ւր ես գնում։'], optLang: 'sr', correct: 0 }
    ]
  };

  SM.content = SM.content || {};
  SM.content.exams = EXAMS;
  SM.content.EXAM_PASS = 0.7;
  SM.content.EXAM_SKILL_MIN = 0.5;
})(window.SM = window.SM || {});
