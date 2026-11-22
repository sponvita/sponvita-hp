// 02 blueprint — 寸法線に実測値を入れる。マウスの位置に十字線と座標を出す
(function () {
  var title = document.querySelector('.hero__title');
  if (!title) return;

  // タイトルの幅と高さを測って、寸法線の上に書く
  var w = document.createElement('b');
  var h = document.createElement('b');
  w.className = 'bp-dim bp-dim--w';
  h.className = 'bp-dim bp-dim--h';
  title.appendChild(w);
  title.appendChild(h);
  function measure() {
    var r = title.getBoundingClientRect();
    w.textContent = 'W ' + Math.round(r.width);
    h.textContent = 'H ' + Math.round(r.height);
  }
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  // 十字線と座標（マウスがある端末だけ）
  if (!window.matchMedia('(hover: hover)').matches) return;
  var cx = document.createElement('div');
  var cy = document.createElement('div');
  var co = document.createElement('div');
  cx.className = 'bp-cross bp-cross--x';
  cy.className = 'bp-cross bp-cross--y';
  co.className = 'bp-coords';
  [cx, cy, co].forEach(function (e) { e.setAttribute('aria-hidden', 'true'); document.body.appendChild(e); });
  function pad(n) { return ('0000' + Math.round(n)).slice(-4); }
  window.addEventListener('pointermove', function (ev) {
    document.documentElement.classList.add('bp-on');
    cx.style.transform = 'translateX(' + ev.clientX + 'px)';
    cy.style.transform = 'translateY(' + ev.clientY + 'px)';
    co.textContent = 'X ' + pad(ev.clientX) + '  Y ' + pad(ev.clientY + window.scrollY);
  }, { passive: true });
  document.addEventListener('mouseleave', function () {
    document.documentElement.classList.remove('bp-on');
  });
})();
