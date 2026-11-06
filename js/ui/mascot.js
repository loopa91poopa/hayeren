/* Мопс — иллюстрации из пака проекта (images/pug/*.png).
 * Состояние → картинка → когда показывается:
 *   greet       машет лапой          приветствие, главная
 *   joy         смеётся              верный ответ
 *   proud       гордится             вспомнил сам, урок пройден
 *   celebrate   праздник             экзамен сдан, уровень завершён
 *   think       задумался            вопрос, «почти верно», диагностика
 *   surprised   удивлён              неожиданный поворот
 *   shy         смущён               ответ с подсказкой
 *   support     с сердечком          ошибка, «Не помню», экзамен не сдан — поддержка без упрёков
 *   overwhelmed «ох, сколько всего»  накопилось много повторений
 *   sad         грустит              подтверждение выхода или сброса
 *   explain     читает книгу         объяснение правила
 *   writing     пишет                письменные задания
 *   listen      в наушниках          аудирование
 *   laptop      за ноутбуком         диагностика, экзамен
 *   run         бежит                маршрут
 *   travel      с чемоданом          диалоги, новый уровень
 *   eat         ест                  перерыв
 *   sleep       спит                 пусто, повторять нечего
 * «Злой» и «плачущий» мопсы из пака не используются: приложение не стыдит за ошибки. */
(function (SM) {
  'use strict';
  var h = SM.ui.h;

  var LABELS = {
    greet: 'Мопс машет лапой', joy: 'Мопс смеётся', proud: 'Мопс гордится', celebrate: 'Мопс празднует',
    think: 'Мопс задумался', surprised: 'Мопс удивился', shy: 'Мопс смущается', support: 'Мопс с сердечком',
    overwhelmed: 'Мопсу многовато', sad: 'Мопс грустит', explain: 'Мопс читает', writing: 'Мопс пишет',
    listen: 'Мопс в наушниках', laptop: 'Мопс за ноутбуком', run: 'Мопс бежит', travel: 'Мопс с чемоданом',
    eat: 'Мопс ест', sleep: 'Мопс спит'
  };
  var ALIASES = { reward: 'proud' }; // имя состояния из прошлой версии

  function resolve(state) {
    state = ALIASES[state] || state;
    return LABELS[state] ? state : 'greet';
  }
  function src(state) { return 'images/pug/' + resolve(state) + '.png'; }

  /* HTML-строка картинки — для мест, где разметка собирается строкой. */
  function img(state, opts) {
    opts = opts || {};
    var s = resolve(state);
    return '<img class="pug-img" src="' + src(s) + '" alt="' + (opts.decorative ? '' : LABELS[s]) + '"' +
      (opts.decorative ? ' aria-hidden="true"' : '') + ' width="230" height="236" decoding="async" draggable="false">';
  }

  /* Фразы мопса выбираются по кругу, чтобы не повторяться подряд. */
  var lastPick = {};
  function pick(list, key) {
    if (!list || !list.length) return '';
    var i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && lastPick[key] === i) i = (i + 1) % list.length;
    lastPick[key] = i;
    return list[i];
  }

  function mascot(state, message, opts) {
    opts = opts || {};
    if (!SM.store.get().settings.mascot && !opts.force) {
      return message ? h('div.mascot.no-pug', h('div.bubble', SM.ui.rich(message))) : h('span');
    }
    var fig = h('div.mascot-fig', { html: img(state, { decorative: !!message }) });
    return h('div.mascot' + (opts.small ? '.small' : '') + (opts.large ? '.large' : ''), fig,
      message ? h('div.bubble', { role: 'status' }, SM.ui.rich(message)) : null);
  }

  SM.ui.mascot = mascot;
  SM.ui.mascotImg = img;
  SM.ui.mascotSvg = img; // старые вызовы
  SM.ui.mascotHead = function () { return img('greet', { decorative: true }); };
  SM.ui.mascotSrc = src;
  SM.ui.MASCOT_STATES = Object.keys(LABELS);
  SM.ui.pickPhrase = pick;
})(window.SM = window.SM || {});
