// MOT booking: date + time picker, details, confirmation.
//
// Availability comes from `api` below. With no backend configured it uses
// realistic sample data so the flow can be demoed. To go live, set
//   window.AUTOTECH_BOOKING_API = 'https://your-backend.example';
// before this script loads. The backend needs two endpoints:
//   GET  {base}/availability?from=ISO&to=ISO  -> { busy: [{ start: ISO, end: ISO }, ...] }
//   POST {base}/bookings  (JSON body below)   -> { reference: 'ATP-1234' }  (409 if slot taken)
// which map directly onto Google Calendar freebusy + events.insert, or the
// equivalent in Outlook / garage management software.
(function () {
  const CONFIG = {
    apiBase: window.AUTOTECH_BOOKING_API || null,
    // getDay(): 0 = Sunday. Matches the published opening hours.
    hours: { 1: ['08:00', '17:00'], 2: ['08:00', '17:00'], 3: ['08:00', '17:00'], 4: ['08:00', '17:00'], 5: ['08:00', '16:30'] },
    slotStep: 30,      // minutes between start times
    leadMinutes: 120,  // earliest bookable slot from now
    daysAhead: 60,
    services: [
      { id: 'mot', name: 'MOT test', mins: 60, note: 'Cars & light vans (class 4)' },
      { id: 'mot-interim', name: 'MOT + interim service', mins: 120, note: 'Oil, filter & safety checks' },
      { id: 'mot-full', name: 'MOT + full service', mins: 180, note: 'Complete service schedule' },
    ],
  };

  const DAY = 86400000;
  const pad = n => String(n).padStart(2, '0');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const toMins = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const fmtTime = mins => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const atMins = (d, mins) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, mins);
  const fmtLong = d => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- Availability source ---------------- */

  // Deterministic sample diary so the same day always shows the same gaps.
  function mockBusy(from, to) {
    const busy = [];
    for (let d = startOfDay(from); d < to; d = new Date(d.getTime() + DAY)) {
      const hours = CONFIG.hours[d.getDay()];
      if (!hours) continue;
      let seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
      const open = toMins(hours[0]), close = toMins(hours[1]);
      if (rnd() < 0.1) { busy.push({ start: atMins(d, open), end: atMins(d, close) }); continue; }
      const jobs = 3 + Math.floor(rnd() * 4);
      for (let j = 0; j < jobs; j++) {
        const s = open + Math.floor(rnd() * ((close - open) / 30)) * 30;
        const len = [60, 60, 90, 120][Math.floor(rnd() * 4)];
        busy.push({ start: atMins(d, s), end: atMins(d, Math.min(close, s + len)) });
      }
    }
    return busy;
  }

  const api = {
    async busy(from, to) {
      if (CONFIG.apiBase) {
        const r = await fetch(`${CONFIG.apiBase}/availability?from=${from.toISOString()}&to=${to.toISOString()}`);
        if (!r.ok) throw new Error('availability');
        const { busy } = await r.json();
        return busy.map(b => ({ start: new Date(b.start), end: new Date(b.end) }));
      }
      await sleep(350);
      return mockBusy(from, to);
    },
    async book(payload) {
      if (CONFIG.apiBase) {
        const r = await fetch(`${CONFIG.apiBase}/bookings`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        if (r.status === 409) { const e = new Error('taken'); e.code = 409; throw e; }
        if (!r.ok) throw new Error('booking');
        return r.json();
      }
      await sleep(800);
      return { reference: 'ATP-' + Math.random().toString(36).slice(2, 7).toUpperCase() };
    },
  };

  /* ---------------- State ---------------- */

  const today = startOfDay(new Date());
  const lastDay = new Date(today.getTime() + CONFIG.daysAhead * DAY);
  const state = {
    step: 1,
    service: CONFIG.services[0],
    month: new Date(today.getFullYear(), today.getMonth(), 1),
    date: null,
    time: null,       // minutes from midnight
    busyByMonth: {},  // 'YYYY-MM' -> Promise<busy[]>
    reg: '',
    reference: null,
  };

  function monthBusy(month) {
    const key = `${month.getFullYear()}-${month.getMonth()}`;
    if (!state.busyByMonth[key]) {
      const from = new Date(month.getFullYear(), month.getMonth(), 1);
      const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      state.busyByMonth[key] = api.busy(from, to).catch(err => { delete state.busyByMonth[key]; throw err; });
    }
    return state.busyByMonth[key];
  }

  function slotsFor(day, busy, mins) {
    const hours = CONFIG.hours[day.getDay()];
    if (!hours || day < today || day > lastDay) return [];
    const earliest = Date.now() + CONFIG.leadMinutes * 60000;
    const dayBusy = busy.filter(b => b.start < atMins(day, 24 * 60) && b.end > day);
    const out = [];
    for (let t = toMins(hours[0]); t + mins <= toMins(hours[1]); t += CONFIG.slotStep) {
      const s = atMins(day, t), e = atMins(day, t + mins);
      if (s.getTime() < earliest) continue;
      if (dayBusy.some(b => b.start < e && b.end > s)) continue;
      out.push(t);
    }
    return out;
  }

  /* ---------------- DOM ---------------- */

  const root = document.createElement('div');
  root.className = 'booking';
  root.hidden = true;
  root.innerHTML = `
    <div class="booking__backdrop" data-close></div>
    <div class="booking__panel" role="dialog" aria-modal="true" aria-labelledby="booking-title">
      <header class="booking__head">
        <div>
          <p class="kicker">Online booking</p>
          <h2 id="booking-title">Book your MOT</h2>
        </div>
        <ol class="booking__steps" aria-label="Progress">
          <li data-step="1"><span>1</span>Date &amp; time</li>
          <li data-step="2"><span>2</span>Your details</li>
          <li data-step="3"><span>3</span>Confirmed</li>
        </ol>
        <button class="booking__close" data-close aria-label="Close booking">&times;</button>
      </header>
      <div class="booking__body"></div>
    </div>`;
  document.body.appendChild(root);
  const body = root.querySelector('.booking__body');
  let lastFocus = null;

  function open(reg) {
    if (reg) state.reg = reg.toUpperCase();
    if (state.step === 3) reset();
    lastFocus = document.activeElement;
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add('is-open'));
    document.documentElement.classList.add('booking-open');
    if (location.hash !== '#book') history.replaceState(null, '', '#book');
    render();
    root.querySelector('.booking__close').focus();
  }

  function close() {
    root.classList.remove('is-open');
    document.documentElement.classList.remove('booking-open');
    if (location.hash === '#book') history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => { root.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  }

  function reset() {
    Object.assign(state, { step: 1, date: null, time: null, reference: null });
  }

  function render() {
    root.querySelectorAll('.booking__steps li').forEach(li => {
      const n = Number(li.dataset.step);
      li.classList.toggle('is-current', n === state.step);
      li.classList.toggle('is-done', n < state.step);
    });
    if (state.step === 1) renderPick();
    else if (state.step === 2) renderDetails();
    else renderDone();
    body.scrollTop = 0;
  }

  /* ---- Step 1: service, date, time ---- */

  function renderPick() {
    body.innerHTML = `
      ${state.reg ? `<p class="bk-for">Booking for <span class="mini-reg">${esc(state.reg)}</span></p>` : ''}
      <div class="bk-services" role="radiogroup" aria-label="Service">
        ${CONFIG.services.map(s => `
          <button class="bk-service ${s.id === state.service.id ? 'is-selected' : ''}" role="radio" aria-checked="${s.id === state.service.id}" data-service="${s.id}">
            <strong>${s.name}</strong><small>${s.note} &middot; approx. ${s.mins >= 120 ? s.mins / 60 + ' hrs' : s.mins + ' mins'}</small>
          </button>`).join('')}
      </div>
      <div class="bk-pick">
        <div class="bk-cal">
          <div class="bk-cal__head">
            <button class="bk-cal__nav" data-month="-1" aria-label="Previous month">&#8249;</button>
            <strong class="bk-cal__title"></strong>
            <button class="bk-cal__nav" data-month="1" aria-label="Next month">&#8250;</button>
          </div>
          <div class="bk-cal__dow"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          <div class="bk-cal__grid" aria-live="polite"></div>
          <p class="bk-legend"><span class="bk-dot"></span> Available &nbsp; <span class="bk-dot bk-dot--off"></span> Full or closed</p>
        </div>
        <div class="bk-slots" aria-live="polite"></div>
      </div>
      <footer class="bk-foot">
        <p class="bk-summary"></p>
        <button class="btn btn--primary" data-next disabled>Continue
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </footer>`;

    body.querySelectorAll('[data-service]').forEach(b => b.addEventListener('click', () => {
      state.service = CONFIG.services.find(s => s.id === b.dataset.service);
      state.time = null;
      renderPick();
    }));
    body.querySelectorAll('[data-month]').forEach(b => b.addEventListener('click', () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + Number(b.dataset.month), 1);
      drawCalendar();
    }));
    body.querySelector('[data-next]').addEventListener('click', () => { state.step = 2; render(); });
    drawCalendar();
  }

  async function drawCalendar() {
    const m = state.month;
    const grid = body.querySelector('.bk-cal__grid');
    body.querySelector('.bk-cal__title').textContent = m.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    body.querySelector('[data-month="-1"]').disabled = m <= new Date(today.getFullYear(), today.getMonth(), 1);
    body.querySelector('[data-month="1"]').disabled = new Date(m.getFullYear(), m.getMonth() + 1, 1) > lastDay;

    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    grid.classList.add('is-loading');
    grid.innerHTML = Array.from({ length: offset }, () => '<span></span>').join('') +
      Array.from({ length: daysInMonth }, (_, i) => `<button class="bk-day" disabled>${i + 1}</button>`).join('');

    let busy;
    try { busy = await monthBusy(m); }
    catch { grid.classList.remove('is-loading'); showSlotsError(); return; }
    if (state.month !== m || state.step !== 1) return; // user moved on

    grid.classList.remove('is-loading');
    const buttons = grid.querySelectorAll('.bk-day');
    let firstAvailable = null;
    buttons.forEach((btn, i) => {
      const day = new Date(m.getFullYear(), m.getMonth(), i + 1);
      const slots = slotsFor(day, busy, state.service.mins);
      btn.disabled = !slots.length;
      btn.classList.toggle('has-slots', slots.length > 0);
      btn.classList.toggle('is-today', day.getTime() === today.getTime());
      btn.setAttribute('aria-label', `${fmtLong(day)}: ${slots.length ? slots.length + ' times available' : 'unavailable'}`);
      if (slots.length && !firstAvailable) firstAvailable = day;
      if (state.date && day.getTime() === state.date.getTime()) btn.classList.add('is-selected');
      btn.addEventListener('click', () => {
        state.date = day;
        state.time = null;
        buttons.forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        drawSlots(slots);
      });
    });

    // Keep the selected day if it's in this month and still open, else pick the first free day
    const sel = state.date && state.date.getMonth() === m.getMonth() && state.date.getFullYear() === m.getFullYear()
      ? slotsFor(state.date, busy, state.service.mins) : null;
    if (sel && sel.length) drawSlots(sel);
    else if (firstAvailable) buttons[firstAvailable.getDate() - 1].click();
    else { state.date = null; drawSlots(null); }
  }

  function drawSlots(slots) {
    const el = body.querySelector('.bk-slots');
    if (!slots) {
      el.innerHTML = '<div class="bk-empty">No availability this month. Try the next month.</div>';
    } else {
      const group = (label, list) => list.length ? `
        <h4>${label}</h4>
        <div class="bk-times">${list.map(t => `<button class="bk-time ${t === state.time ? 'is-selected' : ''}" data-t="${t}">${fmtTime(t)}</button>`).join('')}</div>` : '';
      el.innerHTML = `
        <h3>${fmtLong(state.date)}</h3>
        <p class="bk-sub">${slots.length} start time${slots.length === 1 ? '' : 's'} available for ${state.service.name.toLowerCase()}</p>
        ${group('Morning', slots.filter(t => t < 720))}
        ${group('Afternoon', slots.filter(t => t >= 720))}`;
      el.querySelectorAll('.bk-time').forEach(b => b.addEventListener('click', () => {
        state.time = Number(b.dataset.t);
        el.querySelectorAll('.bk-time').forEach(x => x.classList.toggle('is-selected', x === b));
        updateFoot();
      }));
    }
    updateFoot();
  }

  function showSlotsError() {
    body.querySelector('.bk-slots').innerHTML = `<div class="bk-empty">We couldn't load live availability just now.<br>
      Please call <a href="tel:+441173292050">0117 329 2050</a> and we'll book you in.</div>`;
  }

  function updateFoot() {
    const ok = state.date && state.time !== null;
    body.querySelector('[data-next]').disabled = !ok;
    body.querySelector('.bk-summary').innerHTML = ok
      ? `<strong>${state.service.name}</strong> &middot; ${fmtLong(state.date)} at ${fmtTime(state.time)}`
      : 'Choose a date and start time';
  }

  /* ---- Step 2: details ---- */

  function renderDetails() {
    body.innerHTML = `
      <form class="bk-form" novalidate>
        <div class="bk-form__main">
          <label class="bk-field bk-field--reg"><span>Vehicle registration</span>
            <span class="reg"><span class="reg__flag">GB</span><input name="reg" required maxlength="8" placeholder="ENTER REG" value="${esc(state.reg)}" autocomplete="off"></span>
          </label>
          <div class="bk-row">
            <label class="bk-field"><span>Full name</span><input name="name" required autocomplete="name"></label>
            <label class="bk-field"><span>Mobile number</span><input name="phone" type="tel" required autocomplete="tel"></label>
          </div>
          <label class="bk-field"><span>Email (for your confirmation)</span><input name="email" type="email" required autocomplete="email"></label>
          <fieldset class="bk-field bk-choice">
            <legend>While we work on your car</legend>
            <label><input type="radio" name="wait" value="drop-off" checked> I'll drop it off</label>
            <label><input type="radio" name="wait" value="wait"> I'll wait</label>
          </fieldset>
          <label class="bk-field"><span>Anything we should know? (optional)</span><textarea name="notes" rows="2" placeholder="Warning lights, noises, previous advisories..."></textarea></label>
          <p class="bk-error" hidden></p>
        </div>
        <aside class="bk-recap">
          <h4>Your booking</h4>
          <p><strong>${state.service.name}</strong></p>
          <p>${fmtLong(state.date)}<br>${fmtTime(state.time)} &ndash; ${fmtTime(state.time + state.service.mins)}</p>
          <p>AutoTech Plus<br>8 Bonville Rd, Brislington, Bristol BS4 5NZ</p>
          <button type="button" class="bk-link" data-back>&larr; Change date or time</button>
        </aside>
        <footer class="bk-foot">
          <p class="bk-summary">No payment now. You pay when you collect.</p>
          <button class="btn btn--primary" type="submit">Confirm booking</button>
        </footer>
      </form>`;

    const form = body.querySelector('form');
    const err = body.querySelector('.bk-error');
    form.reg.addEventListener('input', () => { form.reg.value = form.reg.value.toUpperCase(); state.reg = form.reg.value; });
    body.querySelector('[data-back]').addEventListener('click', () => { state.step = 1; render(); });
    (state.reg ? form.name : form.reg).focus();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      const problems = [];
      if (!/^[A-Z0-9 ]{2,8}$/i.test(f.reg.trim())) problems.push(form.reg);
      if (f.name.trim().length < 2) problems.push(form.name);
      if (f.phone.replace(/\D/g, '').length < 10) problems.push(form.phone);
      if (!/^\S+@\S+\.\S+$/.test(f.email)) problems.push(form.email);
      form.querySelectorAll('.is-invalid').forEach(x => x.classList.remove('is-invalid'));
      if (problems.length) {
        problems.forEach(x => x.closest('.bk-field').classList.add('is-invalid'));
        err.textContent = 'Please check the highlighted fields.';
        err.hidden = false;
        problems[0].focus();
        return;
      }

      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Booking...';
      err.hidden = true;
      const start = atMins(state.date, state.time);
      try {
        const res = await api.book({
          service: state.service.id,
          serviceName: state.service.name,
          start: start.toISOString(),
          end: new Date(start.getTime() + state.service.mins * 60000).toISOString(),
          reg: f.reg.trim().toUpperCase(),
          name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(),
          waiting: f.wait === 'wait', notes: f.notes.trim(),
        });
        state.reference = res.reference;
        state.contact = f;
        state.step = 3;
        render();
      } catch (ex) {
        btn.disabled = false;
        btn.textContent = 'Confirm booking';
        if (ex.code === 409) {
          state.busyByMonth = {};
          err.innerHTML = 'Sorry, that slot has just been taken. <button type="button" class="bk-link" data-back2>Pick another time</button>';
          err.querySelector('[data-back2]').addEventListener('click', () => { state.time = null; state.step = 1; render(); });
        } else {
          err.innerHTML = 'Something went wrong. Please try again or call <a href="tel:+441173292050">0117 329 2050</a>.';
        }
        err.hidden = false;
      }
    });
  }

  /* ---- Step 3: confirmation ---- */

  function icsFile() {
    const s = atMins(state.date, state.time), e = new Date(s.getTime() + state.service.mins * 60000);
    const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AutoTech Plus//Booking//EN', 'BEGIN:VEVENT',
      `UID:${state.reference}@autotech-plus.co.uk`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(s)}`, `DTEND:${stamp(e)}`,
      `SUMMARY:${state.service.name} at AutoTech Plus`,
      `DESCRIPTION:Booking ref ${state.reference} - ${state.reg}. Call 0117 329 2050 to change.`,
      'LOCATION:AutoTech Plus\\, 8 Bonville Rd\\, Brislington\\, Bristol BS4 5NZ', 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
  }

  function renderDone() {
    const ics = URL.createObjectURL(new Blob([icsFile()], { type: 'text/calendar' }));
    body.innerHTML = `
      <div class="bk-done">
        <div class="bk-done__tick"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h3>You're booked in</h3>
        <p class="bk-sub">Booking reference <strong>${esc(state.reference)}</strong>. We've sent a confirmation to ${esc(state.contact.email)}.</p>
        <dl class="bk-done__list">
          <div><dt>Service</dt><dd>${state.service.name}</dd></div>
          <div><dt>When</dt><dd>${fmtLong(state.date)}, ${fmtTime(state.time)}</dd></div>
          <div><dt>Vehicle</dt><dd><span class="mini-reg">${esc(state.reg)}</span></dd></div>
          <div><dt>Where</dt><dd>8 Bonville Rd, Brislington, Bristol BS4 5NZ</dd></div>
        </dl>
        <div class="bk-done__actions">
          <a class="btn btn--primary" href="${ics}" download="autotech-plus-booking.ics">Add to my calendar</a>
          <button class="btn btn--ghost" data-close>Done</button>
        </div>
        <p class="bk-small">Need to change it? Call <a href="tel:+441173292050">0117 329 2050</a>.</p>
      </div>`;
    body.querySelector('[data-close]').addEventListener('click', close);
  }

  /* ---------------- Wiring ---------------- */

  root.addEventListener('click', e => { if (e.target.closest('[data-close]') && e.target.closest('.booking__head, .booking__backdrop')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) close(); });

  // Keep keyboard focus inside the dialog
  root.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...root.querySelectorAll('button:not([disabled]), a[href], input, textarea, select')].filter(x => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-book], a[href="#book"]');
    if (!trigger) return;
    e.preventDefault();
    open();
  });

  // The reg plate form in the MOT band starts a booking with the reg filled in
  const motForm = document.querySelector('.mot__form');
  if (motForm) motForm.addEventListener('submit', e => {
    e.preventDefault();
    open(motForm.querySelector('input').value.trim());
  });

  if (location.hash === '#book') open();
  window.AutoTechBooking = { open, close };
})();
