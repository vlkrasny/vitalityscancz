'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const config = window.VITALITY_REVIEWS || {};
  const message = $('admin-message');
  const login = $('admin-login');
  const panel = $('moderation-panel');
  const list = $('moderation-list');
  const state = $('queue-state');
  const filter = $('status-filter');
  let token = null, expiryTimer = null, generation = 0, offset = 0, busy = false;
  const pageSize = 20;
  const labels = { pending: 'Čeká na schválení', approved: 'Schválena', rejected: 'Zamítnuta' };

  function announce(text) { message.textContent = text; message.focus(); }
  function clearSession(text = '') {
    generation++;
    token = null;
    clearTimeout(expiryTimer);
    window.ReviewPhotos.dispose(list);
    list.replaceChildren();
    panel.hidden = true;
    $('login-panel').hidden = false;
    $('login-fields').disabled = false;
    $('admin-password').value = '';
    busy = false;
    announce(text);
  }
  async function api(path, options = {}, bearer = token) {
    const response = await fetch(config.url + path, {
      ...options,
      headers: { apikey: config.publishableKey, ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}), ...options.headers },
      credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      const error = new Error('API request failed');
      error.status = response.status;
      throw error;
    }
    return response;
  }
  function controls(disabled) {
    busy = disabled;
    filter.disabled = disabled;
    $('admin-reload').disabled = disabled;
    $('admin-more').disabled = disabled;
    for (const button of list.querySelectorAll('button')) button.disabled = disabled;
  }
  function failure(error, fallback) {
    if (error.status === 401) clearSession('Přihlášení vypršelo. Přihlaste se znovu.');
    else if (error.status === 403) clearSession('Účet nemá oprávnění ke správě recenzí.');
    else announce(fallback);
  }
  function render(row) {
    const card = document.createElement('article'); card.className = 'moderation-card';
    const title = document.createElement('h3'); title.textContent = row.display_name;
    const meta = document.createElement('p'); meta.className = 'moderation-meta';
    const date = new Date(row.created_at);
    meta.textContent = `${labels[row.status] || 'Neznámý stav'} · Hodnocení ${row.rating} z 5 · ${Number.isNaN(date.getTime()) ? '' : date.toLocaleString('cs-CZ')}`;
    const body = document.createElement('p'); body.className = 'review-text'; body.textContent = row.body;
    const consent = document.createElement('p'); consent.className = 'moderation-meta';
    consent.textContent = `Souhlas se zveřejněním: ${row.publication_consent === true ? 'ano' : 'ne'} · Verze: ${row.consent_version}`;
    if (row.photo_count) consent.textContent += ` · Fotografie: ${row.photo_count} · Souhlas s fotografiemi: ${row.photo_consent === true ? 'ano' : 'ne'} · Verze: ${row.photo_consent_version}`;
    const actions = document.createElement('div'); actions.className = 'moderation-actions';
    for (const [status, label] of [['approved', 'Schválit'], ['rejected', 'Zamítnout'], ['pending', 'Vrátit k posouzení']]) {
      if (status === row.status || (status === 'approved' && (row.publication_consent !== true || (row.photo_count > 0 && row.photo_consent !== true)))) continue;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'button'; button.textContent = label;
      button.setAttribute('aria-label', label + ' recenzi od ' + row.display_name);
      button.addEventListener('click', () => changeStatus(row, status)); actions.append(button);
    }
    card.append(title, meta, body, consent);
    const gallery = window.ReviewPhotos.gallery(row, async path => (await api(path)).blob());
    if (gallery) card.append(gallery);
    card.append(actions); return card;
  }
  async function load(reset = true) {
    if (!token || busy) return;
    const current = generation;
    controls(true);
    if (reset) { offset = 0; window.ReviewPhotos.dispose(list); list.replaceChildren(); $('admin-more').hidden = true; }
    state.textContent = 'Načítáme recenze…';
    try {
      const response = await api('/rest/v1/reviews?select=id,display_name,rating,body,status,created_at,publication_consent,consent_version,photo_count,photo_consent,photo_consent_version&status=eq.' + filter.value + '&order=created_at.desc,id.desc&limit=' + pageSize + '&offset=' + offset);
      const rows = await response.json();
      if (current !== generation) return;
      if (!Array.isArray(rows)) throw new Error('Invalid response');
      for (const row of rows) list.append(render(row));
      offset += rows.length;
      $('admin-more').hidden = rows.length < pageSize;
      state.textContent = offset ? 'Zobrazeno recenzí: ' + offset + '.' : 'V tomto stavu nejsou žádné recenze.';
    } catch (error) {
      if (current !== generation) return;
      state.textContent = 'Seznam se nepodařilo načíst. Použijte Obnovit seznam.';
      failure(error, 'Načtení selhalo. Ověřte připojení a nasazení SQL migrací.');
    } finally { if (current === generation) controls(false); }
  }
  async function changeStatus(row, status) {
    if (!token || busy) return;
    if (status === 'approved' && !window.confirm('Schválit tuto recenzi včetně přiložených fotografií ke zveřejnění? Potvrďte, že jste ověřili text, všechny fotografie a příslušné souhlasy.')) return;
    const current = generation;
    controls(true);
    try {
      const response = await api('/rest/v1/reviews?id=eq.' + encodeURIComponent(row.id) + '&status=eq.' + row.status + '&select=id', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ status })
      });
      const changed = await response.json();
      if (current !== generation) return;
      if (!Array.isArray(changed) || changed.length !== 1) throw new Error('Conflict or no permission');
      announce('Stav recenze byl uložen: ' + labels[status] + '.');
    } catch (error) {
      if (current !== generation) return;
      failure(error, 'Změnu se nepodařilo potvrdit. Obnovte seznam před dalším pokusem; recenzi mohl změnit jiný správce nebo vám bylo odebráno oprávnění.');
    } finally {
      if (current === generation) { controls(false); await load(); }
    }
  }
  login.addEventListener('submit', async event => {
    event.preventDefault();
    if (!login.reportValidity() || busy) return;
    busy = true; $('login-fields').disabled = true;
    message.textContent = 'Přihlašujeme…';
    let candidate = null;
    try {
      const response = await api('/auth/v1/token?grant_type=password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: $('admin-email').value.trim(), password: $('admin-password').value })
      }, null);
      const session = await response.json();
      candidate = session.access_token;
      if (typeof candidate !== 'string' || !Number.isFinite(session.expires_in) || session.expires_in <= 0) throw new Error('Invalid session');
      const user = await (await api('/auth/v1/user', {}, candidate)).json();
      const membership = await (await api('/rest/v1/review_moderators?select=user_id&user_id=eq.' + encodeURIComponent(user.id), {}, candidate)).json();
      if (!Array.isArray(membership) || !membership.some(row => row.user_id === user.id)) {
        const error = new Error('No moderation permission'); error.status = 403; throw error;
      }
      token = candidate; generation++;
      expiryTimer = setTimeout(() => clearSession('Přihlášení vypršelo. Přihlaste se znovu.'), Math.min(session.expires_in * 1000, 2147483647));
      $('admin-password').value = '';
      $('login-panel').hidden = true; panel.hidden = false;
      filter.value = 'pending';
      message.textContent = 'Jste přihlášeni ke správě recenzí.';
      $('queue-title').focus();
      busy = false; await load();
    } catch (error) {
      if (candidate) { try { await api('/auth/v1/logout?scope=local', { method: 'POST' }, candidate); } catch {} }
      clearSession(error.status === 403 ? 'Účet nemá oprávnění ke schvalování. Správce jej musí přidat mezi moderátory.' : error.status === 400 || error.status === 401 ? 'Přihlášení se nezdařilo. Zkontrolujte e-mail, heslo a aktivaci účtu.' : error.status === 429 ? 'Příliš mnoho pokusů. Zkuste přihlášení později.' : 'Přihlášení není dostupné. Ověřte připojení a konfiguraci Supabase.');
    } finally { busy = false; $('login-fields').disabled = false; }
  });
  $('admin-logout').addEventListener('click', async () => {
    const previous = token;
    clearSession('Byli jste odhlášeni z této stránky.');
    if (previous) {
      try { await api('/auth/v1/logout?scope=local', { method: 'POST' }, previous); }
      catch { if (!token) announce('Místní relace byla ukončena. Odhlášení na serveru se nepodařilo potvrdit.'); }
    }
  });
  filter.addEventListener('change', () => load());
  $('admin-reload').addEventListener('click', () => load());
  $('admin-more').addEventListener('click', () => load(false));
  // BFCache nesmí obnovit soukromý seznam ani relaci po odchodu ze stránky.
  window.addEventListener('pagehide', () => clearSession());
  if (config.url !== 'https://rtkzfhqyodbiztkrsvik.supabase.co' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey || '')) {
    message.textContent = 'Přihlášení čeká na konfiguraci Supabase.'; return;
  }
  $('login-fields').disabled = false;
})();
