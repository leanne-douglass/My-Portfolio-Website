// File: /assets/js/site.js

/* ===================== Global Utilities ===================== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ===================== 1) Accessible Mobile Nav ===================== */
(() => {
  const toggle = $('.nav-toggle');
  const menu   = $('#site-menu');
  if (!toggle || !menu) return;

  let trapCleanup = null;
  let ac; // WHY: abort old listeners on close

  const focusablesIn = (root) =>
    $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter(el => !el.hasAttribute('inert') && !el.hidden && el.offsetParent !== null);

  const trapFocus = (root, firstFocus) => {
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const els = focusablesIn(root);
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    root.addEventListener('keydown', onKey);
    (firstFocus ?? focusablesIn(root)[0])?.focus({ preventScroll: true });
    return () => root.removeEventListener('keydown', onKey);
  };

  const setOpen = (open) => {
    if (open) {
      toggle.setAttribute('aria-expanded', 'true');
      menu.classList.add('is-open');
      document.body.classList.add('nav-open');
      trapCleanup = trapCleanup || trapFocus(menu, menu.querySelector('a,button'));
      ac = new AbortController();

      // Outside click (pointerdown is less flaky with focus)
      document.addEventListener('pointerdown', (e) => {
        if (!menu.contains(e.target) && !toggle.contains(e.target)) close();
      }, { signal: ac.signal });

      // Close on Esc (global so it works from toggle as well)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      }, { signal: ac.signal });

      // Close on any menu link activation
      menu.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (a) close();
      }, { signal: ac.signal });
    } else {
      close();
    }
  };

  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    ac?.abort();            // WHY: remove all ephemeral listeners
    ac = null;
    trapCleanup?.();        // WHY: release focus trap
    trapCleanup = null;
    toggle.focus({ preventScroll: true }); // WHY: return focus to invoker
  };

  toggle.addEventListener('click', () => {
    const next = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(next);
  });

  // ARIA wiring
  toggle.setAttribute('aria-controls', 'site-menu');
  toggle.setAttribute('aria-expanded', 'false');
})();

/* ===================== 2) Projects Filter ===================== */
(() => {
  const cards = $$('.project-card');
  const controls = $('.project-controls');
  if (!controls || !cards.length) return;

  const input = controls.querySelector('#q');
  const set = (tag, q = '') => {
    const query = q.trim().toLowerCase();
    cards.forEach((c) => {
      const text = c.textContent.toLowerCase();
      const okTag = tag === 'all' || (c.dataset.tag || '').split(',').includes(tag);
      const okQ   = !query || text.includes(query);
      c.hidden = !(okTag && okQ);
    });
  };

  controls.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tag]');
    if (!btn) return;
    controls.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    set(btn.dataset.tag, input?.value || '');
  });

  input?.addEventListener('input', () => {
    const active = controls.querySelector('button.is-active')?.dataset.tag || 'all';
    set(active, input.value);
  });
})();

/* ===================== 3) Theme Toggle (persist + OS) ===================== */
(() => {
  const NAV = $('.nav-container');
  if (!NAV) return;

  const storageKey = 'ld-theme';
  const root = document.documentElement;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');

  const getSaved = () => localStorage.getItem(storageKey);
  const apply = (mode, explicit = false) => {
    root.dataset.theme = mode;
    if (explicit) localStorage.setItem(storageKey, mode);
    updateButton(mode);
  };
  const current = () => root.dataset.theme || (mq.matches ? 'dark' : 'light');

  // Button (avoid duplicates)
  let btn = $('.theme-toggle', NAV);
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    NAV.appendChild(btn);
  }
  const updateButton = (mode) => {
    btn.ariaLabel = `Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`;
    btn.title = btn.ariaLabel;
    btn.textContent = mode === 'dark' ? '☀️' : '🌙';
  };

  apply(getSaved() || (mq.matches ? 'dark' : 'light'));

  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    apply(next, true);
  });

  // Follow OS changes only if user didn’t choose explicitly
  mq.addEventListener?.('change', () => {
    if (!getSaved()) apply(mq.matches ? 'dark' : 'light');
  });
})();

/* ===================== 4) Header Elevation on Scroll ===================== */
(() => {
  const nav = $('.site-nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('elevated', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ===================== 5) Intersection-based Reveal ===================== */
(() => {
  const sel = [
    '.project-card', '.skill', '.welcome',
    'header[role="banner"] h1', 'header[role="banner"] h2', '.quick-links'
  ].join(',');
  const els = $$(sel);
  if (!els.length || !('IntersectionObserver' in window)) return;

  els.forEach((el) => el.classList.add('reveal-init'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        target.classList.add('reveal-in');
        io.unobserve(target);
      }
    });
  }, { threshold: 0.15, rootMargin: '40px' });
  els.forEach((el) => io.observe(el));
})();

