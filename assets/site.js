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

    // fallback
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
      operaattoriLabel: "Operaattori"
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
      operaattoriLabel: "Оператор"
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

    const title = t(pageSeo.title, lang) || data?.companyName || "RS-Expert Oy";
    const description =
      t(pageSeo.description, lang) ||
      t(data?.site?.defaultDescription, lang) ||
      t(data?.tagline, lang) ||
      "";

    const pageUrlFi = absoluteUrl(baseUrl, path === "/index.html" ? "/" : path);
    const pageUrlRu = setLangInUrl("ru");

    const ruNoIndex = Boolean(data?.i18n?.ruNoIndex);
    if (lang === "ru" && ruNoIndex) {
      setCanonical(pageUrlFi);
      setMeta("robots", "noindex,follow");
    } else {
      setCanonical(lang === "ru" ? setLangInUrl("ru") : pageUrlFi);
      setMeta("robots", "index,follow");
    }

    setHreflangAlternates(pageUrlFi, pageUrlRu);

    const ogImage = absoluteUrl(
      baseUrl,
      pageSeo.ogImage || data?.site?.defaultOgImage || ""
    );

    document.documentElement.lang = lang;
    document.title = title;

    setMeta("description", description);

    setMeta("og:type", "website", true);
    setMeta("og:site_name", data?.companyName || "RS-Expert Oy", true);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", lang === "ru" ? setLangInUrl("ru") : pageUrlFi, true);
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
    const addressText = t(info?.address, lang);

    let street = "";
    let postalCode = "";
    let addressLocality = "";
    if (typeof addressText === "string" && addressText.includes(",")) {
      const parts = addressText.split(",").map((x) => x.trim());
      street = parts[0] || "";
      const rest = parts.slice(1).join(" ");
      const m = rest.match(/(\d{5})\s+(.+)$/);
      if (m) {
        postalCode = m[1];
        addressLocality = m[2];
      }
    }

    const schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: b.legalName || data?.companyName || "RS-Expert Oy",
      url: b.url || baseUrl,
      telephone: b.telephone || data?.phone,
      email: b.email || data?.email,
      image: absoluteUrl(baseUrl, b.image || data?.site?.defaultOgImage || ""),
      areaServed: (b.areaServed || []).filter(Boolean).map((x) => ({ "@type": "City", name: x })),
      openingHours: b.openingHours || [],
      inLanguage: lang
    };

    if (info?.yTunnus) {
      schema.identifier = {
        "@type": "PropertyValue",
        name: "Y-tunnus",
        value: info.yTunnus
      };
    }

    if (addressText) {
      schema.address = {
        "@type": "PostalAddress",
        streetAddress: street || addressText,
        postalCode: postalCode || undefined,
        addressLocality: addressLocality || undefined,
        addressCountry: "FI"
      };
      Object.keys(schema.address).forEach((k) => {
        if (schema.address[k] === undefined) delete schema.address[k];
      });
    }

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
    ]
      .filter(Boolean)
      .join(" • ");

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
          <a href="${escapeHtml(withLang("/index.html", lang))}" class="brand__link">${escapeHtml(data.companyName || "RS-Expert Oy")}</a>
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

        ${
          line2Parts.length
            ? `<div class="footer__meta footer__meta--small">${line2Parts.join(' <span class="dot">•</span> ')}</div>`
            : ``
        }

        <div class="footer__copy">© ${escapeHtml(data.companyName || "RS-Expert Oy")}</div>
      </div>
    `;
  }

  function renderInstagramPreviewBlock(data, lang, igFeed) {
    const info = data.businessInfo || {};
    const ig = info.instagram || "";
    if (!ig) return "";

    const maxItems = Number(data?.instagram?.maxItems || 9);
    const items = (igFeed?.items || []).slice(0, maxItems);

    if (!items.length) {
      // fallback if feed not ready yet
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
      .map((it) => {
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

  function renderHome(data, lang, igFeed) {
    const el = $("#page-home");
    if (!el) return;

    const hero = data.hero || {};
    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const info = data.businessInfo || {};
    const ig = info.instagram || "";

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
          <a class="work" href="${escapeHtml(withLang("/gallery.html", lang))}" aria-label="${escapeHtml(t(g.title, lang) || ui(lang, "gallery"))}">
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

    const instagramCta = ig
      ? `<a class="btn btn--ig" href="${escapeHtml(ig)}" target="_blank" rel="noopener">📸 ${escapeHtml(ui(lang, "instagramCTA"))}</a>`
      : "";

    const igPreview = renderInstagramPreviewBlock(data, lang, igFeed);

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
        <h2>${escapeHtml(ui(lang, "works"))}</h2>
        <div class="grid grid--works">${galleryHtml}</div>
        <div class="section__more">
          <a class="link" href="${escapeHtml(withLang("/gallery.html", lang))}">${escapeHtml(ui(lang, "seeGallery"))}</a>
        </div>
      </section>

      ${igPreview}

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

  function renderReferencesPage(data, lang) {
    const el = $("#page-referenssit");
    if (!el) return;

    const info = data.businessInfo || {};
    const ig = info.instagram || "";

    const igCta = ig
      ? `<div class="mt">
           <a class="btn btn--ig" href="${escapeHtml(ig)}" target="_blank" rel="noopener">📸 ${escapeHtml(ui(lang, "instagramCTA"))}</a>
         </div>`
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

  function renderContactPage(data, lang, igFeed) {
    const el = $("#page-contact");
    if (!el) return;

    const phoneRaw = (data.phone || "").replaceAll(" ", "");
    const regionCity = [data.region, data.city].filter(Boolean).join(" • ");
    const info = data.businessInfo || {};
    const addr = t(info.address, lang);
    const y = info.yTunnus || "";
    const ig = info.instagram || "";
    const bill = info.billing || {};
    const iban = bill.iban || "";
    const eaddr = bill.verkkolaskuosoite || "";
    const op = bill.operaattori || "";

    const igHtml = ig
      ? `<div class="igblock">
           <a class="igcard" href="${escapeHtml(ig)}" target="_blank" rel="noopener">
             <div class="igcard__title">📸 ${escapeHtml(ui(lang, "instagram"))}</div>
             <div class="igcard__sub">${escapeHtml(lang === "ru" ? "Основные фото и работы здесь" : "Tärkeimmät kuvat ja työt täällä")}</div>
           </a>
         </div>`
      : "";

    const igMini = ig ? renderInstagramPreviewBlock(data, lang, igFeed) : "";

    const billingHtml = `
      <div class="card card--pad">
        <div class="card__title">${escapeHtml(ui(lang, "billingTitle"))}</div>
        <div class="stack">
          ${
            iban
              ? `<div class="rowline">
                   <div><strong>${escapeHtml(ui(lang, "ibanLabel"))}:</strong> <span class="mono">${escapeHtml(iban)}</span></div>
                   <button class="copybtn" type="button" data-copy="${escapeHtml(iban)}">${escapeHtml(ui(lang, "copyIban"))}</button>
                 </div>
                 <div class="copystatus" id="copy-status" aria-live="polite"></div>`
              : ""
          }
          ${eaddr ? `<div><strong>${escapeHtml(ui(lang, "verkkolaskuLabel"))}:</strong> <span class="mono">${escapeHtml(eaddr)}</span></div>` : ""}
          ${op ? `<div><strong>${escapeHtml(ui(lang, "operaattoriLabel"))}:</strong> ${escapeHtml(op)}</div>` : ""}
        </div>
      </div>
    `;

    el.innerHTML = `
      <section class="section">
        <h1>${escapeHtml(ui(lang, "contactTitle"))}</h1>

        ${igHtml}

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

        <div class="mt"></div>
        ${billingHtml}

        ${igMini}
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

  function bindCopyButtons(lang) {
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-copy]");
      if (!btn) return;

      const text = btn.getAttribute("data-copy") || "";
      const ok = await copyToClipboard(text);
      const status = document.getElementById("copy-status");

      if (status) {
        status.textContent = ok ? ui(lang, "copied") : "";
        if (ok) setTimeout(() => (status.textContent = ""), 1800);
      }
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
  bindCopyButtons(lang);

  const igFeed = await loadInstagramFeed();

  renderHeader(data, lang);
  renderFooter(data, lang);

  renderHome(data, lang, igFeed);
  renderServicesPage(data, lang);
  renderGalleryPage(data, lang);
  renderReferencesPage(data, lang);
  renderDocumentsPage(data, lang);
  renderTarjousPage(data, lang);
  renderContactPage(data, lang, igFeed);
})();
