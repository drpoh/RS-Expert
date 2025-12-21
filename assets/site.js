/* RS-Expert dynamic site.js
   Data source: Cloudflare Worker proxy -> Airtable
   Worker: https://rs-expert-data.robertsild.workers.dev
*/
(() => {
  const API_BASE = "https://rs-expert-data.robertsild.workers.dev/api";
  const DEFAULT_VIEW = "Grid view";

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const asBool = (v, def = true) => (typeof v === "boolean" ? v : def);
  const asNum = (v, def = 9999) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  // Airtable Attachment -> first file url
  const firstAttachmentUrl = (att) => {
    if (!att) return "";
    if (typeof att === "string") return att;
    if (Array.isArray(att) && att.length) return att[0]?.url || "";
    return att?.url || "";
  };

  async function fetchTable(table, view = DEFAULT_VIEW) {
    const url = `${API_BASE}/${encodeURIComponent(table)}?view=${encodeURIComponent(view)}&t=${Date.now()}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      throw new Error(`Failed to load ${table}: ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  function sortAndFilter(items) {
    return (items || [])
      .filter((x) => asBool(x.enabled, true))
      .sort((a, b) => asNum(a.order) - asNum(b.order));
  }

  // ---------- Global apply (header/footer) ----------
  function applySite(site) {
    const companyName = site?.companyName || "RS-Expert Oy";
    const tagline = site?.tagline || "";
    const phone = site?.phone || "";
    const email = site?.email || "";

    $$("[data-company]").forEach((el) => (el.textContent = companyName));
    $$("[data-tagline]").forEach((el) => (el.textContent = tagline));

    $$("[data-phone-link]").forEach((el) => {
      if (!phone) return;
      el.textContent = phone;
      el.setAttribute("href", `tel:${phone.replace(/\s+/g, "")}`);
    });

    $$("[data-email-link]").forEach((el) => {
      if (!email) return;
      el.textContent = email;
      el.setAttribute("href", `mailto:${email}`);
    });
  }

  function renderMenu(menuItems) {
    const nav = $("#menu");
    if (!nav) return;

    const items = sortAndFilter(menuItems);
    if (!items.length) return;

    nav.innerHTML = items
      .map((it) => {
        const label = esc(it.label || "");
        const href = esc(it.href || "#");
        return `<a href="${href}">${label}</a>`;
      })
      .join("");
  }

  // ---------- Components ----------
  function cardHTML({ title, text, icon, tag, href, img }) {
    const t = esc(title || "");
    const p = esc(text || "");
    const i = esc(icon || "");
    const g = esc(tag || "");
    const link = href ? `href="${esc(href)}"` : "";
    const clickable = href ? "a" : "div";

    const imgHTML = img
      ? `<div class="thumb"><img src="${esc(img)}" alt="${t}" loading="lazy"></div>`
      : "";

    return `
      <${clickable} class="card pad hover" ${link}>
        ${imgHTML}
        <div class="meta">
          <div class="h">
            ${i ? `<span class="icon">${i}</span>` : ""}
            <b>${t}</b>
          </div>
          ${g ? `<div class="small tag">${g}</div>` : ""}
          ${p ? `<p class="small">${p}</p>` : ""}
        </div>
      </${clickable}>
    `;
  }

  function ensureGridClass(el, fallbackClass = "grid three") {
    if (!el) return;
    // если уже есть классы — не трогаем
    if (el.classList.length) return;
    fallbackClass.split(/\s+/).forEach((c) => el.classList.add(c));
  }

  // ---------- Render: Services ----------
  function renderServices(services) {
    // full page container
    const full = $("#servicesList");
    // homepage preview container (мы делали раньше)
    const preview = $("#servicesPreview");

    const items = sortAndFilter(services);

    if (preview) {
      ensureGridClass(preview, "grid three");
      preview.innerHTML = items.slice(0, 6).map((s) =>
        cardHTML({
          title: s.title,
          text: s.text,
          icon: s.icon,
          tag: s.tag,
          href: "/services.html",
        })
      ).join("");
    }

    if (full) {
      ensureGridClass(full, "grid three");
      full.innerHTML = items.map((s) =>
        cardHTML({
          title: s.title,
          text: s.text,
          icon: s.icon,
          tag: s.tag,
        })
      ).join("");
    }
  }

  // ---------- Render: Gallery ----------
  function renderGallery(gallery) {
    const full = $("#galleryList");
    const preview = $("#galleryPreview");

    const items = sortAndFilter(gallery).map((g) => ({
      ...g,
      imageUrl: firstAttachmentUrl(g.image),
    }));

    if (preview) {
      ensureGridClass(preview, "grid three");
      preview.innerHTML = items.slice(0, 6).map((g) =>
        cardHTML({
          title: g.title,
          text: g.text || g.city || "",
          icon: g.type ? "🖼️" : "",
          tag: g.city || g.type || "",
          href: "/gallery.html",
          img: g.imageUrl,
        })
      ).join("");
    }

    if (full) {
      ensureGridClass(full, "grid three");
      full.innerHTML = items.map((g) =>
        cardHTML({
          title: g.title,
          text: g.text,
          icon: g.type ? "🧾" : "",
          tag: [g.type, g.city].filter(Boolean).join(" • "),
          img: g.imageUrl,
        })
      ).join("");
    }
  }

  // ---------- Render: Documents ----------
  function renderDocuments(docs) {
    const el = $("#documentsList");
    if (!el) return;

    const items = sortAndFilter(docs).map((d) => ({
      ...d,
      fileUrl: firstAttachmentUrl(d.file) || d.url || "",
    }));

    el.innerHTML = items
      .map((d) => {
        const title = esc(d.title || "PDF");
        const cat = esc(d.category || "");
        const url = esc(d.fileUrl || "#");
        const chip = cat ? `<span class="pill">${cat}</span>` : "";
        return `
          <a class="card pad hover doc" href="${url}" target="_blank" rel="noopener">
            <div class="h"><b>📄 ${title}</b>${chip}</div>
            <div class="small">Avaa PDF</div>
          </a>
        `;
      })
      .join("");

    // если страница пустая — покажем мягкое сообщение
    if (!items.length) {
      el.innerHTML = `<div class="card pad soft"><b>Ei dokumentteja vielä</b><div class="small">Lisää PDF Airtablesta.</div></div>`;
    }
  }

  // ---------- Render: Reviews ----------
  function renderReviews(reviews) {
    const el = $("#reviewsList");
    if (!el) return;

    const items = sortAndFilter(reviews);

    const stars = (n) => {
      const k = Math.max(1, Math.min(5, Number(n) || 5));
      return "★".repeat(k) + "☆".repeat(5 - k);
    };

    ensureGridClass(el, "grid three");
    el.innerHTML = items
      .map((r) => {
        const title = esc(r.title || "Palaute");
        const text = esc(r.text || "");
        const meta = [r.city, r.service].filter(Boolean).map(esc).join(" • ");
        return `
          <div class="card pad">
            <div class="small">${esc(stars(r.stars))}</div>
            <b>${title}</b>
            ${meta ? `<div class="small">${meta}</div>` : ""}
            ${text ? `<p class="small">${text}</p>` : ""}
          </div>
        `;
      })
      .join("");

    if (!items.length) {
      el.innerHTML = `<div class="card pad soft"><b>Ei arvioita vielä</b><div class="small">Lisää palautteet Airtablesta.</div></div>`;
    }
  }

  // ---------- Render: FAQ ----------
  function renderFAQ(faq) {
    const el = $("#faqList");
    if (!el) return;

    const items = sortAndFilter(faq);

    el.innerHTML = items
      .map((f) => {
        const q = esc(f.q || "");
        const a = esc(f.a || "");
        return `
          <details class="card pad">
            <summary><b>${q}</b></summary>
            <div class="small" style="margin-top:10px">${a}</div>
          </details>
        `;
      })
      .join("");

    if (!items.length) {
      el.innerHTML = `<div class="card pad soft"><b>FAQ puuttuu</b><div class="small">Lisää kysymykset Airtablesta.</div></div>`;
    }
  }

  // ---------- Boot ----------
  async function main() {
    // Покажем ошибку, если есть элемент #error
    const errEl = $("#error");
    const setErr = (msg) => {
      if (errEl) errEl.textContent = msg;
      console.warn(msg);
    };

    try {
      // грузим всё параллельно
      const [siteArr, menu, services, gallery, docs, reviews, faq] = await Promise.all([
        fetchTable("Site"),
        fetchTable("Menu"),
        fetchTable("Services"),
        fetchTable("Gallery"),
        fetchTable("Documents"),
        fetchTable("Reviews"),
        fetchTable("FAQ"),
      ]);

      const site = siteArr?.[0] || {};
      applySite(site);
      renderMenu(menu);

      renderServices(services);
      renderGallery(gallery);
      renderDocuments(docs);
      renderReviews(reviews);
      renderFAQ(faq);
    } catch (e) {
      setErr(`Data error: ${e?.message || e}`);
    }
  }

  // Run
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
