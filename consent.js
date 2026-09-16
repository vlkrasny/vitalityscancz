(() => {
  'use strict';
  const key = 'vitalityscan_consent';
  const version = 1; // Increment when purposes or services change.
  const duration = 180 * 24 * 60 * 60 * 1000;
  let choice = null;
  let expiryTimer;
  let returnFocus;
  const panel = document.createElement('section');
  panel.className = 'consent-panel';
  panel.setAttribute('aria-labelledby', 'consent-title');
  panel.hidden = true;
  // Static markup only. Never interpolate visitor input here.
  panel.innerHTML = `<h2 id="consent-title" tabindex="-1">Vaše soukromí a nastavení</h2>
    <p>Nezbytné úložiště si pamatuje vaši volbu. S vaším souhlasem načteme písma Google Fonts; Google při tom obdrží IP adresu a technické údaje spojení. Bez souhlasu používáme systémová písma. Analytiku ani marketing nepoužíváme.</p>
    <a href="cookies.html">Podrobnosti o cookies a externích službách</a>
    <div class="consent-actions"><button class="button" type="button" data-accept>Přijmout</button><button class="button" type="button" data-reject>Odmítnout</button></div>
    <details><summary>Nastavení podle kategorií</summary>
      <fieldset><legend>Kategorie služeb</legend>
        <label><input type="checkbox" checked disabled> Nezbytné — uložení volby, vždy aktivní</label>
        <label><input type="checkbox" data-fonts> Externí obsah — písma Google Fonts</label>
        <label><input type="checkbox" disabled> Analytika — nepoužíváme</label>
        <label><input type="checkbox" disabled> Marketing — nepoužíváme</label>
      </fieldset>
      <button class="button" type="button" data-save>Uložit nastavení</button>
    </details>`;
  document.body.append(panel);
  const status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  document.body.append(status);
  const fonts = panel.querySelector('[data-fonts]');
  const reopen = document.querySelector('[data-consent-open]');
  reopen.hidden = false;

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if (value?.version === version && Number.isFinite(value.savedAt) &&
          value.savedAt <= Date.now() && value.expiresAt === value.savedAt + duration &&
          value.expiresAt > Date.now() && typeof value.external === 'boolean' &&
          value.analytics === false && value.marketing === false) return value;
    } catch (_) { /* Unavailable or malformed storage means no consent. */ }
    return null;
  }
  function apply() {
    document.querySelectorAll('link[data-consent-fonts]').forEach(link => {
      if (choice?.external) link.setAttribute('href', link.dataset.href);
      else link.removeAttribute('href');
    });
    clearTimeout(expiryTimer);
    if (choice) expiryTimer = setTimeout(refresh, Math.min(choice.expiresAt - Date.now(), 2147483647));
  }
  function show(focus = false) {
    fonts.checked = choice?.external === true;
    panel.hidden = false;
    if (focus) {
      returnFocus = document.activeElement;
      panel.querySelector('h2').focus();
    }
  }
  function save(external) {
    const savedAt = Date.now();
    choice = { version, savedAt, expiresAt: savedAt + duration, external, analytics: false, marketing: false };
    let persisted = true;
    try { localStorage.setItem(key, JSON.stringify(choice)); } catch (_) { persisted = false; }
    apply();
    panel.hidden = true;
    panel.querySelector('details').open = false;
    (returnFocus?.isConnected ? returnFocus : reopen).focus({ preventScroll: true });
    status.textContent = persisted ? 'Nastavení soukromí bylo uloženo. Kdykoli je můžete změnit.' : 'Volba platí pro tuto stránku. Prohlížeč neumožnil její uložení.';
  }
  function refresh() {
    choice = read();
    apply();
    if (!choice) show();
    else { fonts.checked = choice.external; panel.hidden = true; }
  }
  // Acknowledging the old notice is not consent to optional services.
  try { localStorage.removeItem('vitalityscan_cookie_notice'); } catch (_) { /* Optional cleanup. */ }
  try { document.cookie = 'vitalityscan_cookie_notice=; Max-Age=0; Path=/; SameSite=Lax'; } catch (_) { /* Cookies may be blocked too. */ }
  panel.querySelector('[data-accept]').addEventListener('click', () => save(true));
  panel.querySelector('[data-reject]').addEventListener('click', () => save(false));
  panel.querySelector('[data-save]').addEventListener('click', () => save(fonts.checked));
  reopen.addEventListener('click', () => show(true));
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && choice && choice.expiresAt <= Date.now()) refresh(); });
  refresh();
})();
