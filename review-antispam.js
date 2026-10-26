'use strict';
// Načtení ochrany až na výslovné spuštění návštěvníkem, bez trvalého úložiště.
window.ReviewAntispam = (() => {
  let token = '', widget, loading;
  const status = document.getElementById('review-verification-status');
  const button = document.getElementById('review-verification-start');
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Načítáme ochranu proti spamu…';
    try {
      if (widget !== undefined) {
        window.turnstile.reset(widget); button.hidden = true; return;
      }
      loading ||= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timeout = setTimeout(() => { script.remove(); reject(new Error('Verification timeout')); }, 15000);
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.referrerPolicy = 'no-referrer';
        script.onload = () => { clearTimeout(timeout); resolve(); };
        script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Verification unavailable')); };
        document.head.append(script);
      });
      await loading;
      widget = window.turnstile.render('#review-verification', {
        sitekey: window.VITALITY_REVIEWS.turnstileSiteKey,
        action: 'review', size: 'compact', language: 'cs', 'response-field': false,
        callback(value) { token = value; status.textContent = 'Ověření dokončeno. Můžete odeslat recenzi.'; },
        'expired-callback'() { token = ''; status.textContent = 'Ověření vypršelo. Dokončete prosím nové ověření.'; },
        'error-callback'() { token = ''; status.textContent = 'Ověření se nezdařilo. Zkuste je spustit znovu.'; button.hidden = false; button.disabled = false; }
      });
      button.hidden = true;
    } catch {
      loading = null; button.disabled = false;
      status.textContent = 'Ochranu proti spamu se nepodařilo načíst. Zkuste to znovu.';
    }
  });
  return {
    get token() { return token; },
    reset() { token = ''; if (widget !== undefined) { status.textContent = 'Pro další pokus dokončete nové ověření.'; window.turnstile.reset(widget); } }
  };
})();
