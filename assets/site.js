// RS-Expert site.js — FULL VERSION with render + SEO + RU indexing via /ru/ (2025-12-26)
// + FIX: reliable FI/RU switching (Brave-safe), consistent /ru handling, no accidental stuck-on-/ru

(async function () {
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

  function setLink(rel, href, hreflang) {
    let selector = `link[rel="${rel}"]`;
    if (hreflang) selector += `[hreflang="${hreflang}"]`;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      if (hreflang) el.setAttribute("hreflang", hreflang);
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  }

  function removeLink(rel, hreflang) {
    let selector = `link[rel="${rel}"]`;
    if (hreflang) selector += `[hreflang="${hreflang}"]`;
    document.querySelectorAll(selector).forEach((n) => n.remove());
  }

  function removeMeta(nameOrProp, isProperty = false) {
    const selector = isProperty
      ? `meta[property="${nameOrProp}"]`
      : `meta[name="${nameOrProp}"]`;
    document.querySelectorAll(selector).forEach((n) => n.remove());
  }

  function copyToClipboard(text) {
    if (!text) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    // fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return Promise.resolve(ok);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  // i18n helpers
  function getLangFromBrowser(available, def) {
    const nav = (navigator.language || navigator.userLanguage || "").toLowerCase();
    if (nav.startsWith("ru") && available.includes("ru")) return "ru";
    if (nav.startsWith("fi") && available.includes("fi")) return "fi";
    return def;
  }

  // NEW: RU language selection is path-based: /ru/*
  // FIX: normalize "/ru" and "/ru/" and "/ru/index.html"
  function getLangFromPath() {
    const p = window.location.pathname || "/";
    return (p === "/ru" || p === "/ru/" || p.startsWith("/ru/")) ? "ru" : null;
  }

  // NEW: persistent user language choice (sticky across pages/tabs)
  const LANG_STORAGE_KEY = "rs_lang";

  function getLangFromStorage(available) {
    try {
      const v = (localStorage.getItem(LANG_STORAGE_KEY) || "").toLowerCase();
      if (available.includes(v)) return v;
    } catch (e) {}
    return null;
  }

  function setLangToStorage(lang) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {}
  }

  function clearLangStorage() {
    try {
      localStorage.removeItem(LANG_STORAGE_KEY);
    } catch (e) {}
  }

  // FIX: strip RU prefix reliably
  function stripRuPrefix(pathname) {
    if (!pathname) return "/";
    if (pathname === "/ru") return "/";
    if (pathname === "/ru/") return "/";
    if (pathname.startsWith("/ru/")) return pathname.slice(3) || "/";
    return pathname;
  }

  function normalizeToNoTrailingSlash(path) {
    if (!path) return "/";
    if (path === "/") return "/";
    return path.replace(/\/+$/, "");
  }

  // FIX: normalize "index.html" → "/"
  function normalizePathForPage(path) {
    if (!path) return "/";
    if (path === "/index.html") return "/";
    return path;
  }

  // NEW: determine logical page key from current path (works even if server rewrites to index.html)
  function getPageKeyFromPath() {
    const p = normalizePathForPage(stripRuPrefix(window.location.pathname || "/"));
    if (p === "/" || p === "") return "home";
    const m = p.match(/^\/([a-z0-9_-]+)\.html$/i);
    if (m) return m[1].toLowerCase();
    // allow folder-style URLs if they ever appear
    const m2 = p.match(/^\/([a-z0-9_-]+)\/?$/i);
    if (m2) return m2[1].toLowerCase();
    return "home";
  }

  // NEW: ensure correct page container exists (important when /ru/* is served by index.html)
  function ensurePageContainer(pageKey) {
    const id = "page-" + pageKey;
    let el = document.getElementById(id);
    if (el) return el;

    // Prefer #main-content, else first <main>, else body
    const main = document.getElementById("main-content") || document.querySelector("main") || document.body;

    // If there is a dedicated main, clear it (we are on wrong template)
    try {
      // remove previous page-* containers to avoid duplicates
      main.querySelectorAll('[id^="page-"]').forEach((n) => n.remove());
    } catch (e) {}

    el = document.createElement("div");
    el.id = id;
    main.appendChild(el);
    return el;
  }

  function getLang(data) {
    const available = data?.i18n?.available || ["fi"];
    const def = data?.i18n?.default || "fi";

    // 1) PATH override (for SEO-indexable RU pages)
    const pathLang = getLangFromPath();
    if (pathLang && available.includes(pathLang)) return pathLang;

    // 2) legacy ?lang=ru (will be normalized to /ru/* in boot)
    const urlLang = new URLSearchParams(window.location.search).get("lang");
    if (available.includes(urlLang)) return urlLang;

    // 3) user preference from localStorage (sticky)
    const stored = getLangFromStorage(available);
    if (stored) return stored;

    // 4) browser (only if enabled)
    if (data?.i18n?.preferBrowserLanguage) {
      return getLangFromBrowser(available, def);
    }
    return def;
  }

  // NEW: canonical RU URLs are /ru/..., not ?lang=ru
  // FIX: make FI always remove "/ru", RU always add "/ru"
  function setLangInUrl(lang) {
    const url = new URL(window.location.href);

    // Start from logical (FI) path
    let basePath = stripRuPrefix(url.pathname);
    basePath = normalizePathForPage(basePath);

    if (basePath === "" || basePath === "/") basePath = "/";

    // Remove legacy query
    url.searchParams.delete("lang");

    // Build pathname
    if (lang === "ru") {
      url.pathname = (basePath === "/") ? "/ru/" : ("/ru" + normalizeToNoTrailingSlash(basePath));
      return url.toString();
    }

    // FI
    url.pathname = basePath;
    return url.toString();
  }

  function toLangHref(href, lang) {
    if (!href) return href;
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return href;

    // absolute external
    if (href.startsWith("http://") || href.startsWith("https://")) {
      try {
        const u = new URL(href);
        if (u.origin !== window.location.origin) return href;
        // same-origin absolute: convert
        href = u.pathname + u.search + u.hash;
      } catch (e) {
        return href;
      }
    }

    if (lang !== "ru") {
      // FI:
      // strip /ru prefix if present
      try {
        const u = new URL(href, window.location.origin);
        u.searchParams.delete("lang");
        const p = stripRuPrefix(u.pathname);
        return p + (u.search || "") + (u.hash || "");
      } catch (e) {
        return stripRuPrefix(href);
      }
    }

    // RU:
    // convert internal path to /ru/...
    let path = href;
    // strip legacy lang=ru
    try {
      const u = new URL(href, window.location.origin);
      u.searchParams.delete("lang");
      path = u.pathname + (u.search || "") + (u.hash || "");
    } catch (e) {}

    const clean = stripRuPrefix(path);
    if (clean === "/" || clean === "") return "/ru/";
    if (clean.startsWith("/")) return "/ru" + normalizeToNoTrailingSlash(clean);
    return "/ru/" + clean;
  }

  // UI strings
  const UI = {
    fi: {
      copied: "Kopioitu!",
      copy: "Kopioi",
      call: "Soita",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      email: "Sähköposti",
      requestQuote: "Pyydä tarjous",
      services: "Palvelut",
      references: "Referenssit",
      pricing: "Hinnasto",
      gallery: "Galleria",
      docs: "Dokumentit",
      contact: "Yhteystiedot",
      footerFollow: "Seuraa meitä",
      footerCompany: "Yritys",
      footerLegal: "Tiedot",
      footerSlogan: "Sähkötyöt Uusimaa – nopeasti ja luotettavasti.",
      pageTitleHome: "Sähköasentaja Järvenpää | RS-Expert Oy",
      pageTitleServices: "Palvelut — RS-Expert Oy",
      pageTitleReferences: "Referenssit — RS-Expert Oy",
      pageTitleGallery: "Galleria — RS-Expert Oy",
      pageTitlePricing: "Hinnasto — RS-Expert Oy",
      pageTitleDocs: "Dokumentit — RS-Expert Oy",
      pageTitleContact: "Yhteystiedot — RS-Expert Oy",
      pageTitleTarjous: "Tarjouspyyntö — RS-Expert Oy",
      whyUs: "Miksi RS-Expert?",
      highlights: "Vahvuudet",
      instagram: "Instagram",
      galleryIntro: "Työnäytteitä ja projektikuvia.",
      referencesIntro: "Kohteita ja esimerkkejä tekemistämme töistä.",
      pricingIntro: "Hinnat (suuntaa-antavat).",
      docsIntro: "Ladattavat dokumentit ja todistukset.",
      contactIntro: "Ota yhteyttä – vastaamme nopeasti.",
      tarjousIntro: "Kuvaile työ – palaamme tarjouksella.",
      pricingTableProduct: "Palvelu",
      pricingTableVat0: "Hinta (alv 0%)",
      pricingTableVat: "Hinta (alv 25,5%)",
      tariffEffectiveFrom: "Voimassa alkaen",
    },
    ru: {
      copied: "Скопировано!",
      copy: "Копировать",
      call: "Позвонить",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      email: "Email",
      requestQuote: "Запросить предложение",
      services: "Услуги",
      references: "Референсы",
      pricing: "Прайс",
      gallery: "Галерея",
      docs: "Документы",
      contact: "Контакты",
      footerFollow: "Мы в соцсетях",
      footerCompany: "Компания",
      footerLegal: "Информация",
      footerSlogan: "Электромонтаж в Уусимаа — быстро и надёжно.",
      pageTitleHome: "Электрик Ярвенпяя | RS-Expert Oy",
      pageTitleServices: "Услуги — RS-Expert Oy",
      pageTitleReferences: "Референсы — RS-Expert Oy",
      pageTitleGallery: "Галерея — RS-Expert Oy",
      pageTitlePricing: "Прайс — RS-Expert Oy",
      pageTitleDocs: "Документы — RS-Expert Oy",
      pageTitleContact: "Контакты — RS-Expert Oy",
      pageTitleTarjous: "Запрос предложения — RS-Expert Oy",
      whyUs: "Почему RS-Expert?",
      highlights: "Преимущества",
      instagram: "Instagram",
      galleryIntro: "Примеры работ и фото проектов.",
      referencesIntro: "Объекты и примеры выполненных работ.",
      pricingIntro: "Цены (ориентировочно).",
      docsIntro: "Документы и сертификаты для скачивания.",
      contactIntro: "Свяжитесь с нами — отвечаем быстро.",
      tarjousIntro: "Опишите задачу — вернёмся с предложением.",
      tariffEffectiveFrom: "Действует с",
      pricingTableProduct: "Услуга",
      pricingTableVat0: "Цена (без НДС)",
      pricingTableVat: "Цена (с НДС 25,5%)"
    }
  };

  function ui(lang, key) {
    return (UI[lang]?.[key]) || (UI.fi?.[key]) || key;
  }

  // SEO + schema
  function applySeo(data, lang) {
    const baseUrl = data?.site?.baseUrl || window.location.origin;

    let pathname = window.location.pathname.replace(/\/$/, "");
    if (pathname === "" || pathname === "/index.html") pathname = "/";

    // map /ru/services.html -> /services.html for seo.pages lookup
    let logicalPath = stripRuPrefix(pathname);
    logicalPath = normalizePathForPage(logicalPath);
    if (logicalPath === "") logicalPath = "/";

    const pages = data?.seo?.pages || {};
    const pageSeo = pages[logicalPath] || {};

    const title = (lang === "ru" ? pageSeo?.title_ru : pageSeo?.title_fi) || document.title;
    const desc = (lang === "ru" ? pageSeo?.description_ru : pageSeo?.description_fi)
      || document.querySelector('meta[name="description"]')?.getAttribute("content")
      || "";

    document.title = title;
    setMeta("description", desc, false);

    // canonical / alternate
    const fiUrl = absoluteUrl(baseUrl, logicalPath === "/" ? "/" : logicalPath);
    const ruUrl = absoluteUrl(baseUrl, (logicalPath === "/" ? "/ru/" : ("/ru" + normalizeToNoTrailingSlash(logicalPath))));

    // canonical depends on language
    setLink("canonical", lang === "ru" ? ruUrl : fiUrl);

    // alternates
    removeLink("alternate", "fi");
    removeLink("alternate", "ru");
    setLink("alternate", fiUrl, "fi");
    setLink("alternate", ruUrl, "ru");

    // OG / Twitter
    setMeta("og:type", "website", true);
    setMeta("og:title", title, true);
    setMeta("og:description", desc, true);
    setMeta("og:url", (lang === "ru" ? ruUrl : fiUrl), true);
    setMeta("twitter:card", "summary_large_image", false);
    setMeta("twitter:title", title, false);
    setMeta("twitter:description", desc, false);

    // language on <html>
    try {
      document.documentElement.setAttribute("lang", lang === "ru" ? "ru" : "fi");
    } catch (e) {}
  }

  function applyLocalBusinessSchema(data, lang) {
    const baseUrl = data?.site?.baseUrl || window.location.origin;
    const info = data?.businessInfo || {};
    const schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": info?.name || "RS-Expert Oy",
      "url": baseUrl,
      "telephone": info?.phone || data?.phone || "",
      "email": info?.email || "",
      "image": absoluteUrl(baseUrl, info?.logo || "/assets/logo.png"),
      "address": info?.address ? {
        "@type": "PostalAddress",
        "streetAddress": info.address.street || "",
        "postalCode": info.address.zip || "",
        "addressLocality": info.address.city || "",
        "addressCountry": info.address.country || "FI"
      } : undefined,
      "areaServed": info?.areaServed || ["Uusimaa"],
      "sameAs": (info?.socials || [])
        .filter(s => s?.url)
        .map(s => s.url),
      "inLanguage": lang === "ru" ? "ru" : "fi"
    };

    // remove undefined
    Object.keys(schema).forEach((k) => (schema[k] === undefined) && delete schema[k]);

    // inject
    const id = "ld-localbusiness";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
  }

  // Data loaders
  async function loadSiteData() {
    try {
      const res = await fetch("/data/site.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("Failed to load site.json");
      return await res.json();
    } catch (e) {
      console.error("Site data not loaded:", e);
      return null;
    }
  }

  async function loadInstagramFeed() {
    try {
      const res = await fetch("/data/instagram.json", { cache: "no-cache" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn("Instagram feed not loaded:", e);
      return null;
    }
  }

  async function loadUploads() {
    try {
      const res = await fetch("/data/uploads.json", { cache: "no-cache" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn("Uploads not loaded:", e);
      return null;
    }
  }

  // UI blocks
  function renderHeader(data, lang) {
    const el = $("#site-header");
    if (!el) return;

    const baseUrl = data?.site?.baseUrl || window.location.origin;
    const info = data?.businessInfo || {};
    const phoneRaw = (data.phone || info.phone || "").replaceAll(" ", "");
    const email = info.email || "";
    const brand = data?.brand || {};
    const logo = brand.logo || "/assets/logo.svg";
    const nav = data?.nav || [];

    const navHtml = nav
      .filter((n) => n && n.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((n) => {
        const text = lang === "ru" ? (n.title_ru || n.title_fi || "") : (n.title_fi || "");
        const href = toLangHref(n.href || "#", lang);
        const active =
          stripRuPrefix(window.location.pathname).replace(/\/$/, "") === (n.href || "").replace(/\/$/, "");
        return `<a class="nav__link ${active ? "is-active" : ""}" href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
      })
      .join("");

    const langFiActive = (lang === "fi") ? "is-active" : "";
    const langRuActive = (lang === "ru") ? "is-active" : "";

    el.innerHTML = `
      <div class="header container">
        <a class="brand" href="${escapeHtml(toLangHref("/", lang))}">
          <img class="brand__logo" src="${escapeHtml(logo)}" alt="RS-Expert" loading="eager"/>
          <span class="brand__name">RS-Expert</span>
        </a>

        <nav class="nav" aria-label="Primary">
          ${navHtml}
        </nav>

        <div class="header__actions">
          <div class="lang">
            <a class="lang__btn ${langFiActive}" data-lang="fi" href="${escapeHtml(setLangInUrl("fi"))}">FI</a>
            <a class="lang__btn ${langRuActive}" data-lang="ru" href="${escapeHtml(setLangInUrl("ru"))}">RU</a>
          </div>

          ${phoneRaw ? `
            <a class="btn btn--primary" href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(ui(lang, "call"))}</a>
          ` : ""}

          <a class="btn btn--ghost" href="${escapeHtml(toLangHref("/tarjouspyynto.html", lang))}">
            ${escapeHtml(ui(lang, "requestQuote"))}
          </a>
        </div>
      </div>
    `;
  }

  function renderFooter(data, lang) {
    const el = $("#site-footer");
    if (!el) return;

    const info = data?.businessInfo || {};
    const phoneRaw = (info.phone || data.phone || "").replaceAll(" ", "");
    const email = info.email || "";
    const socials = info.socials || [];
    const year = new Date().getFullYear();

    const socialsHtml = socials
      .filter(s => s && s.enabled !== false && s.url)
      .map(s => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title || s.platform || "Link")}</a>`)
      .join(" • ");

    const address = info?.address ? [
      info.address.street,
      `${info.address.zip || ""} ${info.address.city || ""}`.trim(),
      info.address.country || "Finland"
    ].filter(Boolean).join(", ") : "";

    el.innerHTML = `
      <div class="footer container">
        <div class="footer__col">
          <div class="footer__title">RS-Expert Oy</div>
          <div class="footer__text">${escapeHtml(ui(lang, "footerSlogan"))}</div>
          ${address ? `<div class="footer__text">${escapeHtml(address)}</div>` : ""}
          ${phoneRaw ? `<div class="footer__text"><a href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(info.phone || data.phone || "")}</a></div>` : ""}
          ${email ? `<div class="footer__text"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>` : ""}
          <div class="footer__muted">© ${year} RS-Expert Oy</div>
        </div>

        <div class="footer__col">
          <div class="footer__title">${escapeHtml(ui(lang, "footerFollow"))}</div>
          <div class="footer__text">${socialsHtml || ""}</div>
        </div>
      </div>
    `;
  }

  function renderStickyCall(data, lang) {
    const info = data?.businessInfo || {};
    const phoneRaw = (info.phone || data.phone || "").replaceAll(" ", "");
    if (!phoneRaw) return;

    let el = document.getElementById("stickycall");
    if (!el) {
      el = document.createElement("div");
      el.id = "stickycall";
      document.body.appendChild(el);
    }

    el.innerHTML = `
      <a class="stickycall__btn" href="tel:${escapeHtml(phoneRaw)}">
        <span class="stickycall__icon">☎</span>
        <span class="stickycall__text">${escapeHtml(ui(lang, "call"))}</span>
      </a>
    `;

    // добавляем отступ снизу, чтобы контент не перекрывался
    document.body.classList.add("has-stickycall");
  }

  function renderHome(data, lang, igFeed) {
    const el = ensurePageContainer("home");
    const hero = data.hero || {};
    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const info = data.businessInfo || {};
    const ig = info.instagram || "";
    const tagline = lang === "ru" ? (hero.tagline_ru || hero.tagline_fi || "") : (hero.tagline_fi || "");
    const subtitle = lang === "ru" ? (hero.subtitle_ru || hero.subtitle_fi || "") : (hero.subtitle_fi || "");
    const highlights = (data.highlights || [])
      .filter(x => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(h => {
        const t = lang === "ru" ? (h.title_ru || h.title_fi || "") : (h.title_fi || "");
        const d = lang === "ru" ? (h.desc_ru || h.desc_fi || "") : (h.desc_fi || "");
        return `
          <div class="card">
            <div class="card__title">${escapeHtml(t)}</div>
            <div class="card__text">${escapeHtml(d)}</div>
          </div>
        `;
      })
      .join("");

    const servicesHtml = (data.services || [])
      .filter(x => x && x.enabled !== false && x.featured)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 6)
      .map(s => {
        const t = lang === "ru" ? (s.title_ru || s.title_fi || "") : (s.title_fi || "");
        const d = lang === "ru" ? (s.desc_ru || s.desc_fi || "") : (s.desc_fi || "");
        return `
          <div class="card">
            <div class="card__title">${escapeHtml(t)}</div>
            <div class="card__text">${escapeHtml(d)}</div>
          </div>
        `;
      })
      .join("");

    const heroButtons = `
      <div class="hero__actions">
        ${phoneRaw ? `<a class="btn btn--primary" href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(ui(lang, "call"))}</a>` : ""}
        <a class="btn btn--ghost" href="${escapeHtml(toLangHref("/tarjouspyynto.html", lang))}">
          ${escapeHtml(ui(lang, "requestQuote"))}
        </a>
      </div>
    `;

    // Instagram preview
    const igPreview = renderInstagramPreviewBlock(data, lang, igFeed);

    el.innerHTML = `
      <section class="hero">
        <div class="hero__content">
          <h1 class="hero__title">${escapeHtml(tagline)}</h1>
          <p class="hero__subtitle">${escapeHtml(subtitle)}</p>
          ${heroButtons}
        </div>
      </section>

      <section class="section">
        <h2>${escapeHtml(ui(lang, "services"))}</h2>
        <div class="grid">${servicesHtml}</div>
        <div class="section__actions">
          <a class="btn btn--ghost" href="${escapeHtml(toLangHref("/services.html", lang))}">${escapeHtml(ui(lang, "services"))}</a>
        </div>
      </section>

      <section class="section">
        <h2>${escapeHtml(ui(lang, "whyUs"))}</h2>
        <div class="grid grid--highlights">${highlights}</div>
      </section>

      ${igPreview ? `<section class="section">${igPreview}</section>` : ""}

      <section class="section">
        <h2>${escapeHtml(ui(lang, "contact"))}</h2>
        <p>${escapeHtml(lang === "ru" ? (data.contactIntro_ru || UI.ru.contactIntro) : (data.contactIntro_fi || UI.fi.contactIntro))}</p>
        <div class="section__actions">
          <a class="btn btn--primary" href="${escapeHtml(toLangHref("/contact.html", lang))}">${escapeHtml(ui(lang, "contact"))}</a>
        </div>
      </section>
    `;
  }

  function renderServicesPage(data, lang) {
    const el = ensurePageContainer("services");
    const servicesHtml = (data.services || [])
      .filter(x => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(s => `
        <div class="card">
          <div class="card__title">${escapeHtml(lang === "ru" ? (s.title_ru || s.title_fi || "") : (s.title_fi || ""))}</div>
          <div class="card__text">${escapeHtml(lang === "ru" ? (s.desc_ru || s.desc_fi || "") : (s.desc_fi || ""))}</div>
        </div>
      `)
      .join("");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "services"))}</h1>
        <div class="grid">${servicesHtml}</div>
      </section>
    `;
  }

  function renderReferencesPage(data, lang) {
    const el = ensurePageContainer("referenssit");
    const intro = lang === "ru" ? (data.referencesIntro_ru || UI.ru.referencesIntro) : (data.referencesIntro_fi || UI.fi.referencesIntro);

    const itemsHtml = (data.references || [])
      .filter(x => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(r => {
        const t = lang === "ru" ? (r.title_ru || r.title_fi || "") : (r.title_fi || "");
        const d = lang === "ru" ? (r.desc_ru || r.desc_fi || "") : (r.desc_fi || "");
        const meta = [r.city, r.year].filter(Boolean).join(" • ");
        return `
          <div class="card">
            <div class="card__title">${escapeHtml(t)}</div>
            ${meta ? `<div class="card__meta">${escapeHtml(meta)}</div>` : ""}
            <div class="card__text">${escapeHtml(d)}</div>
          </div>
        `;
      })
      .join("");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "references"))}</h1>
        <p>${escapeHtml(intro)}</p>
        <div class="grid">${itemsHtml}</div>
      </section>
    `;
  }

  function renderInstagramPreviewBlock(data, lang, igFeed) {
    const info = data?.businessInfo || {};
    const igUrl = info?.instagramUrl || info?.instagram || "";

    if (!igFeed || !igFeed.items || !igFeed.items.length) return "";

    const items = igFeed.items.slice(0, 6);
    const itemsHtml = items.map(i => {
      const img = i.thumb || i.src || "";
      const cap = i.caption || "";
      const href = i.url || igUrl || "#";
      return `
        <a class="ig__item" href="${escapeHtml(href)}" target="_blank" rel="noopener" title="${escapeHtml(cap)}">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(cap)}" loading="lazy"/>
        </a>
      `;
    }).join("");

    return `
      <div class="ig">
        <div class="ig__head">
          <h2>${escapeHtml(ui(lang, "instagram"))}</h2>
          ${igUrl ? `<a class="btn btn--ghost" href="${escapeHtml(igUrl)}" target="_blank" rel="noopener">Instagram</a>` : ""}
        </div>
        <div class="ig__grid">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  function renderGalleryPage(data, lang, igFeed, uploads) {
    const el = ensurePageContainer("gallery");
    const intro = lang === "ru" ? (data.galleryIntro_ru || UI.ru.galleryIntro) : (data.galleryIntro_fi || UI.fi.galleryIntro);

    const igItems = (igFeed?.items || []).map(i => ({
      src: i.src || i.thumb,
      thumb: i.thumb || i.src,
      title: i.caption || "",
      url: i.url || "",
      origin: "instagram"
    })).filter(x => x.src);

    const upItems = (uploads?.items || []).map(u => ({
      src: u.src,
      thumb: u.thumb || u.src,
      title: lang === "ru" ? (u.title_ru || u.title_fi || "") : (u.title_fi || ""),
      url: u.url || "",
      origin: "upload"
    })).filter(x => x.src);

    const all = [...upItems, ...igItems];

    const itemsHtml = all.slice(0, 60).map(i => `
      <a class="gallery__item" href="${escapeHtml(i.url || i.src)}" target="_blank" rel="noopener">
        <img src="${escapeHtml(i.thumb || i.src)}" alt="${escapeHtml(i.title || "Photo")}" loading="lazy"/>
      </a>
    `).join("");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "gallery"))}</h1>
        <p>${escapeHtml(intro)}</p>
        <div class="gallery__grid">${itemsHtml}</div>
      </section>
    `;
  }

  function renderDocumentsPage(data, lang) {
    const el = ensurePageContainer("documents");
    const intro = lang === "ru" ? (data.docsIntro_ru || UI.ru.docsIntro) : (data.docsIntro_fi || UI.fi.docsIntro);

    const docsHtml = (data.documents || [])
      .filter(x => x && x.enabled !== false && x.url)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(d => `
        <div class="card">
          <div class="card__title">${escapeHtml(lang === "ru" ? (d.title_ru || d.title_fi || "") : (d.title_fi || ""))}</div>
          <div class="card__text">${escapeHtml(lang === "ru" ? (d.desc_ru || d.desc_fi || "") : (d.desc_fi || ""))}</div>
          <div class="section__actions">
            <a class="btn btn--ghost" href="${escapeHtml(d.url)}" target="_blank" rel="noopener">PDF</a>
          </div>
        </div>
      `)
      .join("");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "docs"))}</h1>
        <p>${escapeHtml(intro)}</p>
        <div class="grid">${docsHtml}</div>
      </section>
    `;
  }

  function renderTarjousPage(data, lang) {
    const el = ensurePageContainer("tarjouspyynto");
    const intro = lang === "ru" ? (data.tarjousIntro_ru || UI.ru.tarjousIntro) : (data.tarjousIntro_fi || UI.fi.tarjousIntro);

    const tallyFi = data?.tally?.fi || data?.tally?.default || "";
    const tallyRu = data?.tally?.ru || "";
    const formId = (lang === "ru" && tallyRu) ? tallyRu : tallyFi;

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "pageTitleTarjous"))}</h1>
        <p>${escapeHtml(intro)}</p>

        ${formId ? `
          <div class="embed">
            <iframe
              data-tally-src="https://tally.so/r/${escapeHtml(formId)}"
              loading="lazy"
              width="100%"
              height="1000"
              frameborder="0"
              marginheight="0"
              marginwidth="0"
              title="Tally form"
            ></iframe>
          </div>
        ` : `
          <div class="card">
            <div class="card__text">${escapeHtml(lang === "ru" ? "Форма временно недоступна." : "Lomake ei ole saatavilla.")}</div>
          </div>
        `}
      </section>
    `;

    // Tally embed script (once)
    if (formId) {
      const id = "tally-embed";
      if (!document.getElementById(id)) {
        const s = document.createElement("script");
        s.id = id;
        s.src = "https://tally.so/widgets/embed.js";
        s.async = true;
        document.body.appendChild(s);
      } else {
        // if script already loaded, re-init
        try { window.Tally && window.Tally.loadEmbeds && window.Tally.loadEmbeds(); } catch (e) {}
      }
    }
  }

  function renderHinnastoPage(data, lang) {
    const el = ensurePageContainer("hinnasto");
    const intro = lang === "ru" ? (data.pricingIntro_ru || UI.ru.pricingIntro) : (data.pricingIntro_fi || UI.fi.pricingIntro);

    const effectiveFrom = data?.pricing?.effectiveFrom || "";
    const rows = (data?.pricing?.items || [])
      .filter(x => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(p => {
        const name = lang === "ru" ? (p.name_ru || p.name_fi || "") : (p.name_fi || "");
        const vat0 = p.vat0 ?? "";
        const vat = p.vat ?? "";
        return `
          <tr>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(vat0)}</td>
            <td>${escapeHtml(vat)}</td>
          </tr>
        `;
      })
      .join("");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "pricing"))}</h1>
        <p>${escapeHtml(intro)}</p>
        ${effectiveFrom ? `<div class="muted">${escapeHtml(ui(lang, "tariffEffectiveFrom"))}: ${escapeHtml(effectiveFrom)}</div>` : ""}
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>${escapeHtml(ui(lang, "pricingTableProduct"))}</th>
                <th>${escapeHtml(ui(lang, "pricingTableVat0"))}</th>
                <th>${escapeHtml(ui(lang, "pricingTableVat"))}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderContactPage(data, lang) {
    const el = ensurePageContainer("contact");
    const info = data?.businessInfo || {};
    const phone = info.phone || data.phone || "";
    const phoneRaw = phone.replaceAll(" ", "");
    const email = info.email || "";
    const address = info?.address ? [
      info.address.street,
      `${info.address.zip || ""} ${info.address.city || ""}`.trim(),
      info.address.country || "Finland"
    ].filter(Boolean).join(", ") : "";

    const socials = (info.socials || [])
      .filter(s => s && s.enabled !== false && s.url)
      .map(s => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title || s.platform || "Link")}</a>`)
      .join(" • ");

    const intro = lang === "ru" ? (data.contactIntro_ru || UI.ru.contactIntro) : (data.contactIntro_fi || UI.fi.contactIntro);

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "contact"))}</h1>
        <p>${escapeHtml(intro)}</p>

        <div class="grid">
          ${phoneRaw ? `
            <div class="card">
              <div class="card__title">${escapeHtml(ui(lang, "call"))}</div>
              <div class="card__text"><a href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(phone)}</a></div>
              <div class="section__actions">
                <button class="btn btn--ghost" data-copy="${escapeHtml(phone)}">${escapeHtml(ui(lang, "copy"))}</button>
              </div>
            </div>
          ` : ""}

          ${email ? `
            <div class="card">
              <div class="card__title">${escapeHtml(ui(lang, "email"))}</div>
              <div class="card__text"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
              <div class="section__actions">
                <button class="btn btn--ghost" data-copy="${escapeHtml(email)}">${escapeHtml(ui(lang, "copy"))}</button>
              </div>
            </div>
          ` : ""}

          ${address ? `
            <div class="card">
              <div class="card__title">${escapeHtml(lang === "ru" ? "Адрес" : "Osoite")}</div>
              <div class="card__text">${escapeHtml(address)}</div>
            </div>
          ` : ""}

          ${socials ? `
            <div class="card">
              <div class="card__title">${escapeHtml(ui(lang, "footerFollow"))}</div>
              <div class="card__text">${socials}</div>
            </div>
          ` : ""}
        </div>

        <div id="copy-status" class="muted" aria-live="polite"></div>
      </section>
    `;
  }

  // --- main ---
  const data = await loadSiteData();
  if (!data) return;

  // Normalize legacy ?lang=ru to /ru/*
  try {
    const url = new URL(window.location.href);
    const qLang = url.searchParams.get("lang");
    if (qLang === "ru") {
      const basePath = stripRuPrefix(url.pathname);
      const targetPath = basePath === "/" ? "/ru/" : `/ru${normalizeToNoTrailingSlash(basePath)}`;
      url.pathname = targetPath;
      url.searchParams.delete("lang");
      window.location.replace(url.toString());
      return;
    }
  } catch (e) {}

  // NEW: if user has chosen RU (or FI) in storage, normalize URL to match it
  try {
    const available = data?.i18n?.available || ["fi"];
    const stored = getLangFromStorage(available);
    const pathLang = getLangFromPath(); // null or "ru"
    if (stored === "ru" && pathLang !== "ru") {
      // redirect FI URL -> RU URL
      window.location.replace(setLangInUrl("ru"));
      return;
    }
    if (stored === "fi" && pathLang === "ru") {
      // redirect RU URL -> FI URL
      window.location.replace(setLangInUrl("fi"));
      return;
    }
  } catch (e) {}

  const lang = getLang(data);

  applySeo(data, lang);
  applyLocalBusinessSchema(data, lang);

  // Bind events
  // FIX: Brave-safe click handling + capture + preventDefault (avoid stuck on /ru/)
  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest ? e.target.closest("[data-lang]") : null;
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const nextLang = btn.getAttribute("data-lang");
    if (data?.i18n?.available?.includes(nextLang)) {
      setLangToStorage(nextLang);
      window.location.href = setLangInUrl(nextLang);
    }
  }, true);

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (btn) {
      const text = btn.getAttribute("data-copy") || "";
      const ok = await copyToClipboard(text);
      const status = $("#copy-status");
      if (status) {
        status.textContent = ok ? ui(lang, "copied") : (lang === "ru" ? "Не удалось скопировать" : "Kopiointi epäonnistui");
        status.style.color = ok ? "var(--brand)" : "#ff6b6b";
        if (ok) setTimeout(() => { status.textContent = ""; status.style.color = ""; }, 2500);
      }
    }
  });

  const igFeed = await loadInstagramFeed();
  const uploads = await loadUploads();

  renderHeader(data, lang);
  renderFooter(data, lang);

  const pageKey = getPageKeyFromPath();

  switch (pageKey) {
    case "services":
      renderServicesPage(data, lang);
      break;
    case "gallery":
      renderGalleryPage(data, lang, igFeed, uploads);
      break;
    case "referenssit":
      renderReferencesPage(data, lang);
      break;
    case "documents":
      renderDocumentsPage(data, lang);
      break;
    case "tarjouspyynto":
      renderTarjousPage(data, lang);
      break;
    case "hinnasto":
      renderHinnastoPage(data, lang);
      break;
    case "contact":
      renderContactPage(data, lang);
      break;
    case "home":
    default:
      renderHome(data, lang, igFeed);
      break;
  }

  renderStickyCall(data, lang);

  console.log("Site rendered successfully in language:", lang);
})();
