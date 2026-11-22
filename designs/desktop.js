// 09 desktop — ウィンドウをつかんで動かす。バーのボタン（最小化・最大化・閉じる）と時計
(function () {
  var root = document.documentElement;
  root.classList.add('dk-js');

  // ── 時計 ──
  var bar = document.querySelector('.site-header__inner');
  if (bar) {
    var clock = document.createElement('span');
    clock.className = 'dk-clock';
    clock.setAttribute('aria-hidden', 'true');
    bar.appendChild(clock);
    var tickClock = function () {
      var d = new Date();
      clock.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    };
    tickClock();
    setInterval(tickClock, 10000);
  }

  // ── ウィンドウ ──
  var wins = Array.prototype.slice.call(document.querySelectorAll('.hero__inner, .section__inner'));
  var wide = window.matchMedia('(min-width: 900px)');
  var z = 10;

  function activate(win) {
    wins.forEach(function (w) { w.classList.remove('is-active'); });
    win.classList.add('is-active');
    win.style.zIndex = ++z;
  }

  wins.forEach(function (win, idx) {
    var title = win.querySelector('.hero__eyebrow, .section__label');
    if (!title) return;
    win.classList.add('dk-win');
    if (idx === 0) win.classList.add('is-active');
    var pos = { x: 0, y: 0 };

    // バーの右に 3 つのボタンを足す
    var btns = document.createElement('span');
    btns.className = 'dk-btns';
    btns.setAttribute('aria-hidden', 'true');
    btns.innerHTML = '<b data-a="min"></b><b data-a="max"></b><b data-a="close"></b>';
    title.appendChild(btns);
    btns.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
    btns.addEventListener('click', function (ev) {
      var a = ev.target.getAttribute && ev.target.getAttribute('data-a');
      if (!a) return;
      activate(win);
      if (a === 'min') {
        win.classList.toggle('is-min');
      } else if (a === 'max') {
        win.classList.remove('is-min');
        win.classList.toggle('is-max');
      } else if (a === 'close') {
        // 閉じても、すぐ自分で開き直す（is-closing を外すと、開くときの動きがもう一度走る）
        win.classList.add('is-closing');
        setTimeout(function () { win.classList.remove('is-closing', 'is-min'); }, 700);
      }
    });

    win.addEventListener('pointerdown', function () { activate(win); });

    // バーをつかんで動かす（広い画面だけ）
    function setDraggable() { win.classList.toggle('dk-drag', wide.matches); if (!wide.matches) { pos.x = pos.y = 0; win.style.translate = ''; } }
    setDraggable();
    if (wide.addEventListener) wide.addEventListener('change', setDraggable);

    var start = null;
    title.addEventListener('pointerdown', function (ev) {
      if (!wide.matches || win.classList.contains('is-max') || ev.button > 0) return;
      start = { px: ev.clientX, py: ev.clientY, x: pos.x, y: pos.y };
      win.classList.add('is-dragging');
      try { title.setPointerCapture(ev.pointerId); } catch (e) {}
      ev.preventDefault();
    });
    title.addEventListener('pointermove', function (ev) {
      if (!start) return;
      pos.x = start.x + ev.clientX - start.px;
      pos.y = start.y + ev.clientY - start.py;
      win.style.translate = pos.x + 'px ' + pos.y + 'px';
    });
    function end() { start = null; win.classList.remove('is-dragging'); }
    title.addEventListener('pointerup', end);
    title.addEventListener('pointercancel', end);
  });
})();
