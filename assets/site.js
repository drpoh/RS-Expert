(async function () {
  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function absoluteUrl(baseUrl, path) {
    const base = (baseUrl || window.location.origin).replace(/\/$/, "");
    if (!path) return base;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return base + (path.startsWith("/") ? path : "/" + path);
  }

  function setMeta(nameOrProp, value, isProperty = false) {
    const selector = isProperty
      ? `meta[property="${nameOrProp}"]`
      : `meta[name="${nameOrProp}"]`;

    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      if (isProperty) el.setAttribute("property", nameOrProp);
      else el.setAttribute("name", nameOrProp);
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  }

  function setCanonical(url) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
  }

  function applySeo(data) {
    const baseUrl = data?.site?.baseUrl || window.location.origin;

    const path = window.location.pathname.endsWith("/")
      ? "/index.html"
      : window.location.pathname;

    const pageSeo = data?.seo?.pages?.[path] || {};
    const title = pageSeo.title || data?.companyName || "RS-Expert Oy";
    const description =
      pageSeo.description ||
      data?.site?.defaultDescription ||
      data?.tagline ||
      "";

    const pageUrl = absoluteUrl(baseUrl, path === "/index.html" ? "/" : path);
    const ogImage = absoluteUrl(
      baseUrl,
      pageSeo.ogImage || data?.site?.defaultOgImage || ""
    );

    document.documentElement.lang = data?.site?.language || "fi";
    document.title = title;

    setMeta("description", description);
    setMeta("robots", "index,follow");

    setCanonical(pageUrl);

    // OG
    setMeta("og:type", "website", true);
    setMeta("og:site_name", data?.companyName || "RS-Expert Oy", true);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", pageUrl, true);
    if (ogImage) setMeta("og:image", ogImage, true);

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (ogImage) setMeta("twitter:image", ogImage);
  }

  function applyLocalBusinessSchema(data) {
    const baseUrl = data?.site?.baseUrl || window.location.origin;
    const b = data?.business || {};

    // Минимально полезный LocalBusiness без адреса (адрес можно добавить позже)
    const schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: b.legalName || data?.companyName || "RS-Expert Oy",
      url: b.url || baseUrl,
      telephone: b.telephone || data?.phone,
      email: b.email || data?.email,
      image: absoluteUrl(baseUrl, b.image || data?.site?.defaultOgImage || ""),
      areaServed: (b.areaServed || [])
        .filter(Boolean)
        .map((x) => ({ "@type": "City", name: x })),
      openingHours: b.openingHours || []
    };

    // чистим пустые поля
    Object.keys(schema).forEach((k) => {
      const v = schema[k];
      if (
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0)
      ) {
        delete schema[k];
      }
    });

    const el = document.getElementById("ld-json");
    if (el) el.textContent = JSON.stringify(schema, null, 2);
  }

  // ---------- UI render (минимально, чтобы сайт не ломался) ----------
  function renderHeader(data) {
    const header = $("#site-header");
    if (!header) return;

    const menu = (data.menu || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(
        (m) =>
          `<a class="nav__link" href="${escapeHtml(m.href)}">${escapeHtml(
            m.label
          )}</a>`
      )
      .join("");

    header.innerHTML = `
      <div class="topbar">
        <div class="topbar__left">${escapeHtml(
          `Nopea apu • ${data.region || ""} ${data.phone || ""}`.trim()
        )}</div>
        <div class="topbar__right">
          <a class="topbar__btn" href="tel:${escapeHtml(
            (data.phone || "").replaceAll(" ", "")
          )}">Soita</a>
          <a class="topbar__btn" href="mailto:${escapeHtml(
            data.email || ""
          )}">Email</a>
        </div>
      </div>
      <div class="nav">
        <div class="nav__brand">
          <a href="/index.html" class="brand__link">${escapeHtml(
            data.companyName || "RS-Expert Oy"
          )}</a>
        </div>
        <nav class="nav__links">${menu}</nav>
        <div class="nav__cta">
          <a class="btn btn--primary" href="/tarjouspyynto.html">Pyydä tarjous</a>
        </div>
      </div>
    `;
  }

  function renderFooter(data) {
    const footer = $("#site-footer");
    if (!footer) return;
    footer.innerHTML = `
      <div class="footer__inner">
        <div class="footer__brand">${escapeHtml(data.companyName || "")}</div>
        <div class="footer__meta">
          <a href="tel:${escapeHtml(
            (data.phone || "").replaceAll(" ", "")
          )}">${escapeHtml(data.phone || "")}</a>
          <span class="dot">•</span>
          <a href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(
            data.email || ""
          )}</a>
        </div>
        <div class="footer__copy">© ${escapeHtml(
          data.companyName || "RS-Expert Oy"
        )}</div>
      </div>
    `;
  }

  function renderHome(data) {
    const el = $("#page-home");
    if (!el) return;

    const hero = data.hero || {};
    const badges = (hero.badges || [])
      .map((b) => `<span class="badge">${escapeHtml(b)}</span>`)
      .join("");

    const highlights = (data.highlights || [])
      .filter((x) => x && x.enabled !== false)
      .map(
        (h) => `
        <div class="card">
          <div class="card__icon">${escapeHtml(h.icon || "")}</div>
          <div class="card__title">${escapeHtml(h.title || "")}</div>
          <div class="card__text">${escapeHtml(h.text || "")}</div>
        </div>
      `
      )
      .join("");

    const services = (data.services || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 6)
      .map(
        (s) => `
        <div class="service">
          <div class="service__top">
            <div class="service__icon">${escapeHtml(s.icon || "")}</div>
            <div class="service__tag">${escapeHtml(s.tag || "")}</div>
          </div>
          <div class="service__title">${escapeHtml(s.title || "")}</div>
          <div class="service__text">${escapeHtml(s.text || "")}</div>
        </div>
      `
      )
      .join("");

    const gallery = (data.gallery || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 3)
      .map(
        (g) => `
        <a class="work" href="/gallery.html" aria-label="${escapeHtml(
          g.title || "Galleria"
        )}">
          <img class="work__img" src="${escapeHtml(g.image || "")}" alt="${escapeHtml(
          g.title || ""
        )}">
          <div class="work__meta">
            <div class="work__title">${escapeHtml(g.title || "")}</div>
            <div class="work__sub">${escapeHtml(
              [g.city, g.type].filter(Boolean).join(" • ")
            )}</div>
          </div>
        </a>
      `
      )
      .join("");

    const reviews = (data.reviews || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((r) => {
        const stars = "★".repeat(Number(r.stars || 0)).padEnd(5, "☆");
        return `
          <div class="review">
            <div class="review__top">
              <div class="review__title">${escapeHtml(r.title || "")}</div>
              <div class="review__stars" aria-label="${escapeHtml(
                String(r.stars || 0)
              )} stars">${stars}</div>
            </div>
            <div class="review__meta">${escapeHtml(
              [r.city, r.service].filter(Boolean).join(" • ")
            )}</div>
            <div class="review__text">${escapeHtml(r.text || "")}</div>
          </div>
        `;
      })
      .join("");

    const faq = (data.faq || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(
        (f) => `
        <details class="faq">
          <summary class="faq__q">${escapeHtml(f.q || "")}</summary>
          <div class="faq__a">${escapeHtml(f.a || "")}</div>
        </details>
      `
      )
      .join("");

    el.innerHTML = `
      <section class="hero">
        <h1 class="hero__title">${escapeHtml(hero.title || "")}</h1>
        <p class="hero__subtitle">${escapeHtml(hero.subtitle || "")}</p>
        <div class="hero__badges">${badges}</div>
        <div class="hero__cta">
          <a class="btn btn--primary" href="/tarjouspyynto.html">Pyydä tarjous</a>
          <a class="btn btn--ghost" href="tel:${escapeHtml(
            (data.phone || "").replaceAll(" ", "")
          )}">Soita</a>
        </div>
      </section>

      <section class="section">
        <h2>Palvelut</h2>
        <div class="grid grid--services">${services}</div>
        <div class="section__more">
          <a class="link" href="/services.html">Näytä kaikki →</a>
        </div>
      </section>

      <section class="section">
        <h2>Työnäytteet</h2>
        <div class="grid grid--works">${gallery}</div>
        <div class="section__more">
          <a class="link" href="/gallery.html">Katso galleria →</a>
        </div>
      </section>

      <section class="section">
        <h2>Asiakaspalaute</h2>
        <div class="grid grid--reviews">${reviews}</div>
      </section>

      <section class="section">
        <h2>Usein kysyttyä</h2>
        <div class="stack">${faq}</div>
      </section>

      <section class="section section--cta">
        <h2>Tarvitsetko sähkömiestä?</h2>
        <p>Lähetä pyyntö — palaamme nopeasti.</p>
        <div class="cta__buttons">
          <a class="btn btn--primary" href="/tarjouspyynto.html">Pyydä tarjous</a>
          <a class="btn btn--ghost" href="tel:${escapeHtml(
            (data.phone || "").r
