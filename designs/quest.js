// 08 quest — メッセージ窓の文字を 1 文字ずつ出す。コマンドは ↑↓ キーで選べる
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── メッセージ窓 ──
  var lead = document.querySelector('.hero__lead');
  if (lead) {
    var chars = [];
    lead.querySelectorAll('span').forEach(function (line) {
      var text = line.textContent;
      line.textContent = '';
      // 読み上げ用に、元の文を見えない形でそのまま残す
      var sr = document.createElement('b');
      sr.className = 'q-sr';
      sr.textContent = text;
      line.appendChild(sr);
      text.split('').forEach(function (ch) {
        var el = document.createElement('i');
        el.setAttribute('aria-hidden', 'true');
        el.textContent = ch;
        line.appendChild(el);
        chars.push(el);
      });
    });
    var n = 0;
    function finish() {
      chars.forEach(function (el) { el.className = 'on'; });
      n = chars.length;
      lead.classList.add('is-done');
    }
    function tick() {
      if (n >= chars.length) { lead.classList.add('is-done'); return; }
      var ch = chars[n].textContent;
      chars[n++].className = 'on';
      // 句読点のあとは少し間を置く
      setTimeout(tick, ch === '。' ? 420 : ch === '、' ? 200 : 55);
    }
    if (reduce) finish();
    else setTimeout(tick, 1900);
    // 押したら残りを一気に出す
    lead.addEventListener('click', finish);
  }

  // ── コマンド選択：↑↓ で移動 ──
  var links = Array.prototype.slice.call(document.querySelectorAll('.card__link'));
  links.forEach(function (a, i) {
    a.addEventListener('keydown', function (ev) {
      var d = ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      links[(i + d + links.length) % links.length].focus();
    });
  });
})();
