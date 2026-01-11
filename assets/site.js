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
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(n => n.remove());
    function add(hreflang, href) {
      const l = document.createElement("link");
      l.rel = "alternate";
      l.hreflang = hreflang;
      l.href = href;
      document.head.appendChild(l);
    }
    add("fi", urlFi);
    add("ru", urlRu);
    add("x-default", urlFi);
  }

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

  // NEW: RU language selection is path-based: /ru/*
  // FIX: normalize "/ru" and "/ru/" and "/ru/index.html"
  function getLangFromPath() {
    const p = window.location.pathname || "/";
    return (p === "/ru" || p === "/ru/" || p.startsWith("/ru/")) ? "ru" : null;
  }

  // FIX: strip RU prefix reliably
  function stripRuPrefix(pathname) {
    const p = pathname || "/";
    if (p === "/ru" || p === "/ru/") return "/";
    if (p.startsWith("/ru/")) return p.slice(3) || "/"; // remove "/ru"
    return p;
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

  // ===== FIX #1: sticky language (FI default, RU persists across pages/tabs) =====
  const LANG_KEY = "rs_lang"; // separate from old "lang" to avoid legacy conflicts

  function getStoredLang() {
    try {
      const v = localStorage.getItem(LANG_KEY);
      return (v === "ru" || v === "fi") ? v : null;
    } catch (e) {
      return null;
    }
  }

  function setStoredLang(lang) {
    try {
      if (lang === "ru" || lang === "fi") localStorage.setItem(LANG_KEY, lang);
      else localStorage.removeItem(LANG_KEY);
    } catch (e) {}
  }

  // ===== FIX #2: if /ru/* serves index.html, create correct page container =====
  function getDesiredPageIdFromUrl() {
    let p = stripRuPrefix(window.location.pathname || "/");
    p = normalizePathForPage(p);
    p = p.replace(/\/+$/, "");
    if (p === "" || p === "/") return "page-home";

    let name = p.startsWith("/") ? p.slice(1) : p;
    name = name.replace(/\.html$/i, "");

    // map tarjouspyynto.html -> page-tarjous (as in your HTML ids)
    if (name === "tarjouspyynto") name = "tarjous";

    const known = new Set([
      "home",
      "services",
      "gallery",
      "referenssit",
      "documents",
      "tarjous",
      "hinnasto",
      "contact"
    ]);

    if (!known.has(name)) return "page-home";
    return "page-" + name;
  }

  function ensurePageMount() {
    const desiredId = getDesiredPageIdFromUrl();
    if (document.getElementById(desiredId)) return;

    // If server served wrong HTML (often index.html), only page-home exists.
    // We create the correct page container inside main.container.
    const main = document.querySelector("main.container") || document.querySelector("main") || document.body;

    // remove existing page-* containers to avoid two pages at once
    main.querySelectorAll('div[id^="page-"]').forEach(n => n.remove());

    const div = document.createElement("div");
    div.id = desiredId;
    main.appendChild(div);
  }

  function getLang(data) {
    const available = data?.i18n?.available || ["fi"];
    const def = data?.i18n?.default || "fi";

    // 1) PATH override (SEO-indexable RU pages)
    const pathLang = getLangFromPath();
    if (pathLang && available.includes(pathLang)) return pathLang;

    // 2) sticky saved preference
    const stored = getStoredLang();
    if (stored && available.includes(stored)) return stored;

    // 3) legacy ?lang=ru (we will redirect to /ru/* in boot)
    const urlLang = new URLSearchParams(window.location.search).get("lang");
    if (available.includes(urlLang)) return urlLang;

    // 4) old saved (legacy) - keep as fallback only
    let saved = null;
    try { saved = localStorage.getItem("lang"); } catch (e) {}
    if (available.includes(saved)) return saved;

    // 5) browser
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
    url.pathname = (basePath === "/") ? "/" : normalizeToNoTrailingSlash(basePath);
    return url.toString();
  }

  // NEW: keep links consistent: if RU -> prefix /ru to internal paths
  function withLang(href, lang) {
    if (!href) return "#";
    if (href.startsWith("http://") || href.startsWith("https://")) return href;

    // normalize home
    if (href === "/index.html") href = "/";

    if (lang !== "ru") {
      // FI: never include /ru and never include ?lang
      return stripRuPrefix(href).replace(/\?lang=ru\b/g, "").replace(/[?&]lang=ru\b/g, "");
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
    if (clean.startsWith("/")) return "/ru" + clean;
    return "/ru/" + clean;
  }

  async function copyToClipboard(text) {
    const value = String(text || "");
    if (!value) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (e) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
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

  const UI = {
    fi: {
      call: "Soita",
      email: "Email",
      instagram: "Instagram",
      instagramCTA: "Katso Instagram",
      instagramPreviewTitle: "Uusimmat kuvat Instagramissa",
      instagramPreviewLead: "Työnäytteet ja toteutukset — seuraa uusimmat kohteet.",
      requestQuote: "Pyydä tarjous",
      services: "Palvelut",
      works: "Työnäytteet",
      gallery: "Galleria",
      references: "Referenssit",
      showAll: "Näytä kaikki →",
      seeGallery: "Katso galleria →",
      reviews: "Asiakaspalaute",
      needElectrician: "Tarvitsetko sähkömiestä?",
      sendRequest: "Lähetä pyyntö — palaamme nopeasti.",
      whyUs: "Miksi valita meidät",
      documents: "Dokumentit",
      docsLead: "PDF-dokumentit ja ohjeet.",
      galleryLead: "Työnäytteitä ja toteutuksia.",
      referencesLead: "Päivitämme parhaillaan referenssejä. Uudet kohteet julkaistaan pian — seuraa Instagramia.",
      quoteTitle: "Tarjouspyyntö",
      quoteLead: "Kerro kohde ja toiveet — palaamme nopeasti.",
      phoneLabel: "Puhelin",
      contactTitle: "Yhteystiedot",
      contactCTA: "Pyydä tarjous",
      addressLabel: "Osoite",
      yLabel: "Y-tunnus",
      billingTitle: "Laskutusosoite",
      ibanLabel: "IBAN",
      copyIban: "Kopioi IBAN",
      copied: "Kopioitu!",
      verkkolaskuLabel: "Verkkolaskuosoite",
      operaattoriLabel: "Operaattori",
      serviceAreaTitleFallback: "Palvelualue",
      serviceAreaNoteFallback: "Kysy myös muista kohteista Uudellamaalla.",
      mapTitle: "SIJAINTIMME KARTALLA",
      pricingTitle: "Hinnasto",
      pricingLead: "Hinnat ALV 0 % ja ALV 25,5 %.",
      pricingEffectiveFrom: "Voimassa alkaen",
      pricingTableProduct: "Tuote",
      pricingTableVat0: "Hinta (ALV 0 %)",
      pricingTableVat: "Hinta (ALV 25,5 %)"
    },
    ru: {
      call: "Позвонить",
      email: "Email",
      instagram: "Instagram",
      instagramCTA: "Смотреть Instagram",
      instagramPreviewTitle: "Свежие фото из Instagram",
      instagramPreviewLead: "Примеры работ и объекты — новые фото появляются там.",
      requestQuote: "Заявка",
      services: "Услуги",
      works: "Примеры работ",
      gallery: "Галерея",
      references: "Референсы",
      showAll: "Показать все →",
      seeGallery: "Смотреть галерею →",
      reviews: "Отзывы",
      needElectrician: "Нужен электрик?",
      sendRequest: "Отправьте заявку — быстро ответим.",
      whyUs: "Почему мы",
      documents: "Документы",
      docsLead: "PDF-документы и инструкции.",
      galleryLead: "Примеры выполненных работ.",
      referencesLead: "Сейчас обновляем референсы. Новые объекты скоро появятся — следите за Instagram.",
      quoteTitle: "Заявка на расчёт",
      quoteLead: "Опишите объект и пожелания — быстро ответим.",
      phoneLabel: "Телефон",
      contactTitle: "Контакты",
      contactCTA: "Оставить заявку",
      addressLabel: "Адрес",
      yLabel: "Y-tunnus",
      billingTitle: "Реквизиты для счета",
      ibanLabel: "IBAN",
      copyIban: "Копировать IBAN",
      copied: "Скопировано!",
      verkkolaskuLabel: "Verkkolaskuosoite",
      operaattoriLabel: "Оператор",
      serviceAreaTitleFallback: "Зона обслуживания",
      serviceAreaNoteFallback: "Можно договориться и о других городах Uusimaa.",
      mapTitle: "МЫ НА КАРТЕ",
      pricingTitle: "Цены",
      pricingLead: "Цены без НДС и с НДС 25,5%.",
      pricingEffectiveFrom: "Действует с",
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
    logicalPath = logicalPath.replace(/\/$/, "");
    if (logicalPath === "" || logicalPath === "/index.html") logicalPath = "/";
    if (logicalPath === "") logicalPath = "/";

    const pageSeo = data?.seo?.pages?.[logicalPath] || data?.seo?.pages?.["/"] || {};

    const title = t(pageSeo.title, lang) || data?.companyName || "RS-Expert Oy";

    const description =
      t(pageSeo.description, lang) ||
      t(data?.site?.defaultDescription, lang) ||
      t(data?.tagline, lang) || "";

    const fiPath = logicalPath === "/" ? "/" : logicalPath;
    const ruPath = logicalPath === "/" ? "/ru/" : `/ru${logicalPath}`;

    const pageUrlFi = absoluteUrl(baseUrl, fiPath);
    const pageUrlRu = absoluteUrl(baseUrl, ruPath);

    const ruNoIndex = Boolean(data?.i18n?.ruNoIndex);

    const canonicalUrl = (lang === "ru") ? pageUrlRu : pageUrlFi;

    if (lang === "ru" && ruNoIndex) {
      setMeta("robots", "noindex,follow");
      setMeta("googlebot", "noindex");
    } else {
      setMeta("robots", "index,follow");
      setMeta("googlebot", "index");
    }

    setCanonical(canonicalUrl);
    setHreflangAlternates(pageUrlFi, pageUrlRu);

    const ogImage = absoluteUrl(baseUrl, pageSeo.ogImage || data?.site?.defaultOgImage || "");

    document.documentElement.lang = lang;
    document.title = title;

    setMeta("description", description);

    setMeta("og:type", "website", true);
    setMeta("og:site_name", data?.companyName || "RS-Expert Oy", true);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", canonicalUrl, true);
    if (ogImage) setMeta("og:image", ogImage, true);

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (ogImage) setMeta("twitter:image", ogImage);
  }

  function applyLocalBusinessSchema(data, lang) {
    const baseUrl = data?.site?.baseUrl || window.location.origin;
    const b = data?.business || {};
    const info = data?.businessInfo || {};
    const schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: b.legalName || data?.companyName || "RS-Expert Oy",
      url: b.url || baseUrl,
      telephone: b.telephone || data?.phone,
      email: b.email || data?.email,
      image: absoluteUrl(baseUrl, b.image || data?.site?.defaultOgImage || ""),
      areaServed: (b.areaServed || []).filter(Boolean).map(x => ({ "@type": "City", name: x })),
      openingHours: b.openingHours || [],
      inLanguage: lang
    };
    if (info?.yTunnus) {
      schema.identifier = { "@type": "PropertyValue", name: "Y-tunnus", value: info.yTunnus };
    }
    const addr = t(info.address, lang);
    if (addr) {
      schema.address = {
        "@type": "PostalAddress",
        streetAddress: addr,
        addressCountry: "FI"
      };
    }
    Object.keys(schema).forEach(k => {
      if (
        schema[k] === undefined ||
        schema[k] === null ||
        schema[k] === "" ||
        (Array.isArray(schema[k]) && schema[k].length === 0)
      ) {
        delete schema[k];
      }
    });
    const el = document.getElementById("ld-json");
    if (el) el.textContent = JSON.stringify(schema, null, 2);
  }

  function showError(message) {
    const main = $("main.container") || document.body;
    main.innerHTML = `
      <div class="card card--pad" style="margin:100px auto;max-width:600px;text-align:center;background:#1a1f2e;color:#fff;">
        <h2>Virhe sivun lataamisessa</h2>
        <p>${escapeHtml(message)}</p>
        <p>Yritä päivittää sivu tai ota yhteyttä: <a href="mailto:rs.expert.oy@gmail.com" style="color:#6ae4ff;">rs.expert.oy@gmail.com</a></p>
      </div>
    `;
  }

  // RENDER FUNCTIONS
  function renderHeader(data, lang) {
    const header = $("#site-header");
    if (!header) return;

    const menuHtml = (data.menu || [])
      .filter(x => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(m => {
        const href = escapeHtml(withLang(m.href || "#", lang));
        const label = escapeHtml(t(m.label, lang));
        return `<a class="nav__link" href="${href}">${label}</a>`;
      })
      .join("");

    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const info = data.businessInfo || {};
    const ig = info.instagram || "";
    const topLeftText = [
      lang === "ru" ? "Быстрая помощь" : "Nopea apu",
      data.region || "",
      data.phone || ""
    ].filter(Boolean).join(" • ");

    const fiActive = lang === "fi" ? " lang__btn--active" : "";
    const ruActive = lang === "ru" ? " lang__btn--active" : "";

    const igBtn = ig
      ? `<a class="topbar__btn topbar__btn--ig" href="${escapeHtml(ig)}" target="_blank" rel="noopener">📸 ${escapeHtml(ui(lang, "instagram"))}</a>`
      : "";

    header.innerHTML = `
      <div class="topbar">
        <div class="topbar__left">${escapeHtml(topLeftText)}</div>
        <div class="topbar__right">
          <div class="lang">
            <button class="lang__btn${fiActive}" data-lang="fi" type="button">FI</button>
            <button class="lang__btn${ruActive}" data-lang="ru" type="button">RU</button>
          </div>
          ${igBtn}
          <a class="topbar__btn" href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(ui(lang, "call"))}</a>
          <a class="topbar__btn" href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(ui(lang, "email"))}</a>
        </div>
      </div>
      <div class="nav">
        <div class="nav__brand">
          <a href="${escapeHtml(withLang("/", lang))}" class="brand__link">${escapeHtml(data.companyName || "RS-Expert Oy")}</a>
        </div>
        <nav class="nav__links">${menuHtml}</nav>
        <div class="nav__cta">
          <a class="btn btn--primary" href="${escapeHtml(withLang("/tarjouspyynto.html", lang))}">${escapeHtml(ui(lang, "requestQuote"))}</a>
        </div>
      </div>
    `;
  }

  function renderFooter(data, lang) {
    const footer = $("#site-footer");
    if (!footer) return;

    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const info = data.businessInfo || {};
    const ig = info.instagram || "";
    const addr = t(info.address, lang);
    const y = info.yTunnus || "";
    const igHtml = ig
      ? `<span class="dot">•</span><a class="footer__ig" href="${escapeHtml(ig)}" target="_blank" rel="noopener">📸 ${escapeHtml(ui(lang, "instagram"))}</a>`
      : "";

    const line2Parts = [];
    if (addr) line2Parts.push(`${escapeHtml(ui(lang, "addressLabel"))}: ${escapeHtml(addr)}`);
    if (y) line2Parts.push(`${escapeHtml(ui(lang, "yLabel"))}: ${escapeHtml(y)}`);

    footer.innerHTML = `
      <div class="footer__inner">
        <div class="footer__brand">${escapeHtml(data.companyName || "RS-Expert Oy")}</div>
        <div class="footer__meta">
          <a href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(data.phone || "")}</a>
          <span class="dot">•</span>
          <a href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(data.email || "")}</a>
          ${igHtml}
        </div>
        ${line2Parts.length ? `<div class="footer__meta footer__meta--small">${line2Parts.join(' <span class="dot">•</span> ')}</div>` : ""}
        <div class="footer__copy">© ${escapeHtml(data.companyName || "RS-Expert Oy")}</div>
      </div>
    `;
  }

  function renderStickyCall(data, lang) {
    // показываем только если есть телефон
    const phone = (data.phone || "").trim();
    if (!phone) return;

    const phoneRaw = phone.replaceAll(" ", "");
    const label = ui(lang, "call"); // "Soita" / "Позвонить"
    const sub = lang === "ru" ? "Быстрый звонок" : "Nopea puhelu";

    // контейнер создаём один раз
    let wrap = document.getElementById("stickycall");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "stickycall";
      wrap.className = "stickycall";
      document.body.appendChild(wrap);
    }

    wrap.innerHTML = `
      <div class="stickycall__inner">
        <a class="stickycall__btn" href="tel:${escapeHtml(phoneRaw)}" aria-label="${escapeHtml(label)}">
          📞 ${escapeHtml(label)} ${escapeHtml(phone)}
        </a>
        <div class="stickycall__sub">${escapeHtml(sub)}</div>
      </div>
    `;

    // добавляем отступ снизу, чтобы контент не перекрывался
    document.body.classList.add("has-stickycall");
  }

  function renderHome(data, lang, igFeed) {
    const el = $("#page-home");
    if (!el) return;

    const hero = data.hero || {};
    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const info = data.businessInfo || {};
    const ig = info.instagram || "";

    const badgesHtml = (hero.badges || [])
      .map(b => `<span class="badge">${escapeHtml(t(b, lang))}</span>`)
      .join("");

    const highlightsHtml = (data.highlights || [])
      .filter(x => x && x.enabled !== false)
      .map(h => `
        <div class="card">
          <div class="card__icon">${escapeHtml(h.icon || "")}</div>
          <div class="card__title">${escapeHtml(t(h.title, lang))}</div>
          <div class="card__text">${escapeHtml(t(h.text, lang))}</div>
        </div>
      `).join("");

    const servicesHtml = (data.services || [])
      .filter(x => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 6)
      .map(s => `
        <div class="service">
          <div class="service__top">
            <div class="service__icon">${escapeHtml(s.icon || "")}</div>
            <div class="service__tag">${escapeHtml(t(s.tag, lang))}</div>
          </div>
          <div class="service__title">${escapeHtml(t(s.title, lang))}</div>
          <div class="service__text">${escapeHtml(t(s.text, lang))}</div>
        </div>
      `).join("");

    const reviewsHtml = (data.reviews || [])
      .filter(x => x && x.enabled !== false)
      .map(r => {
        const starsCount = Number(r.stars || 0);
        const stars = "★".repeat(starsCount).padEnd(5, "☆");
        const meta = [r.city, t(r.service, lang)].filter(Boolean).join(" • ");
        return `
          <div class="review">
            <div class="review__top">
              <div class="review__title">${escapeHtml(t(r.title, lang))}</div>
              <div class="review__stars" aria-label="${starsCount} stars">${stars}</div>
            </div>
            <div class="review__meta">${escapeHtml(meta)}</div>
            <div class="review__text">${escapeHtml(t(r.text, lang))}</div>
          </div>
        `;
      }).join("");

    const instagramCta = ig
      ? `<a class="btn btn--ig" href="${escapeHtml(ig)}" target="_blank" rel="noopener">📸 ${escapeHtml(ui(lang, "instagramCTA"))}</a>`
      : "";

    el.innerHTML = `
      <section class="hero">
        <h1 class="hero__title">${escapeHtml(t(hero.title, lang))}</h1>
        <p class="hero__subtitle">${escapeHtml(t(hero.subtitle, lang))}</p>
        <div class="hero__badges">${badgesHtml}</div>
        <div class="hero__cta">
          <a class="btn btn--primary" href="${escapeHtml(withLang("/tarjouspyynto.html", lang))}">${escapeHtml(ui(lang, "requestQuote"))}</a>
          <a class="btn btn--ghost" href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(ui(lang, "call"))}</a>
          ${instagramCta}
        </div>
      </section>
      <section class="section">
        <h2>${escapeHtml(ui(lang, "services"))}</h2>
        <div class="grid grid--services">${servicesHtml}</div>
        <div class="section__more">
          <a class="link" href="${escapeHtml(withLang("/services.html", lang))}">${escapeHtml(ui(lang, "showAll"))}</a>
        </div>
      </section>
      <section class="section">
        <h2>${escapeHtml(ui(lang, "reviews"))}</h2>
        <div class="grid grid--reviews">${reviewsHtml}</div>
      </section>
      <section class="section section--cta">
        <h2>${escapeHtml(ui(lang, "needElectrician"))}</h2>
        <p>${escapeHtml(ui(lang, "sendRequest"))}</p>
        <div class="cta__buttons">
          <a class="btn btn--primary" href="${escapeHtml(withLang("/tarjouspyynto.html", lang))}">${escapeHtml(ui(lang, "requestQuote"))}</a>
          <a class="btn btn--ghost" href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(ui(lang, "call"))}</a>
          ${instagramCta}
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
      .filter(x => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(s => `
        <div class="service service--big">
          <div class="service__top">
            <div class="service__icon">${escapeHtml(s.icon || "")}</div>
            <div class="service__tag">${escapeHtml(t(s.tag, lang))}</div>
          </div>
          <div class="service__title">${escapeHtml(t(s.title, lang))}</div>
          <div class="service__text">${escapeHtml(t(s.text, lang))}</div>
        </div>
      `).join("");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "services"))}</h1>
        <p class="lead">${escapeHtml(t(data.tagline, lang))}</p>
        <div class="grid grid--services">${servicesHtml}</div>
      </section>
    `;
  }

  function renderInstagramPreviewBlock(data, lang, igFeed) {
    const info = data.businessInfo || {};
    const ig = info.instagram || "";
    if (!ig) return "";

    const maxItems = Number(data?.instagram?.maxItems || 24);
    const items = (igFeed?.items || []).slice(0, maxItems);

    if (!items.length) {
      return `
        <section class="section">
          <div class="igpreview__head">
            <h2>${escapeHtml(ui(lang, "instagramPreviewTitle"))}</h2>
            <p class="lead">${escapeHtml(ui(lang, "instagramPreviewLead"))}</p>
          </div>
          <a class="igcard" href="${escapeHtml(ig)}" target="_blank" rel="noopener">
            <div class="igcard__title">📸 ${escapeHtml(ui(lang, "instagram"))}</div>
            <div class="igcard__sub">${escapeHtml(lang === "ru" ? "Открыть профиль и смотреть фото" : "Avaa profiili ja katso kuvat")}</div>
          </a>
        </section>
      `;
    }

    const grid = items
      .map(it => {
        const url = escapeHtml(it.url || ig);
        const img = escapeHtml(it.image || "");
        const alt = escapeHtml(it.alt || "Instagram");
        return `
          <a class="igthumb" href="${url}" target="_blank" rel="noopener">
            <img class="igthumb__img" src="${img}" alt="${alt}" loading="lazy">
          </a>
        `;
      })
      .join("");

    return `
      <section class="section">
        <div class="igpreview__head">
          <h2>${escapeHtml(ui(lang, "instagramPreviewTitle"))}</h2>
          <p class="lead">${escapeHtml(ui(lang, "instagramPreviewLead"))}</p>
        </div>
        <div class="iggrid">
          ${grid}
        </div>
        <div class="section__more">
          <a class="link" href="${escapeHtml(ig)}" target="_blank" rel="noopener">📸 ${escapeHtml(ui(lang, "instagramCTA"))}</a>
        </div>
      </section>
    `;
  }

  function renderGalleryPage(data, lang, igFeed, uploads) {
    const el = $("#page-gallery");
    if (!el) return;

    const uploadItems = (uploads?.items || []).filter(x => x && x.image);
    const hasUploads = uploadItems.length > 0;

    const uploadsHtml = uploadItems
      .map(it => {
        const img = escapeHtml(it.image);
        const title = escapeHtml(it.title || "");
        return `
          <a class="igthumb" href="${img}" target="_blank" rel="noopener">
            <img class="igthumb__img" src="${img}" alt="${title}" loading="lazy">
          </a>
        `;
      })
      .join("");

    const igBlock = renderInstagramPreviewBlock(data, lang, igFeed);

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "gallery"))}</h1>
      </section>
      ${
        hasUploads
          ? `<section class="section">
               <h2>${escapeHtml(lang === "ru" ? "Проекты" : "Projektit")}</h2>
               <div class="iggrid">${uploadsHtml}</div>
             </section>`
          : ""
      }
      ${igBlock}
    `;
  }

  function renderReferencesPage(data, lang) {
    const el = $("#page-referenssit");
    if (!el) return;

    const info = data.businessInfo || {};
    const ig = info.instagram || "";
    const igCta = ig
      ? `<div class="mt"><a class="btn btn--ig" href="${escapeHtml(ig)}" target="_blank" rel="noopener">📸 ${escapeHtml(ui(lang, "instagramCTA"))}</a></div>`
      : "";

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "references"))}</h1>
        <p class="lead">${escapeHtml(ui(lang, "referencesLead"))}</p>
        <div class="card card--pad">
          <p style="margin:0;">${escapeHtml(ui(lang, "referencesLead"))}</p>
          ${igCta}
        </div>
      </section>
    `;
  }

  function renderDocumentsPage(data, lang) {
    const el = $("#page-documents");
    if (!el) return;

    const docsHtml = (data.documents || [])
      .filter(x => x && x.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(d => {
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

  function renderHinnastoPage(data, lang) {
    const el = $("#page-hinnasto");
    if (!el) return;

    const p = data.pricing || null;
    if (!p) {
      el.innerHTML = `<section class="section"><h1>${escapeHtml(ui(lang, "pricingTitle"))}</h1><div class="card card--pad">Lisää pricing data/site.json tiedostoon.</div></section>`;
      return;
    }

    const effective = p.effectiveFrom || "";
    const lead = t(p.lead, lang) || ui(lang, "pricingLead");

    const introLines = Array.isArray(p.intro?.[lang]) ? p.intro[lang] : (Array.isArray(p.intro?.fi) ? p.intro.fi : []);
    const introHtml = introLines.map(x => `<li>${escapeHtml(String(x))}</li>`).join("");

    const tables = Array.isArray(p.tables) ? p.tables : [];
    const tablesHtml = tables.map(tbl => {
      const title = escapeHtml(t(tbl.title, lang));
      const cols = tbl.columns?.[lang] || tbl.columns?.fi || [
        ui(lang, "pricingTableProduct"),
        ui(lang, "pricingTableVat0"),
        ui(lang, "pricingTableVat")
      ];
      const rows = Array.isArray(tbl.rows) ? tbl.rows : [];
      const rowsHtml = rows.map(r => {
        const name = escapeHtml(t(r.name, lang));
        const p0 = escapeHtml(r.price0 || "");
        const pv = escapeHtml(r.priceVat || "");
        return `<tr><td>${name}</td><td class="mono">${p0}</td><td class="mono">${pv}</td></tr>`;
      }).join("");
      return `
        <section class="section">
          <h2>${title}</h2>
          <div class="card card--pad">
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;min-width:600px;">
                <thead style="background:rgba(255,255,255,0.05);">
                  <tr>
                    <th style="padding:10px;border:1px solid var(--border-light);">${escapeHtml(cols[0])}</th>
                    <th style="padding:10px;border:1px solid var(--border-light);">${escapeHtml(cols[1])}</th>
                    <th style="padding:10px;border:1px solid var(--border-light);">${escapeHtml(cols[2])}</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </section>`;
    }).join("");

    const notesLines = Array.isArray(p.notes?.[lang]) ? p.notes[lang] : (Array.isArray(p.notes?.fi) ? p.notes.fi : []);
    const notesHtml = notesLines.map(x => `<li>${escapeHtml(String(x))}</li>`).join("");

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "pricingTitle"))}</h1>
        ${lead ? `<p class="lead">${escapeHtml(lead)}</p>` : ""}
        ${effective ? `<div class="card card--pad mt"><strong>${escapeHtml(ui(lang, "pricingEffectiveFrom"))}:</strong> <span class="mono">${escapeHtml(effective)}</span></div>` : ""}
        ${introHtml ? `<div class="card card--pad mt"><ul>${introHtml}</ul></div>` : ""}
      </section>
      ${tablesHtml}
      ${notesHtml ? `<section class="section"><div class="card card--pad"><ul>${notesHtml}</ul></div></section>` : ""}
    `;
  }

  function renderContactPage(data, lang) {
    const el = $("#page-contact");
    if (!el) return;

    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const regionCity = [data.region, data.city].filter(Boolean).join(" • ");
    const info = data.businessInfo || {};
    const addr = t(info.address, lang);
    const y = info.yTunnus || "";
    const bill = info.billing || {};
    const iban = bill.iban || "";
    const eaddr = bill.verkkolaskuosoite || "";
    const op = bill.operaattori || "";
    const mapQuery = encodeURIComponent(info.mapAddress || "Siltakatu 73, 04400 Järvenpää, Finland");
    const mapSrc = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

    const mapBlock = `
      <section class="section">
        <h2>${escapeHtml(ui(lang, "mapTitle"))}</h2>
        <div class="card card--pad">
          <iframe
            title="${escapeHtml(ui(lang, "mapTitle"))}"
            src="${mapSrc}"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            style="width:100%;height:420px;border:0;border-radius:16px;"
            allowfullscreen
          ></iframe>
        </div>
      </section>
    `;

    const billingHtml = `
      <div class="card card--pad">
        <div class="card__title">${escapeHtml(ui(lang, "billingTitle"))}</div>
        <div class="stack">
          ${iban ? `
            <div class="rowline">
              <div><strong>${escapeHtml(ui(lang, "ibanLabel"))}:</strong> <span class="mono">${escapeHtml(iban)}</span></div>
              <button class="copybtn" type="button" data-copy="${escapeHtml(iban)}">${escapeHtml(ui(lang, "copyIban"))}</button>
            </div>
            <div class="copystatus" id="copy-status" aria-live="polite"></div>` : ""}
          ${eaddr ? `<div><strong>${escapeHtml(ui(lang, "verkkolaskuLabel"))}:</strong> <span class="mono">${escapeHtml(eaddr)}</span></div>` : ""}
          ${op ? `<div><strong>${escapeHtml(ui(lang, "operaattoriLabel"))}:</strong> ${escapeHtml(op)}</div>` : ""}
        </div>
      </div>
    `;

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "contactTitle"))}</h1>
        <div class="card card--pad">
          <div class="stack">
            <div><strong>${escapeHtml(data.companyName || "")}</strong></div>
            <div>${escapeHtml(regionCity)}</div>
            <div><strong>${escapeHtml(ui(lang, "phoneLabel"))}:</strong> <a href="tel:${escapeHtml(phoneRaw)}">${escapeHtml(data.phone || "")}</a></div>
            <div><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(data.email || "")}</a></div>
            ${addr ? `<div><strong>${escapeHtml(ui(lang, "addressLabel"))}:</strong> ${escapeHtml(addr)}</div>` : ""}
            ${y ? `<div><strong>${escapeHtml(ui(lang, "yLabel"))}:</strong> ${escapeHtml(y)}</div>` : ""}
            <div class="mt">
              <a class="btn btn--primary" href="${escapeHtml(withLang("/tarjouspyynto.html", lang))}">${escapeHtml(ui(lang, "contactCTA"))}</a>
            </div>
          </div>
        </div>
        ${billingHtml}
      </section>
      ${mapBlock}
    `;
  }

  // BOOT
  let data = null;
  try {
    const res = await fetch("/data/site.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`site.json not found: ${res.status} ${res.statusText}`);
    data = await res.json();
    console.log("site.json loaded successfully");
  } catch (e) {
    console.error("Failed to load /data/site.json:", e);
    showError("Sivuston tiedot eivät latautuneet. Tarkista /data/site.json");
    return;
  }

  // redirect legacy ?lang=ru -> /ru/*
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

  // ===== Sticky language redirect across pages/tabs =====
  try {
    const available = data?.i18n?.available || ["fi"];
    const stored = getStoredLang();
    if (stored && available.includes(stored)) {
      const current = getLangFromPath() ? "ru" : "fi";
      if (stored !== current) {
        window.location.replace(setLangInUrl(stored));
        return;
      }
    }
  } catch (e) {}

  const lang = getLang(data);

  // persist selection (new key + keep old key for backward compatibility)
  try { setStoredLang(lang); } catch (e) {}
  try { localStorage.setItem("lang", lang); } catch (e) {}

  applySeo(data, lang);
  applyLocalBusinessSchema(data, lang);

  // If server returned wrong HTML for /ru/*, create correct mount node
  ensurePageMount();

  // Bind events (language)
  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest ? e.target.closest("[data-lang]") : null;
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const nextLang = btn.getAttribute("data-lang");
    if (data?.i18n?.available?.includes(nextLang)) {
      try { setStoredLang(nextLang); } catch (e) {}
      try { localStorage.setItem("lang", nextLang); } catch (e) {}
      window.location.href = setLangInUrl(nextLang);
    }
  }, true);

  // copy buttons
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
  renderHome(data, lang, igFeed);
  renderServicesPage(data, lang);
  renderGalleryPage(data, lang, igFeed, uploads);
  renderReferencesPage(data, lang);
  renderDocumentsPage(data, lang);
  renderTarjousPage(data, lang);
  renderHinnastoPage(data, lang);
  renderContactPage(data, lang);
  renderStickyCall(data, lang);

  console.log("Site rendered successfully in language:", lang);
})();
