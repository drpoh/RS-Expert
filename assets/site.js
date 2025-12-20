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

  const basic = d.basic || {};
  const companyName = basic.companyName || d.companyName || 'RS-Expert Oy';
  const tagline = basic.tagline || d.tagline || '';
  const phone = basic.phone || d.phone || '';
  const email = basic.email || d.email || '';

  document.querySelectorAll('[data-company]').forEach(e => (e.textContent = companyName));
  document.querySelectorAll('[data-tagline]').forEach(e => (e.textContent = tagline));

  // Menu
  const nav = document.getElementById('menu');
  if (nav && Array.isArray(d.menu)) {
    nav.innerHTML = d.menu.map(m => `<a href="${safeUrl(m.href)}">${escapeHtml(m.label)}</a>`).join('');
  }

  // Contacts
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

  const servicesAll = (Array.isArray(d.services) ? d.services : []).filter(x => x?.enabled !== false);
  const docsAll = (Array.isArray(d.documents) ? d.documents : []).filter(x => x?.enabled !== false);
  const galleryAll = (Array.isArray(d.gallery) ? d.gallery : []).filter(x => x?.enabled !== false);

  // ===== Services page list
  const servicesEl = document.getElementById('services');
  if (servicesEl) servicesEl.innerHTML = renderServicesGrid(servicesAll);

  // ===== Home services preview
  const servicesPreview = document.getElementById('servicesPreview');
  if (servicesPreview) servicesPreview.innerHTML = renderServicesGrid(servicesAll.slice(0, 6));

  // Services bullets
  const bullets = document.getElementById('servicesBullets');
  if (bullets) bullets.innerHTML = servicesAll.length
    ? servicesAll.map(s => `<li>${escapeHtml(s.title || '')}</li>`).join('')
    : `<li>Lisää palvelut admin-paneelissa: /admin</li>`;

  // Documents page
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

  // Home docs preview
  const docsPreview = document.getElementById('documentsPreview');
  if (docsPreview) docsPreview.innerHTML = renderDocsPreview(docsAll.slice(0, 3));

  // Gallery page
  const galleryEl = document.getElementById('gallery');
  if (galleryEl) {
    galleryEl.innerHTML = renderGalleryGrid(galleryAll);
    attachLightbox(galleryEl);
  }

  // Home gallery preview
  const galleryPreview = document.getElementById('galleryPreview');
  if (galleryPreview) {
    galleryPreview.innerHTML = renderGalleryGrid(galleryAll.slice(0, 6), true);
    attachLightbox(galleryPreview);
  }

  // Gallery filters placeholder
  makeGalleryFilters(galleryAll);

  // Reviews/Trust on home
  const reviewsEl = document.getElementById('reviews');
  if (reviewsEl) {
    const reviewsAll = (Array.isArray(d.reviews) ? d.reviews : defaultReviews()).filter(x => x?.enabled !== false);
    reviewsEl.innerHTML = renderReviews(reviewsAll);
  }

  // FAQ on home
  const faqEl = document.getElementById('faq');
  if (faqEl) {
    const faqAll = (Array.isArray(d.faq) ? d.faq : defaultFaq()).filter(x => x?.enabled !== false);
    faqEl.innerHTML = renderFaq(faqAll);
    bindFaq();
  }

  enableLazyImages();
  ensureBottomBar(phone, email);
}

/* ===== Renderers ===== */

