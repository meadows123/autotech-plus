// Page-specific behaviour for faq.html and contact.html.
(function () {
  /* ---------- FAQ: search + topic filter ---------- */
  const search = document.getElementById('faq-search');
  if (search) {
    const groups = [...document.querySelectorAll('.faq-group')];
    const chips = [...document.querySelectorAll('.chip')];
    const empty = document.querySelector('.faq-empty');
    let cat = 'all';

    const apply = () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      groups.forEach(g => {
        let inGroup = 0;
        g.querySelectorAll('.faq').forEach(f => {
          const match = (cat === 'all' || g.dataset.cat === cat) && (!q || f.textContent.toLowerCase().includes(q));
          f.hidden = !match;
          if (match) inGroup++;
          if (q && match) f.open = true;
        });
        g.hidden = !inGroup;
        shown += inGroup;
      });
      empty.hidden = shown > 0;
    };
    search.addEventListener('input', apply);
    chips.forEach(c => c.addEventListener('click', () => {
      cat = c.dataset.cat;
      chips.forEach(x => x.classList.toggle('is-active', x === c));
      apply();
    }));
  }

  /* ---------- Contact: open-now badge, service prefill, demo submit ---------- */
  const badge = document.getElementById('open-badge');
  if (badge) {
    // Opening hours in UK time: [open, close] in minutes, keyed by getDay()
    const hours = { 1: [480, 1020], 2: [480, 1020], 3: [480, 1020], 4: [480, 1020], 5: [480, 990] };
    const uk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const day = uk.getDay(), mins = uk.getHours() * 60 + uk.getMinutes();
    const h = hours[day];
    const open = h && mins >= h[0] && mins < h[1];
    badge.textContent = open ? 'Open now' : 'Closed now';
    badge.classList.toggle('is-closed', !open);
    badge.hidden = false;
    document.querySelectorAll('.hours tr[data-days]').forEach(tr => {
      tr.classList.toggle('is-today', tr.dataset.days.split(',').includes(String(day)));
    });
  }

  const select = document.getElementById('service-select');
  if (select) {
    const wanted = new URLSearchParams(location.search).get('service');
    if (wanted && [...select.options].some(o => o.value === wanted)) select.value = wanted;
  }

  /* ---------- Lead forms (contact page, gearbox quote forms) ----------
     Set window.AUTOTECH_FORM_ENDPOINT (e.g. a Formspree URL) to deliver enquiries.
     Without it the forms only show the thank-you message (demo mode). */
  document.querySelectorAll('form[data-lead]').forEach(form => {
    const reg = form.querySelector('.reg-input');
    if (reg) reg.addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      const endpoint = window.AUTOTECH_FORM_ENDPOINT;
      if (endpoint) {
        try {
          const r = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
          if (!r.ok) throw new Error(r.status);
        } catch (err) {
          btn.disabled = false;
          alert('Sorry, your message could not be sent. Please call us on 0117 329 2050.');
          return;
        }
      }
      form.classList.add('is-sent');
    });
  });
})();
