<script>
async function loadSite() {
  const res = await fetch('/data/site.json', { cache: 'no-store' });
  const d = await res.json();

  // Header
  document.querySelectorAll('[data-company]').forEach(e => e.textContent = d.companyName);
  document.querySelectorAll('[data-tagline]').forEach(e => e.textContent = d.tagline);

  // Menu
  const nav = document.getElementById('menu');
  if (nav) nav.innerHTML = d.menu.map(m => `<a href="${m.href}">${m.label}</a>`).join('');

  // Services
  const s = document.getElementById('services');
  if (s) s.innerHTML = d.services.map(i =>
    `<div class="card"><h3>${i.title}</h3><p>${i.text}</p></div>`
  ).join('');

  // Documents
  const docs = document.getElementById('documents');
  if (docs) docs.innerHTML = d.documents.map(i =>
    `<div class="card"><h3>${i.title}</h3><a href="${i.url}" target="_blank">Avaa PDF</a></div>`
  ).join('');

  // Gallery
  const g = document.getElementById('gallery');
  if (g) g.innerHTML = d.gallery.map(i =>
    `<div class="card">
      <img src="${i.image}" style="width:100%;border-radius:12px">
      <h3>${i.title}</h3>
      <p>${i.city || ''}</p>
      <p>${i.text || ''}</p>
    </div>`
  ).join('');
}
loadSite();
</script>
