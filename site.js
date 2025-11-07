/* ---- Global Utilities --------------------------------------------------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ---- 1) Accessible Mobile Nav ------------------------------------------ */
(() => {
  const toggle = $('.nav-toggle');
  const menu   = $('#site-menu');
  if (!toggle || !menu) return;

  const open = () => {
    toggle.setAttribute('aria-expanded', 'true');
    menu.classList.add('is-open');
    document.body.classList.add('nav-open');
    // trap focus
    const focusables = $$('a, button', menu);
    const first = focusables[0], last = focusables[focusables.length - 1];
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && focusables.length) {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    menu.dataset.kb = '1';
    menu.addEventListener('keydown', onKey);
    first?.focus();
  };

  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    menu.replaceWith(menu.cloneNode(true)); // remove listeners cleanly
  };

  toggle.addEventListener('click', () => (
    toggle.getAttribute('aria-expanded') === 'true' ? close() : open()
  ));
  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('is-open')) return;
    if (!menu.contains(e.target) && !toggle.contains(e.target)) close();
  });
})();
(() => {
  const cards = [...document.querySelectorAll('.project-card')];
  const controls = document.querySelector('.project-controls');
  if (!controls || !cards.length) return;
  const input = controls.querySelector('#q');
  const set = (tag, q='') => {
    cards.forEach(c => {
      const text = c.textContent.toLowerCase();
      const okTag = tag === 'all' || c.dataset.tag?.split(',').includes(tag);
      const okQ   = !q || text.includes(q.toLowerCase());
      c.style.display = (okTag && okQ) ? '' : 'none';
    });
  };
  controls.addEventListener('click', e => {
    if (!e.target.matches('button[data-tag]')) return;
    controls.querySelectorAll('button').forEach(b=>b.classList.remove('is-active'));
    e.target.classList.add('is-active');
    set(e.target.dataset.tag, input.value);
  });
  input.addEventListener('input', () => {
    const active = controls.querySelector('button.is-active')?.dataset.tag || 'all';
    set(active, input.value);
  });
})();

/* ---- 2) Theme Toggle (prefers-color-scheme + persistence) -------------- */
// Adds a lightweight theme toggle button to the nav on first load.
(() => {
  const NAV = $('.nav-container');
  if (!NAV) return;

  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.type = 'button';
  btn.ariaLabel = 'Toggle dark mode';
  btn.title = 'Toggle dark mode';
  btn.textContent = '🌙';

  const storageKey = 'ld-theme';
  const apply = (mode) => {
    document.documentElement.dataset.theme = mode;
    btn.textContent = mode === 'dark' ? '☀️' : '🌙';
  };

  const saved = localStorage.getItem(storageKey);
  const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  apply(saved || prefers);

  btn.addEventListener('click', () => {
    const next = (document.documentElement.dataset.theme === 'dark') ? 'light' : 'dark';
    localStorage.setItem(storageKey, next);
    apply(next);
  });

  NAV.appendChild(btn);
})();

/* ---- 3) Header Elevation on Scroll (polish) ---------------------------- */
(() => {
  const nav = $('.site-nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('elevated', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ---- 4) Intersection-based Reveal Animations --------------------------- */
(() => {
  const revealables = [
    '.project-card', '.skill', '.welcome', 'header[role="banner"] h1',
    'header[role="banner"] h2', '.quick-links'
  ];
  const els = $$(revealables.join(','));
  if (!els.length) return;

  els.forEach(el => el.classList.add('reveal-init'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        target.classList.add('reveal-in');
        io.unobserve(target);
      }
    });
  }, { threshold: 0.15, rootMargin: '40px' });

  els.forEach(el => io.observe(el));
})();

/* ---- 5) Typing/Rotating Keywords (hero) -------------------------------- */
(() => {
  const h2 = $('header[role="banner"] h2') || $('header h2');
  if (!h2) return;
  const base = 'Front-End Developer & ';
  const words = ['Accessibility Advocate', 'Performance Tuner', 'UI Engineer', 'UX-minded Coder', 'AI-curious Builder'];
  let i = 0;

  const span = document.createElement('span');
  span.className = 'typing';
  h2.innerHTML = `${base}`;
  h2.appendChild(span);

  const swap = () => {
    span.classList.remove('typing-in');
    void span.offsetWidth; // reflow to restart animation
    span.textContent = words[i = (i + 1) % words.length];
    span.classList.add('typing-in');
  };
  span.textContent = words[0];
  span.classList.add('typing-in');
  setInterval(swap, 2600);
})();

