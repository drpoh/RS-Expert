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
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function loadInstagramFeed() {
    try {
      const res = await fetch("/data/instagram.json", { cache: "no-cache" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // ---------- UI texts ----------
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
      gallery: "Galleria",
      reviews: "Asiakaspalaute",
      needElectrician: "Tarvitsetko sähkömiestä?",
      sendRequest: "Lähetä pyyntö — palaamme nopeasti.",
      whyUs: "Miksi valita meidät",
      references: "Referenssit",
      referencesLead:
        "Päivitämme parhaillaan referenssejä. Uudet kohteet julkaistaan pian — seuraa Instagramia.",
      documents: "Dokumentit",
      docsLead: "PDF-dokumentit ja ohjeet.",
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
      serviceAreaNoteFallback: "Kysy myös muista kohteista Uudellamaalla."
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
      gallery: "Галерея",
      reviews: "Отзывы",
      needElectrician: "Нужен электрик?",
      sendRequest: "Отправьте заявку — быстро ответим.",
      whyUs: "Почему мы",
      references: "Референсы",
      referencesLead:
        "Сейчас обновляем референсы. Новые объекты скоро появятся — следите за Instagram.",
      documents: "Документы",
      docsLead: "PDF-документы и инструкции.",
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
      verkkolaskuLabel: "Verkkолaskuosoite",
      operaattoriLabel: "Оператор",
      serviceAreaTitleFallback: "Зона обслуживания",
      serviceAreaNoteFallback: "Можно договориться и о других городах Uusimaa."
    }
  };

  const ui = (lang, key) =>
    (UI[lang] && UI[lang][key]) || (UI.fi && UI.fi[key]) || key;

  // ---------- render blocks ----------
  function renderInstagramPreviewBlock(data, lang, igFeed) {
    const ig = data?.businessInfo?.instagram;
    if (!ig) return "";

    const items = (igFeed?.items || []).slice(0, data?.instagram?.maxItems || 9);

    const grid = items
      .map(
        (it) => `
        <a class="igthumb" href="${escapeHtml(it.url)}" target="_blank" rel="noopener">
          <img class="igthumb__img" src="${escapeHtml(it.image)}" alt="" loading="lazy">
        </a>`
      )
      .join("");

    return `
      <section class="section">
        <h2>${escapeHtml(ui(lang, "instagramPreviewTitle"))}</h2>
        <p class="lead">${escapeHtml(ui(lang, "instagramPreviewLead"))}</p>
        <div class="iggrid">${grid}</div>
        <div class="section__more">
          <a class="link" href="${escapeHtml(ig)}" target="_blank" rel="noopener">
            📸 ${escapeHtml(ui(lang, "instagramCTA"))}
          </a>
        </div>
      </section>
    `;
  }

  function renderHome(data, lang) {
    const el = $("#page-home");
    if (!el) return;

    const hero = data.hero || {};
    const phoneRaw = (data.phone || "").replaceAll(" ", "");

    const badges = (hero.badges || [])
      .map((b) => `<span class="badge">${escapeHtml(t(b, lang))}</span>`)
      .join("");

    const services = (data.services || [])
      .filter((x) => x.enabled !== false)
      .slice(0, 6)
      .map(
        (s) => `
        <div class="service">
          <div class="service__title">${escapeHtml(t(s.title, lang))}</div>
          <div class="service__text">${escapeHtml(t(s.text, lang))}</div>
        </div>`
      )
      .join("");

    const reviews = (data.reviews || [])
      .filter((x) => x.enabled !== false)
      .map(
        (r) => `
        <div class="review">
          <strong>${escapeHtml(t(r.title, lang))}</strong>
          <div>${escapeHtml(t(r.text, lang))}</div>
        </div>`
      )
      .join("");

    el.innerHTML = `
      <section class="hero">
        <h1>${escapeHtml(t(hero.title, lang))}</h1>
        <p class="hero__subtitle">${escapeHtml(t(hero.subtitle, lang))}</p>
        <div class="hero__badges">${badges}</div>
        <div class="hero__cta">
          <a class="btn btn--primary" href="${withLang("/tarjouspyynto.html", lang)}">
            ${escapeHtml(ui(lang, "requestQuote"))}
          </a>
          <a class="btn btn--ghost" href="tel:${phoneRaw}">
            ${escapeHtml(ui(lang, "call"))}
          </a>
        </div>
      </section>

      <section class="section">
        <h2>${escapeHtml(ui(lang, "services"))}</h2>
        <div class="grid grid--services">${services}</div>
      </section>

      <section class="section">
        <h2>${escapeHtml(ui(lang, "reviews"))}</h2>
        <div class="grid grid--reviews">${reviews}</div>
      </section>

      <section class="section section--cta">
        <h2>${escapeHtml(ui(lang, "needElectrician"))}</h2>
        <p>${escapeHtml(ui(lang, "sendRequest"))}</p>
        <a class="btn btn--primary" href="${withLang("/tarjouspyynto.html", lang)}">
          ${escapeHtml(ui(lang, "requestQuote"))}
        </a>
      </section>
    `;
  }

  // ---------- boot ----------
  const data = await (await fetch("/data/site.json")).json();
  const lang = getLang(data);
  const igFeed = await loadInstagramFeed();

  renderHome(data, lang);
  renderInstagramPreviewBlock(data, lang, igFeed);
})();
