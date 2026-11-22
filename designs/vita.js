// 07 vita — タイトルを光の粒で描く。粒はポインタを避け、クリックで弾けて、また集まる
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ページ全体：ポインタについてくる淡い光
  window.addEventListener('pointermove', function (e) {
    root.style.setProperty('--px', e.clientX + 'px');
    root.style.setProperty('--py', e.clientY + 'px');
  }, { passive: true });

  // カード：ポインタの位置が内側から光る
  document.querySelectorAll('.card__link').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px');
      el.style.setProperty('--my', e.clientY - r.top + 'px');
    }, { passive: true });
  });

  var hero = document.querySelector('.hero');
  var title = document.querySelector('.hero__title');
  var deco = document.querySelector('.hero__deco');
  if (reduce || !hero || !title || !deco) return;

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  canvas.className = 'vt-canvas';
  deco.appendChild(canvas);

  var BUCKETS = 24;
  var STOPS = [[96, 245, 208], [110, 160, 255], [255, 150, 105]]; // teal → blue → warm
  var colors = [];
  for (var b = 0; b < BUCKETS; b++) {
    var u = b / (BUCKETS - 1) * 2, i0 = Math.min(1, Math.floor(u)), f = u - i0;
    var c0 = STOPS[i0], c1 = STOPS[i0 + 1];
    colors.push('rgb(' + [0, 1, 2].map(function (k) { return Math.round(c0[k] + (c1[k] - c0[k]) * f); }).join(',') + ')');
  }

  var W = 0, H = 0, dpr = 1;
  var parts = [];      // タイトルを作る粒
  var plankton = [];   // 漂っているだけの粒
  var groups = [];     // 色ごとにまとめた粒（描くときに色の切り替えを減らす）
  var pointer = { x: -9999, y: -9999 };
  var t0 = 0, burstUntil = 0, running = false, onScreen = true, raf = 0;

  function build() {
    var hr = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hr.width; H = hr.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // 本物の文字と同じ位置に、見えないキャンバスへ文字を描いて、文字の中の点を拾う
    var off = document.createElement('canvas');
    off.width = Math.ceil(W); off.height = Math.ceil(H);
    var o = off.getContext('2d', { willReadFrequently: true });
    var cs = getComputedStyle(title);
    var fontSize = parseFloat(cs.fontSize);
    o.font = cs.fontWeight + ' ' + fontSize + 'px ' + cs.fontFamily;
    o.textBaseline = 'alphabetic';
    o.fillStyle = '#fff';
    var tr = title.getBoundingClientRect();
    var spans = title.querySelectorAll('span');
    spans.forEach(function (sp) {
      var r = sp.getBoundingClientRect();
      var m = o.measureText(sp.textContent);
      var ascent = m.fontBoundingBoxAscent || r.height * 0.8;
      o.fillText(sp.textContent, r.left - hr.left, r.top - hr.top + ascent);
    });

    var x0 = Math.max(0, Math.floor(tr.left - hr.left) - 4);
    var y0 = Math.max(0, Math.floor(tr.top - hr.top) - 4);
    var w = Math.min(off.width - x0, Math.ceil(tr.width) + 8);
    var h = Math.min(off.height - y0, Math.ceil(tr.height) + 8);
    if (w <= 0 || h <= 0) return false;
    var data = o.getImageData(x0, y0, w, h).data;
    var step = Math.max(3, Math.round(fontSize / 38));
    var old = parts;
    parts = [];
    for (var y = 0; y < h; y += step) {
      for (var x = (y / step) % 2 ? step / 2 : 0; x < w; x += step) {
        if (data[(y * w + Math.floor(x)) * 4 + 3] < 128) continue;
        var u = x / w;
        var prev = old.length ? old[parts.length % old.length] : null;
        parts.push({
          hx: x0 + x, hy: y0 + y, u: u,
          x: prev ? prev.x : Math.random() * W,
          y: prev ? prev.y : Math.random() * H,
          vx: 0, vy: 0,
          ph: Math.random() * 6.283,
          s: (1.4 + Math.random() * 1.5) * Math.min(1, step / 4.5), // 小さい画面では粒も小さく
          d: 0.25 + u * 1.0 + Math.random() * 0.5,
          c: Math.min(BUCKETS - 1, Math.floor(u * BUCKETS))
        });
      }
    }
    groups = [];
    for (var g = 0; g < BUCKETS; g++) groups.push([]);
    parts.forEach(function (p) { groups[p.c].push(p); });

    if (!plankton.length) {
      for (var n = 0; n < 70; n++) {
        plankton.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.8, ph: Math.random() * 6.283, c: Math.floor(Math.random() * BUCKETS) });
      }
    }
    return parts.length > 0;
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    var t = (now - t0) / 1000;
    var burst = now < burstUntil;
    var R = Math.max(70, Math.min(140, W * 0.12)), R2 = R * R;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // 漂う粒
    for (var n = 0; n < plankton.length; n++) {
      var q = plankton[n];
      q.x += Math.sin(q.y * 0.006 + t * 0.3 + q.ph) * 0.25 + 0.06;
      q.y -= 0.12 + q.r * 0.05;
      if (q.y < -5) { q.y = H + 5; q.x = Math.random() * W; }
      if (q.x > W + 5) q.x = -5;
      ctx.globalAlpha = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.4 + q.ph));
      ctx.fillStyle = colors[q.c];
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
    }

    // タイトルの粒
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var k = t > p.d ? Math.min(1, (t - p.d) / 1.4) * 0.05 : 0;
      if (burst) k *= 0.04;
      if (k) {
        var tx = p.hx + Math.sin(t * 1.3 + p.ph) * 1.4;
        var ty = p.hy + Math.cos(t * 1.1 + p.ph * 1.7) * 1.4 + Math.sin(t * 0.9 - p.u * 5) * 2.2;
        p.vx += (tx - p.x) * k;
        p.vy += (ty - p.y) * k;
      } else {
        p.vx += Math.sin(p.ph + t) * 0.03;
        p.vy += Math.cos(p.ph * 2 + t) * 0.03;
      }
      var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
      if (d2 < R2) {
        var d = Math.sqrt(d2) || 1, f = 1 - d / R;
        f = f * f * 2.6;
        p.vx += dx / d * f;
        p.vy += dy / d * f;
      }
      p.vx *= 0.86; p.vy *= 0.86;
      p.x += p.vx; p.y += p.vy;
    }
    for (var g = 0; g < groups.length; g++) {
      var list = groups[g];
      if (!list.length) continue;
      ctx.fillStyle = colors[g];
      ctx.globalAlpha = 0.16;
      for (var a = 0; a < list.length; a++) { var p1 = list[a], s3 = p1.s * 3.4; ctx.fillRect(p1.x - s3 / 2, p1.y - s3 / 2, s3, s3); }
      ctx.globalAlpha = 0.95;
      for (var c = 0; c < list.length; c++) { var p2 = list[c]; ctx.fillRect(p2.x - p2.s / 2, p2.y - p2.s / 2, p2.s, p2.s); }
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function setRunning() {
    var should = onScreen && !document.hidden && parts.length > 0;
    if (should && !running) { running = true; if (!raf) raf = requestAnimationFrame(frame); }
    else if (!should) running = false;
  }

  function start() {
    if (!build()) return;
    root.classList.add('vt-ready');
    t0 = performance.now();
    setRunning();
  }

  // 文字の形を拾うので、フォントが読み込まれてから始める
  var started = false;
  function once() { if (!started) { started = true; start(); } }
  if (document.fonts && document.fonts.load) {
    var cs0 = getComputedStyle(title);
    document.fonts.load(cs0.fontWeight + ' 100px ' + cs0.fontFamily, 'SPONVITA').then(once, once);
    setTimeout(once, 2500);
  } else {
    once();
  }

  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
  }, { passive: true });
  ['pointerleave', 'pointercancel'].forEach(function (type) {
    hero.addEventListener(type, function () { pointer.x = pointer.y = -9999; });
  });
  hero.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') pointer.x = pointer.y = -9999; });

  // クリックで弾ける
  hero.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('a')) return;
    var r = hero.getBoundingClientRect();
    var cx = e.clientX - r.left, cy = e.clientY - r.top;
    parts.forEach(function (p) {
      var dx = p.x - cx, dy = p.y - cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var f = 1400 / (d + 60) * (0.5 + Math.random());
      p.vx += dx / d * f; p.vy += dy / d * f;
    });
    burstUntil = performance.now() + 650;
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; setRunning(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', setRunning);

  var resizeTimer = 0, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    // スマホでアドレスバーが出入りするだけの高さ変化では作り直さない
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (started) { build(); setRunning(); } }, 200);
  });
})();
