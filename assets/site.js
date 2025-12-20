// RS-Expert site.js (FREE dynamic content mode via GitHub Raw)

const REPO_OWNER = 'drpoh';
const REPO_NAME = 'RS-Expert';
const REPO_BRANCH = 'main';
const REPO_RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}`;
const SITE_JSON_PATH = '/data/site.json';

async function loadSite() {
  const url = `${REPO_RAW_BASE}${SITE_JSON_PATH}?ts=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Cannot load site data from GitHub Raw: ' + res.status);

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
    nav.innerHTML = d.menu.map(m => `<a href="${safeUrl(m.href)}">${escapeHtml(m.label)}</a>`).join('');
  }

  // Contacts (update all matching links)
  document.querySelectorAll('[data-phone-link]').forEach(a => {
    if (!phone) return;
    a.href = 'tel:' + phone.replace(/\s+/g, '');
    if (looksLikePlaceholder(a.textContent)) a.textContent = phone;
  });

  document.querySelectorAll('[data-email-link]').forEach(a => {
    if (!email) return;
    a.href = 'mailto:' + email;
    if (looksLikePlaceholder(a.textContent)) a.textContent = email;
  });

  // Services
  const servicesAll = (Array.isArray(d.services) ? d.services : []).filter(x => x?.enabled !== false);

  const servicesEl = document.getElementById('services');
  if (servicesEl) {
    servicesEl.innerHTML = servicesAll.length
      ? servicesAll.map(i => `
          <div class="card pad">
            <h3>${escapeHtml(i.title || '')}</h3>
            <p>${escapeHtml(i.text || '')}</p>
          </div>
        `).join('')
      : `<div class="card pad"><p>Lisää palvelut admin-paneelissa: /admin</p></div>`;
  }

  // Services preview (home)
  const servicesPreview = document.getElementById('servicesPreview');
  if (servicesPreview) {
    const slice = servicesAll.slice(0, 6);
    servicesPreview.innerHTML = slice.length
      ? slice.map(i => `
          <div class="card pad">
            <h3>${escapeHtml(i.title || '')}</h3>
            <p>${escapeHtml(i.text || '')}</p>
          </div>
        `).join('')
      : `<div class="card pad"><p>Lisää palvelut admin-paneelissa: /admin</p></div>`;
  }

  // Services bullets (services.html)
  const bullets = document.getElementById('servicesBullets');
  if (bullets) {
    bullets.innerHTML = servicesAll.length
      ? servicesAll.map(s => `<li>${escapeHtml(s.title || '')}</li>`).join('')
      : `<li>Lisää palvelut admin-paneelissa: /admin</li>`;
  }

  // Documents
  const docsAll = (Array.isArray(d.documents) ? d.documents : []).filter(x => x?.enabled !== false);

  const docsEl = document.getElementById('documents');
  if (docsEl) {
    if (!docsAll.length) {
      docsEl.innerHTML = `<div class="card pad"><p>Lisää PDF:t admin-paneelissa: /admin</p></div>`;
    } else {
      const groups = groupBy(docsAll, it => it.category || 'Muut');
      const order = ['Sertifikaatit', 'Hinnasto', 'Ohjeet', 'Muut'];

      docsEl.innerHTML =
        order.filter(cat => groups[cat]).map(cat => renderDocGroup(cat, groups[cat])).join('') +
        Object.keys(groups).filter(cat => !order.includes(cat)).map(cat => renderDocGroup(cat, groups[cat])).join('');
    }
  }

  // Documents preview (home)
  const docsPreview = document.getElementById('documentsPreview');
  if (docsPreview) {
    const slice = docsAll.slice(0, 3);
    docsPreview.innerHTML = slice.length
      ? slice.map(i => `
          <div class="card pad">
            <h3>${escapeHtml(i.title || 'Dokumentti')}</h3>
            ${i.category ? `<p class="small">${escapeHtml(i.category)}</p>` : ``}
            <p><a class="btn" href="${safeUrl(i.url)}" target="_blank" rel="noopener">Avaa PDF</a></p>
          </div>
        `).join('')
      : `<div class="card pad"><p>Lisää PDF:t admin-paneelissa: /admin</p></div>`;
  }

  // Gallery
  const galleryAll = (Array.isArray(d.gallery) ? d.gallery : []).filter(x => x?.enabled !== false);

  const galleryEl = document.getElementById('gallery');
  if (galleryEl) {
    galleryEl.innerHTML = galleryAll.length
      ? galleryAll.map(i => `
          <div class="card pad" data-type="${escapeAttr(i.type || '')}" data-city="${escapeAttr(i.city || '')}">
            ${i.image ? `<img class="clickable" src="${safeUrl(i.image)}" alt="" data-lightbox>` : ''}
            <h3>${escapeHtml(i.title || '')}</h3>
            ${i.type ? `<p class="small">${escapeHtml(i.type)}</p>` : ''}
            ${i.city ? `<p class="small">${escapeHtml(i.city)}</p>` : ''}
            ${i.text ? `<p>${escapeHtml(i.text)}</p>` : ''}
          </div>
        `).join('')
      : `<div class="card pad"><p>Lisää kuvia admin-paneelissa: /admin</p></div>`;

    attachLightbox(galleryEl);
  }

  // Gallery preview (home)
  const galleryPreview = document.getElementById('galleryPreview');
  if (galleryPreview) {
    const slice = galleryAll.slice(0, 6);
    galleryPreview.innerHTML = slice.length
      ? slice.map(i => `
          <div class="card pad" data-type="${escapeAttr(i.type || '')}" data-city="${escapeAttr(i.city || '')}">
            ${i.image ? `<img class="clickable" src="${safeUrl(i.image)}" alt="" data-lightbox>` : ''}
            <h3>${escapeHtml(i.title || '')}</h3>
            ${i.city ? `<p class="small">${escapeHtml(i.city)}</p>` : ''}
          </div>
        `).join('')
      : `<div class="card pad"><p>Lisää kuvia admin-paneelissa: /admin</p></div>`;

    attachLightbox(galleryPreview);
  }

  // Gallery filters (if placeholder exists)
  makeGalleryFilters(galleryAll);

  // Performance tweaks
  enableLazyImages();

  // Mobile conversion
  ensureBottomBar(phone, email);
}