/* ---- 6) Email copy + Toast (footer polish) ----------------------------- */
(() => {
  const emailBtn = $('.email-btn');
  if (!emailBtn) return;

  // Create toast container
  const toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);

  emailBtn.addEventListener('click', (e) => {
    // If user wants to copy instead of open mail client: Ctrl/Meta + click copies
    if (!(e.ctrlKey || e.metaKey)) return; // allow normal click to open mail
    e.preventDefault();
    const email = emailBtn.textContent.trim();
    navigator.clipboard.writeText(email).then(() => {
      toast.textContent = 'Email copied to clipboard';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1600);
    });
  });
})();

/* ---- 7) Projects Quick-View Modal (click any project image) ------------- */
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

  const preview = modal.querySelector('img');
  const caption = modal.querySelector('.img-caption');

  imgs.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      preview.src = img.src;
      preview.alt = img.alt || 'Project image';
      caption.textContent = img.alt || '';
      modal.showModal();
      modal.classList.add('open');
    });
  });

  const close = () => { modal.classList.remove('open'); modal.close(); };
  modal.querySelector('.img-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.open) close(); });
})();

/* ---- 8) Contact form: validation + confirm summary --------------------- */
// Works with your existing onsubmit="return validateAndConfirm(event)" in contact.html
// Shows a review dialog; blocks bad input; sets min date = tomorrow.
function validateAndConfirm(ev) {
  ev.preventDefault();

  const get = (id) => document.getElementById(id);
  const name = get('name'), desc = get('description'), email = get('email');
  const email2 = get('confirmEmail'), phone = get('phone'), method = get('contactMethod');
  const date = get('dateRequired'), reqs = get('requirements');

  // Basic checks
  const errors = [];

  // Name: 2+ words, letters/spaces only (with apostrophes/hyphens)
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}(?: [A-Za-zÀ-ÖØ-öø-ÿ' -]{2,})+$/.test(name.value.trim()))
    errors.push('Please enter your full name (first and last).');

  // Description: 10+ chars
  if (desc.value.trim().length < 10)
    errors.push('Project description should be at least 10 characters.');

  // Email match & format
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
  if (!emailOk) errors.push('Enter a valid email address.');
  if (email.value !== email2.value) errors.push('Emails do not match.');

  // Phone (optional): accept spaces, +, (), - ; min 7 digits if present
  if (phone.value.trim() && (phone.value.replace(/\D/g, '').length < 7))
    errors.push('Phone number looks too short.');

  // Date: must be >= tomorrow
  const today = new Date();
  const min = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const chosen = new Date(date.value);
  if (!(date.value && chosen >= min))
    errors.push('Please choose a date from tomorrow onwards.');

  if (errors.length) {
    alert('Please fix the following:\n\n• ' + errors.join('\n• '));
    return false;
  }

  // Build confirmation dialog
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

  dlg.addEventListener('close', function onClose() {
    dlg.removeEventListener('close', onClose);
    if (dlg.returnValue === 'submit') {
      // Simulate submit success; here you’d POST via fetch() to your backend
      // fetch('/api/contact', { method:'POST', body: new FormData(form) })
      confettiBurst(); // small delight
      alert('Thanks! Your enquiry has been sent.');
      ev.target.submit();
    }
  });

  return false;
}

/* ---- 9) Small confetti burst (no deps) --------------------------------- */
function confettiBurst() {
  const count = 18;
  const end = Date.now() + 400;
  const frame = () => {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.setProperty('--dx', (Math.random() * 2 - 1).toFixed(2));
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1000);
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/* ---- 10) Back-to-top button (auto appears) ----------------------------- */
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
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ---- 11) (Optional) Simple performance marks --------------------------- */
performance.mark('ld-interactive');
console.info('%cLD Portfolio ready', 'font-weight:bold', { timeSinceNavStartMs: performance.now().toFixed(1) });
