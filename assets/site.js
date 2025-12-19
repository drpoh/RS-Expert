async function loadSite() {
  const res = await fetch('/data/site.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Cannot load /data/site.json: ' + res.status);
  const d = await res.json();

  // Header
  document.querySelectorAll('[data-company]').forEach(e => e.textContent = d.companyName || 'RS-Expert Oy');
  document.querySelectorAll('[data-tagline]').forEach(e => e.textContent = d.tagline || '');

  // Menu
  const nav = document.getElementById('menu');
  if (nav && Array.isArray(d.menu)) {
    nav.innerHTML = d.menu.map(m => `<a href="${m.href}">${escapeHtml(m.label)}</a>`).join('');
  }

  // Contacts
  const phoneA = document.querySelector('[data-phone-link]');
  if (phoneA && d.phone) {
    phoneA.href = 'tel:' + d.phone.replace(/\s+/g, '');
    phoneA.textContent = d.phone;
  }
  const emailA = document.querySelector('[data-email-link]');
  if (emailA && d.email) {
    emailA.href = 'mailto:' + d.email;
    emailA.textContent = d.email;
  }

  // Services
  const s = document.getElementById('services');
  if (s) {
    const items = Array.isArray(d.services) ? d.services : [];
    s.innerHTML = items.length
      ? items.map(i => `<div class="card"><h3>${escapeHtml(i.title||'')}</h3><p>${escapeHtml(i.text||'')}</p></div>`).join('')
      : `<div class="card"><p>Добавь услуги в /admin → Palvelut</p></div>`;
  }

  // Documents
  const docs = document.getElementById('documents');
  if (docs) {
    const items = Array.isArray(d.documents) ? d.documents : [];
    docs.innerHTML = items.length
      ? items.map(i => `<div class="card"><h3>${escapeHtml(i.title||'Dokumentti')}</h3><p><a class="btn" href="${i.url}" target="_blank" rel="noopener">Avaa</a></p></div>`).join('')
      : `<div class="card"><p>Добавь PDF в /admin → Dokumentit</p></div>`;
  }

  // Gallery
  const g = document.getElementById('gallery');
  if (g) {
    const items = Array.isArray(d.gallery) ? d.gallery : [];
    g.innerHTML = items.length
      ? items.map(i => `
        <div class="card">
          ${i.image ? `<img src="${i.image}" alt="">` : ''}
          <h3>${escapeHtml(i.title||'')}</h3>
          ${i.city ? `<p>${escapeHtml(i.city)}</p>` : ''}
          ${i.text ? `<p>${escapeHtml(i.text)}</p>` : ''}
        </div>`).join('')
      : `<div class="card"><p>Добавь фото в /admin → Galleria</p></div>`;
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

loadSite().catch(err => {
  console.error(err);
  const el = document.getElementById('error');
  if (el) el.textContent = 'Ошибка: ' + err.message;
});
