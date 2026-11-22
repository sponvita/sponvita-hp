// 10 holo — カードをポインタ（スマホは本体の傾き）に合わせて傾け、箔の虹を動かす。金のきらめきを降らせる
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards = Array.prototype.slice.call(
    document.querySelectorAll('.hero__inner, .origin .section__inner, .company .section__inner, .card__link')
  );

  // ── カードの傾きと箔 ──
  cards.forEach(function (el) {
    var big = !el.classList.contains('card__link');
    var max = big ? 5 : 11; // 大きいカードは控えめに傾ける
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.classList.add('is-live');
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      if (!reduce) {
        el.style.setProperty('--ry', ((x - 0.5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y) * 2 * max).toFixed(2) + 'deg');
      }
    }, { passive: true });
    el.addEventListener('pointerleave', function () {
      el.classList.remove('is-live');
      ['--mx', '--my', '--rx', '--ry'].forEach(function (p) { el.style.removeProperty(p); });
    });
  });

  // スマホ：本体を傾けると箔が動く（許可の確認が要らない端末だけ）
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function' &&
      window.matchMedia('(hover: none)').matches) {
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return;
      var x = Math.max(0, Math.min(100, 50 + e.gamma * 1.6));
      var y = Math.max(0, Math.min(100, 50 + (e.beta - 45) * 1.6));
      cards.forEach(function (el) {
        el.classList.add('is-live');
        el.style.setProperty('--mx', x.toFixed(1) + '%');
        el.style.setProperty('--my', y.toFixed(1) + '%');
      });
    }, { passive: true });
  }

  if (reduce) return;

  // ── きらめき ──
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  canvas.className = 'hl-sparkles';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  var W = 0, H = 0, dpr = 1, stars = [], raf = 0, last = 0, lastSpawn = 0;
  var COLORS = ['#fff6cf', '#ffe38a', '#ffffff', '#d4af37', '#c9b6ff', '#9be8ff'];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn(x, y, speed, life) {
    if (stars.length > 260) return;
    var a = Math.random() * 6.283;
    stars.push({
      x: x, y: y,
      vx: Math.cos(a) * speed * Math.random(), vy: Math.sin(a) * speed * Math.random(),
      r: 2 + Math.random() * 6, rot: Math.random() * 3.14, vr: (Math.random() - 0.5) * 3,
      life: life, age: 0, c: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  }

  // 4 つの角を持つ星
  function star(s, alpha) {
    var r = s.r, q = r * 0.22;
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(q, -q); ctx.lineTo(r, 0); ctx.lineTo(q, q);
    ctx.lineTo(0, r); ctx.lineTo(-q, q); ctx.lineTo(-r, 0); ctx.lineTo(-q, -q);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    // ふだんは、ゆっくり降ってくる
    if (now - lastSpawn > 260) { lastSpawn = now; spawn(Math.random() * W, Math.random() * H * 0.9, 12, 1.6 + Math.random() * 1.6); }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = stars.length - 1; i >= 0; i--) {
      var s = stars[i];
      s.age += dt;
      if (s.age >= s.life) { stars.splice(i, 1); continue; }
      s.vy += 26 * dt; s.vx *= 0.985; s.vy *= 0.985;
      s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
      var k = s.age / s.life;
      star(s, Math.sin(k * 3.1416) * (0.55 + 0.45 * Math.sin(now / 70 + i)));
    }
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } });

  // 最初に、画面の中央から金の星が弾ける
  setTimeout(function () {
    for (var n = 0; n < 150; n++) spawn(W / 2, H * 0.45, 620, 1.2 + Math.random() * 1.6);
  }, 250);
  last = performance.now();
  raf = requestAnimationFrame(frame);

  // ポインタの通ったあとにも少し残る
  var lastTrail = 0;
  window.addEventListener('pointermove', function (e) {
    var now = performance.now();
    if (now - lastTrail < 45) return;
    lastTrail = now;
    spawn(e.clientX, e.clientY, 50, 0.7 + Math.random() * 0.6);
  }, { passive: true });
  // クリックした場所でも弾ける
  window.addEventListener('pointerdown', function (e) {
    for (var n = 0; n < 22; n++) spawn(e.clientX, e.clientY, 320, 0.7 + Math.random() * 0.8);
  }, { passive: true });
})();
