// 06 neon — タイトルを押すと電源が切れる／入る。ときどき 1 文字だけちらつく
(function () {
  var title = document.querySelector('.hero__title');
  if (!title) return;
  var letters = title.querySelectorAll('span');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function buzz(el) {
    el.classList.remove('is-buzz');
    void el.offsetWidth; // アニメーションを最初からやり直す
    el.classList.add('is-buzz');
  }
  letters.forEach(function (el) {
    el.addEventListener('animationend', function () { el.classList.remove('is-buzz'); });
  });

  // 最初の「点灯」が終わってから、クリックとちらつきを受け付ける
  setTimeout(function () {
    title.classList.add('is-ready');

    title.addEventListener('click', function () {
      var off = title.classList.toggle('is-off');
      if (!off && !reduce) letters.forEach(function (el, i) { setTimeout(function () { buzz(el); }, i * 70); });
    });

    if (reduce) return;
    (function loop() {
      setTimeout(function () {
        if (!title.classList.contains('is-off') && !document.hidden) {
          buzz(letters[Math.floor(Math.random() * letters.length)]);
        }
        loop();
      }, 2200 + Math.random() * 3800);
    })();
  }, reduce ? 0 : 3200);
})();
