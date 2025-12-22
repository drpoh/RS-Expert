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

  function withLang(href, lang) {
    if (!href) return "#";
    if (lang !== "ru") return href;
    return href.includes("?") ? `${href}&lang=ru` : `${href}?lang=ru`;
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

  // ... (applySeo, applyLocalBusinessSchema, showError — как в твоём коде)

  // Восстановленные render-функции
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
    const igBtn = ig ? `<a class="topbar__btn topbar__btn--ig" href="${escapeHtml(ig)}" target="_blank" rel="noopener">📸 ${escapeHtml(ui(lang, "instagram"))}</a>` : "";
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
    const igHtml = ig ? `<span class="dot">•</span><a class="footer__ig" href="${escapeHtml(ig)}" target="_blank" rel="noopener">📸 ${escapeHtml(ui(lang, "instagram"))}</a>` : "";
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

  // ... (остальные render-функции — renderHome, renderServicesPage и т.д. — добавь их из предыдущих версий, если нужно)

  // boot
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

  const lang = getLang(data);
  applySeo(data, lang);
  applyLocalBusinessSchema(data, lang);

  // ... (bind events)

  const igFeed = await loadInstagramFeed();
  const uploads = await loadUploads();

  renderHeader(data, lang);
  renderFooter(data, lang);
  // ... вызов остальных render-функций
})();
