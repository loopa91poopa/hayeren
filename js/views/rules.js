/* Раздел «Правила»: правила появляются по мере прохождения уроков. */
(function (SM) {
  'use strict';
  var h = SM.ui.h, sr = SM.ui.sr, rich = SM.ui.rich;
  var V = SM.views = SM.views || {};

  function ruleCard(rule, open) {
    var body = h('div.rule-body');
    body.appendChild(rich(rule.body, 'p'));
    if (rule.table) {
      var tbl = h('table.gtable');
      rule.table.forEach(function (row, ri) {
        var tr = h('tr');
        row.forEach(function (cell) { tr.appendChild(h(ri === 0 ? 'th' : 'td', rule.rawTable ? cell : sr(cell))); });
        tbl.appendChild(tr);
      });
      body.appendChild(h('div.table-wrap', tbl));
    }
    if (rule.examples) {
      body.appendChild(h('ul.examples', rule.examples.map(function (e) {
        return h('li', h('span.ex-sr', sr(e.sr), SM.ui.audioButtons(e.sr, { slow: false })), h('span.ex-ru', e.ru));
      })));
    }
    if (rule.tip) body.appendChild(h('div.note', h('strong', 'Полезно. '), rich(rule.tip)));
    if (rule.exceptions && rule.exceptions.length) {
      body.appendChild(h('div.rule-exceptions', h('h4', 'Исключения и ловушки'), h('ul', rule.exceptions.map(function (x) { return h('li', rich(x)); }))));
    }
    var from = rule.lessons.map(function (lid) { return SM.content.lessons[lid]; }).filter(Boolean);
    if (from.length) body.appendChild(h('p.small.muted', 'Из урока: ', from.map(function (l, i) {
      return h('span', i ? ', ' : '', h('a', { href: '#/lesson/' + l.id }, SM.translit.render(l.title, SM.store.get().settings.script)));
    })));
    return h('details.rule-card', { id: rule.id, open: open ? true : null }, h('summary', h('span.rule-title', rule.title)), body);
  }

  V.rules = {
    render: function (main, args) {
      var query = '';
      var listBox = h('div');
      function draw() {
        SM.ui.clear(main);
        var s = SM.store.get();
        var open = SM.rules.list(s);
        var total = SM.content.rules.length;
        main.appendChild(h('div.page-title', h('h1', 'Правила'), h('span.page-pug', { html: SM.ui.mascotImg('explain', { decorative: true }) })));
        main.appendChild(h('p.lead', 'Сюда попадают правила из пройденных уроков — с примерами и исключениями. Удобно, чтобы быстро освежить тему.'));
        if (!open.length) {
          main.appendChild(h('div.card.center', SM.ui.mascot('explain', 'Пока здесь пусто. Пройдите первый урок — и первое правило появится здесь.'),
            h('div.actions.center', h('a.btn.primary', { href: '#/route' }, 'К урокам'))));
          return;
        }
        var input = h('input.search', { type: 'search', placeholder: 'Поиск по правилам: падеж, бити, исключения…', 'aria-label': 'Поиск по правилам', value: query,
          on: { input: function () { query = input.value; drawList(); } } });
        main.appendChild(h('div.search-row', SM.ui.icon('search'), input));
        main.appendChild(listBox);
        drawList();
        if (open.length < total) main.appendChild(h('p.small.muted', 'Открыто ' + open.length + ' из ' + total + '. Остальные появятся по мере прохождения уроков.'));
        if (args && args[0]) { var el = document.getElementById(args[0]); if (el) { el.open = true; el.scrollIntoView({ block: 'start' }); } }
      }
      function drawList() {
        SM.ui.clear(listBox);
        var s = SM.store.get();
        var q = query.toLowerCase().trim();
        var plain = function (t) { return String(t || '').replace(/\{\{|\}\}/g, '').toLowerCase(); };
        var list = SM.rules.list(s).filter(function (r) {
          if (!q) return true;
          var hay = [r.title, r.body, r.tip].concat(r.exceptions || []).map(plain).join(' ');
          return hay.indexOf(q) !== -1 || SM.translit.toLatin(hay).indexOf(SM.translit.toLatin(q)) !== -1;
        });
        if (!list.length) { listBox.appendChild(h('p.muted', 'Ничего не найдено.')); return; }
        SM.content.stages.forEach(function (st) {
          var group = list.filter(function (r) { return r.stage === st.id; });
          if (!group.length) return;
          listBox.appendChild(h('h2.rules-stage', st.title));
          group.forEach(function (r) { listBox.appendChild(ruleCard(r, !!q)); });
        });
      }
      draw();
      return { rerender: draw };
    }
  };
})(window.SM = window.SM || {});