/* ===================== 6) Typing / Rotating Keywords ===================== */
(() => {
  const h2 = $('header[role="banner"] h2') || $('header h2');
  if (!h2) return;

  const base = 'Front-End Developer & ';
  const words = [
    'Accessibility Advocate',
    'Performance Tuner',
    'UI Engineer',
    'UX-minded Coder',
    'AI-curious Builder'
  ];
  let i = 0;

  const span = document.createElement('span');
  span.className = 'typing';
  h2.innerHTML = base;
  h2.appendChild(span);

  const swap = () => {
    span.classList.remove('typing-in');
    void span.offsetWidth; // WHY: restart css animation
    span.textContent = words[i = (i + 1) % words.length];
    span.classList.add('typing-in');
  };
  span.textContent = words[0];
  span.classList.add('typing-in');
  setInterval(swap, 2600);
})();

/* ===================== 7) Email copy + Toast ===================== */
(() => {
  const emailBtn = $('.email-btn');
  if (!emailBtn) return;

  let toast = $('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  emailBtn.addEventListener('click', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return; // normal click opens mail client
    e.preventDefault();
    const email = emailBtn.textContent.trim();
    navigator.clipboard.writeText(email).then(() => {
      toast.textContent = 'Email copied to clipboard';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1600);
    });
  });
})();

/* ===================== 8) Projects Quick-View Modal ===================== */
(() => {
  const imgs = $$('.projects .project-card img');
  if (!imgs.length) return;

  const modal = document.createElement('dialog');
  modal.className = 'img-modal';
  modal.innerHTML = `
    <button class="img-close" aria-label="Close">✕</button>
    <img alt="">
    <p class="img-caption"></p>
  `;
  document.body.appendChild(modal);

  const preview = $('img', modal);
  const caption = $('.img-caption', modal);

  const close = () => { modal.classList.remove('open'); modal.close(); };

  modal.querySelector('.img-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.open) close(); });

  imgs.forEach((img) => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      preview.src = img.src;
      preview.alt = img.alt || 'Project image';
      caption.textContent = img.alt || '';
      modal.showModal();
      modal.classList.add('open');
    });
  });
})();

/* ===================== 9) Contact form: validate + confirm ===================== */
function validateAndConfirm(ev) {
  ev.preventDefault();

  const get = (id) => document.getElementById(id);
  const name = get('name'), desc = get('description'), email = get('email');
  const email2 = get('confirmEmail'), phone = get('phone'), method = get('contactMethod');
  const date = get('dateRequired'), reqs = get('requirements');

  const errors = [];

  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}(?: [A-Za-zÀ-ÖØ-öø-ÿ' -]{2,})+$/.test(name.value.trim()))
    errors.push('Please enter your full name (first and last).');

  if (desc.value.trim().length < 10)
    errors.push('Project description should be at least 10 characters.');

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
  if (!emailOk) errors.push('Enter a valid email address.');
  if (email.value !== email2.value) errors.push('Emails do not match.');

  if (phone.value.trim() && (phone.value.replace(/\D/g, '').length < 7))
    errors.push('Phone number looks too short.');

  const today = new Date();
  const min = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const chosen = new Date(date.value);
  if (!(date.value && chosen >= min))
    errors.push('Please choose a date from tomorrow onwards.');

  if (errors.length) {
    alert('Please fix the following:\n\n• ' + errors.join('\n• '));
    return false;
  }

  let dlg = document.querySelector('dialog.contact-confirm');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.className = 'contact-confirm';
    dlg.innerHTML = `
      <form method="dialog" class="confirm-card" aria-labelledby="confirm-title">
        <h3 id="confirm-title">Review your details</h3>
        <ul class="kv"></ul>
        <menu>
          <button value="cancel" class="btn-secondary">Edit</button>
          <button value="submit" class="btn-primary">Submit</button>
        </menu>
      </form>`;
    document.body.appendChild(dlg);
  }

  const kv = dlg.querySelector('.kv');
  kv.innerHTML = `
    <li><strong>Name</strong><span>${name.value}</span></li>
    <li><strong>Email</strong><span>${email.value}</span></li>
    <li><strong>Phone</strong><span>${phone.value || '—'}</span></li>
    <li><strong>Preferred Contact</strong><span>${method.value}</span></li>
    <li><strong>Needed by</strong><span>${new Date(date.value).toLocaleDateString()}</span></li>
    <li><strong>Project</strong><span>${desc.value}</span></li>
    <li><strong>Extra</strong><span>${(reqs.value || '—').replace(/\n/g, '<br>')}</span></li>
  `;

  dlg.showModal();
  const onClose = () => {
    dlg.removeEventListener('close', onClose);
    if (dlg.returnValue === 'submit') {
      confettiBurst();
      alert('Thanks! Your enquiry has been sent.');
      ev.target.submit();
    }
  };
  dlg.addEventListener('close', onClose);

  return false;
}

