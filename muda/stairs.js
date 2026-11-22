/*
 * 階段 — 地下（/b1/）と屋上（/rf/）で使う共通の部品。
 *
 *   1. 昇り降りした分を、トップページの走行距離計（/muda/muda.js）に足す
 *   2. 「謎の集計」をたまに出すための道具（どれを出すかを決める、トップページを数える）
 *
 * 記録はすべて、見ている人のブラウザの中だけに置く。どこにも送らない。
 */
window.MUDA_STAIRS = (function () {
  var K = 'sponvita.muda.';
  var FLOOR_M = 3.2;                // 1 階ぶんの高さ
  var PX_TO_M = 0.0254 / 96;        // /muda/muda.js と同じ換算
  var STAT_FROM = 10;               // 集計が出はじめる階
  var STAT_CHANCE = 0.34;           // その階に着いたとき、集計が出る確率

  // ── 走行距離計に足す ──
  // 書くのは sponvita.muda.dig だけ。スクロールの分（sponvita.muda.odo）は読むだけにして、
  // トップページ側の記録とぶつからないようにしている
  var mem = null;
  function dig() {
    var d;
    try { d = JSON.parse(localStorage.getItem(K + 'dig')); } catch (e) { d = mem; }
    return d && typeof d.m === 'number' && d.m > 0 ? d : { m: 0, t0: 0, t100: 0 };
  }
  function total(d) {
    var px = 0;
    try { px = (JSON.parse(localStorage.getItem(K + 'odo')) || {}).px || 0; } catch (e) {}
    return (px > 0 ? px * PX_TO_M : 0) + (d || dig()).m;
  }
  function walk(floors) {
    var d = dig(), before = total(d);
    if (!d.t0) d.t0 = Date.now();
    d.m = Math.round((d.m + floors * FLOOR_M) * 10) / 10;
    if (!d.t100 && before < 100 && total(d) >= 100) d.t100 = Date.now();
    mem = d;
    try { localStorage.setItem(K + 'dig', JSON.stringify(d)); } catch (e) {}
  }
  // トップページの入口（床・天井）を通って来たか。来ていたら、しるしを消して true
  function arrived(flag) {
    try {
      if (!sessionStorage.getItem(K + flag)) return false;
      sessionStorage.removeItem(K + flag);
      return true;
    } catch (e) { return false; }
  }
  function best(key, n, max) {
    var b = 1;
    try { b = parseInt(localStorage.getItem(K + key), 10); } catch (e) {}
    if (!(b >= 1 && b <= max)) b = 1;
    if (n > b) { b = n; try { localStorage.setItem(K + key, String(b)); } catch (e) {} }
    return b;
  }

  // ── 表記 ──
  function num(n, d) { return n.toLocaleString('ja-JP', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function dist(m) {
    if (m >= 1000) return num(m / 1000, 2) + ' km';
    return num(m, m < 10 ? 2 : 1) + ' m';
  }

  // ── 謎の集計 ──
  // 同じものが続かないように、袋から 1 つずつ引く。空になったら入れなおす
  function draw(key, n) {
    var bag = [];
    try { bag = JSON.parse(sessionStorage.getItem(K + key)) || []; } catch (e) {}
    if (!Array.isArray(bag) || !bag.length) {
      bag = [];
      for (var i = 0; i < n; i++) bag.splice(Math.floor(Math.random() * (bag.length + 1)), 0, i);
    }
    var pick = bag.pop();
    try { sessionStorage.setItem(K + key, JSON.stringify(bag)); } catch (e) {}
    return pick >= 0 && pick < n ? pick : 0;
  }
  // この階で集計を出すか。出すなら何番目か（出さないなら -1）。
  // ?stat=3 を付けると、どの階でも 3 番目を出す（確認用）
  function roll(key, n, floor, special) {
    var m = /[?&]stat=(\d+)/.exec(location.search);
    if (m) return Math.max(1, Math.min(n, parseInt(m[1], 10))) - 1;
    if (floor < STAT_FROM || special) return -1;
    return Math.random() < STAT_CHANCE ? draw(key, n) : -1;
  }
  // トップページの本文。数えるために 1 回だけ取りに行く
  var top = null;
  function topPage() {
    if (!top) {
      top = fetch('/', { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      }).then(function (html) {
        var d = new DOMParser().parseFromString(html, 'text/html');
        Array.prototype.forEach.call(d.querySelectorAll('script, style, noscript, template'), function (e) { e.remove(); });
        return { doc: d, text: (d.body.textContent || '').replace(/\s+/g, ''), bytes: new Blob([html]).size };
      });
      top.catch(function () { top = null; });
    }
    return top;
  }

  return {
    FLOOR_M: FLOOR_M, dig: dig, total: total, walk: walk, arrived: arrived, best: best,
    num: num, dist: dist, roll: roll, topPage: topPage
  };
})();
