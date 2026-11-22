/*
 * muda — なくても誰も困らない機能を 3 つ。どのデザインを引いても動く。
 *
 *   1. 走行距離計 … このサイトを何メートル スクロールしたかを測り続ける（フッターの「↕ 0.00 m」）
 *   2. 居眠り     … 45 秒さわらないと、サイトが寝る。さわると「寝てません」と言う
 *   3. 地下への入口 … いちばん下で、さらに下へ行こうとし続けると、床が開く（/b1/ へ）
 *
 * 記録はすべて、見ている人のブラウザの中（localStorage）だけに置く。どこにも送らない。
 */
(function () {
  var V = '1';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 記録（使えないブラウザでは、その場かぎりで動く） ──
  var mem = {};
  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem('sponvita.muda.' + key)); return v == null ? fallback : v; }
    catch (e) { return key in mem ? mem[key] : fallback; }
  }
  function save(key, value) {
    mem[key] = value;
    try { localStorage.setItem('sponvita.muda.' + key, JSON.stringify(value)); } catch (e) {}
  }

  function el(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fade(node, after) {
    setTimeout(function () {
      node.classList.add('is-out');
      setTimeout(function () { node.remove(); }, 350);
    }, after);
  }

  // ── 画面の下に出るひとこと ──
  var toasts = el('div', 'muda-toasts');
  toasts.setAttribute('role', 'status');
  toasts.setAttribute('aria-live', 'polite');
  function say(text, ms) {
    if (!toasts.parentNode) doc.body.appendChild(toasts);
    while (toasts.children.length > 1) toasts.firstChild.remove();
    var t = el('p', 'muda-toast', text);
    toasts.appendChild(t);
    fade(t, ms || 4200);
  }

  var num = new Intl.NumberFormat('ja-JP');
  function fixed(n, d) { return n.toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d }); }

  // ════════ 1. 走行距離計 ════════
  var PX_TO_M = 0.0254 / 96;   // CSS の 1px は 1/96 インチ
  var GOALS = [
    { m: 1, name: '1 メートル', hit: 'このサイトを 1 m スクロールしました。フッターで測っています。' },
    { m: 5, name: 'キリンの背の高さ' },
    { m: 10, name: '路線バスの長さ' },
    { m: 25, name: '学校のプール' },
    { m: 50, name: '新幹線 2 両' },
    { m: 100, name: '100 m 走' },
    { m: 333, name: '東京タワー' },
    { m: 634, name: '東京スカイツリー' },
    { m: 3776, name: '富士山' },
    { m: 42195, name: 'フルマラソン' },
    { m: 384400000, name: '月' }
  ];
  var odo = load('odo', { px: 0, t0: 0, hit: 0, t100: 0 });
  var odoBtn = null, odoDirty = false;

  function meters() { return odo.px * PX_TO_M; }
  function distance(m) {
    if (m >= 1000) return fixed(m / 1000, 2) + ' km';
    return fixed(m, m < 10 ? 2 : 1) + ' m';
  }
  function goalLabel(g) { return g.m >= 1000 ? num.format(g.m / 1000) + ' km' : num.format(g.m) + ' m'; }
  function span(ms) {
    var s = Math.max(0, ms / 1000);
    if (s < 60) return fixed(s, 1) + ' 秒';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' 分 ' + Math.floor(s % 60) + ' 秒';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' 時間 ' + (m % 60) + ' 分';
    return num.format(Math.floor(h / 24)) + ' 日 ' + (h % 24) + ' 時間';
  }
  function years(y) {
    if (y >= 1e8) return '約 ' + fixed(y / 1e8, y >= 1e10 ? 0 : 1) + ' 億年';
    if (y >= 1e4) return '約 ' + num.format(Math.round(y / 1e4)) + ' 万年';
    if (y >= 1) return '約 ' + num.format(Math.round(y)) + ' 年';
    return '1 年以内';
  }

  function paintOdo() { if (odoBtn) odoBtn.textContent = '↕ ' + distance(meters()); }

  function initOdo() {
    var tag = doc.querySelector('.design-tag');
    if (!tag) return;
    odoBtn = el('button', 'muda-odo');
    odoBtn.type = 'button';
    odoBtn.title = 'このサイトをスクロールした距離';
    odoBtn.setAttribute('aria-label', 'このサイトをスクロールした距離を見る');
    tag.appendChild(odoBtn);
    paintOdo();
    odoBtn.addEventListener('click', openOdo);

    var lastY = window.scrollY || 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY || 0, d = Math.abs(y - lastY);
      lastY = y;
      if (!d) return;
      if (!odo.t0) odo.t0 = Date.now();
      odo.px += d;
      odoDirty = true;
      paintOdo();
      var m = meters();
      while (odo.hit < GOALS.length && m >= GOALS[odo.hit].m) {
        var g = GOALS[odo.hit++];
        if (g.m === 100) {
          odo.t100 = Date.now() - odo.t0;
          say('走行距離 100 m。タイムは ' + span(odo.t100) + ' でした（世界記録は 9.58 秒）。', 7000);
        } else {
          say(g.hit || '走行距離 ' + goalLabel(g) + '。' + g.name + 'を超えました。', 5200);
        }
      }
    }, { passive: true });

    setInterval(flushOdo, 1500);
    window.addEventListener('pagehide', flushOdo);
    doc.addEventListener('visibilitychange', flushOdo);
  }
  function flushOdo() { if (odoDirty) { odoDirty = false; save('odo', odo); } }

  var dialog = null;
  function openOdo() {
    if (!dialog) {
      dialog = el('dialog', 'muda-dialog');
      dialog.setAttribute('aria-labelledby', 'muda-odo-title');
      doc.body.appendChild(dialog);
      dialog.addEventListener('click', function (e) {
        var t = e.target;
        if (t === dialog || (t.closest && t.closest('[data-close]'))) closeOdo();
        if (t.closest && t.closest('.muda-reset')) {
          odo = { px: 0, t0: 0, hit: 0, t100: 0 };
          save('odo', odo);
          paintOdo();
          renderOdo();
          say('メーターを 0 に戻しました。');
        }
      });
    }
    renderOdo();
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
  }
  function closeOdo() { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); }

  function renderOdo() {
    var m = meters(), now = Date.now();
    var next = null, prev = 0, i;
    for (i = 0; i < GOALS.length; i++) { if (m < GOALS[i].m) { next = GOALS[i]; break; } prev = GOALS[i].m; }

    // 車のメーターのように、6 桁 + 小数 2 桁
    var shown = Math.min(m, 999999.99).toFixed(2), whole = ('000000' + shown.split('.')[0]).slice(-6), frac = shown.split('.')[1];
    var digits = whole.split('').map(function (c) { return '<b>' + c + '</b>'; }).join('') + '<i>.</i>' +
      frac.split('').map(function (c) { return '<b class="is-frac">' + c + '</b>'; }).join('');

    var list = GOALS.map(function (g) {
      return '<li' + (m >= g.m ? ' class="is-done"' : '') + '><span>' + g.name + '</span><span>' + goalLabel(g) + '</span></li>';
    }).join('');

    var facts = [];
    if (odo.t0) {
      var elapsed = now - odo.t0;
      facts.push('測りはじめてから ' + span(elapsed) + '。');
      if (odo.t100) facts.push('100 m のタイムは ' + span(odo.t100) + '（世界記録は 9.58 秒）。');
      var speed = m / (elapsed / 1000);   // m/秒
      if (m > 0 && elapsed > 3000) {
        var y = (384400000 - m) / speed / 31557600;
        facts.push('このペースだと、月に着くのは ' + years(y) + '後です。' + (y > 1.38e10 ? '宇宙の年齢（約 138 億年）より長くかかります。' : ''));
      }
    } else {
      facts.push('まだ 1 ミリも動いていません。');
    }

    dialog.innerHTML =
      '<div class="muda-dialog__head"><h2 class="muda-dialog__title" id="muda-odo-title">スクロール走行距離計</h2>' +
      '<button type="button" class="muda-dialog__close" data-close aria-label="閉じる">×</button></div>' +
      '<div class="muda-dialog__body">' +
      '<div class="muda-meter" role="img" aria-label="' + distance(m) + '"><div class="muda-meter__digits">' + digits + '</div><span class="muda-meter__unit">m</span></div>' +
      (next
        ? '<p class="muda-next">次は「' + next.name + '」（' + goalLabel(next) + '）。あと ' + distance(next.m - m) + '。</p>' +
          '<div class="muda-bar"><i style="width:' + Math.max(0, Math.min(100, (m - prev) / (next.m - prev) * 100)).toFixed(2) + '%"></i></div>'
        : '<p class="muda-next">月に着きました。おつかれさまでした。</p>') +
      '<ul class="muda-list">' + list + '</ul>' +
      '<div class="muda-facts">' + facts.map(function (f) { return '<p>' + f + '</p>'; }).join('') + '</div>' +
      '<p class="muda-note">このサイトを上下にスクロールした量を、CSS の 1px ＝ 1/96 インチ（約 0.26 mm）として足しています。画面の大きさによって、指やホイールが実際に動いた距離とは違います。記録はこのブラウザの中だけにあります。</p>' +
      '<div class="muda-dialog__foot"><button type="button" class="muda-reset">メーターを 0 に戻す</button>' +
      '<button type="button" class="muda-ok" data-close>閉じる</button></div></div>';
  }

  // ════════ 2. 居眠り ════════
  var IDLE_MS = 45000;
  var TALK = [
    '…むにゃ…自発的に…',
    '…あと 5 分だけ…',
    '…それは…仕様です…',
    '…金曜の夕方に…リリースは…しない…',
    '…sponte…vita…',
    '…テストは…通ってます…たぶん…',
    '…その会議…30 分で…終わります…'
  ];
  var lastInput = Date.now(), asleepAt = 0, zzz = null, zTimer = 0, talkTimer = 0, bubble = null, pageTitle = doc.title;

  function anchor() {
    // Zzz は、ロゴ（社名まで）が画面に見えていればその右はし、見えていなければ画面の左上から出る
    var brand = doc.querySelector('.brand'), r = brand && brand.getBoundingClientRect();
    var ok = r && r.width && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    return {
      x: ok ? r.right + 5 : 20, y: ok ? Math.max(22, r.top + r.height / 2 - 4) : 34,
      bx: ok ? Math.max(8, r.left) : 12, by: ok ? r.bottom + 12 : 56
    };
  }
  function speak(text, ms) {
    if (bubble) bubble.remove();
    var a = anchor();
    bubble = el('p', 'muda-bubble', text);
    bubble.style.left = a.bx + 'px';
    bubble.style.top = a.by + 'px';
    doc.body.appendChild(bubble);
    fade(bubble, ms);
  }
  function sleep() {
    asleepAt = Date.now();
    root.classList.add('muda-asleep');
    pageTitle = doc.title;
    doc.title = 'Zzz… ' + pageTitle;
    var a = anchor();
    zzz = el('div', 'muda-zzz' + (reduce ? ' is-still' : ''));
    zzz.setAttribute('aria-hidden', 'true');
    zzz.style.left = a.x + 'px';
    zzz.style.top = a.y + 'px';
    doc.body.appendChild(zzz);
    if (reduce) {
      zzz.appendChild(el('i', '', 'Zzz'));
    } else {
      var n = 0;
      var puff = function () {
        // ほかのタブを見ているあいだは動きが止まるので、ためこまない
        if (doc.hidden || zzz.children.length > 4) return;
        var z = el('i', '', n++ % 3 === 2 ? 'Z' : 'z');
        z.addEventListener('animationend', function () { z.remove(); });
        zzz.appendChild(z);
      };
      puff();
      zTimer = setInterval(puff, 1100);
    }
    // しばらくすると寝言を言う
    var i = Math.floor(Math.random() * TALK.length);
    talkTimer = setInterval(function () { if (!doc.hidden) speak(TALK[i++ % TALK.length], 5200); }, 14000);
  }
  function wake() {
    var secs = Math.round((Date.now() - asleepAt) / 1000);
    asleepAt = 0;
    clearInterval(zTimer); clearInterval(talkTimer);
    if (zzz) zzz.remove();
    root.classList.remove('muda-asleep');
    doc.title = pageTitle;
    // きょう何回目の居眠りか
    var day = new Date().toDateString(), naps = load('naps', { day: day, n: 0 });
    if (naps.day !== day) naps = { day: day, n: 0 };
    naps.n++;
    save('naps', naps);
    speak('はっ。…寝てません。' + (secs >= 20 ? secs + ' 秒ほど目を閉じていただけです。' : '') + (naps.n >= 2 ? '（本日 ' + naps.n + ' 回目）' : ''), 4800);
  }
  function initDoze() {
    function touch() {
      lastInput = Date.now();
      if (asleepAt) wake();
    }
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (type) {
      window.addEventListener(type, touch, { passive: true });
    });
    // ほかのタブから戻ってきたときも起きる
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden && asleepAt) touch(); });
    setInterval(function () {
      if (!asleepAt && Date.now() - lastInput >= IDLE_MS) sleep();
    }, 1000);
  }

  // ════════ 3. 地下への入口 ════════
  var LINES = [null, 'ここが一番下です。', 'これより下はありません。', 'ありませんってば。', '……。'];
  var knocks = 0, hatch = null, lastKnock = 0;

  function atBottom() {
    return window.innerHeight + (window.scrollY || 0) >= root.scrollHeight - 2;
  }
  function openHatch(line) {
    if (!hatch) {
      hatch = el('a', 'muda-hatch');
      hatch.href = '/b1/';
      hatch.appendChild(el('span', '', '▼ 地下 1 階へ降りる'));
      doc.body.appendChild(hatch);
      save('basement', true);
    }
    hatch.hidden = false;
    toasts.classList.add('has-hatch');
    say(line);
  }
  function knock() {
    var now = Date.now();
    if (now - lastKnock < 450) return;
    lastKnock = now;
    if (hatch && !hatch.hidden) return;
    knocks++;
    if (hatch) return openHatch('どうぞ。');
    if (load('basement', false)) { if (knocks >= 2) openHatch('…またですか。開けます。'); return; }
    if (knocks < LINES.length) { if (LINES[knocks]) say(LINES[knocks], 3200); return; }
    openHatch('…わかりました。開けます。');
  }
  function initBasement() {
    // ホイール：一番下にいる状態で「回しはじめた」ときだけ数える（勢いで届いた分は数えない）
    var lastWheel = 0;
    window.addEventListener('wheel', function (e) {
      var now = Date.now(), fresh = now - lastWheel > 220;
      lastWheel = now;
      if (fresh && e.deltaY > 0 && atBottom()) knock();
    }, { passive: true });
    // 指：一番下にいる状態から、さらに上へ払ったとき
    var startY = null;
    window.addEventListener('touchstart', function (e) { startY = atBottom() ? e.touches[0].clientY : null; }, { passive: true });
    window.addEventListener('touchend', function (e) {
      if (startY != null && e.changedTouches[0] && startY - e.changedTouches[0].clientY > 40 && atBottom()) knock();
      startY = null;
    }, { passive: true });
    // キー
    window.addEventListener('keydown', function (e) {
      if (e.repeat || !atBottom()) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'End' || (e.key === ' ' && !e.shiftKey && e.target === doc.body)) knock();
    });
    // 上へ戻ったら、床は閉じる。数えなおし
    window.addEventListener('scroll', function () {
      if (window.innerHeight + (window.scrollY || 0) < root.scrollHeight - 240) {
        knocks = 0;
        if (hatch && !hatch.hidden) { hatch.hidden = true; toasts.classList.remove('has-hatch'); }
      }
    }, { passive: true });
  }

  // ── 見た目を読み込んでから、はじめる ──
  var css = doc.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/muda/muda.css?v=' + V;
  var started = false;
  function start() {
    if (started) return;
    started = true;
    initOdo(); initDoze(); initBasement();
  }
  css.onload = start;
  css.onerror = function () {};   // 見た目が届かなければ、何もしない
  doc.head.appendChild(css);
})();
