/*
 * muda — なくても誰も困らない機能。どのデザインを引いても動く。
 *
 *   1. 走行距離計 … このサイトを何メートル スクロールしたかを測り続ける（フッターの「↕ 0.00 m」）
 *                   地下と屋上の階段を昇り降りした分も足す（1 階ぶん 3.2 m。数えるのは /muda/stairs.js）
 *   2. 居眠り     … 45 秒さわらないと、サイトが寝る。さわると「寝てません」と言う
 *   3. 地下への入口 … いちばん下で、さらに下へ行こうとし続けると、床が開く（/b1/ へ）
 *   4. 屋上への入口 … いちばん上で、さらに上へ行こうとし続けると、天井が開く（/rf/ へ）
 *   5. 印刷証明書  … ページを印刷すると、1 枚目に「印刷したことの証明書」が付く
 *
 * 記録はすべて、見ている人のブラウザの中（localStorage）だけに置く。どこにも送らない。
 */
(function () {
  var V = '2';
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

  // 地下と屋上の階段を昇り降りした分。書くのは /muda/stairs.js だけで、ここでは読むだけ（0 に戻すときを除く）
  //   m: メートル / t0: 最初に階段を使った時刻 / t100: 階段にいるあいだに合計が 100 m を超えた時刻
  var dig = loadDig();
  function loadDig() {
    var d = load('dig', null);
    return d && typeof d.m === 'number' && d.m > 0 ? d : { m: 0, t0: 0, t100: 0 };
  }

  function meters() { return odo.px * PX_TO_M + dig.m; }
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
      checkGoals(false);
    }, { passive: true });

    setInterval(flushOdo, 1500);
    window.addEventListener('pagehide', flushOdo);
    doc.addEventListener('visibilitychange', function () {
      flushOdo();
      if (!doc.hidden) syncDig();
    });
    // 地下や屋上から「戻る」で帰ってきたとき（ページが読み込み直されない）
    window.addEventListener('pageshow', function (e) { if (e.persisted) syncDig(); });
    setTimeout(syncDig, 1200);
  }
  function flushOdo() { if (odoDirty) { odoDirty = false; save('odo', odo); } }

  // 目標を超えていたら知らせる。away は「地下か屋上にいるあいだに超えた」とき（まとめて 1 回だけ言う）
  function checkGoals(away) {
    var m = meters(), last = null;
    while (odo.hit < GOALS.length && m >= GOALS[odo.hit].m) {
      var g = GOALS[odo.hit++];
      odoDirty = true;
      last = g;
      if (g.m === 100) odo.t100 = Math.max(0, (away && dig.t100 ? dig.t100 : Date.now()) - odo.t0);
      if (away) continue;
      if (g.m === 100) say('走行距離 100 m。タイムは ' + span(odo.t100) + ' でした（世界記録は 9.58 秒）。', 7000);
      else say(g.hit || '走行距離 ' + goalLabel(g) + '。' + g.name + 'を超えました。', 5200);
    }
    if (!away || !last) return;
    if (last.m === 100) say('階段を使っているあいだに、走行距離が 100 m を超えていました。タイムは ' + span(odo.t100) + ' でした（世界記録は 9.58 秒）。', 7000);
    else if (last.m === 1) say('階段を使っているあいだに、走行距離が 1 m を超えていました。フッターで測っています。', 6000);
    else say('階段を使っているあいだに、走行距離が ' + goalLabel(last) + '（' + last.name + '）を超えていました。', 6000);
  }

  // 地下と屋上で増えた分を読み直す
  function syncDig() {
    dig = loadDig();
    if (dig.t0 && (!odo.t0 || dig.t0 < odo.t0)) { odo.t0 = dig.t0; odoDirty = true; }
    paintOdo();
    checkGoals(true);
  }

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
          save('dig', null);
          dig = loadDig();
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
      if (dig.m > 0) facts.push('うち ' + distance(dig.m) + ' は、地下と屋上の階段を昇り降りした分です。');
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
      '<p class="muda-note">このサイトを上下にスクロールした量を、CSS の 1px ＝ 1/96 インチ（約 0.26 mm）として足しています。画面の大きさによって、指やホイールが実際に動いた距離とは違います。地下と屋上の階段は、1 階ぶんを 3.2 m として足しています。記録はこのブラウザの中だけにあります。</p>' +
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

  // ════════ 3. 地下への入口 ／ 4. 屋上への入口 ════════
  // 端まで来て、さらにその先へ行こうとし続けると、5 回目で開く。一度開けた人は 2 回目で開く
  function atBottom() { return window.innerHeight + (window.scrollY || 0) >= root.scrollHeight - 2; }
  function atTop() { return (window.scrollY || 0) <= 0; }

  function makeDoor(o) {
    var knocks = 0, hatch = null, last = 0;
    function open(line) {
      if (!hatch) {
        hatch = el('a', 'muda-hatch' + (o.up ? ' muda-hatch--up' : ''));
        hatch.href = o.href;
        hatch.appendChild(el('span', '', o.label));
        // 地上からの 1 階ぶんは、着いた先（/b1/・/rf/）で距離に足す
        hatch.addEventListener('click', function () {
          flushOdo();
          try { sessionStorage.setItem('sponvita.muda.' + o.flag, '1'); } catch (e) {}
        });
        doc.body.appendChild(hatch);
        save(o.key, true);
      }
      hatch.hidden = false;
      if (!o.up) toasts.classList.add('has-hatch');
      say(line);
    }
    return {
      knock: function () {
        var now = Date.now();
        if (now - last < 450) return;
        last = now;
        if (hatch && !hatch.hidden) return;
        knocks++;
        if (o.remember) o.remember(knocks);
        if (hatch) return open('どうぞ。');
        if (load(o.key, false)) { if (knocks >= 2) open('…またですか。開けます。'); return; }
        if (knocks < o.lines.length) { if (o.lines[knocks]) say(o.lines[knocks], 3200); return; }
        open('…わかりました。開けます。');
      },
      // 端から離れたら閉じる。数えなおし
      close: function () {
        if (!knocks && !(hatch && !hatch.hidden)) return;
        knocks = 0;
        if (o.remember) o.remember(0);
        if (hatch && !hatch.hidden) { hatch.hidden = true; if (!o.up) toasts.classList.remove('has-hatch'); }
      },
      resume: function (n) { knocks = n; }
    };
  }

  function initDoors() {
    var floor = makeDoor({
      key: 'basement', flag: 'descend', href: '/b1/', label: '▼ 地下 1 階へ降りる',
      lines: [null, 'ここが一番下です。', 'これより下はありません。', 'ありませんってば。', '……。']
    });
    // スマホでは、一番上で下へ引くと画面が読み込み直されることがある。それでも数が消えないように、少しのあいだ覚えておく
    var UP_KEY = 'sponvita.muda.upknocks';
    var ceiling = makeDoor({
      up: true, key: 'roof', flag: 'ascend', href: '/rf/', label: '▲ 屋上へ昇る',
      lines: [null, 'ここが一番上です。', 'これより上はありません。', '空しかありませんよ。', '……。'],
      remember: function (n) {
        try {
          if (n) sessionStorage.setItem(UP_KEY, JSON.stringify({ n: n, at: Date.now() }));
          else sessionStorage.removeItem(UP_KEY);
        } catch (e) {}
      }
    });
    try {
      var kept = JSON.parse(sessionStorage.getItem(UP_KEY));
      if (kept && kept.n > 0 && Date.now() - kept.at < 20000) ceiling.resume(kept.n);
    } catch (e) {}

    // ホイール：端にいる状態で「回しはじめた」ときだけ数える（勢いで届いた分は数えない）
    var lastWheel = 0;
    window.addEventListener('wheel', function (e) {
      var now = Date.now(), fresh = now - lastWheel > 220;
      lastWheel = now;
      if (!fresh) return;
      if (e.deltaY > 0 && atBottom()) floor.knock();
      else if (e.deltaY < 0 && atTop()) ceiling.knock();
    }, { passive: true });
    // 指：端にいる状態から、さらにその先へ払ったとき
    var startY = null, startAt = '';
    window.addEventListener('touchstart', function (e) {
      startAt = atBottom() ? 'bottom' : atTop() ? 'top' : '';
      startY = startAt ? e.touches[0].clientY : null;
    }, { passive: true });
    window.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      if (startY != null && t) {
        if (startAt === 'bottom' && startY - t.clientY > 40 && atBottom()) floor.knock();
        if (startAt === 'top' && t.clientY - startY > 40 && atTop()) ceiling.knock();
      }
      startY = null;
    }, { passive: true });
    // キー
    window.addEventListener('keydown', function (e) {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      var space = e.key === ' ' && e.target === doc.body;
      if (atBottom() && (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'End' || (space && !e.shiftKey))) floor.knock();
      else if (atTop() && (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home' || (space && e.shiftKey))) ceiling.knock();
    });
    window.addEventListener('scroll', function () {
      var y = window.scrollY || 0;
      if (window.innerHeight + y < root.scrollHeight - 240) floor.close();
      if (y > 240) ceiling.close();
    }, { passive: true });
  }

  // ════════ 5. 印刷証明書 ════════
  // ページを印刷すると、1 枚目に「印刷したことの証明書」が付く。2 枚目からは、いつものページがそのまま出る
  function initPrint() {
    var cert = el('section', 'muda-cert');
    cert.setAttribute('aria-hidden', 'true');
    doc.body.insertBefore(cert, doc.body.firstChild);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };

    function fill(count) {
      var now = new Date(), S = window.SPONVITA, d = S && S.design, rows = [];
      var day = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日';
      rows.push(['印刷した日時', day + ' ' + now.getHours() + ' 時 ' + pad(now.getMinutes()) + ' 分']);
      if (d) {
        var line = 'No.' + pad(d.no) + ' ' + d.id;
        if (S.weightOf && !S.forced) line += '（今日の当選確率 ' + S.weightOf(d, now.getDay()) + ' %）';
        rows.push(['引いたデザイン', line]);
      }
      rows.push(['それまでの走行距離', distance(meters())]);
      cert.innerHTML =
        '<div class="muda-cert__frame">' +
        '<p class="muda-cert__no">第 ' + num.format(count) + ' 号</p>' +
        '<h2 class="muda-cert__title">印刷証明書</h2>' +
        '<p class="muda-cert__to">このページを印刷した方　殿</p>' +
        '<p class="muda-cert__body">あなたは、株式会社SPONVITA のウェブサイトを、<br>わざわざ紙に印刷されました。<br>画面で見れば済むところを、その手間を惜しまなかったことを、<br>ここに証明します。</p>' +
        '<dl class="muda-cert__facts">' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' +
        '<div class="muda-cert__sign"><p>' + day + '<br><b>株式会社SPONVITA</b></p><span class="muda-cert__seal">印刷<br>済</span></div>' +
        '<p class="muda-cert__note">この証明書に効力はありません。2 枚目からが、本来のページです。</p>' +
        '</div>';
    }
    fill(load('prints', 0) + 1);
    // 印刷しようとするたびに、番号を進める（プレビューを開いただけでも進む）
    window.addEventListener('beforeprint', function () {
      var n = load('prints', 0) + 1;
      save('prints', n);
      fill(n);
    });
  }

  // ── 見た目を読み込んでから、はじめる ──
  var css = doc.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/muda/muda.css?v=' + V;
  var started = false;
  function start() {
    if (started) return;
    started = true;
    initOdo(); initDoze(); initDoors(); initPrint();
  }
  css.onload = start;
  css.onerror = function () {};   // 見た目が届かなければ、何もしない
  doc.head.appendChild(css);
})();
