// Stejný aktuální rok jako v patičce hlavní stránky.
document.getElementById('year').textContent = new Date().getFullYear();

(() => {
  const config = window.VITALITY_REVIEWS || {};
  const form = document.getElementById('review-form');
  const fields = document.getElementById('review-fields');
  const result = document.getElementById('review-result');
  const state = document.getElementById('reviews-state');
  const list = document.getElementById('reviews-list');
  const more = document.getElementById('reviews-more');
  const notice = document.getElementById('review-configuration');
  const photos = window.ReviewPhotos.createUploader(form);
  const submit = document.getElementById('review-submit');
  const protection = window.ReviewAntispam;
  const intakeReady = /^[A-Za-z0-9_-]{10,100}$/.test(config.turnstileSiteKey || '');
  let photoAttempt = null;
  const ratingGroup = document.getElementById('review-rating');
  const stars = [...ratingGroup.querySelectorAll('.rating-star')];
  const ratingValue = document.getElementById('review-rating-value');
  const ratingLabels = ['Zatím nehodnoceno', '1 z 5 — špatné', '2 z 5 — slabé', '3 z 5 — průměrné', '4 z 5 — velmi dobré', '5 z 5 — výborné'];
  function paintRating(value = Number(form.elements.rating.value)) {
    stars.forEach((star, index) => {
      const filled = index < value;
      star.classList.toggle('is-filled', filled);
      star.querySelector('[aria-hidden]').textContent = filled ? '★' : '☆';
    });
  }
  function updateRating() {
    paintRating();
    ratingValue.textContent = ratingLabels[Number(form.elements.rating.value)];
    ratingGroup.removeAttribute('aria-invalid');
    document.getElementById('review-rating-error').textContent = '';
  }
  stars.forEach((star, index) => {
    star.addEventListener('pointerenter', () => {
      if (!fields.disabled) paintRating(index + 1);
    });
    star.querySelector('input').addEventListener('change', updateRating);
  });
  ratingGroup.addEventListener('pointerleave', () => paintRating());
  if (config.url !== 'https://rtkzfhqyodbiztkrsvik.supabase.co' ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey || '')) {
    state.textContent = 'Recenze zatím nejsou dostupné. Propojení čeká na konfiguraci.';
    return;
  }
  const endpoint = config.url + '/rest/v1/reviews';
  const headers = { apikey: config.publishableKey };
  let offset = 0;
  let sending = false;
  const pageSize = 12;
  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options, credentials: 'omit', referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(options.method === 'POST' ? 60000 : 15000)
    });
    if (!response.ok) {
      const error = new Error('Request failed'); error.status = response.status;
      try { const detail = await response.json(); error.code = detail.error || detail.code; } catch {}
      throw error;
    }
    return response;
  }
  async function loadReviews() {
    more.disabled = true;
    state.textContent = 'Načítáme schválené recenze…';
    try {
      // Status filtruje RLS; interní sloupce se z klienta nečtou.
      const response = await request(endpoint + '?select=id,display_name,rating,body,created_at,photo_count&order=created_at.desc,id.desc&limit=' + pageSize + '&offset=' + offset, { headers });
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid response');
      const fragment = document.createDocumentFragment();
      for (const row of rows) {
        const card = document.createElement('article');
        card.className = 'review-card review-copy';
        const name = document.createElement('h3');
        name.textContent = row.display_name;
        const rating = document.createElement('p');
        rating.className = 'card-label';
        rating.textContent = 'Hodnocení ' + row.rating + ' z 5';
        const body = document.createElement('p');
        body.className = 'review-text';
        body.textContent = row.body;
        card.append(name, rating, body);
        const gallery = window.ReviewPhotos.gallery(row, async path => (await request(config.url + path, { headers, cache: 'no-store' })).blob());
        if (gallery) card.append(gallery);
        fragment.append(card);
      }
      list.append(fragment);
      offset += rows.length;
      more.hidden = rows.length < pageSize;
      more.textContent = 'Další recenze';
      state.textContent = offset ? 'Zobrazeno recenzí: ' + offset + '.' : 'Zatím tu nejsou žádné schválené recenze. Můžete přidat vlastní zkušenost.';
    } catch {
      state.textContent = 'Recenze se nepodařilo načíst. Zkuste načtení znovu.';
      more.textContent = 'Zkusit načíst recenze';
      more.hidden = false;
    } finally { more.disabled = false; }
  }
  function validate() {
    let first = null;
    const checks = [
      ['review-name', el => el.value.trim().length >= 2 && el.value.trim().length <= 60, 'Zadejte veřejné jméno nebo přezdívku o délce 2–60 znaků.'],
      ['review-rating', () => /^[1-5]$/.test(form.elements.rating.value), 'Vyberte hodnocení od 1 do 5.'],
      ['review-body', el => el.value.trim().length >= 20 && el.value.trim().length <= 1500, 'Napište recenzi o délce 20–1 500 znaků.'],
      ['review-consent', el => el.checked, 'Pro zveřejnění recenze je potřeba váš souhlas.']
    ];
    for (const [id, check, message] of checks) {
      const el = document.getElementById(id);
      const valid = check(el);
      el.setAttribute('aria-invalid', String(!valid));
      document.getElementById(id + '-error').textContent = valid ? '' : message;
      if (!valid && !first) first = id === 'review-rating' ? el.querySelector('input') : el;
    }
    if (first) first.focus();
    return !first;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    if (photos.processing) { result.textContent = 'Počkejte prosím na dokončení přípravy fotografií.'; result.focus(); return; }
    if (!validate() || !photos.validate()) return;
    if (!intakeReady || !protection.token) {
      const message = document.getElementById('review-verification-status');
      message.textContent = 'Před odesláním dokončete ověření proti spamu.';
      message.focus(); return;
    }
    sending = true;
    const payload = {
      display_name: form.elements.display_name.value.trim(),
      rating: Number(form.elements.rating.value),
      body: form.elements.body.value.trim(),
      publication_consent: form.elements.publication_consent.checked,
      status: 'pending'
    };
    fields.disabled = true;
    photos.lock(true);
    form.setAttribute('aria-busy', 'true');
    result.textContent = 'Odesíláme recenzi…';
    try {
      // Náhodné tajemství pokusu zůstává jen v paměti. Opakování nemění obsah.
      photoAttempt ||= {
        payload: { ...payload, id: crypto.randomUUID(), photo_count: photos.count, photo_consent: photos.count > 0 },
        receipt: crypto.randomUUID(), blobs: photos.blobs
      };
      const data = new FormData();
      data.set('review', JSON.stringify(photoAttempt.payload));
      data.set('receipt', photoAttempt.receipt);
      data.set('captcha', protection.token);
      photoAttempt.blobs.forEach((blob, index) => data.append('photos', blob, (index + 1) + '.jpg'));
      const response = await request(config.url + '/functions/v1/submit-review', {
        method: 'POST', headers, body: data
      });
      if ((await response.json()).ok !== true) throw new Error('Invalid receipt');
      photoAttempt = null;
      form.reset();
      photos.reset();
      updateRating();
      result.textContent = 'Děkujeme. Recenze byla přijata a čeká na schválení. Zatím není veřejná.';
    } catch (error) {
      result.textContent = error.status === 429
        ? 'Byl dosažen limit odesílání. Vyčkejte prosím a zkuste to později.'
        : error.status === 403 ? 'Ověření proti spamu nebylo přijato. Dokončete nové ověření a zkuste to znovu.'
        : error.status === 409 ? 'Tento pokus již nelze dokončit. Obnovte stránku; pokud jste recenzi už odeslali, kontaktujte nás před opakováním.'
        : 'Přijetí se nepodařilo potvrdit. Dokončete nové ověření a použijte Dokončit odeslání. Stejný pokus nevytvoří další recenzi. Obnovením stránky možnost pokračovat ztratíte.';
    } finally {
      protection.reset();
      sending = false;
      fields.disabled = false;
      for (const control of fields.querySelectorAll('input, textarea, select, button')) control.disabled = !!photoAttempt;
      submit.disabled = false;
      document.getElementById('review-verification-start').disabled = false;
      submit.textContent = photoAttempt ? 'Dokončit odeslání' : 'Odeslat ke schválení';
      photos.lock(!!photoAttempt);
      form.removeAttribute('aria-busy');
      result.focus();
    }
  });
  more.addEventListener('click', loadReviews);
  window.addEventListener('pagehide', () => { window.ReviewPhotos.dispose(list); photos.reset(); });
  fields.disabled = !intakeReady;
  notice.textContent = intakeReady ? 'Recenze se odesílá ke kontrole. Zveřejnění není automatické.' : 'Odesílání recenzí je dočasně nedostupné. Probíhá nastavení ochrany proti spamu.';
  loadReviews();
})();