/* ===== Components ===== */

function renderDocGroup(title, items) {
  const safeTitle = escapeHtml(title);
  const cards = items.map(i => `
    <div class="card pad">
      <h3>${escapeHtml(i.title || 'Dokumentti')}</h3>
      <p><a class="btn" href="${safeUrl(i.url)}" target="_blank" rel="noopener">Avaa PDF</a></p>
    </div>
  `).join('');
  return `
    <section class="section" style="padding-top:10px">
      <h2 style="margin:0 0 10px">${safeTitle}</h2>
      <div class="grid">${cards}</div>
    </section>
  `;
}

function attachLightbox(container) {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbBg = document.getElementById('lightbox-bg');
  const lbClose = document.getElementById('lightbox-close');
  if (!lb || !lbImg || !lbBg || !lbClose) return;

  container.querySelectorAll('img[data-lightbox]').forEach(img => {
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

  if (!lb.dataset.bound) {
    lbBg.addEventListener('click', closeLB);
    lbClose.addEventListener('click', closeLB);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeLB();
    });
    lb.dataset.bound = '1';
  }
}

/* ===== Add-ons (free) ===== */

function ensureBottomBar(phone, email) {
  if (document.getElementById('bottomBar')) return;
  if (window.matchMedia && window.matchMedia('(min-width: 980px)').matches) return;

  const tel = (phone || '').replace(/\s+/g, '');
  const mail = email || '';

  const bar = document.createElement('div');
  bar.id = 'bottomBar';
  bar.innerHTML = `
    <div class="bb-wrap">
      <a class="bb-btn bb-primary" href="tel:${escapeAttr(tel)}">📞 Soita</a>
      <a class="bb-btn" href="/contact.html">💬 Lähetä</a>
      <a class="bb-btn" href="mailto:${escapeAttr(mail)}">✉️ Email</a>
    </div>
  `;
  document.body.appendChild(bar);

  let shown = false;
  const onScroll = () => {
    const y = window.scrollY || 0;
    if (y > 180 && !shown) { bar.classList.add('show'); shown = true; }
    if (y <= 180 && shown) { bar.classList.remove('show'); shown = false; }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function makeGalleryFilters(items) {
  const host = document.getElementById('galleryFilters');
  if (!host) return;

  const types = uniq(items.map(x => x.type).filter(Boolean));
  const cities = uniq(items.map(x => x.city).filter(Boolean));

  host.innerHTML = `
    <div class="gf">
      <select id="fType" aria-label="Työn tyyppi">
        <option value="">Kaikki tyypit</option>
        ${types.map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join('')}
      </select>
      <select id="fCity" aria-label="Kaupunki">
        <option value="">Kaikki kaupungit</option>
        ${cities.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('')}
      </select>
      <button class="gf-btn" id="fClear" type="button">Tyhjennä</button>
    </div>
  `;

  const fType = document.getElementById('fType');
  const fCity = document.getElementById('fCity');
  const fClear = document.getElementById('fClear');

  const apply = () => {
    const t = fType.value;
    const c = fCity.value;
    document.querySelectorAll('#gallery .card').forEach(card => {
      const ct = card.getAttribute('data-type') || '';
      const cc = card.getAttribute('data-city') || '';
      const ok = (!t || ct === t) && (!c || cc === c);
      card.style.display = ok ? '' : 'none';
    });
  };

  fType.addEventListener('change', apply);
  fCity.addEventListener('change', apply);
  fClear.addEventListener('click', () => {
    fType.value = '';
    fCity.value = '';
    apply();
  });
}

function enableLazyImages() {
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
  });
}

/* ===== Utils ===== */

function groupBy(arr, fn) {
  return arr.reduce((acc, x) => {
    const k = fn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}

function uniq(a) {
  return Array.from(new Set(a));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

function escapeAttr(s) {
  return String(s).replace(/["&<>]/g, m => ({
    '"': '&quot;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  }[m]));
}

function safeUrl(u) {
  const s = String(u || '').trim();
  if (!s) return '#';
  if (s.startsWith('/')) return s;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return '#';
}

function looksLikePlaceholder(t) {
  const s = String(t || '').trim();
  return s === '' || s.includes('…') || s.includes('+358') || s.includes('@');
}

loadSite().catch(err => {
  console.error(err);
  const el = document.getElementById('error');
  if (el) el.textContent = 'Ошибка: ' + err.message;
});
// ===== Premium scroll reveal =====
(function initReveal() {
  // Mark sections/cards to reveal
  const targets = [
    ...document.querySelectorAll('section'),
    ...document.querySelectorAll('.card')
  ];

  targets.forEach(el => el.classList.add('reveal'));

  // IntersectionObserver reveal
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(el => io.observe(el));
})();