// Algazy Group Inc. — page behaviour. Everything here enhances; the page reads fully without it.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Bar turns solid as soon as the page scrolls, so nothing passes under clear text.
(() => {
  const bar = document.querySelector('.bar');
  if (!bar) return;
  const set = () => bar.classList.toggle('is-solid', scrollY > 8);
  addEventListener('scroll', set, { passive: true });
  set();
})();

// Phone menu: the section links fold behind one word.
(() => {
  const btn = document.querySelector('.bar__menu');
  const nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  btn.hidden = false;
  const set = (open) => { btn.setAttribute('aria-expanded', open); nav.classList.toggle('is-open', open); btn.textContent = open ? 'Close' : 'Menu'; };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); } });
})();

// Hero: the kitchen crossfades through four modern LA kitchens. Paused when the tab is hidden.
(() => {
  const imgs = [...document.querySelectorAll('[data-fade] img')];
  if (imgs.length < 2 || reduced) return;
  let i = 0, timer;
  const step = () => {
    const next = (i + 1) % imgs.length;
    imgs[next].loading = 'eager';
    imgs[i].classList.remove('is-on');
    imgs[next].classList.add('is-on');
    i = next;
  };
  const start = () => { clearInterval(timer); timer = setInterval(step, 6000); };
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : start()));
  // warm the next frames once the first has painted
  addEventListener('load', () => imgs.slice(1).forEach((im) => { im.loading = 'eager'; }));
  start();
})();

// Layouts: pick the shape of the room, see the kitchen that fits it. Without script all four are shown in a column.
(() => {
  const picker = document.querySelector('[data-picker]');
  if (!picker) return;
  const tabs = [...picker.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const formLayout = document.getElementById('q-layout');
  const select = (tab, focus, chosen) => {
    tabs.forEach((t, n) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      panels[n].hidden = !on;
      if (on && !reduced) {
        panels[n].classList.remove('is-entering');
        void panels[n].offsetWidth;
        panels[n].classList.add('is-entering');
      }
    });
    if (focus) tab.focus();
    // a layout the visitor picked carries into the quote form
    if (chosen && formLayout) formLayout.value = tab.textContent.trim();
  };
  tabs.forEach((t, n) => {
    t.addEventListener('click', () => select(t, false, true));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (k) { e.preventDefault(); select(tabs[(n + k + tabs.length) % tabs.length], true, true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true, true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true, true); }
    });
  });
  picker.hidden = false;
  select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]);
})();

// Quote form: checks the two fields we need, then sends. With data-endpoint set, the request is
// posted there (any form service that accepts a POST); without one, it opens a text message to the
// office with every answer filled in.
(() => {
  const form = document.getElementById('quote-form');
  if (!form) return;
  const status = form.querySelector('.qform__status');
  const send = form.querySelector('.qform__send');
  const checks = [
    [form.name, (v) => v.trim().length > 1],
    [form.phone, (v) => v.replace(/\D/g, '').length >= 10],
    [form.email, (v) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())],
  ];
  const mark = (input, ok) => {
    input.setAttribute('aria-invalid', String(!ok));
    document.getElementById(input.getAttribute('aria-describedby')).hidden = ok;
  };
  checks.forEach(([input, ok]) => input.addEventListener('blur', () => { if (input.value) mark(input, ok(input.value)); }));
  checks.forEach(([input, ok]) => input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') mark(input, ok(input.value)); }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = checks.filter(([input, ok]) => { const good = ok(input.value); mark(input, good); return !good; });
    if (bad.length) { bad[0][0].focus(); status.textContent = ''; return; }
    const data = Object.fromEntries(new FormData(form));
    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      send.disabled = true; status.textContent = 'Sending…';
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
        if (!r.ok) throw new Error(r.status);
        form.reset();
        status.textContent = `Thank you, ${data.name.split(' ')[0]}. We'll call you at ${data.phone} soon.`;
      } catch {
        status.textContent = 'That did not go through. Please call or text (323) 940-8041.';
      } finally { send.disabled = false; }
      return;
    }
    const body = [
      'Quote request',
      `Name: ${data.name}`, `Phone: ${data.phone}`, data.email && `Email: ${data.email}`,
      `Work: ${data.scope}`, `Area: ${data.area}`, `Layout: ${data.layout}`,
      `Start: ${data.start}`, `Budget: ${data.budget}`, data.notes && `Notes: ${data.notes}`,
    ].filter(Boolean).join('\n');
    // iOS reads "&body=", Android "?body="; "?&body=" works on both
    location.href = `sms:+13239408041?&body=${encodeURIComponent(body)}`;
    status.textContent = 'Your messages app should open with the details ready to send. If it does not, call (323) 940-8041.';
  });
})();

// Phone dock: Call and Get a quote appear whenever the hero's own buttons are out of sight,
// and step aside while the quote form is on screen.
(() => {
  const dock = document.querySelector('[data-dock]');
  const heroActions = document.querySelector('[data-hero-actions]');
  const quote = document.getElementById('quote');
  if (!dock || !heroActions || !quote || !('IntersectionObserver' in window)) return;
  let pastHero = false, atQuote = false;
  const set = () => dock.classList.toggle('is-shown', pastHero && !atQuote);
  dock.classList.add('is-managed');
  // shown whenever the hero's own buttons are off screen (scrolled past, or below the first screen with large text)
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; set(); }).observe(heroActions);
  new IntersectionObserver(([e]) => { atQuote = e.isIntersecting; set(); }, { rootMargin: '0px 0px -30% 0px' }).observe(quote);
})();

// Gallery strip (phone): mark the photo in view so only its caption shows.
(() => {
  const strip = document.querySelector('.gallery__frames');
  if (!strip || !('IntersectionObserver' in window)) { document.querySelectorAll('.frame').forEach((f) => f.classList.add('is-current')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('is-current', e.intersectionRatio >= 0.6);
  }, { root: strip, threshold: [0, 0.6, 1] });
  strip.querySelectorAll('.frame').forEach((f) => io.observe(f));
})();

// Reveal once on entry. Never replays, never leaves content hidden.
(() => {
  const targets = document.querySelectorAll('[data-reveal], .frame');
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -4% 0px', threshold: 0 });
  targets.forEach((el) => io.observe(el));
  addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
  }), 2500));
})();

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
