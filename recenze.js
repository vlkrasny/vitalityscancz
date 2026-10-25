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
      signal: AbortSignal.timeout(15000)
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
      if (photos.count || photoAttempt) {
        // Stejný náhodný identifikátor při opakování zabrání duplicitě po výpadku.
        photoAttempt ||= {
          payload: { ...payload, id: crypto.randomUUID(), photo_count: photos.count, photo_consent: true },
          blobs: photos.blobs, created: false, next: 0
        };
        if (!photoAttempt.created) {
          try {
            await request(endpoint, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(photoAttempt.payload) });
          } catch (error) { if (error.status !== 409) throw error; }
          photoAttempt.created = true;
        }
        for (; photoAttempt.next < photoAttempt.blobs.length; photoAttempt.next++) {
          result.textContent = 'Nahráváme fotografii ' + (photoAttempt.next + 1) + ' z ' + photoAttempt.blobs.length + '…';
          try {
            await request(config.url + window.ReviewPhotos.bucket + photoAttempt.payload.id + '/' + (photoAttempt.next + 1) + '.jpg', {
              method: 'POST', headers: { ...headers, 'Content-Type': 'image/jpeg', 'x-upsert': 'false', 'cache-control': 'no-store' }, body: photoAttempt.blobs[photoAttempt.next]
            });
          } catch (error) {
            if (error.status !== 409 && error.code !== 'Duplicate' && error.code !== 'ResourceAlreadyExists') throw error;
          }
        }
        photoAttempt = null;
      } else {
        await request(endpoint, {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(payload)
        });
      }
      form.reset();
      photos.reset();
      updateRating();
      result.textContent = 'Děkujeme. Recenze byla přijata a čeká na schválení. Zatím není veřejná.';
    } catch {
      result.textContent = photoAttempt ? 'Odeslání recenze s fotografiemi se nepodařilo dokončit. Klikněte na Dokončit odeslání. Tento pokus zůstává uzamčený a zopakuje se bez vytvoření další recenze. Obnovením stránky ztratíte možnost dokončit tento pokus.' : 'Přijetí recenze se nepodařilo potvrdit. Údaje zůstaly ve formuláři. Při výpadku spojení mohla být recenze uložena; před opakováním prosím chvíli vyčkejte.';
    } finally {
      sending = false;
      fields.disabled = false;
      for (const control of fields.querySelectorAll('input, textarea, select, button')) control.disabled = !!photoAttempt;
      submit.disabled = false;
      submit.textContent = photoAttempt ? 'Dokončit odeslání' : 'Odeslat ke schválení';
      photos.lock(!!photoAttempt);
      form.removeAttribute('aria-busy');
      result.focus();
    }
  });
  more.addEventListener('click', loadReviews);
  window.addEventListener('pagehide', () => { window.ReviewPhotos.dispose(list); photos.reset(); });
  fields.disabled = false;
  notice.textContent = 'Recenze se odesílá ke kontrole. Zveřejnění není automatické.';
  loadReviews();
})();
