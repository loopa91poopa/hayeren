/* Банк заданий входной диагностики. lvl: 1 = буквы, 2 = слова, 3 = предложения.
 * skill: reading | listening | grammar | vocab | writing | pragmatics.
 * tag связывает ошибку с темой курса (см. SM.content.topicMap).
 * Задания составлены для этого приложения; уровни не откалиброваны на реальных учащихся. */
(function (SM) {
  'use strict';

  var B = [
    // ── Буквы ──
    { id: 'd1', lvl: 1, skill: 'reading', type: 'choice', tag: 'letters', forceScript: 'cyr', prompt: 'Какой звук передаёт эта буква?', sr: 'մ', options: ['[м]', '[н]', '[с]', '[т]'], optLang: 'ru', correct: 0 },
    { id: 'd2', lvl: 1, skill: 'reading', type: 'choice', tag: 'letters', prompt: 'Какая заглавная буква соответствует строчной «հ»?', options: ['Հ', 'Ն', 'Տ', 'Ր'], optLang: 'ru', correct: 0 },
    { id: 'd3', lvl: 1, skill: 'vocab', type: 'choice', tag: 'reading-letters', prompt: 'Выберите перевод: տուն', options: ['дом', 'имя', 'день', 'вода'], optLang: 'ru', correct: 0 },
    { id: 'd4', lvl: 1, skill: 'reading', type: 'choice', tag: 'reading-letters', prompt: 'Как читается слово «բարև»?', options: ['[барэв]', '[парев]', '[бармэ]', '[варэб]'], optLang: 'ru', correct: 0 },
    { id: 'd5', lvl: 1, skill: 'writing', type: 'type', tag: 'reading-letters', prompt: 'Напишите армянскими буквами: «мать» [майр].', accept: ['մայր'] },
    { id: 'd6', lvl: 1, skill: 'reading', type: 'choice', tag: 'letters', prompt: 'Какая буква читается как [у]?', options: ['ու', 'ո', 'օ', 'ը'], optLang: 'ru', correct: 0 },
    { id: 'd7', lvl: 1, skill: 'listening', type: 'listen_choice', tag: 'reading-letters', prompt: 'Прослушайте. Что сказал человек?', sr: 'Բարև։', options: ['«Привет»', '«Спасибо»', '«Пока»'], optLang: 'ru', correct: 0 },

    // ── Слова ──
    { id: 'd8', lvl: 2, skill: 'vocab', type: 'choice', tag: 'greetings', prompt: 'Что значит это слово?', sr: 'շնորհակալություն', options: ['спасибо', 'пожалуйста', 'извините', 'до свидания'], optLang: 'ru', correct: 0 },
    { id: 'd9', lvl: 2, skill: 'vocab', type: 'choice', tag: 'family', prompt: 'Что значит это слово?', sr: 'եղբայր', options: ['брат', 'отец', 'сын', 'друг'], optLang: 'ru', correct: 0 },
    { id: 'd10', lvl: 2, skill: 'vocab', type: 'choice', tag: 'time', prompt: 'Что значит это слово?', sr: 'վաղը', options: ['завтра', 'вчера', 'сегодня', 'сейчас'], optLang: 'ru', correct: 0 },
    { id: 'd11', lvl: 2, skill: 'pragmatics', type: 'choice', tag: 'register', prompt: 'Что вежливо сказать незнакомому врачу?', options: ['Բարև ձեզ։', 'Ինչպե՞ս ես։', 'Բարև։'], optLang: 'sr', correct: 0 },
    { id: 'd12', lvl: 2, skill: 'writing', type: 'type', tag: 'numbers', prompt: 'Напишите по-армянски число 2.', accept: ['երկու'] },
    { id: 'd13', lvl: 2, skill: 'reading', type: 'read_choice', tag: 'food', prompt: 'Прочитайте и ответьте.', text: 'Մի սուրճ և մի լավաշ, խնդրեմ։', question: 'Что заказывают?', options: ['Кофе и лаваш', 'Чай и хлеб', 'Вино и сыр'], optLang: 'ru', correct: 0 },
    { id: 'd14', lvl: 2, skill: 'listening', type: 'listen_choice', tag: 'city', prompt: 'Прослушайте. О чём спрашивают?', sr: 'Որտե՞ղ է շուկան։', options: ['Где рынок?', 'Когда рынок?', 'Сколько стоит?'], optLang: 'ru', correct: 0 },

    // ── Предложения ──
    { id: 'd15', lvl: 3, skill: 'grammar', type: 'choice', tag: 'biti', prompt: 'Выберите форму.', sr: 'Մենք այստեղ ___։', options: ['ենք', 'են', 'եմ', 'է'], optLang: 'sr', correct: 0 },
    { id: 'd16', lvl: 3, skill: 'grammar', type: 'choice', tag: 'negation', prompt: 'Выберите отрицание.', sr: 'Ես գրում եմ։', options: ['Ես չեմ գրում։', 'Ես գրում չեմ։', 'Ես չգրում եմ։'], optLang: 'sr', correct: 0 },
    { id: 'd17', lvl: 3, skill: 'grammar', type: 'order', tag: 'word-order', prompt: 'Соберите: «Я пью чай».', tokens: ['խմում', 'թեյ', 'Ես', 'եմ'], accept: ['Ես թեյ եմ խմում'] },
    { id: 'd18', lvl: 3, skill: 'grammar', type: 'choice', tag: 'cases', prompt: 'Как сказать «я из России»?', options: ['Ես Ռուսաստանից եմ։', 'Ես Ռուսաստանում եմ։', 'Ես Ռուսաստան եմ։'], optLang: 'sr', correct: 0 },
    { id: 'd19', lvl: 3, skill: 'reading', type: 'read_choice', tag: 'reading-s', prompt: 'Прочитайте и ответьте.', text: 'Երեկ ես տանն էի։ Վաղը գնալու եմ Երևան։', question: 'Что человек будет делать завтра?', options: ['Поедет в Ереван', 'Будет дома', 'Пойдёт на рынок'], optLang: 'ru', correct: 0 },
    { id: 'd20', lvl: 3, skill: 'writing', type: 'type', tag: 'biti', prompt: 'Напишите: «Я студент».', accept: ['Ես ուսանող եմ', 'Ուսանող եմ'] },
    { id: 'd21', lvl: 3, skill: 'listening', type: 'listen_choice', tag: 'past', prompt: 'Прослушайте. Когда это было?', sr: 'Երեկ գնացի շուկա։', options: ['Вчера', 'Завтра', 'Сейчас'], optLang: 'ru', correct: 0 },
    { id: 'd22', lvl: 3, skill: 'pragmatics', type: 'choice', tag: 'questions', prompt: 'Вас спрашивают {{Ի՞նչ է սա}}, показывая на книгу. Что ответить?', options: ['Սա գիրք է։', 'Ես գիրք եմ։', 'Գիրքը չեմ։'], optLang: 'sr', correct: 0 }
  ];

  /* Тема ошибки → урок курса, где она разбирается. */
  var TOPIC_MAP = {
    'letters': 'a-1', 'reading-letters': 'a-read', 'greetings': 'w-greet', 'register': 'w-greet', 'names': 'w-intro', 'numbers': 'w-num',
    'family': 'w-family', 'people': 'w-people', 'home': 'w-home', 'food': 'w-food', 'city': 'w-city', 'time': 'w-time', 'colors': 'w-desc', 'verbs': 'w-verbs',
    'biti': 's-biti', 'negation': 's-neg', 'questions': 's-ques', 'article': 's-art', 'plural': 's-art', 'present': 's-pres', 'word-order': 's-pres',
    'possessive': 's-poss', 'cases': 's-where', 'past': 's-past', 'future': 's-fut', 'tense-choice': 's-fut', 'modal': 's-want', 'writing-s': 's-story', 'reading-s': 's-past',
    'feelings': 'w-feel', 'body': 'w-body', 'clothes': 'w-clothes', 'shopping': 'w-shop', 'travel': 'w-travel', 'weather': 'w-weather', 'nature': 'w-nature', 'emergency': 'w-help',
    'have': 's-have', 'genitive': 's-gen', 'must': 's-must', 'imperative': 's-imper', 'comparison': 's-comp', 'conj': 's-conj',
    'dialogue': 'dlg-znakom', 'vocab-review': null, 'game-match': null
  };

  var TOPIC_LABELS = {
    'letters': 'буквы и звуки', 'reading-letters': 'чтение и письмо слов', 'greetings': 'приветствия и вежливость', 'register': '«ты» и «Вы»', 'names': 'знакомство',
    'numbers': 'числа и цены', 'family': 'семья', 'people': 'люди и работа', 'home': 'дом и вещи', 'food': 'еда', 'city': 'город и дорога', 'time': 'время и дни недели',
    'colors': 'цвета и описания', 'verbs': 'главные глаголы', 'biti': 'глагол «быть»', 'negation': 'отрицание', 'questions': 'вопросы', 'article': 'артикль',
    'plural': 'множественное число', 'present': 'настоящее время', 'word-order': 'порядок слов', 'possessive': 'притяжательные слова', 'cases': 'где, куда, откуда',
    'past': 'прошедшее время', 'future': 'будущее время', 'tense-choice': 'выбор времени', 'modal': '«хочу» и «могу»', 'writing-s': 'письмо', 'reading-s': 'чтение текста',
    'feelings': 'чувства', 'body': 'тело и здоровье', 'clothes': 'одежда', 'shopping': 'покупки', 'travel': 'поездки', 'weather': 'погода', 'nature': 'природа', 'emergency': 'экстренные случаи',
    'have': '«у меня есть», կա', 'genitive': 'чей, кому, с кем', 'must': '«надо» и «можно»', 'imperative': 'повелительная форма', 'comparison': 'сравнение', 'conj': 'союзы',
    'dialogue': 'диалоги', 'vocab-review': 'слова в повторении', 'game-match': 'значения слов (игра «Сопоставление»)'
  };

  SM.content = SM.content || {};
  SM.content.diagnosticBank = B;
  SM.content.topicMap = TOPIC_MAP;
  SM.content.topicLabels = TOPIC_LABELS;
})(window.SM = window.SM || {});
