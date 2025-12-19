// ===== UX Add-ons (2025): bottom CTA bar + gallery filters + lazyload =====

function ensureBottomBar(phone, email) {
  if (document.getElementById('bottomBar')) return;

  const bar = document.createElement('div');
  bar.id = 'bottomBar';
  bar.innerHTML = `
    <div class="bb-wrap">
      <a class="bb-btn bb-primary" href="tel:${(phone||'').replace(/\s+/g,'')}">📞 Soita</a>
      <a class="bb-btn" href="/index.html#contact">💬 Viesti</a>
      <a class="bb-btn" href="mailto:${email||''}">✉️ Email</a>
    </div>
  `;
  document.body.appendChild(bar);

  // show on scroll (less intrusive)
  let shown = false;
  const onScroll = () => {
    const y = window.scrollY || 0;
    if (y > 220 && !shown) { bar.classList.add('show'); shown = true; }
    if (y <= 220 && shown) { bar.classList.remove('show'); shown = false; }
  };
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();
}

function makeGalleryFilters(items) {
  const host = document.getElementById('galleryFilters');
  if (!host) return;

  const types = uniq(items.map(x => x.type).filter(Boolean));
  const cities = uniq(items.map(x => x.city).filter(Boolean));

  host.innerHTML = `
    <div class="gf">
      <select id="fType">
        <option value="">Kaikki tyypit</option>
        ${types.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}
      </select>
      <select id="fCity">
        <option value="">Kaikki kaupungit</option>
        ${cities.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}
      </select>
      <button class="gf-btn" id="fClear">Tyhjennä</button>
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
  fClear.addEventListener('click', () => { fType.value=''; fCity.value=''; apply(); });
}

function uniq(a){ return Array.from(new Set(a)); }
function esc(s){ return String(s).replace(/"/g,'&quot;'); }

// Patch: add loading="lazy" to gallery images (if present)
function enableLazyImages() {
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding','async');
  });
}
