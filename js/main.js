// Nav state, mobile menu, scroll reveals and card spotlight.
(function () {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 30);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('.nav__links a').forEach(a =>
    a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    })
  );

  // Reveal sections as they scroll into view
  const targets = document.querySelectorAll('.section__head, .svc-head, .reviews-head, .tile, .svc-row, .c-card, .faq-group, .contact-main, .about__media, .about__copy, .stack-head, .review, .contact__info, .contact__form, .stat, .mot__inner');
  targets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 4) * 70 + 'ms';
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  targets.forEach(el => io.observe(el));

  // Service tiles: play the clip on hover (desktop) or while on screen (touch)
  const tiles = [...document.querySelectorAll('.tile')];
  const playTile = tile => {
    const v = tile.querySelector('video');
    if (!v.src) v.src = v.dataset.src;
    v.play().then(() => tile.classList.add('is-playing')).catch(() => {});
  };
  const stopTile = tile => { tile.querySelector('video').pause(); tile.classList.remove('is-playing'); };
  if (matchMedia('(hover: hover)').matches) {
    tiles.forEach(t => {
      t.addEventListener('mouseenter', () => playTile(t));
      t.addEventListener('mouseleave', () => stopTile(t));
    });
  } else {
    const tio = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? playTile : stopTile)(e.target)), { threshold: 0.6 });
    tiles.forEach(t => tio.observe(t));
  }

  // Stacking cards: each card shrinks and dims as the next one slides over it
  const stack = [...document.querySelectorAll('.stack-card')];
  const stackMq = matchMedia('(min-width: 861px)');
  let stackQueued = false;
  function updateStack() {
    stackQueued = false;
    const vh = window.innerHeight;
    const progress = stack.map((card, i) => {
      if (i === 0) return 0;
      const stickTop = parseFloat(getComputedStyle(card).top);
      const top = card.getBoundingClientRect().top;
      return Math.min(1, Math.max(0, (vh - top) / (vh - stickTop)));
    });
    stack.forEach((card, i) => {
      const inner = card.firstElementChild;
      if (!stackMq.matches) { inner.style.removeProperty('--s'); inner.style.removeProperty('--b'); return; }
      const depth = progress.slice(i + 1).reduce((a, b) => a + b, 0);
      inner.style.setProperty('--s', (1 - depth * 0.04).toFixed(4));
      inner.style.setProperty('--b', (1 - Math.min(depth, 3) * 0.1).toFixed(3));
    });
  }
  const queueStack = () => { if (!stackQueued) { stackQueued = true; requestAnimationFrame(updateStack); } };
  window.addEventListener('scroll', queueStack, { passive: true });
  window.addEventListener('resize', queueStack);
  updateStack();

  // Typewriter hero headline: types in, then erases and retypes each time the
  // hero video changes clip. The full text is in the HTML, so it reads fine without JS.
  (function typeHeadline() {
    const title = document.getElementById('hero-title');
    if (!title) return;
    const lines = [...title.querySelectorAll('[data-type]')];
    const texts = lines.map(l => l.textContent);
    const caret = document.createElement('span');
    caret.className = 'tw-caret';
    caret.setAttribute('aria-hidden', 'true');
    title.setAttribute('aria-label', texts.join(' ') + title.querySelector('.sr-only').textContent);

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lines[lines.length - 1].after(caret);
      return;
    }
    // Lock the final height so the page doesn't jump while typing
    title.style.minHeight = title.offsetHeight + 'px';
    lines.forEach(l => { l.textContent = ''; });

    const wait = ms => new Promise(r => setTimeout(r, ms));
    let run = 0; // bumping this cancels any sequence in progress

    async function typeIn(id) {
      caret.classList.add('is-typing');
      for (let i = 0; i < lines.length; i++) {
        lines[i].after(caret);
        for (let c = lines[i].textContent.length; c < texts[i].length; c++) {
          if (id !== run) return;
          lines[i].textContent = texts[i].slice(0, c + 1);
          const ch = texts[i][c];
          await wait(ch === ',' || ch === '.' ? 240 : 50 + Math.random() * 60);
        }
        if (i < lines.length - 1) await wait(300);
      }
      caret.classList.remove('is-typing');
    }

    async function eraseOut(id) {
      caret.classList.add('is-typing');
      for (let i = lines.length - 1; i >= 0; i--) {
        lines[i].after(caret);
        while (lines[i].textContent.length) {
          if (id !== run) return;
          lines[i].textContent = lines[i].textContent.slice(0, -1);
          await wait(22);
        }
      }
    }

    async function cycle(first) {
      const id = ++run;
      if (!first) await eraseOut(id);
      if (id !== run) return;
      await wait(first ? 600 : 250);
      if (id === run) typeIn(id);
    }

    lines[0].after(caret);
    cycle(true);
    document.addEventListener('hero:clip', e => { if (e.detail.index !== 0 || e.detail.loop) cycle(false); });
  })();

  // Services page: highlight the jump chip for the section in view
  const jumpLinks = [...document.querySelectorAll('.jump a')];
  if (jumpLinks.length) {
    const jio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      jumpLinks.forEach(a => {
        const on = a.getAttribute('href') === '#' + e.target.id;
        a.classList.toggle('is-active', on);
        if (on) a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
    }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.svc-row').forEach(r => jio.observe(r));
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