/* ===================== 10) Small confetti burst ===================== */
function confettiBurst() {
  const until = performance.now() + 400;
  const tick = () => {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.setProperty('--dx', (Math.random() * 2 - 1).toFixed(2));
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1000);
    if (performance.now() < until) requestAnimationFrame(tick);
  };
  tick();
}

/* ===================== 11) Back-to-top button ===================== */
(() => {
  const btn = document.createElement('button');
  btn.className = 'to-top';
  btn.type = 'button';
  btn.title = 'Back to top';
  btn.ariaLabel = 'Back to top';
  btn.textContent = '↑';
  document.body.appendChild(btn);

  const toggle = () => btn.classList.toggle('show', window.scrollY > 350);
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  btn.addEventListener('click', () =>
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })
  );
})();

/* ===================== 12) Small perf mark ===================== */
performance.mark('ld-interactive');
console.info('%cLD Portfolio ready', 'font-weight:bold', { ms: performance.now().toFixed(1) });


/* ===================== 13) Animated Counters ===================== */
(() => {
  const counters = $$('[data-countto]');
  if (!counters.length || !('IntersectionObserver' in window)) return;
  const step = (el, target) => {
    const start = performance.now();
    const dur = 900 + Math.random()*400;
    const from = 0;
    const tick = (t) => {
      const p = Math.min(1, (t - start)/dur);
      const val = Math.floor(from + (target - from) * (1 - Math.cos(p * Math.PI)) / 2);
      el.textContent = String(val);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({target, isIntersecting}) => {
      if (!isIntersecting) return;
      const n = parseInt(target.getAttribute('data-countto'), 10);
      if (!Number.isFinite(n)) { io.unobserve(target); return; }
      step(target, n);
      io.unobserve(target);
    });
  }, {threshold:.4});
  counters.forEach(el => io.observe(el));
})();


/* ===================== 14) Blog: search + tag filter ===================== */
(() => {
  const posts = Array.from(document.querySelectorAll('.posts .post-card'));
  const ctrls = document.querySelector('.blog-controls');
  if (!ctrls || !posts.length) return;

  const input = ctrls.querySelector('#blog-q');
  const set = (tag, q='') => {
    const query = q.trim().toLowerCase();
    posts.forEach((p) => {
      const text = p.textContent.toLowerCase();
      const okTag = tag === 'all' || (p.dataset.tag || '').split(',').includes(tag);
      const okQ = !query || text.includes(query);
      p.hidden = !(okTag && okQ);
    });
  };

  ctrls.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tag]');
    if (!btn) return;
    ctrls.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    set(btn.dataset.tag, input?.value || '');
    if (btn.dataset.tag !== 'all') location.hash = btn.dataset.tag;
  });

  input?.addEventListener('input', () => {
    const active = ctrls.querySelector('button.is-active')?.dataset.tag || 'all';
    set(active, input.value);
  });

  // Hash deep-link
  const tag = location.hash.replace('#', '');
  if (tag) {
    const btn = ctrls.querySelector(`button[data-tag="${tag}"]`);
    if (btn) { btn.click(); }
  }
})();

/* ===================== 15) Reading time estimate ===================== */
(() => {
  const targets = document.querySelectorAll('[data-reading]');
  if (!targets.length) return;
  const WPM = 200;
  targets.forEach(el => {
    // On a post page, use the article text; on list, use linked article snippet + fallback
    let scope = el.closest('.page-post') ? document.querySelector('main.article article') : el.closest('.post-card');
    const text = scope ? scope.textContent.trim() : '';
    const words = text ? text.split(/\s+/).length : 0;
    const mins = Math.max(1, Math.round(words / WPM));
    el.textContent = `${mins} min read`;
  });
})();