function renderServicesGrid(items) {
  if (!items.length) {
    return `<div class="card pad"><p>Lisää palvelut admin-paneelissa: /admin</p></div>`;
  }
  return items.map(i => {
    const icon = i.icon || pickIcon(i.title);
    const tag = i.tag || '';
    return `
      <a class="serviceCard" href="/services.html" style="text-decoration:none">
        <div class="inner">
          <div class="serviceIcon">${escapeHtml(icon)}</div>
          <h3>${escapeHtml(i.title || '')}</h3>
          <p class="small">${escapeHtml(shortText(i.text || '', 90))}</p>
          <div class="meta">
            ${tag ? `<span class="pill">✨ ${escapeHtml(tag)}</span>` : ``}
            <span class="pill">Uusimaa</span>
            <span class="pill">Ota yhteyttä →</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function renderGalleryGrid(items, compact=false) {
  if (!items.length) {
    return `<div class="card pad"><p>Lisää kuvia admin-paneelissa: /admin</p></div>`;
  }
  return items.map(i => `
    <div class="card pad galleryCard" data-type="${escapeAttr(i.type || '')}" data-city="${escapeAttr(i.city || '')}">
      ${i.image ? `<img class="clickable" src="${safeUrl(i.image)}" alt="" data-lightbox>` : ''}
      <h3>${escapeHtml(i.title || '')}</h3>
      <p class="small" style="margin:6px 0 0">
        ${[i.type, i.city].filter(Boolean).map(escapeHtml).join(' • ')}
      </p>
      ${(!compact && i.text) ? `<p>${escapeHtml(shortText(i.text, 110))}</p>` : ``}
    </div>
  `).join('');
}

function renderDocsPreview(items) {
  if (!items.length) return `<div class="card pad"><p>Lisää PDF:t admin-paneelissa: /admin</p></div>`;
  return items.map(i => `
    <div class="card pad">
      <h3>${escapeHtml(i.title || 'Dokumentti')}</h3>
      ${i.category ? `<p class="small">${escapeHtml(i.category)}</p>` : ``}
      <p style="margin-top:10px">
        <a class="btn" href="${safeUrl(i.url)}" target="_blank" rel="noopener">Avaa PDF</a>
      </p>
    </div>
  `).join('');
}

function renderReviews(items) {
  return `<div class="grid two">` + items.map(r => `
    <div class="reviewCard">
      <div class="reviewTop">
        <div>
          <b>${escapeHtml(r.title || 'Palaute')}</b>
          <div class="small">${escapeHtml([r.city, r.service].filter(Boolean).join(' • '))}</div>
        </div>
        <div class="stars">${'★★★★★'.slice(0, clampStars(r.stars))}</div>
      </div>
      <div class="quote">“${escapeHtml(r.text || '')}”</div>
    </div>
  `).join('') + `</div>`;
}

function renderFaq(items) {
  return items.map((f, idx) => `
    <div class="faqItem" data-faq>
      <button class="faqQ" type="button">
        <span>${escapeHtml(f.q || '')}</span>
        <span class="faqChevron">⌄</span>
      </button>
      <div class="faqA">${escapeHtml(f.a || '')}</div>
    </div>
  `).join('');
}

function renderDocGroup(title, items) {
  const safeTitle = escapeHtml(title);
  const cards = items.map(i => `
    <div class="card pad">
      <h3>${escapeHtml(i.title || 'Dokumentti')}</h3>
      <p style="margin-top:10px">
        <a class="btn" href="${safeUrl(i.url)}" target="_blank" rel="noopener">Avaa PDF</a>
      </p>
    </div>
  `).join('');
  return `
    <section class="section" style="padding-top:10px">
      <h2 style="margin:0 0 10px">${safeTitle}</h2>
      <div class="grid">${cards}</div>
    </section>
  `;
}

/* ===== FAQ binding ===== */
function bindFaq() {
  document.querySelectorAll('[data-faq]').forEach(box => {
    const btn = box.querySelector('.faqQ');
    btn?.addEventListener('click', () => box.classList.toggle('open'));
  });
}

/* ===== Lightbox ===== */
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
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLB(); });
    lb.dataset.bound = '1';
  }
}

/* ===== Filters / perf / bottom bar ===== */
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
      card.style.display = ((!t || ct === t) && (!c || cc === c)) ? '' : 'none';
    });
  };

  fType.addEventListener('change', apply);
  fCity.addEventListener('change', apply);
  fClear.addEventListener('click', () => { fType.value=''; fCity.value=''; apply(); });
}

function enableLazyImages() {
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
  });
}

/* ===== Defaults ===== */
function defaultReviews() {
  return [
    { title: 'Nopea ja siisti työ', city: 'Järvenpää', service: 'Sähkökeskus', stars: 5, text: 'Kommunikointi oli selkeää ja työ tehtiin sovitusti.', enabled: true },
    { title: 'Vika löytyi nopeasti', city: 'Helsinki', service: 'Vianhaku', stars: 5, text: 'Sulake laukesi jatkuvasti — korjaus onnistui saman käynnin aikana.', enabled: true }
  ];
}
function defaultFaq() {
  return [
    { q: 'Teettekö pieniä töitä?', a: 'Kyllä. Myös pienet asennukset ja korjaukset onnistuvat.', enabled: true },
    { q: 'Kuinka nopeasti pääsette paikalle?', a: 'Usein järjestyy aika nopeasti — soita ja sovitaan.', enabled: true },
    { q: 'Voinko lähettää kuvan?', a: 'Kyllä. Kuva auttaa arvioinnissa ja nopeuttaa toteutusta.', enabled: true },
    { q: 'Palveletteko taloyhtiöitä ja yrityksiä?', a: 'Kyllä. Sovitaan toteutus ja dokumentointi tarpeen mukaan.', enabled: true }
  ];
}

/* ===== Utils ===== */
function groupBy(arr, fn) {
  return arr.reduce((acc, x) => { const k = fn(x); (acc[k] ||= []).push(x); return acc; }, {});
}
function uniq(a){ return Array.from(new Set(a)); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function escapeAttr(s){ return String(s).replace(/["&<>]/g, m => ({'"':'&quot;','&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
function safeUrl(u){ const s=String(u||'').trim(); if(!s) return '#'; if(s.startsWith('/')) return s; if(s.startsWith('http://')||s.startsWith('https://')) return s; return '#'; }
function looksLikePlaceholder(t){ const s=String(t||'').trim(); return s===''||s.includes('…')||s.includes('+358')||s.includes('@'); }
function shortText(s,n){ const t=String(s||''); return t.length>n ? t.slice(0,n-1).trim()+'…' : t; }
function pickIcon(title){
  const t = String(title||'').toLowerCase();
  if (t.includes('vianh')) return '🧯';
  if (t.includes('keskus')) return '🧰';
  if (t.includes('äly') || t.includes('autom')) return '🤖';
  if (t.includes('sauna') || t.includes('ulk')) return '💡';
  return '🔌';
}
function clampStars(n){ const x = Number(n||5); return Math.max(1, Math.min(5, Math.round(x))); }

loadSite().catch(err => {
  console.error(err);
  const el = document.getElementById('error');
  if (el) el.textContent = 'Ошибка: ' + err.message;
});