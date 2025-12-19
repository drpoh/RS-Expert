async function loadSite() {
  const res = await fetch('/data/site.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Cannot load /data/site.json: ' + res.status);
  const d = await res.json();

  // Backwards compatible: allow both old flat fields and new basic.*
  const basic = d.basic || {};
  const companyName = basic.companyName || d.companyName || 'RS-Expert Oy';
  const tagline = basic.tagline || d.tagline || '';
  const phone = basic.phone || d.phone || '';
  const email = basic.email || d.email || '';

  // Header texts
  document.querySelectorAll('[data-company]').forEach(e => (e.textContent = companyName));
  document.querySelectorAll('[data-tagline]').forEach(e => (e.textContent = tagline));

  // Menu
  const nav = document.getElementById('menu');
  if (nav && Array.isArray(d.menu)) {
    nav.innerHTML = d.menu
      .map(m => `<a href="${m.href}">${escapeHtml(m.label)}</a>`)
      .join('');
  }

  // Contacts
  const phoneA = document.querySelector('[data-phone-link]');
  if (phoneA && phone) {
    phoneA.href = 'tel:' + phone.replace(/\s+/g, '');
    phoneA.textContent = phone;
  }
  const emailA = document.querySelector('[data-email-link]');
  if (emailA && email) {
    emailA.href = 'mailto:' + email;
    emailA.textContent = email;
  }

  // Services (only enabled)
  const s = document.getElementById('services');
  if (s) {
    const items = (Array.isArray(d.services) ? d.services : []).filter(x => x?.enabled !== false);
    s.innerHTML = items.length
      ? items
          .map(
            i => `
          <div class="card">
            <h3>${escapeHtml(i.title || '')}</h3>
            <p>${escapeHtml(i.text || '')}</p>
          </div>
        `
          )
          .join('')
      : `<div class="card"><p>Lisää palvelut admin-paneelissa: /admin</p></div>`;
  }

  // Documents (grouped by category, only enabled)
  const docs = document.getElementById('documents');
  if (docs) {
    const items = (Array.isArray(d.documents) ? d.documents : []).filter(x => x?.enabled !== false);

    if (!items.length) {
      docs.innerHTML = `<div class="card"><p>Lisää PDF:t admin-paneelissa: /admin</p></div>`;
    } else {
      const groups = groupBy(items, it => it.category || 'Muut');
      const order = ['Sertifikaatit', 'Hinnasto', 'Ohjeet', 'Muut'];

      docs.innerHTML = order
        .filter(cat => groups[cat])
        .map(cat => renderDocGroup(cat, groups[cat]))
        .join('') +
        Object.keys(groups)
          .filter(cat => !order.includes(cat))
          .map(cat => renderDocGroup(cat, groups[cat]))
          .join('');
    }
  }

  // Gallery (only enabled, add data-lightbox)
  const g = document.getElementById('gallery');
  if (g) {
    const items = (Array.isArray(d.gallery) ? d.gallery : []).filter(x => x?.enabled !== false);

    g.innerHTML = items.length
      ? items
          .map(
            i => `
          <div class="card">
            ${i.image ? `<img src="${i.image}" alt="" data-lightbox>` : ''}
            <h3>${escapeHtml(i.title || '')}</h3>
            ${i.type ? `<p class="small">${escapeHtml(i.type)}</p>` : ''}
            ${i.city ? `<p class="small">${escapeHtml(i.city)}</p>` : ''}
            ${i.text ? `<p>${escapeHtml(i.text)}</p>` : ''}
          </div>
        `
          )
          .join('')
      : `<div class="card"><p>Lisää kuvia admin-paneelissa: /admin</p></div>`;

    // Lightbox (if lightbox exists on page)
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbBg = document.getElementById('lightbox-bg');
    const lbClose = document.getElementById('lightbox-close');

    if (lb && lbImg && lbBg && lbClose) {
      g.querySelectorAll('img[data-lightbox]').forEach(img => {
        img.addEventListener('click', () => {
          lbImg.src = img.src;
          lb.style.display = 'block';
          document.body.style.overflow = 'hidden';
        });
      });

      const closeLB = () => {
        lb.style.display = 'none';
        lbImg.src = '';
        document.body.style.overflow = '';
      };

      lbBg.addEventListener('click', closeLB);
      lbClose.addEventListener('click', closeLB);
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeLB();
      });
    }
  }
}

function renderDocGroup(title, items) {
  const safeTitle = escapeHtml(title);
  const cards = items
    .map(
      i => `
    <div class="card">
      <h3>${escapeHtml(i.title || 'Dokumentti')}</h3>
      <p><a class="btn" href="${i.url}" target="_blank" rel="noopener">Avaa PDF</a></p>
    </div>
  `
    )
    .join('');
  return `
    <section style="margin: 14px 0 20px">
      <h2 style="margin:0 0 10px">${safeTitle}</h2>
      <div class="grid">${cards}</div>
    </section>
  `;
}

function groupBy(arr, fn) {
  return arr.reduce((acc, x) => {
    const k = fn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[m]));
}

loadSite().catch(err => {
  console.error(err);
  const el = document.getElementById('error');
  if (el) el.textContent = 'Ошибка: ' + err.message;
});
