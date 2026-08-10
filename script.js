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

form?.addEventListener('submit', event => {
  event.preventDefault();
  const nameInput = form.elements.namedItem('name');
  const phoneInput = form.elements.namedItem('phone');
  const emailInput = form.elements.namedItem('email');
  const privacyInput = document.getElementById('privacy');
  const errors = [
    setError('program', planSelect.value ? '' : 'Vyberte prosím program.'),
    setError('name', nameInput.value.trim().length >= 3 ? '' : 'Doplňte prosím celé jméno.'),
    setError('phone', /^[+\d][\d\s-]{7,}$/.test(phoneInput.value.trim()) ? '' : 'Doplňte platné telefonní číslo.'),
    setError('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim()) ? '' : 'Doplňte platný e-mail.'),
    setError('privacy', privacyInput.checked ? '' : 'Pro odeslání je potřeba souhlas.')
  ];
  const status = document.getElementById('form-status');
  if (errors.some(Boolean)) {
    status.textContent = 'Zkontrolujte prosím označená pole.';
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  status.textContent = 'Formulář je správně vyplněný. Odesílání bude dostupné po propojení formulářové služby.';
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
