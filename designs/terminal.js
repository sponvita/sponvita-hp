// 05 terminal — タイトルをマス目の文字に組み直す。一番下に、実際に打てるシェルを置く
(function () {
  // ── タイトル：5 段のドット文字 ──
  var GLYPH = {
    S: ['01111', '10000', '01110', '00001', '11110'],
    P: ['11110', '10001', '11110', '10000', '10000'],
    O: ['01110', '10001', '10001', '10001', '01110'],
    N: ['10001', '11001', '10101', '10011', '10001'],
    V: ['10001', '10001', '10001', '01010', '00100'],
    I: ['111', '010', '010', '010', '111'],
    T: ['11111', '00100', '00100', '00100', '00100'],
    A: ['01110', '10001', '11111', '10001', '10001']
  };
  var title = document.querySelector('.hero__title');
  var word = title ? title.getAttribute('aria-label') || '' : '';
  var ok = word && word.split('').every(function (ch) { return GLYPH[ch]; });
  if (ok) {
    var rows = ['', '', '', '', ''];
    word.split('').forEach(function (ch, i) {
      for (var r = 0; r < 5; r++) rows[r] += (i ? '0' : '') + GLYPH[ch][r];
    });
    var banner = document.createElement('div');
    banner.className = 'tm-banner';
    banner.style.gridTemplateColumns = 'repeat(' + rows[0].length + ', 1fr)';
    rows.forEach(function (row) {
      row.split('').forEach(function (bit, c) {
        var cell = document.createElement('i');
        if (bit === '1') { cell.className = 'on'; cell.style.setProperty('--c', c); }
        banner.appendChild(cell);
      });
    });
    title.appendChild(banner);
    document.documentElement.classList.add('tm-ready');
  }

  // ── シェル ──
  var main = document.querySelector('main');
  if (!main) return;
  var PROMPT = 'sponvita@web:~$ ';
  var shell = document.createElement('div');
  shell.className = 'tm-shell';
  shell.innerHTML =
    '<div class="tm-shell__out" aria-live="polite"></div>' +
    '<form class="tm-shell__line" autocomplete="off">' +
    '<label for="tm-in">' + PROMPT + '</label>' +
    '<input id="tm-in" class="tm-shell__input" type="text" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="help" aria-label="コマンドを入力">' +
    '</form>';
  main.appendChild(shell);
  var out = shell.querySelector('.tm-shell__out');
  var input = shell.querySelector('input');

  function print(text, cls) {
    var line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = text;
    out.appendChild(line);
  }
  function echo(cmd) {
    var line = document.createElement('div');
    var p = document.createElement('span');
    var c = document.createElement('span');
    p.className = 'p'; p.textContent = PROMPT;
    c.className = 'c'; c.textContent = cmd;
    line.appendChild(p); line.appendChild(c);
    out.appendChild(line);
  }
  function go(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var PAGES = { origin: 'origin', services: 'services', company: 'company' };
  var LINKS = { 'ai-fde': '/service/', 'ai/fde': '/service/', app: 'https://kinetic.sponvita.co.jp/' };

  function run(raw) {
    var cmd = raw.trim();
    echo(cmd);
    if (!cmd) return;
    var parts = cmd.toLowerCase().split(/\s+/);
    var name = parts[0];
    // cd origin / open app / cat company.yml のように書いても通す
    if ((name === 'cd' || name === 'open' || name === 'cat') && parts[1]) {
      name = parts[1].replace(/^\.?\//, '').replace(/\/$/, '').replace(/\.(md|yml)$/, '');
    }
    if (name === 'help') {
      print('origin  services  company   その場所へ移動');
      print('ai-fde  app                 ページを開く');
      print('ls  clear  reroll           一覧 / 消す / デザインを引き直す');
    } else if (name === 'ls') {
      print('origin.md  services/  company.yml  ai-fde  app');
    } else if (PAGES[name]) {
      go(PAGES[name]);
    } else if (LINKS[name]) {
      location.href = LINKS[name];
    } else if (name === 'clear') {
      out.textContent = '';
    } else if (name === 'reroll') {
      location.href = location.pathname;
    } else {
      print('command not found: ' + parts[0] + '（help で一覧）', 'e');
    }
  }

  shell.querySelector('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    run(input.value);
    input.value = '';
    input.scrollIntoView({ block: 'nearest' });
  });
})();
