/* Структура курса: этап → модули → уроки; в конце этапа — экзамен.
 * Путь: сначала буквы, потом слова, потом предложения.
 * Экзамен этапа открывает следующий этап. Модули внутри этапа идут подряд, без экзаменов. */
(function (SM) {
  'use strict';

  var STAGES = [
    {
      id: 's1', title: 'Буквы', from: 'с нуля', to: 'читаю', dot: 'Ա', level: 'Буквы', exam: 'exam-letters',
      lessonsTotal: 10,
      desc: 'Все 39 букв армянского алфавита, правила чтения и знаки препинания. К концу этапа вы читаете и пишете слова.',
      modules: [
        { id: 's1-m1', n: 1, range: 'Уроки 1–4', title: 'Առաջին տառերը', ru: 'Первая половина алфавита', planned: 0,
          vocab: ['Первые слова: дом, мать, отец, кошка', 'Местоимения: я, ты, он', 'Слово «армянин»'],
          grammar: ['Заглавные и строчные буквы', 'Как читать ո и ու', 'Как читать ե и է'],
          outcomes: ['Читать и писать 20 букв', 'Читать простые слова без транскрипции'],
          lessons: ['a-1', 'a-2', 'a-3', 'a-4'] },
        { id: 's1-m2', n: 2, range: 'Уроки 5–8', title: 'Մյուս տառերը', ru: 'Вторая половина алфавита', planned: 0,
          vocab: ['Вода, хлеб, чай', 'Числа от 3 до 9', 'Город, друг, привет'],
          grammar: ['Короткий гласный ը', 'Пары «с выдохом и без»', 'Лигатура և'],
          outcomes: ['Знать все 39 букв', 'Различать կ–ք, տ–թ, պ–փ, ծ–ց, ճ–չ'],
          lessons: ['a-5', 'a-6', 'a-7', 'a-8'] },
        { id: 's1-m3', n: 3, range: 'Уроки 9–10', title: 'Կարդում ենք', ru: 'Читаем', planned: 0,
          vocab: ['Повторение первых слов'], grammar: ['Армянские знаки препинания', 'Ударение', 'Правила чтения'],
          outcomes: ['Читать короткий текст', 'Подготовиться к экзамену'],
          lessons: ['a-read', 'a-check'] }
      ]
    },
    {
      id: 's2', title: 'Слова', from: 'читаю', to: 'знаю слова', dot: 'Բ', level: 'Слова', exam: 'exam-words',
      lessonsTotal: 10,
      desc: 'Около 300 новых слов и фраз на темы всех популярных разговорников: от приветствий и чисел до врача, гостиницы и экстренных случаев.',
      modules: [
        { id: 's2-m1', n: 1, range: 'Уроки 1–5', title: 'Բարև', ru: 'Первое общение', planned: 0,
          vocab: ['Приветствия', 'Вежливость', 'Знакомство', 'Страны и языки', 'Числа, цены, время'], grammar: ['Готовые фразы', 'Порядковые числа'],
          outcomes: ['Поздороваться и попрощаться', 'Назвать себя', 'Спросить цену'],
          lessons: ['w-greet', 'w-intro', 'w-lands', 'w-num', 'w-num2'], dialogues: ['dlg-znakom'] },
        { id: 's2-m2', n: 2, range: 'Уроки 6–11', title: 'Իմ աշխարհը', ru: 'Мой мир', planned: 0,
          vocab: ['Семья', 'Люди и работа', 'Чувства', 'Тело и здоровье', 'Дом', 'Одежда'], grammar: ['Прилагательное перед существительным', 'Рода нет'],
          outcomes: ['Рассказать о семье', 'Сказать, что болит', 'Назвать вещи дома'],
          lessons: ['w-family', 'w-people', 'w-feel', 'w-body', 'w-home', 'w-clothes'] },
        { id: 's2-m4', n: 3, range: 'Уроки 12–15', title: 'Սեղանի շուրջ', ru: 'Еда и покупки', planned: 0,
          vocab: ['Еда', 'Фрукты и продукты', 'Ресторан', 'Магазин'], grammar: ['Заказ: блюдо + խնդրեմ'],
          outcomes: ['Заказать в кафе и ресторане', 'Купить продукты', 'Спросить цену и скидку'],
          lessons: ['w-food', 'w-market', 'w-rest', 'w-shop'], dialogues: ['dlg-kafe', 'dlg-shuka'] },
        { id: 's2-m3', n: 4, range: 'Уроки 16–25', title: 'Շուրջը', ru: 'Вокруг меня', planned: 0,
          vocab: ['Город и дорога', 'Поездка и гостиница', 'Время, месяцы, погода', 'Природа', 'Цвета и описания', 'Экстренные случаи', 'Главные глаголы'], grammar: ['Словарная форма глагола'],
          outcomes: ['Спросить дорогу', 'Назвать дату и погоду', 'Описать предмет', 'Позвать на помощь'],
          lessons: ['w-city', 'w-travel', 'w-time', 'w-months', 'w-weather', 'w-nature', 'w-desc', 'w-opp', 'w-help', 'w-verbs'], dialogues: ['dlg-taqsi', 'dlg-hyuranots'] }
      ]
    },
    {
      id: 's3', title: 'Предложения', from: 'знаю слова', to: 'говорю', dot: 'Գ', level: 'Предложения', exam: 'exam-sentences',
      lessonsTotal: 11,
      desc: 'Как слова становятся предложениями: «быть», отрицание, вопросы, артикль, все времена, просьбы, сравнения и союзы.',
      modules: [
        { id: 's3-m1', n: 1, range: 'Уроки 1–4', title: 'Պարզ նախադասություն', ru: 'Простое предложение', planned: 0,
          vocab: ['Вопросительные слова'], grammar: ['Глагол «быть»', 'Отрицание չ-', 'Вопросы и знак ՞', 'Артикль и множественное число'],
          outcomes: ['Сказать, кто вы', 'Задать вопрос', 'Сказать «нет»'],
          lessons: ['s-biti', 's-neg', 's-ques', 's-art'], dialogues: ['dlg-chanaparh'] },
        { id: 's3-m2', n: 2, range: 'Уроки 5–10', title: 'Գործողություններ', ru: 'Действия', planned: 0,
          vocab: ['Притяжательные слова', 'Города и страны'], grammar: ['Настоящее время', 'Порядок слов', '«У меня есть», կա', 'Окончания -ում, -ից, -ի, -ին'],
          outcomes: ['Рассказать, что вы делаете', 'Сказать, что у вас есть', 'Сказать, где вы и откуда'],
          lessons: ['s-pres', 's-negv', 's-have', 's-poss', 's-where', 's-gen'], dialogues: ['dlg-yntaniq'] },
        { id: 's3-m3', n: 3, range: 'Уроки 11–18', title: 'Անցյալ և ապագա', ru: 'Прошлое и будущее', planned: 0,
          vocab: ['Планы', 'Желания', 'Союзы'], grammar: ['Прошедшее время', 'Будущее время', '«Хочу», «могу», «надо», «можно»', 'Повелительная форма', 'Сравнение', 'Сложные предложения'],
          outcomes: ['Рассказать о вчерашнем дне', 'Поделиться планами', 'Написать несколько предложений о себе'],
          lessons: ['s-past', 's-fut', 's-want', 's-must', 's-imper', 's-comp', 's-conj', 's-story'], dialogues: ['dlg-plan', 'dlg-bzhishk', 'dlg-korats'] }
      ]
    }
  ];

  // Файл подключается после уроков и диалогов: проставляем им модуль, этап, уровень и номер.
  var lessons = (SM.content && SM.content.lessons) || {};
  var dialogues = (SM.content && SM.content.dialogueById) || {};
  var moduleById = {}, stageById = {}, stageOfLesson = {}, moduleOfLesson = {}, order = [];
  STAGES.forEach(function (st, si) {
    st.index = si;
    stageById[st.id] = st;
    var n = 0;
    st.modules.forEach(function (m) {
      m.stage = st.id;
      moduleById[m.id] = m;
      m.lessons.forEach(function (lid) {
        order.push(lid); stageOfLesson[lid] = st.id; moduleOfLesson[lid] = m.id;
        var l = lessons[lid];
        if (l) { l.module = m.id; l.stage = st.id; l.level = st.level; l.n = ++n; }
      });
      (m.dialogues || []).forEach(function (did) { if (dialogues[did]) { dialogues[did].module = m.id; dialogues[did].stage = st.id; } });
    });
    st.lessonsTotal = n;
  });

  SM.content = SM.content || {};
  SM.content.stages = STAGES;
  SM.content.stageById = stageById;
  SM.content.moduleById = moduleById;
  SM.content.modules = STAGES.reduce(function (a, s) { return a.concat(s.modules); }, []);
  SM.content.lessonOrder = order;
  SM.content.stageOfLesson = stageOfLesson;
  SM.content.moduleOfLesson = moduleOfLesson;
})(window.SM = window.SM || {});
