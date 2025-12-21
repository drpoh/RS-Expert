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
    el.setAttribute("content", String(value ?? ""));
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

    // remove empty
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

  // ---------- UI render ----------
  function renderHeader(data) {
    const header = $("#site-header");
    if (!header) return;

    const menuHtml = (data.menu || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((m) => {
        const href = escapeHtml(m.href || "#");
        const label = escapeHtml(m.label || "");
        return `<a class="nav__link" href="${href}">${label}</a>`;
      })
      .join("");

    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const topLeftText = [
      "Nopea apu",
      data.region || "",
      data.phone || ""
    ].filter(Boolean).join(" • ");

    header.innerHTML = `
      <div class="topbar">
        <div class="topbar__left">${escapeHtml(topLeftText)}</div>
        <div class="topbar__right">
          <a class="topbar__btn" href="tel:${escapeHtml(phoneRaw)}">Soita</a>
          <a class="topbar__btn" href="mailto:${escapeHtml(data.email || "")}">Email</a>
        </div>
      </div>
      <div class="nav">
        <div class="nav__brand">
          <a href="/index.html" class="brand__link">${escapeHtml(data.companyName || "RS-Expert Oy")}</a>
        </div>
        <nav class="nav__links">${menuHtml}</nav>
        <div class="nav__cta">
          <a class="btn btn--primary" href="/tarjouspyynto.html">Pyydä tarjous</a>
        </div>
      </div>
    `;
  }

  function renderFooter(data) {
    const footer = $("#site-footer");
    if (!footer) return;

    const phoneRaw = (data.phone || "").replaceAll(" ", "");

    footer.innerHTML = `
      <div class="footer__inner">
        <div class="footer__brand">${escapeHtml(data.companyName || "RS-Expert Oy")}</div>
        <div class="footer__meta">
          <a href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(data.phone || "")}</a>
          <span class="dot">•</span>
          <a href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(data.email || "")}</a>
        </div>
        <div class="footer__copy">© ${escapeHtml(data.companyName || "RS-Expert Oy")}</div>
      </div>
    `;
  }

  function renderHome(data) {
    const el = $("#page-home");
    if (!el) return;

    const hero = data.hero || {};
    const phoneRaw = (data.phone || "").replaceAll(" ", "");

    const badgesHtml = (hero.badges || [])
      .map((b) => `<span class="badge">${escapeHtml(b)}</span>`)
      .join("");

    const highlightsHtml = (data.highlights || [])
      .filter((x) => x && x.enabled !== false)
      .map((h) => {
        return `
          <div class="card">
            <div class="card__icon">${escapeHtml(h.icon || "")}</div>
            <div class="card__title">${escapeHtml(h.title || "")}</div>
            <div class="card__text">${escapeHtml(h.text || "")}</div>
          </div>
        `;
      })
      .join("");

    const servicesHtml = (data.services || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 6)
      .map((s) => {
        return `
          <div class="service">
            <div class="service__top">
              <div class="service__icon">${escapeHtml(s.icon || "")}</div>
              <div class="service__tag">${escapeHtml(s.tag || "")}</div>
            </div>
            <div class="service__title">${escapeHtml(s.title || "")}</div>
            <div class="service__text">${escapeHtml(s.text || "")}</div>
          </div>
        `;
      })
      .join("");

    const galleryHtml = (data.gallery || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 3)
      .map((g) => {
        const meta = [g.city, g.type].filter(Boolean).join(" • ");
        return `
          <a class="work" href="/gallery.html" aria-label="${escapeHtml(g.title || "Galleria")}">
            <img class="work__img" src="${escapeHtml(g.image || "")}" alt="${escapeHtml(g.title || "")}">
            <div class="work__meta">
              <div class="work__title">${escapeHtml(g.title || "")}</div>
              <div class="work__sub">${escapeHtml(meta)}</div>
            </div>
          </a>
        `;
      })
      .join("");

    const reviewsHtml = (data.reviews || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((r) => {
        const starsCount = Number(r.stars || 0);
        const stars = "★".repeat(starsCount).padEnd(5, "☆");
        const meta = [r.city, r.service].filter(Boolean).join(" • ");
        return `
          <div class="review">
            <div class="review__top">
              <div class="review__title">${escapeHtml(r.title || "")}</div>
              <div class="review__stars" aria-label="${escapeHtml(String(starsCount))} stars">${stars}</div>
            </div>
            <div class="review__meta">${escapeHtml(meta)}</div>
            <div class="review__text">${escapeHtml(r.text || "")}</div>
          </div>
        `;
      })
      .join("");

    const faqHtml = (data.faq || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((f) => {
        return `
          <details class="faq">
            <summary class="faq__q">${escapeHtml(f.q || "")}</summary>
            <div class="faq__a">${escapeHtml(f.a || "")}</div>
          </details>
        `;
      })
      .join("");

    el.innerHTML = `
      <section class="hero">
        <h1 class="hero__title">${escapeHtml(hero.title || "")}</h1>
        <p class="hero__subtitle">${escapeHtml(hero.subtitle || "")}</p>
        <div class="hero__badges">${badgesHtml}</div>
        <div class="hero__cta">
          <a class="btn btn--primary" href="/tarjouspyynto.html">Pyydä tarjous</a>
          <a class="btn btn--ghost" href="tel:${escapeHtml(phoneRaw)}">Soita</a>
        </div>
      </section>

      <section class="section">
        <h2>Palvelut</h2>
        <div class="grid grid--services">${servicesHtml}</div>
        <div class="section__more">
          <a class="link" href="/services.html">Näytä kaikki →</a>
        </div>
      </section>

      <section class="section">
        <h2>Työnäytteet</h2>
        <div class="grid grid--works">${galleryHtml}</div>
        <div class="section__more">
          <a class="link" href="/gallery.html">Katso galleria →</a>
        </div>
      </section>

      <section class="section">
        <h2>Asiakaspalaute</h2>
        <div class="grid grid--reviews">${reviewsHtml}</div>
      </section>

      <section class="section">
        <h2>Usein kysyttyä</h2>
        <div class="stack">${faqHtml}</div>
      </section>

      <section class="section section--cta">
        <h2>Tarvitsetko sähkömiestä?</h2>
        <p>Lähetä pyyntö — palaamme nopeasti.</p>
        <div class="cta__buttons">
          <a class="btn btn--primary" href="/tarjouspyynto.html">Pyydä tarjous</a>
          <a class="btn btn--ghost" href="tel:${escapeHtml(phoneRaw)}">Soita</a>
        </div>
      </section>

      <section class="section">
        <h2>Miksi valita meidät</h2>
        <div class="grid grid--highlights">${highlightsHtml}</div>
      </section>
    `;
  }

  function renderServicesPage(data) {
    const el = $("#page-services");
    if (!el) return;

    const servicesHtml = (data.services || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((s) => {
        return `
          <div class="service service--big">
            <div class="service__top">
              <div class="service__icon">${escapeHtml(s.icon || "")}</div>
              <div class="service__tag">${escapeHtml(s.tag || "")}</div>
            </div>
            <div class="service__title">${escapeHtml(s.title || "")}</div>
            <div class="service__text">${escapeHtml(s.text || "")}</div>
          </div>
        `;
      })
      .join("");

    el.innerHTML = `
      <section class="section">
        <h1>Palvelut</h1>
        <p class="lead">${escapeHtml(data.tagline || "")}</p>
        <div class="grid grid--services">${servicesHtml}</div>
      </section>
    `;
  }

  function renderGalleryPage(data) {
    const el = $("#page-gallery");
    if (!el) return;

    const itemsHtml = (data.gallery || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((g) => {
        const meta = [g.city, g.type].filter(Boolean).join(" • ");
        return `
          <article class="workcard">
            <img class="workcard__img" src="${escapeHtml(g.image || "")}" alt="${escapeHtml(g.title || "")}">
            <div class="workcard__body">
              <div class="workcard__title">${escapeHtml(g.title || "")}</div>
              <div class="workcard__meta">${escapeHtml(meta)}</div>
              <div class="workcard__text">${escapeHtml(g.text || "")}</div>
            </div>
          </article>
        `;
      })
      .join("");

    el.innerHTML = `
      <section class="section">
        <h1>Galleria</h1>
        <p class="lead">Työnäytteitä ja toteutuksia.</p>
        <div class="grid grid--gallery">${itemsHtml}</div>
      </section>
    `;
  }

  function renderDocumentsPage(data) {
    const el = $("#page-documents");
    if (!el) return;

    const docsHtml = (data.documents || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((d) => {
        const url = escapeHtml(d.url || "#");
        return `
          <a class="doc" href="${url}" target="_blank" rel="noopener">
            <div class="doc__title">${escapeHtml(d.title || "")}</div>
            <div class="doc__meta">${escapeHtml(d.category || "PDF")}</div>
          </a>
        `;
      })
      .join("");

    el.innerHTML = `
      <section class="section">
        <h1>Dokumentit</h1>
        <p class="lead">PDF-dokumentit ja ohjeet.</p>
        <div class="grid grid--docs">${docsHtml}</div>
      </section>
    `;
  }

  function renderTarjousPage(data) {
    const el = $("#page-tarjous");
    if (!el) return;

    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const formId = data.tallyFormId || "";
    const iframeSrc = formId ? `https://tally.so/r/${encodeURIComponent(formId)}` : "";

    el.innerHTML = `
      <section class="section">
        <h1>Tarjouspyyntö</h1>
        <p class="lead">Kerro kohde ja toiveet — palaamme nopeasti.</p>

        <div class="card card--pad">
          <div class="stack">
            <div><strong>Puhelin:</strong> <a href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(data.phone || "")}</a></div>
            <div><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(data.email || "")}</a></div>
          </div>
        </div>

        ${
          iframeSrc
            ? `<div class="tally">
                 <iframe
                   title="Tarjouspyyntö"
                   src="${iframeSrc}"
                   loading="lazy"
                   style="width:100%;height:900px;border:0;border-radius:16px;"
                 ></iframe>
               </div>`
            : `<div class="card card--pad">Lisää tallyFormId data/site.json tiedostoon.</div>`
        }
      </section>
    `;
  }

  function renderContactPage(data) {
    const el = $("#page-contact");
    if (!el) return;

    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const regionCity = [data.region, data.city].filter(Boolean).join(" • ");

    el.innerHTML = `
      <section class="section">
        <h1>Yhteystiedot</h1>
        <div class="card card--pad">
          <div class="stack">
            <div><strong>${escapeHtml(data.companyName || "")}</strong></div>
            <div>${escapeHtml(regionCity)}</div>
            <div><a href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(data.phone || "")}</a></div>
            <div><a href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(data.email || "")}</a></div>
            <div class="mt">
              <a class="btn btn--primary" href="/tarjouspyynto.html">Pyydä tarjous</a>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ---------- boot ----------
  let data;
  try {
    const res = await fetch("/data/site.json", { cache: "no-cache" });
    data = await res.json();
  } catch (e) {
    console.error("Failed to load /data/site.json", e);
    return;
  }

  applySeo(data);
  applyLocalBusinessSchema(data);

  renderHeader(data);
  renderFooter(data);

  renderHome(data);
  renderServicesPage(data);
  renderGalleryPage(data);
  renderDocumentsPage(data);
  renderTarjousPage(data);
  renderContactPage(data);
})();
