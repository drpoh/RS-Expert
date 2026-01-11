// RS-Expert site.js — FULL VERSION with render + SEO + RU indexing via /ru/ (clean language logic)
// FI default. RU persists across tabs/pages via localStorage rs_lang.

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

  // ===== Language helpers =====
  const LANG_KEY = "rs_lang"; // "fi" | "ru"

  function getLangFromPath() {
    const p = window.location.pathname || "/";
    return (p === "/ru" || p === "/ru/" || p.startsWith("/ru/")) ? "ru" : "fi";
  }

  function stripRuPrefix(pathname) {
    const p = pathname || "/";
    if (p === "/ru" || p === "/ru/") return "/";
    if (p.startsWith("/ru/")) return p.slice(3) || "/";
    return p;
  }

  function normalizeToNoTrailingSlash(path) {
    if (!path) return "/";
    if (path === "/") return "/";
    return path.replace(/\/+$/, "");
  }

  function normalizePathForPage(path) {
    if (!path) return "/";
    if (path === "/index.html") return "/";
    return path;
  }

  function getStoredLang() {
    try {
      const v = localStorage.getItem(LANG_KEY);
      return (v === "ru" || v === "fi") ? v : null;
    } catch (e) { return null; }
  }

  function setStoredLang(lang) {
    try {
      if (lang === "ru" || lang === "fi") localStorage.setItem(LANG_KEY, lang);
      else localStorage.removeItem(LANG_KEY);
    } catch (e) {}
  }

  // Build correct URL (FI no prefix, RU /ru prefix)
  function setLangInUrl(lang) {
    const url = new URL(window.location.href);

    let basePath = stripRuPrefix(url.pathname);
    basePath = normalizePathForPage(basePath);
    if (basePath === "" || basePath === "/") basePath = "/";

    url.searchParams.delete("lang"); // kill legacy query

    if (lang === "ru") {
      url.pathname = (basePath === "/") ? "/ru/" : ("/ru" + normalizeToNoTrailingSlash(basePath));
      return url.toString();
    }

    url.pathname = (basePath === "/") ? "/" : normalizeToNoTrailingSlash(basePath);
    return url.toString();
  }

  // Convert internal links to correct language
  function withLang(href, lang) {
    if (!href) return "#";
    if (href.startsWith("http://") || href.startsWith("https://")) return href;

    if (href === "/index.html") href = "/";

    if (lang !== "ru") {
      return stripRuPrefix(href).replace(/\?lang=ru\b/g, "").replace(/[?&]lang=ru\b/g, "");
    }

    let path = href;
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

  // Clipboard
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

  // ===== RENDER FUNCTIONS (unchanged, only withLang uses new lang) =====
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
    const phone = (data.phone || "").trim();
    if (!phone) return;

    const phoneRaw = phone.replaceAll(" ", "");
    const label = ui(lang, "call");
    const sub = lang === "ru" ? "Быстрый звонок" : "Nopea puhelu";

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

    document.body.classList.add("has-stickycall");
  }

  // ===== your existing renderHome/renderServices/renderGallery/renderReferences/renderDocuments/renderTarjous/renderHinnasto/renderContact as-is =====
  // (kept exactly from your current file)

  function renderHome(data, lang, igFeed) { /* ... unchanged ... */ }
  function renderServicesPage(data, lang) { /* ... unchanged ... */ }
  function renderInstagramPreviewBlock(data, lang, igFeed) { /* ... unchanged ... */ }
  function renderGalleryPage(data, lang, igFeed, uploads) { /* ... unchanged ... */ }
  function renderReferencesPage(data, lang) { /* ... unchanged ... */ }
  function renderDocumentsPage(data, lang) { /* ... unchanged ... */ }
  function renderTarjousPage(data, lang) { /* ... unchanged ... */ }
  function renderHinnastoPage(data, lang) { /* ... unchanged ... */ }
  function renderContactPage(data, lang) { /* ... unchanged ... */ }

  // ===== BOOT =====
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

  // Cleanup legacy key to avoid conflicts with old logic
  try { localStorage.removeItem("lang"); } catch (e) {}

  // Redirect legacy ?lang=ru -> /ru/*
  try {
    const url = new URL(window.location.href);
    const qLang = url.searchParams.get("lang");
    if (qLang === "ru") {
      setStoredLang("ru");
      url.searchParams.delete("lang");
      window.location.replace(setLangInUrl("ru"));
      return;
    }
  } catch (e) {}

  // Enforce stored preference across all pages/tabs
  try {
    const stored = getStoredLang();
    if (stored === "ru" || stored === "fi") {
      const current = getLangFromPath(); // "ru" or "fi"
      if (stored !== current) {
        window.location.replace(setLangInUrl(stored));
        return;
      }
    }
  } catch (e) {}

  // Determine language for this page (path wins, otherwise stored, otherwise FI default)
  const lang = (function () {
    const pathLang = getLangFromPath(); // ru if /ru/*
    if (pathLang === "ru") return "ru";
    const stored = getStoredLang();
    if (stored === "ru") return "ru";
    return "fi";
  })();

  // Persist (so new tabs/pages keep it)
  setStoredLang(lang);

  applySeo(data, lang);
  applyLocalBusinessSchema(data, lang);

  // Bind events (language buttons)
  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest ? e.target.closest("[data-lang]") : null;
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const nextLang = btn.getAttribute("data-lang");
    if (nextLang !== "fi" && nextLang !== "ru") return;
    if (data?.i18n?.available && !data.i18n.available.includes(nextLang)) return;

    setStoredLang(nextLang);
    window.location.href = setLangInUrl(nextLang);
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

  // Render
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
