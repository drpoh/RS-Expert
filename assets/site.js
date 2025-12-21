(() => {
  const DATA_URL = "/data/site.json";
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const asBool = (v, d = true) => (typeof v === "boolean" ? v : d);
  const asNum = (v, d = 9999) => (Number.isFinite(Number(v)) ? Number(v) : d);

  const sortEnabled = (arr) =>
    (arr || [])
      .filter((x) => asBool(x.enabled, true))
      .sort((a, b) => asNum(a.order) - asNum(b.order));

  function setText(sel, text) {
    qsa(sel).forEach((el) => (el.textContent = text ?? ""));
  }
  function setAttr(sel, attr, value) {
    qsa(sel).forEach((el) => el.setAttribute(attr, value));
  }

  function initTally(formId) {
    // кнопки с data-tally-open в HTML уже есть, но мы продублируем ID на всякий случай
    qsa("[data-tally-open]").forEach((btn) => {
      if (!btn.getAttribute("data-tally-open")) btn.setAttribute("data-tally-open", formId);
    });
  }

  function renderMenu(menu) {
    const nav = qs("#menu");
    if (!nav) return;
    const items = sortEnabled(menu);
    nav.innerHTML = items
      .map((m) => `<a href="${esc(m.href)}">${esc(m.label)}</a>`)
      .join("");
  }

  function card({ title, text, icon, tag, href, image }) {
    const img = image
      ? `<div class="thumb"><img src="${esc(image)}" alt="${esc(title)}" loading="lazy"></div>`
      : "";
    const content = `
      ${img}
      <div class="meta">
        <div class="h">
          ${icon ? `<span class="icon">${esc(icon)}</span>` : ""}
          <b>${esc(title)}</b>
        </div>
        ${tag ? `<div class="chip">${esc(tag)}</div>` : ""}
        ${text ? `<p class="small">${esc(text)}</p>` : ""}
      </div>
    `;
    if (href) return `<a class="card pad hover" href="${esc(href)}">${content}</a>`;
    return `<div class="card pad">${content}</div>`;
  }

  function renderHero(hero) {
    const el = qs("#hero");
    if (!el || !hero) return;

    const badges = (hero.badges || [])
      .slice(0, 6)
      .map((b) => `<span class="pill">${esc(b)}</span>`)
      .join("");

    el.innerHTML = `
      <div class="card pad glow">
        <div class="pills">${badges}</div>
        <h1>${esc(hero.title || "")}</h1>
        <p class="lead">${esc(hero.subtitle || "")}</p>
        <div class="cta">
          <button class="btn primary"
            data-tally-open=""
            data-tally-width="420"
            data-tally-overlay="1"
            data-tally-emoji-text="👋"
            data-tally-emoji-animation="wave"
          >💬 Pyydä tarjous</button>
          <a class="btn" data-phone-link href="tel:">📞 Soita</a>
          <a class="btn" href="/services.html">🔌 Palvelut</a>
        </div>
      </div>
    `;
  }

  function renderHighlights(items) {
    const el = qs("#highlights");
    if (!el) return;
    const arr = sortEnabled(items).slice(0, 6);
    el.innerHTML = arr
      .map((x) =>
        `<div class="card pad">
          <b>${esc(x.icon || "✅")} ${esc(x.title || "")}</b>
          <p class="small">${esc(x.text || "")}</p>
        </div>`
      )
      .join("");
  }

  function renderServices(data) {
    const preview = qs("#servicesPreview");
    const full = qs("#servicesList");
    const items = sortEnabled(data);

    if (preview) {
      preview.innerHTML = items.slice(0, 6).map((s) =>
        card({ title: s.title, text: s.text, icon: s.icon, tag: s.tag, href: "/services.html" })
      ).join("");
    }
    if (full) {
      full.innerHTML = items.map((s) =>
        card({ title: s.title, text: s.text, icon: s.icon, tag: s.tag })
      ).join("");
    }
  }

  function renderGallery(data) {
    const preview = qs("#galleryPreview");
    const full = qs("#galleryList");
    const items = sortEnabled(data);

    const mapItem = (g, href) =>
      card({
        title: g.title,
        text: g.text || "",
        icon: g.type ? "🖼️" : "",
        tag: [g.type, g.city].filter(Boolean).join(" • "),
        href,
        image: g.image
      });

    if (preview) {
      preview.innerHTML = items.slice(0, 6).map((g) => mapItem(g, "/gallery.html")).join("");
    }
    if (full) {
      full.innerHTML = items.map((g) => mapItem(g, "")).join("");
    }
  }

  function renderDocuments(data) {
    const el = qs("#documentsList");
    if (!el) return;
    const items = sortEnabled(data);

    el.innerHTML = items.map((d) => {
      const chip = d.category ? `<span class="chip">${esc(d.category)}</span>` : "";
      return `
        <a class="card pad hover doc" href="${esc(d.url || "#")}" target="_blank" rel="noopener">
          <div class="h"><b>📄 ${esc(d.title || "PDF")}</b>${chip}</div>
          <div class="small">Avaa dokumentti</div>
        </a>
      `;
    }).join("");

    if (!items.length) {
      el.innerHTML = `<div class="card pad soft"><b>Ei dokumentteja vielä</b><div class="small">Lisää PDF tiedostot /assets/uploads/ ja päivitä data/site.json.</div></div>`;
    }
  }

  function renderReviews(data) {
    const el = qs("#reviewsList");
    if (!el) return;
    const items = sortEnabled(data);

    const stars = (n) => {
      const k = Math.max(1, Math.min(5, Number(n) || 5));
      return "★".repeat(k) + "☆".repeat(5 - k);
    };

    el.innerHTML = items.map((r) => {
      const meta = [r.city, r.service].filter(Boolean).map(esc).join(" • ");
      return `
        <div class="card pad">
          <div class="small stars">${esc(stars(r.stars))}</div>
          <b>${esc(r.title || "Palaute")}</b>
          ${meta ? `<div class="small">${meta}</div>` : ""}
          ${r.text ? `<p class="small">${esc(r.text)}</p>` : ""}
        </div>
      `;
    }).join("");

    if (!items.length) {
      el.innerHTML = `<div class="card pad soft"><b>Ei arvioita vielä</b><div class="small">Lisää palautteet data/site.json.</div></div>`;
    }
  }

  function renderFAQ(data) {
    const el = qs("#faqList");
    if (!el) return;
    const items = sortEnabled(data);

    el.innerHTML = items.map((f) => `
      <details class="card pad">
        <summary><b>${esc(f.q || "")}</b></summary>
        <div class="small" style="margin-top:10px">${esc(f.a || "")}</div>
      </details>
    `).join("");

    if (!items.length) {
      el.innerHTML = `<div class="card pad soft"><b>FAQ puuttuu</b><div class="small">Lisää kysymykset data/site.json.</div></div>`;
    }
  }

  async function main() {
    const err = qs("#error");
    const setErr = (m) => {
      if (err) err.textContent = m;
      console.warn(m);
    };

    try {
      const res = await fetch(`${DATA_URL}?v=${Date.now()}`);
      if (!res.ok) throw new Error(`site.json load failed: ${res.status}`);
      const site = await res.json();

      // global
      setText("[data-company]", site.companyName || "RS-Expert Oy");
      setText("[data-tagline]", site.tagline || "");
      setAttr("[data-phone-link]", "href", `tel:${String(site.phone || "").replace(/\s+/g, "")}`);
      setText("[data-phone-link]", site.phone || "");
      setAttr("[data-email-link]", "href", `mailto:${site.email || ""}`);
      setText("[data-email-link]", site.email || "");

      initTally(site.tallyFormId || "");
      renderMenu(site.menu);

      // pages
      renderHero(site.hero);
      renderHighlights(site.highlights);
      renderServices(site.services);
      renderGallery(site.gallery);
      renderDocuments(site.documents);
      renderReviews(site.reviews);
      renderFAQ(site.faq);

    } catch (e) {
      setErr(`Error: ${e?.message || e}`);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
