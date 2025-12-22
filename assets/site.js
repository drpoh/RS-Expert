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

  function applySeo(data, lang) {
    const baseUrl = data?.site?.baseUrl || window.location.origin;
    let path = window.location.pathname.replace(/\/$/, "");
    if (path === "" || path === "/index.html") path = "/";
    const pageSeo = data?.seo?.pages?.[path] || data?.seo?.pages?.["/"] || {};
    const title = t(pageSeo.title, lang) || data?.companyName || "RS-Expert Oy";
    const description = t(pageSeo.description, lang) ||
      t(data?.site?.defaultDescription, lang) ||
      t(data?.tagline, lang) || "";
    const pageUrlFi = absoluteUrl(baseUrl, path);
    const pageUrlRu = setLangInUrl("ru");
    const ruNoIndex = Boolean(data?.i18n?.ruNoIndex);
    if (lang === "ru" && ruNoIndex) {
      setCanonical(pageUrlFi);
      setMeta("robots", "noindex,follow");
      setMeta("googlebot", "noindex");
    } else {
      setCanonical(pageUrlFi);
      setMeta("robots", "index,follow");
    }
    setHreflangAlternates(pageUrlFi, pageUrlRu);
    const ogImage = absoluteUrl(baseUrl, pageSeo.ogImage || data?.site?.defaultOgImage || "");
    document.documentElement.lang = lang;
    document.title = title;
    setMeta("description", description);
    setMeta("og:type", "website", true);
    setMeta("og:site_name", data?.companyName || "RS-Expert Oy", true);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", pageUrlFi, true);
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
      if (schema[k] === undefined || schema[k] === null || schema[k] === "" || (Array.isArray(schema[k]) && schema[k].length === 0)) {
        delete schema[k];
      }
    });
    const el = document.getElementById("ld-json");
    if (el) el.textContent = JSON.stringify(schema, null, 2);
  }

  // Функция для отображения ошибки загрузки
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

  // Привязка событий (переключение языка, копирование)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lang]");
    if (btn) {
      const lang = btn.getAttribute("data-lang");
      if (data?.i18n?.available?.includes(lang)) {
        localStorage.setItem("lang", lang);
        window.location.href = setLangInUrl(lang);
      }
    }
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (btn) {
      const text = btn.getAttribute("data-copy") || "";
      const ok = await copyToClipboard(text);
      const status = $("#copy-status");
      if (status) {
        status.textContent = ok ? ui(lang, "copied") : "Kopiointi epäonnistui";
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

  console.log("Site rendered successfully in language:", lang);
})();
