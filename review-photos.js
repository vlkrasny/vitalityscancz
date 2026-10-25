'use strict';
// Sdílené fotografie recenzí. Žádné cizí URL se nestahují a názvy souborů se neodesílají.
window.ReviewPhotos = (() => {
  const galleries = new Map();
  const bucket = '/storage/v1/object/review-photos/';
  function dispose(root) {
    for (const [element, urls] of galleries) {
      if (root.contains(element)) { urls.forEach(URL.revokeObjectURL); galleries.delete(element); }
    }
  }
  function gallery(row, getBlob) {
    const count = Number(row.photo_count || 0);
    if (!Number.isInteger(count) || count < 1 || count > 3 || !/^[0-9a-f-]{36}$/i.test(row.id)) return null;
    const wrap = document.createElement('div'); wrap.className = 'review-photo-gallery';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'button button-outline';
    button.textContent = 'Zobrazit fotografie (' + count + ')';
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    const images = document.createElement('div'); images.className = 'review-photo-grid';
    const urls = []; galleries.set(wrap, urls);
    button.addEventListener('click', async () => {
      button.disabled = true; status.textContent = 'Načítáme fotografie…';
      urls.splice(0).forEach(URL.revokeObjectURL); images.replaceChildren();
      let failed = 0;
      for (let index = 1; index <= count; index++) {
        if (!wrap.isConnected) return;
        try {
          const blob = await getBlob('/storage/v1/object/authenticated/review-photos/' + row.id + '/' + index + '.jpg');
          if (!wrap.isConnected) return;
          if (!blob.type.startsWith('image/') || blob.size > 2 * 1024 * 1024) throw new Error('Invalid image');
          const url = URL.createObjectURL(blob); urls.push(url);
          const image = document.createElement('img');
          image.alt = 'Fotografie přiložená k recenzi, ' + index + ' z ' + count;
          image.width = 640; image.height = 480; image.decoding = 'async'; image.src = url;
          await image.decode();
          if (!wrap.isConnected) { URL.revokeObjectURL(url); return; }
          const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener';
          link.setAttribute('aria-label', 'Otevřít fotografii ' + index + ' v plné velikosti');
          link.append(image); images.append(link);
        } catch { failed++; }
      }
      if (!wrap.isConnected) return;
      status.textContent = failed ? 'Některé fotografie nejsou dostupné nebo ještě nejsou nahrané. Zkuste je načíst znovu.' : '';
      button.hidden = !failed; button.disabled = false;
      if (failed) button.textContent = 'Zkusit fotografie znovu';
    });
    wrap.append(button, status, images); return wrap;
  }
  function createUploader(form) {
    const zone = document.getElementById('review-photo-drop');
    const input = document.getElementById('review-photos');
    const pick = document.getElementById('review-photo-pick');
    const previews = document.getElementById('review-photo-previews');
    const message = document.getElementById('review-photo-message');
    const consent = document.getElementById('review-photo-consent');
    const items = [];
    let locked = false, processing = false;
    function say(text) { message.textContent = text; }
    function render() {
      previews.replaceChildren();
      items.forEach((item, index) => {
        const card = document.createElement('div'); card.className = 'review-photo-preview';
        const image = document.createElement('img'); image.src = item.url; image.alt = 'Náhled fotografie ' + (index + 1); image.width = 240; image.height = 180;
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'text-link';
        remove.textContent = 'Odebrat fotografii ' + (index + 1); remove.disabled = locked;
        remove.addEventListener('click', () => {
          URL.revokeObjectURL(item.url); items.splice(index, 1); render();
          pick.focus(); say('Fotografie odebrána. Vybráno: ' + items.length + ' z 3.');
        });
        card.append(image, remove); previews.append(card);
      });
      document.getElementById('review-photo-consent-wrap').hidden = items.length === 0;
      consent.required = items.length > 0;
    }
    async function convert(file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Použijte fotografii JPG, PNG nebo WebP.');
      if (file.size > 8 * 1024 * 1024 || !file.size) throw new Error('Každá fotografie musí mít nejvýše 8 MB a nesmí být prázdná.');
      let image;
      try { image = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
      catch { throw new Error('Fotografii se nepodařilo otevřít. Vyberte jiný soubor.'); }
      try {
        if (image.width * image.height > 40_000_000) throw new Error('Fotografie je příliš velká. Zmenšete ji nejvýše na 40 megapixelů.');
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        // Nový JPEG uchová pixely, nikoli původní EXIF/GPS či název souboru.
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.84));
        if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('Fotografii se nepodařilo zmenšit. Vyberte menší soubor.');
        return blob;
      } finally { image.close(); }
    }
    async function add(files) {
      if (locked || form.querySelector('#review-fields').disabled) return;
      if (processing) { say('Počkejte prosím na dokončení přípravy fotografií.'); return; }
      if (!files.length) { say('Přetáhněte soubor fotografie nebo vložte obrázek ze schránky. Pokud prohlížeč předává jen odkaz, fotografii nejprve uložte a vyberte jako soubor.'); return; }
      if (items.length + files.length > 3) { say('K jedné recenzi můžete přidat nejvýše 3 fotografie. Nejprve některou odeberte.'); return; }
      processing = true; pick.disabled = true; zone.setAttribute('aria-busy', 'true'); say('Připravujeme fotografie…');
      const errors = [];
      for (const file of files) {
        try { const blob = await convert(file); items.push({ blob, url: URL.createObjectURL(blob) }); }
        catch (error) { errors.push(error.message); }
      }
      processing = false; pick.disabled = locked; zone.removeAttribute('aria-busy');
      render(); say(errors.length ? errors.join(' ') : 'Vybráno fotografií: ' + items.length + ' z 3.');
    }
    pick.addEventListener('click', () => input.click());
    consent.addEventListener('change', () => {
      consent.removeAttribute('aria-invalid');
      say('Vybráno fotografií: ' + items.length + ' z 3.');
    });
    input.addEventListener('change', () => { add([...input.files]); input.value = ''; });
    zone.addEventListener('dragover', event => { event.preventDefault(); if (!locked) zone.classList.add('is-dragover'); });
    zone.addEventListener('dragleave', event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove('is-dragover'); });
    zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('is-dragover'); add([...event.dataTransfer.files]); });
    form.addEventListener('paste', event => {
      const files = [...(event.clipboardData?.files || [])];
      if (files.length) { event.preventDefault(); add(files); }
    });
    return {
      get processing() { return processing; },
      get count() { return items.length; },
      get blobs() { return items.map(item => item.blob); },
      validate() {
        const valid = !items.length || consent.checked;
        consent.setAttribute('aria-invalid', String(!valid));
        if (!valid) { say('Potvrďte prosím samostatný souhlas se zveřejněním fotografií.'); consent.focus(); }
        return valid;
      },
      lock(value) { locked = value; pick.disabled = value; input.disabled = value; render(); },
      reset() { items.splice(0).forEach(item => URL.revokeObjectURL(item.url)); consent.checked = false; consent.removeAttribute('aria-invalid'); render(); say(''); }
    };
  }
  return { createUploader, gallery, dispose, bucket };
})();
