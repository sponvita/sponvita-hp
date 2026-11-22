// 03 pop — タイトルの文字を押すと、色が変わって跳ねて紙吹雪が出る
(function () {
  var COLORS = ['#ff7ac6', '#58efc0', '#3b5bff', '#ff8a3d', '#ffe24a', '#ffffff'];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var letters = document.querySelectorAll('.hero__title span');

  function confetti(x, y) {
    if (reduce) return;
    for (var i = 0; i < 12; i++) {
      var c = document.createElement('i');
      var a = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      var d = 60 + Math.random() * 70;
      c.className = 'pop-confetti';
      c.setAttribute('aria-hidden', 'true');
      c.style.left = x + 'px';
      c.style.top = y + 'px';
      c.style.background = COLORS[i % COLORS.length];
      c.style.borderRadius = i % 2 ? '50%' : '2px';
      c.style.setProperty('--dx', Math.cos(a) * d + 'px');
      c.style.setProperty('--dy', Math.sin(a) * d + 30 + 'px');
      c.style.setProperty('--dr', Math.random() * 540 - 270 + 'deg');
      document.body.appendChild(c);
      c.addEventListener('animationend', function () { this.remove(); });
    }
  }

  // 最初の「落ちてくる」動きが終わってから、跳ねる動きに切り替える
  var title = document.querySelector('.hero__title');
  setTimeout(function () { title.classList.add('is-landed'); }, reduce ? 0 : 1700);

  function jump(el) {
    if (!title.classList.contains('is-landed')) return;
    el.classList.remove('is-jump');
    void el.offsetWidth; // アニメーションを最初からやり直す
    el.classList.add('is-jump');
  }

  letters.forEach(function (el, i) {
    var n = i;
    el.addEventListener('mouseenter', function () { jump(el); });
    el.addEventListener('click', function (ev) {
      n = (n + 1) % COLORS.length;
      var bg = COLORS[n];
      el.style.setProperty('--c', bg);
      el.style.color = bg === '#3b5bff' ? '#fff' : '#121212';
      jump(el);
      confetti(ev.clientX, ev.clientY);
    });
    el.addEventListener('animationend', function () { el.classList.remove('is-jump'); });
  });
})();
