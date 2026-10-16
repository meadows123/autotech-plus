// Hero background: crossfades through the service clips, synced to the tabs.
(function () {
  const videos = [...document.querySelectorAll('#hero-videos video')];
  const tabs = [...document.querySelectorAll('.scene-tab')];
  const bars = tabs.map(t => t.querySelector('.scene-tab__bar i'));
  const hero = document.querySelector('.hero');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const XFADE = 1.0; // seconds before the end to start the next clip
  let current = 0;
  let switching = false;
  let started = false;

  function show(i) {
    const prev = videos[current];
    const next = videos[i];
    current = i;
    switching = true;

    next.preload = 'auto';
    next.currentTime = 0;
    if (!reduceMotion) next.play().catch(() => {});
    next.classList.add('is-active');
    if (prev !== next) {
      prev.classList.remove('is-active');
      setTimeout(() => { if (prev !== videos[current]) prev.pause(); }, 1200);
    }
    // Warm up the clip after this one
    videos[(i + 1) % videos.length].preload = 'auto';

    tabs.forEach((tab, j) => {
      tab.classList.toggle('is-active', j === i);
      tab.setAttribute('aria-selected', j === i);
      bars[j].style.transform = `scaleX(${j < i ? 1 : 0})`;
    });
    setTimeout(() => { switching = false; }, 400);
    document.dispatchEvent(new CustomEvent('hero:clip', { detail: { index: i, loop: started } }));
    started = true;
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', () => { if (i !== current) show(i); }));

  videos.forEach((v, i) => {
    v.addEventListener('error', () => { if (i === current) show((i + 1) % videos.length); });
  });

  function tick() {
    requestAnimationFrame(tick);
    const v = videos[current];
    if (!v.duration) return;
    bars[current].style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration).toFixed(4)})`;
    if (!switching && !reduceMotion && v.currentTime >= v.duration - XFADE) {
      show((current + 1) % videos.length);
    }
  }

  // Pause everything while the hero is off screen
  new IntersectionObserver(([e]) => {
    const v = videos[current];
    if (e.isIntersecting && !reduceMotion) v.play().catch(() => {}); else v.pause();
  }).observe(hero);

  if (reduceMotion) videos[0].removeAttribute('autoplay');
  show(0);
  tick();
})();
