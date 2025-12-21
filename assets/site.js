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

  function setHreflangAlternates(urlFi, urlRu) {
    // remove old alternates
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());

    function add(hreflang, href) {
      const l = document.createElement("link");
      l.rel = "alternate";
      l.hreflang = hreflang;
      l.href = href;
      document.head.appendChild(l);
    }

    add("fi", urlFi);
    add("ru", urlRu);
    // x-default -> финский
    add("x-default", urlFi);
  }

  // ---------- i18n ----------
  function t(value, lang) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      return value[lang] || value.fi || Object.values(value)[0] || "";
    }
    return "";
  }

  function getLangFromBrowser(available, def) {
    const nav = (navigator.language || navigator.userLanguage || "").toLowerCase();
    if (nav.startsWith("ru") && available.includes("ru")) return "ru";
    if (nav.startsWith("fi") && available.includes("fi")) return "fi";
    return def;
  }

  function getLang(data) {
    const available = data?.i18n?.available || ["fi"];
    const def = data?.i18n?.default || "fi";

    const urlLang = new URLSearchParams(window.location.search).get("lang");
    if (available.includes(urlLang)) return urlLang;

    const saved = localStorage.getItem("lang");
    if (available.includes(saved)) return saved;

    if (data?.i18n?.preferBrowserLanguage) {
      return getLangFromBrowser(available, def);
    }

    return def;
  }

  function setLangInUrl(lang) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    return url.toString();
  }

  const UI = {
    fi: {
      call: "Soita",
      email: "Email",
      requestQuote: "Pyydä tarjous",
      services: "Palvelut",
      works: "Työnäytteet",
      gallery: "Galleria",
      showAll: "Näytä kaikki →",
      seeGallery: "Katso galleria →",
      reviews: "Asiakaspalaute",
      faq: "Usein kysyttyä",
      needElectrician: "Tarvitsetko sähkömiestä?",
      sendRequest: "Lähetä pyyntö — palaamme nopeasti.",
      whyUs: "Miksi valita meidät",
      documents: "Dokumentit",
      docsLead: "PDF-dokumentit ja ohjeet.",
      servicesLeadFallback: "",
      galleryLead: "Työnäytteitä ja toteutuksia.",
      quoteTitle: "Tarjouspyyntö",
      quoteLead: "Kerro kohde ja toiveet — palaamme nopeasti.",
      phoneLabel: "Puhelin",
      contactTitle: "Yhteystiedot",
      contactCTA: "Pyydä tarjous"
    },
    ru: {
      call: "Позвонить",
      email: "Email",
      requestQuote: "Заявка",
      services: "Услуги",
      works: "Примеры работ",
      gallery: "Галерея",
      showAll: "Показать все →",
      seeGallery: "Смотреть галерею →",
      reviews: "Отзывы",
      faq: "FAQ",
      needElectrician: "Нужен электрик?",
      sendRequest: "Отправьте заявку — быстро ответим.",
      whyUs: "Почему мы",
      documents: "Документы",
      docsLead: "PDF-документы и инструкции.",
      servicesLeadFallback: "",
      galleryLead: "Примеры выполненных работ.",
      quoteTitle: "Заявка на расчёт",
      quoteLead: "Опишите объект и пожелания — быстро ответим.",
      phoneLabel: "Телефон",
      contactTitle: "Контакты",
      contactCTA: "Оставить заявку"
    }
  };

  function ui(lang, key) {
    return (UI[lang] && UI[lang][key]) || (UI.fi && UI.fi[key]) || key;
  }

  function applySeo(data, lang) {
    const baseUrl = data?.site?.baseUrl || window.location.origin;

    const path = window.location.pathname.endsWith("/")
      ? "/index.html"
      : window.location.pathname;

    const pageSeo = data?.seo?.pages?.[path] || {};

    const title =
      t(pageSeo.title, lang) ||
      t(data?.companyName, lang) ||
      data?.companyName ||
      "RS-Expert Oy";

    const description =
      t(pageSeo.description, lang) ||
      t(data?.site?.defaultDescription, lang) ||
      t(data?.tagline, lang) ||
      "";

    const pageUrlFi = absoluteUrl(baseUrl, path === "/index.html" ? "/" : path);
    const pageUrlRu = setLangInUrl("ru");

    // canonical: для RU делаем canonical на FI (если включено)
    const ruNoIndex = Boolean(data?.i18n?.ruNoIndex);
    if (lang === "ru" && ruNoIndex) {
      setCanonical(pageUrlFi);
      setMeta("robots", "noindex,follow");
    } else {
      setCanonical(lang === "ru" ? setLangInUrl("ru") : pageUrlFi);
      setMeta("robots", "index,follow");
    }

    // hreflang
    const urlFi = pageUrlFi; // без ?lang
    const urlRu = pageUrlRu; // с ?lang=ru
    setHreflangAlternates(urlFi, urlRu);

    const ogImage = absoluteUrl(
      baseUrl,
      pageSeo.ogImage || data?.site?.defaultOgImage || ""
    );

    document.documentElement.lang = lang;
    document.title = title;

    setMeta("description", description);

    // OG
    setMeta("og:type", "website", true);
    setMeta("og:site_name", data?.companyName || "RS-Expert Oy", true);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", lang === "ru" ? setLangInUrl("ru") : pageUrlFi, true);
    if (ogImage) setMeta("og:image", ogImage, true);

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (ogImage) setMeta("twitter:image", ogImage);
  }

  function applyLocalBusinessSchema(data, lang) {
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
      openingHours: b.openingHours || [],
      inLanguage: lang
    };

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
  function renderHeader(data, lang) {
    const header = $("#site-header");
    if (!header) return;

    const menuHtml = (data.menu || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((m) => {
        const href = escapeHtml(m.href || "#");
        const label = escapeHtml(t(m.label, lang));
        // сохраняем lang при переходах, но не добавляем к index в canonical
        const withLang = lang === "ru" ? `${href}?lang=ru` : href;
        return `<a class="nav__link" href="${withLang}">${label}</a>`;
      })
      .join("");

    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const topLeftText = [
      lang === "ru" ? "Быстрая помощь" : "Nopea apu",
      data.region || "",
      data.phone || ""
    ]
      .filter(Boolean)
      .join(" • ");

    const fiActive = lang === "fi" ? " lang__btn--active" : "";
    const ruActive = lang === "ru" ? " lang__btn--active" : "";

    header.innerHTML = `
      <div class="topbar">
        <div class="topbar__left">${escapeHtml(topLeftText)}</div>
        <div class="topbar__right">
          <div class="lang">
            <button class="lang__btn${fiActive}" data-lang="fi" type="button">FI</button>
            <button class="lang__btn${ruActive}" data-lang="ru" type="button">RU</button>
          </div>
          <a class="topbar__btn" href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(ui(lang, "call"))}</a>
          <a class="topbar__btn" href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(ui(lang, "email"))}</a>
        </div>
      </div>
      <div class="nav">
        <div class="nav__brand">
          <a href="/index.html${lang === "ru" ? "?lang=ru" : ""}" class="brand__link">${escapeHtml(data.companyName || "RS-Expert Oy")}</a>
        </div>
        <nav class="nav__links">${menuHtml}</nav>
        <div class="nav__cta">
          <a class="btn btn--primary" href="/tarjouspyynto.html${lang === "ru" ? "?lang=ru" : ""}">${escapeHtml(ui(lang, "requestQuote"))}</a>
        </div>
      </div>
    `;
  }

  function renderFooter(data, lang) {
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

  function renderHome(data, lang) {
    const el = $("#page-home");
    if (!el) return;

    const hero = data.hero || {};
    const phoneRaw = (data.phone || "").replaceAll(" ", "");

    const badgesHtml = (hero.badges || [])
      .map((b) => `<span class="badge">${escapeHtml(t(b, lang))}</span>`)
      .join("");

    const highlightsHtml = (data.highlights || [])
      .filter((x) => x && x.enabled !== false)
      .map((h) => {
        return `
          <div class="card">
            <div class="card__icon">${escapeHtml(h.icon || "")}</div>
            <div class="card__title">${escapeHtml(t(h.title, lang))}</div>
            <div class="card__text">${escapeHtml(t(h.text, lang))}</div>
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
              <div class="service__tag">${escapeHtml(t(s.tag, lang))}</div>
            </div>
            <div class="service__title">${escapeHtml(t(s.title, lang))}</div>
            <div class="service__text">${escapeHtml(t(s.text, lang))}</div>
          </div>
        `;
      })
      .join("");

    const galleryHtml = (data.gallery || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 3)
      .map((g) => {
        const meta = [g.city, t(g.type, lang)].filter(Boolean).join(" • ");
        return `
          <a class="work" href="/gallery.html${lang === "ru" ? "?lang=ru" : ""}" aria-label="${escapeHtml(t(g.title, lang) || ui(lang, "gallery"))}">
            <img class="work__img" src="${escapeHtml(g.image || "")}" alt="${escapeHtml(t(g.title, lang))}">
            <div class="work__meta">
              <div class="work__title">${escapeHtml(t(g.title, lang))}</div>
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
        const meta = [r.city, t(r.service, lang)].filter(Boolean).join(" • ");
        return `
          <div class="review">
            <div class="review__top">
              <div class="review__title">${escapeHtml(t(r.title, lang))}</div>
              <div class="review__stars" aria-label="${escapeHtml(String(starsCount))} stars">${stars}</div>
            </div>
            <div class="review__meta">${escapeHtml(meta)}</div>
            <div class="review__text">${escapeHtml(t(r.text, lang))}</div>
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
            <summary class="faq__q">${escapeHtml(t(f.q, lang))}</summary>
            <div class="faq__a">${escapeHtml(t(f.a, lang))}</div>
          </details>
        `;
      })
      .join("");

    el.innerHTML = `
      <section class="hero">
        <h1 class="hero__title">${escapeHtml(t(hero.title, lang))}</h1>
        <p class="hero__subtitle">${escapeHtml(t(hero.subtitle, lang))}</p>
        <div class="hero__badges">${badgesHtml}</div>
        <div class="hero__cta">
          <a class="btn btn--primary" href="/tarjouspyynto.html${lang === "ru" ? "?lang=ru" : ""}">${escapeHtml(ui(lang, "requestQuote"))}</a>
          <a class="btn btn--ghost" href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(ui(lang, "call"))}</a>
        </div>
      </section>

      <section class="section">
        <h2>${escapeHtml(ui(lang, "services"))}</h2>
        <div class="grid grid--services">${servicesHtml}</div>
        <div class="section__more">
          <a class="link" href="/services.html${lang === "ru" ? "?lang=ru" : ""}">${escapeHtml(ui(lang, "showAll"))}</a>
        </div>
      </section>

      <section class="section">
        <h2>${escapeHtml(ui(lang, "works"))}</h2>
        <div class="grid grid--works">${galleryHtml}</div>
        <div class="section__more">
          <a class="link" href="/gallery.html${lang === "ru" ? "?lang=ru" : ""}">${escapeHtml(ui(lang, "seeGallery"))}</a>
        </div>
      </section>

      <section class="section">
        <h2>${escapeHtml(ui(lang, "reviews"))}</h2>
        <div class="grid grid--reviews">${reviewsHtml}</div>
      </section>

      <section class="section">
        <h2>${escapeHtml(ui(lang, "faq"))}</h2>
        <div class="stack">${faqHtml}</div>
      </section>

      <section class="section section--cta">
        <h2>${escapeHtml(ui(lang, "needElectrician"))}</h2>
        <p>${escapeHtml(ui(lang, "sendRequest"))}</p>
        <div class="cta__buttons">
          <a class="btn btn--primary" href="/tarjouspyynto.html${lang === "ru" ? "?lang=ru" : ""}">${escapeHtml(ui(lang, "requestQuote"))}</a>
          <a class="btn btn--ghost" href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(ui(lang, "call"))}</a>
        </div>
      </section>

      <section class="section">
        <h2>${escapeHtml(ui(lang, "whyUs"))}</h2>
        <div class="grid grid--highlights">${highlightsHtml}</div>
      </section>
    `;
  }

  function renderServicesPage(data, lang) {
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
              <div class="service__tag">${escapeHtml(t(s.tag, lang))}</div>
            </div>
            <div class="service__title">${escapeHtml(t(s.title, lang))}</div>
            <div class="service__text">${escapeHtml(t(s.text, lang))}</div>
          </div>
        `;
      })
      .join("");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "services"))}</h1>
        <p class="lead">${escapeHtml(t(data.tagline, lang))}</p>
        <div class="grid grid--services">${servicesHtml}</div>
      </section>
    `;
  }

  function renderGalleryPage(data, lang) {
    const el = $("#page-gallery");
    if (!el) return;

    const itemsHtml = (data.gallery || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((g) => {
        const meta = [g.city, t(g.type, lang)].filter(Boolean).join(" • ");
        return `
          <article class="workcard">
            <img class="workcard__img" src="${escapeHtml(g.image || "")}" alt="${escapeHtml(t(g.title, lang))}">
            <div class="workcard__body">
              <div class="workcard__title">${escapeHtml(t(g.title, lang))}</div>
              <div class="workcard__meta">${escapeHtml(meta)}</div>
              <div class="workcard__text">${escapeHtml(t(g.text, lang))}</div>
            </div>
          </article>
        `;
      })
      .join("");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "gallery"))}</h1>
        <p class="lead">${escapeHtml(ui(lang, "galleryLead"))}</p>
        <div class="grid grid--gallery">${itemsHtml}</div>
      </section>
    `;
  }

  function renderDocumentsPage(data, lang) {
    const el = $("#page-documents");
    if (!el) return;

    const docsHtml = (data.documents || [])
      .filter((x) => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((d) => {
        const url = escapeHtml(d.url || "#");
        return `
          <a class="doc" href="${url}" target="_blank" rel="noopener">
            <div class="doc__title">${escapeHtml(t(d.title, lang))}</div>
            <div class="doc__meta">${escapeHtml(t(d.category, lang) || "PDF")}</div>
          </a>
        `;
      })
      .join("");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "documents"))}</h1>
        <p class="lead">${escapeHtml(ui(lang, "docsLead"))}</p>
        <div class="grid grid--docs">${docsHtml}</div>
      </section>
    `;
  }

  function renderTarjousPage(data, lang) {
    const el = $("#page-tarjous");
    if (!el) return;

    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const formId = data.tallyFormId || "";
    const iframeSrc = formId ? `https://tally.so/r/${encodeURIComponent(formId)}` : "";

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "quoteTitle"))}</h1>
        <p class="lead">${escapeHtml(ui(lang, "quoteLead"))}</p>

        <div class="card card--pad">
          <div class="stack">
            <div><strong>${escapeHtml(ui(lang, "phoneLabel"))}:</strong> <a href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(data.phone || "")}</a></div>
            <div><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(data.email || "")}</a></div>
          </div>
        </div>

        ${
          iframeSrc
            ? `<div class="tally">
                 <iframe
                   title="${escapeHtml(ui(lang, "quoteTitle"))}"
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

  function renderContactPage(data, lang) {
    const el = $("#page-contact");
    if (!el) return;

    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const regionCity = [data.region, data.city].filter(Boolean).join(" • ");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "contactTitle"))}</h1>
        <div class="card card--pad">
          <div class="stack">
            <div><strong>${escapeHtml(data.companyName || "")}</strong></div>
            <div>${escapeHtml(regionCity)}</div>
            <div><a href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(data.phone || "")}</a></div>
            <div><a href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(data.email || "")}</a></div>
            <div class="mt">
              <a class="btn btn--primary" href="/tarjouspyynto.html${lang === "ru" ? "?lang=ru" : ""}">${escapeHtml(ui(lang, "contactCTA"))}</a>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function bindLanguageSwitcher(data) {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lang]");
      if (!btn) return;

      const available = data?.i18n?.available || ["fi"];
      const lang = btn.getAttribute("data-lang");
      if (!available.includes(lang)) return;

      localStorage.setItem("lang", lang);

      const url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.location.href = url.toString();
    });
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

  const lang = getLang(data);

  applySeo(data, lang);
  applyLocalBusinessSchema(data, lang);

  bindLanguageSwitcher(data);

  renderHeader(data, lang);
  renderFooter(data, lang);

  renderHome(data, lang);
  renderServicesPage(data, lang);
  renderGalleryPage(data, lang);
  renderDocumentsPage(data, lang);
  renderTarjousPage(data, lang);
  renderContactPage(data, lang);
})();
