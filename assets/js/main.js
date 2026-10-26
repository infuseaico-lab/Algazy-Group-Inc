// Algazy Group Inc. — page behaviour. Everything here enhances; the page reads fully without it.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reading progress along the bottom of the header (the storytelling pattern's progress indicator).
(() => {
  const bar = document.querySelector('[data-progress]');
  if (!bar) return;
  let queued = false;
  const paint = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
  addEventListener('resize', paint);
  paint();
})();

// Phone menu.
(() => {
  const btn = document.querySelector('.bar__menu');
  const nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  btn.hidden = false;
  const icon = btn.querySelector('use');
  const set = (open) => {
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    icon.setAttribute('href', open ? '#i-close' : '#i-menu');
    nav.classList.toggle('is-open', open);
  };
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
    imgs[i].classList.remove('is-on');
    imgs[next].classList.add('is-on');
    i = next;
  };
  const start = () => { clearInterval(timer); timer = setInterval(step, 6000); };
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : start()));
  addEventListener('load', () => imgs.slice(1).forEach((im) => { im.loading = 'eager'; }));
  start();
})();

// Layouts: pick the shape of the room, see the kitchen that fits it; the choice carries into the quote form.
// Without script all four panels are shown in a column.
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
      if (on && !reduced) { panels[n].classList.remove('is-entering'); void panels[n].offsetWidth; panels[n].classList.add('is-entering'); }
    });
    if (focus) tab.focus();
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

// Gallery strip (phone and tablet): previous / next buttons and a position count, so every photo is
// reachable without dragging.
(() => {
  const strip = document.querySelector('[data-gallery]');
  const nav = document.querySelector('[data-gallery-nav]');
  if (!strip || !nav) return;
  const shots = [...strip.children];
  const prev = nav.querySelector('[data-gallery-prev]');
  const next = nav.querySelector('[data-gallery-next]');
  const count = nav.querySelector('[data-gallery-count]');
  const pad = () => parseFloat(getComputedStyle(strip).scrollPaddingLeft) || 0;
  const offset = (s) => s.offsetLeft - strip.offsetLeft - pad();
  let current = 0;
  const show = (n) => strip.scrollTo({ left: offset(shots[Math.max(0, Math.min(shots.length - 1, n))]), behavior: reduced ? 'auto' : 'smooth' });
  const update = () => {
    current = shots.reduce((best, s, n) => (Math.abs(offset(s) - strip.scrollLeft) < Math.abs(offset(shots[best]) - strip.scrollLeft) ? n : best), 0);
    count.textContent = `${current + 1} / ${shots.length}`;
    prev.disabled = current === 0;
    next.disabled = current === shots.length - 1;
  };
  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  let queued = false;
  strip.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } }, { passive: true });
  nav.hidden = false;
  update();
})();

// Quote form: required fields marked and checked, errors next to the field, loading then a result.
// With data-endpoint set the request is posted there (any form service that accepts a POST);
// without one, it opens a text message to the office with every answer filled in.
(() => {
  const form = document.getElementById('quote-form');
  if (!form) return;
  const status = form.querySelector('[data-status]');
  const send = form.querySelector('[data-send]');
  const more = form.querySelector('[data-more]');
  const checks = [
    [form.name, (v) => v.trim().length > 1],
    [form.phone, (v) => v.replace(/\D/g, '').length >= 10],
    [form.email, (v) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())],
  ];
  const mark = (input, ok) => {
    input.setAttribute('aria-invalid', String(!ok));
    document.getElementById(input.getAttribute('aria-describedby')).hidden = ok;
  };
  checks.forEach(([input, ok]) => {
    input.addEventListener('blur', () => { if (input.value) mark(input, ok(input.value)); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') mark(input, ok(input.value)); });
  });
  const say = (text, kind) => { status.textContent = text; status.className = 'form__status' + (kind ? ` is-${kind}` : ''); };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = checks.filter(([input, ok]) => { const good = ok(input.value); mark(input, good); return !good; });
    if (bad.length) {
      if (bad[0][0] === form.email && more) more.open = true;
      bad[0][0].focus();
      say('Please check the highlighted field.', 'err');
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      send.setAttribute('aria-busy', 'true'); send.disabled = true; say('Sending…');
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
        if (!r.ok) throw new Error(r.status);
        form.reset();
        say(`Thank you, ${data.name.split(' ')[0]}. We'll call you at ${data.phone} soon.`, 'ok');
      } catch {
        say('That did not go through. Please call or text (323) 940-8041.', 'err');
      } finally { send.removeAttribute('aria-busy'); send.disabled = false; }
      return;
    }
    const body = [
      'Quote request',
      `Name: ${data.name}`, `Phone: ${data.phone}`, data.email && `Email: ${data.email}`, `Area: ${data.area}`,
      `Work: ${data.scope}`, `Layout: ${data.layout}`, `Start: ${data.start}`, `Budget: ${data.budget}`, data.notes && `Notes: ${data.notes}`,
    ].filter(Boolean).join('\n');
    // iOS reads "&body=", Android "?body="; "?&body=" works on both
    location.href = `sms:+13239408041?&body=${encodeURIComponent(body)}`;
    say('Your messages app should open with the details ready to send. If it does not, call (323) 940-8041.', 'ok');
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
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; set(); }).observe(heroActions);
  new IntersectionObserver(([e]) => { atQuote = e.isIntersecting; set(); }, { rootMargin: '0px 0px -30% 0px' }).observe(quote);
})();

// Reveal once on entry, staggered within each group. Never replays, never leaves content hidden.
(() => {
  const targets = [...document.querySelectorAll('[data-reveal]')];
  targets.forEach((el) => { const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal')); el.style.setProperty('--i', Math.min(sibs.indexOf(el), 5)); });
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
  targets.forEach((el) => io.observe(el));
  addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
  }), 2000));
})();

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
