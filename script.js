const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  menuButton.querySelector('.sr-only').textContent = open ? 'Otevřít menu' : 'Zavřít menu';
  nav.classList.toggle('open', !open);
  document.body.classList.toggle('menu-open', !open);
});

nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  document.body.classList.remove('menu-open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

document.querySelectorAll('.faq-item button').forEach(button => {
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
  });
});

const planSelect = document.getElementById('program');
document.querySelectorAll('.select-plan').forEach(link => {
  link.addEventListener('click', () => {
    planSelect.value = link.dataset.plan;
    window.setTimeout(() => planSelect.focus({preventScroll:true}), 500);
  });
});

const form = document.getElementById('booking-form');
const setError = (id, message) => {
  const field = document.getElementById(id);
  const error = document.getElementById(`${id}-error`);
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  field.setAttribute('aria-describedby', `${id}-error`);
  error.textContent = message;
  return Boolean(message);
};

// Keep native validation and POST available when JavaScript is disabled.
if (form) form.noValidate = true;
let submitting = false;
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  const nameInput = form.elements.namedItem('name');
  const phoneInput = form.elements.namedItem('phone');
  const emailInput = form.elements.namedItem('email');
  const privacyInput = document.getElementById('privacy');
  const errors = [
    setError('program', planSelect.value ? '' : 'Vyberte prosím program.'),
    setError('name', nameInput.value.trim().length >= 3 ? '' : 'Doplňte prosím celé jméno.'),
    setError('phone', /^[+\d][\d\s-]{7,}$/.test(phoneInput.value.trim()) ? '' : 'Doplňte platné telefonní číslo.'),
    setError('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim()) ? '' : 'Doplňte platný e-mail.'),
    setError('privacy', privacyInput.checked ? '' : 'Potvrďte prosím seznámení s informacemi o ochraně osobních údajů.')
  ];
  const status = document.getElementById('form-status');
  if (errors.some(Boolean)) {
    status.textContent = 'Zkontrolujte prosím označená pole.';
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const submitButton = form.querySelector('[type="submit"]');
  const originalLabel = submitButton.textContent;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  submitting = true;
  submitButton.disabled = true;
  submitButton.textContent = 'Odesílám…';
  form.setAttribute('aria-busy', 'true');
  status.textContent = 'Odesílám vaši poptávku…';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) {
      status.textContent = response.status === 429
        ? 'Služba nyní přijímá příliš mnoho požadavků. Vyčkejte prosím a zkuste odeslání později. Vyplněné údaje zůstaly zachované.'
        : 'Poptávku se nepodařilo odeslat. Zkontrolujte údaje a zkuste to prosím později. Vyplněné údaje zůstaly zachované.';
      return;
    }
    form.reset();
    status.textContent = 'Děkujeme, vaše poptávka byla odeslána. Ozveme se vám s domluvou termínu. Termín zatím není rezervován.';
  } catch (_) {
    status.textContent = 'Odeslání se nepodařilo potvrdit. Zkontrolujte připojení. Vyplněné údaje zůstaly zachované; při opakovaném odeslání může vzniknout duplicitní poptávka.';
  } finally {
    window.clearTimeout(timeout);
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
    form.removeAttribute('aria-busy');
  }
});

document.getElementById('year').textContent = new Date().getFullYear();

const cookieNotice = document.getElementById('cookie-notice');
const noticeStorageKey = 'vitalityscan_cookie_notice';
let noticeStoredLocally = false;
try { noticeStoredLocally = localStorage.getItem(noticeStorageKey) === 'ack'; } catch (_) { /* Storage may be unavailable. */ }
const noticeStoredInCookie = document.cookie.split('; ').some(cookie => cookie.startsWith(`${noticeStorageKey}=`));
const cookieAcknowledgement = noticeStoredLocally || noticeStoredInCookie;
if (cookieNotice && !cookieAcknowledgement) cookieNotice.hidden = false;
document.getElementById('cookie-acknowledge')?.addEventListener('click', () => {
  try { localStorage.setItem(noticeStorageKey, 'ack'); } catch (_) { /* The cookie remains as a fallback. */ }
  document.cookie = `${noticeStorageKey}=ack; Max-Age=15552000; Path=/; SameSite=Lax`;
  cookieNotice.hidden = true;
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion || !('IntersectionObserver' in window)) {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), {threshold: .12});
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
