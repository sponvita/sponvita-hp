// 01 default — タイトルの文字・光の玉・カードを、ポインタとスクロールに反応させる
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var header = document.querySelector('.site-header');
  var hero = document.querySelector('.hero');
  var deco = document.querySelector('.hero__deco');
  var title = document.querySelector('.hero__title');
  var origin = document.querySelector('.origin');

  // ── スクロール：ヘッダーの線、ヒーローの奥行き ──
  function onScroll() {
    var y = window.scrollY || 0, vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    if (header) {
      header.style.setProperty('--sp', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      header.classList.toggle('is-scrolled', y > 12);
    }
    if (reduce) return;
    if (hero) hero.style.setProperty('--hs', Math.min(1, y / vh).toFixed(4));
    if (origin) {
      // 0 = 下から入ってきた瞬間、1 = 上へ抜けた瞬間
      var r = origin.getBoundingClientRect();
      var v = (vh - r.top) / (vh + r.height);
      if (v > -0.1 && v < 1.1) origin.style.setProperty('--sv', v.toFixed(4));
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // ── 入った場所を覚える（カード・ボタンの色の広がり、会社概要とフッターの光） ──
  function track(el, onMove, onLeave) {
    function set(e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--mx', x.toFixed(1) + 'px');
      el.style.setProperty('--my', y.toFixed(1) + 'px');
      if (onMove) onMove(e, x, y, r);
    }
    el.addEventListener('pointerenter', set);
    el.addEventListener('pointerdown', set);
    el.addEventListener('pointermove', set, { passive: true });
    if (onLeave) el.addEventListener('pointerleave', onLeave);
  }

  document.querySelectorAll('.card__link').forEach(function (el) {
    track(el, function (e, x, y, r) {
      if (!fine || reduce || e.pointerType === 'touch') return;
      el.classList.add('is-tilting');
      el.style.setProperty('--ry', ((x / r.width - 0.5) * 9).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((0.5 - y / r.height) * 7).toFixed(2) + 'deg');
    }, function () {
      el.classList.remove('is-tilting');
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    });
  });

  // 指で触る端末にはホバーがないので、画面のまんなかの線にかかったカードを塗る
  if (!fine && 'IntersectionObserver' in window) {
    var mid = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-active', en.isIntersecting); });
    }, { rootMargin: '-49.5% 0px -49.5% 0px' });
    document.querySelectorAll('.card__link').forEach(function (el) { mid.observe(el); });
  }

  var company = document.querySelector('.company');
  if (company) {
    track(company, function (e) { if (e.pointerType !== 'touch') company.style.setProperty('--on', 1); },
      function () { company.style.setProperty('--on', 0); });
  }
  var footer = document.querySelector('.site-footer');
  if (footer) {
    track(footer, null, function () { footer.style.removeProperty('--mx'); footer.style.removeProperty('--my'); });
  }

  // ボタン：色の広がりに加えて、ポインタに少し引っぱられる
  document.querySelectorAll('.btn').forEach(function (el) {
    var bx = 0, by = 0;
    track(el, function (e, x, y, r) {
      if (!fine || reduce || e.pointerType === 'touch') return;
      // r は引っぱられた後の位置なので、その分を戻して中心を出す
      bx = (e.clientX - (r.left - bx + r.width / 2)) * 0.28;
      by = (e.clientY - (r.top - by + r.height / 2)) * 0.4;
      el.classList.add('is-pulled');
      el.style.setProperty('--bx', bx.toFixed(1) + 'px');
      el.style.setProperty('--by', by.toFixed(1) + 'px');
    }, function () {
      bx = by = 0;
      el.classList.remove('is-pulled');
      el.style.removeProperty('--bx');
      el.style.removeProperty('--by');
    });
  });

  if (reduce || !hero || !deco || !title) return;

  // ── タイトル：文字ごとにグラデーションを持たせ、位置をずらして 1 枚に見せる ──
  var letters = Array.prototype.map.call(title.children, function (el) {
    return { el: el, cx: 0, y: 0, vy: 0, r: 0, vr: 0 };
  });
  var fontSize = 100;
  function measure() {
    fontSize = parseFloat(getComputedStyle(title).fontSize) || 100;
    title.style.setProperty('--tw', title.clientWidth + 'px');
    letters.forEach(function (L) {
      var x = L.el.offsetLeft - title.offsetLeft;
      L.el.style.setProperty('--x', x + 'px');
      L.cx = x + L.el.offsetWidth / 2;
    });
  }
  root.classList.add('dp-ready');
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  // ── ポインタ ──
  var orb = document.createElement('i');
  orb.className = 'dp-orb';
  deco.appendChild(orb);

  var P = { x: 0, y: 0, inside: false };   // ヒーローの左上からの位置
  var px = 0, py = 0, ox = 0, oy = 0, gp = 0, orbPlaced = false;
  var raf = 0;
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function locate(e) {
    var r = hero.getBoundingClientRect();
    P.x = e.clientX - r.left; P.y = e.clientY - r.top;
    P.w = r.width; P.h = r.height;
  }

  if (fine) {
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      locate(e);
      P.inside = true;
      hero.style.setProperty('--mx', P.x.toFixed(1) + 'px');
      hero.style.setProperty('--my', P.y.toFixed(1) + 'px');
      if (!orbPlaced) { ox = P.x; oy = P.y; orbPlaced = true; }
      orb.classList.add('is-on');
      kick();
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      P.inside = false;
      hero.style.removeProperty('--mx');
      hero.style.removeProperty('--my');
      orb.classList.remove('is-on');
      kick();
    });
  }

  // クリック（タップ）した場所から輪が広がる。タイトルの上なら文字が波打つ
  // マウスは押した瞬間、指はタップ（スクロールの始まりでは出さない）
  hero.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'touch') burst(e); });
  var lastType = '';
  hero.addEventListener('pointerup', function (e) { lastType = e.pointerType; });
  hero.addEventListener('click', function (e) { if (lastType === 'touch') burst(e); });
  function burst(e) {
    if (e.target.closest && e.target.closest('a, button')) return;
    // 光の玉の層はスクロールでずれるので、その層の中での位置にする
    var dr = deco.getBoundingClientRect();
    for (var n = 0; n < 2; n++) {
      var ring = document.createElement('i');
      ring.className = 'dp-ring';
      ring.style.left = (e.clientX - dr.left) + 'px';
      ring.style.top = (e.clientY - dr.top) + 'px';
      ring.addEventListener('animationend', function () { this.remove(); });
      deco.appendChild(ring);
    }
    var tr = title.getBoundingClientRect();
    var pad = fontSize * 0.5;
    if (e.clientX > tr.left - pad && e.clientX < tr.right + pad && e.clientY > tr.top - pad && e.clientY < tr.bottom + pad) {
      wave(e.clientX - tr.left);
    }
  }

  // x（タイトルの左端からの位置）を中心に、外へ向かって順に跳ねる
  function wave(x) {
    letters.forEach(function (L) {
      var d = Math.abs(L.cx - x) / fontSize;
      setTimeout(function () {
        L.vy -= fontSize * 0.085 / (1 + d * 0.35);
        L.vr += (L.cx < x ? -1 : 1) * 2.4 / (1 + d);
        kick();
      }, d * 90);
    });
  }

  function frame() {
    raf = 0;
    var busy = false;

    // 光の玉：ポインタの反対へ少し動く（-1〜1）
    var tx = P.inside ? (P.x / P.w - 0.5) * 2 : 0;
    var ty = P.inside ? (P.y / P.h - 0.5) * 2 : 0;
    px += (tx - px) * 0.05; py += (ty - py) * 0.05;
    deco.style.setProperty('--px', px.toFixed(4));
    deco.style.setProperty('--py', py.toFixed(4));
    if (Math.abs(tx - px) > 0.002 || Math.abs(ty - py) > 0.002) busy = true;

    // ポインタについてくる光の玉（少し遅れる）
    if (P.inside) {
      ox += (P.x - ox) * 0.1; oy += (P.y - oy) * 0.1;
      orb.style.setProperty('--ox', ox.toFixed(1) + 'px');
      orb.style.setProperty('--oy', oy.toFixed(1) + 'px');
      if (Math.abs(P.x - ox) > 0.5 || Math.abs(P.y - oy) > 0.5) busy = true;
    }

    // タイトルの色：ポインタが左へ行くほど青が左へ寄る
    var tg = P.inside ? (P.x / P.w - 0.5) * 36 : 0;
    gp += (tg - gp) * 0.07;
    title.style.setProperty('--gp', gp.toFixed(2) + '%');
    if (Math.abs(tg - gp) > 0.05) busy = true;

    // タイトルの文字：ポインタの近くが持ち上がり、外へ傾く（ばね）
    var tr = null, hr = null;
    if (P.inside) { tr = title.getBoundingClientRect(); hr = hero.getBoundingClientRect(); }
    var R = fontSize * 1.15;
    for (var i = 0; i < letters.length; i++) {
      var L = letters[i], goalY = 0, goalR = 0;
      if (tr) {
        var dx = (tr.left - hr.left + L.cx) - P.x;
        var dy = (tr.top - hr.top + tr.height / 2) - P.y;
        var f = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / R);
        f = f * f * (3 - 2 * f);
        goalY = -f * fontSize * 0.1;
        goalR = Math.max(-1, Math.min(1, dx / R * 2)) * f * 7;
      }
      L.vy = (L.vy + (goalY - L.y) * 0.13) * 0.8;
      L.vr = (L.vr + (goalR - L.r) * 0.13) * 0.8;
      L.y += L.vy; L.r += L.vr;
      if (Math.abs(L.vy) > 0.02 || Math.abs(L.vr) > 0.02 || Math.abs(goalY - L.y) > 0.05 || Math.abs(goalR - L.r) > 0.05) {
        busy = true;
      } else {
        L.y = goalY; L.r = goalR; L.vy = L.vr = 0;   // 落ち着いたら止める
      }
      var sy = L.y ? '0 ' + L.y.toFixed(2) + 'px' : '', sr = L.r ? L.r.toFixed(2) + 'deg' : '';
      if (sy !== L.sy) { L.el.style.translate = sy; L.sy = sy; }
      if (sr !== L.sr) { L.el.style.rotate = sr; L.sr = sr; }
    }

    if (busy) kick();
  }
})();
