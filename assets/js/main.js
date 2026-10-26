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
  const select = (tab, focus) => {
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
  };
  tabs.forEach((t, n) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (k) { e.preventDefault(); select(tabs[(n + k + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });
  picker.hidden = false;
  select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]);
})();

// Contact card: the text message carries the visitor's area and house.
(() => {
  const form = document.querySelector('[data-sms]');
  const link = document.querySelector('[data-sms-link]');
  if (!form || !link) return;
  const update = () => {
    const area = form.area.value, layout = form.layout.value;
    const body = `Hi Algazy Group, I'd like a kitchen remodel. Area: ${area}. Layout: ${layout}.`;
    // iOS reads "&body=", Android "?body="; "?&body=" works on both
    link.href = `sms:+13239408041?&body=${encodeURIComponent(body)}`;
  };
  form.addEventListener('change', update);
  update();
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
