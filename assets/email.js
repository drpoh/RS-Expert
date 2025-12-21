// assets/email.js
(() => {
  const user = "info";
  const domain = "rs-expert.fi";
  const email = `${user}@${domain}`;

  // Create mailto link without exposing email directly in HTML source
  const makeEmailLink = (text = email) => {
    const a = document.createElement("a");
    a.href = `mailto:${email}`;
    a.textContent = text;
    a.className = "contact-email-link";
    return a;
  };

  // 1) Replace placeholders: <span data-email></span>
  document.querySelectorAll("[data-email]").forEach((el) => {
    el.textContent = "";
    el.appendChild(makeEmailLink());
  });

  // 2) Add email to NAV (header) if there's a nav
  // Looks for common nav containers; won't duplicate if already added.
  const nav =
    document.querySelector("header nav") ||
    document.querySelector("nav") ||
    document.querySelector(".nav") ||
    document.querySelector(".navbar");

  if (nav && !nav.querySelector(".contact-email-nav")) {
    const wrap = document.createElement("div");
    wrap.className = "contact-email-nav";
    wrap.appendChild(makeEmailLink("info@rs-expert.fi"));
    nav.appendChild(wrap);
  }

  // 3) Add email to FOOTER if exists
  const footer =
    document.querySelector("footer") ||
    document.querySelector(".footer") ||
    document.querySelector("#footer");

  if (footer && !footer.querySelector(".contact-email-footer")) {
    const p = document.createElement("p");
    p.className = "contact-email-footer";
    p.append("📧 ");
    p.appendChild(makeEmailLink("info@rs-expert.fi"));
    footer.appendChild(p);
  }

  // 4) If no footer found, add a small bottom contact bar (non-intrusive)
  if (!footer && !document.querySelector(".contact-bottom-bar")) {
    const bar = document.createElement("div");
    bar.className = "contact-bottom-bar";
    const inner = document.createElement("div");
    inner.className = "contact-bottom-bar__inner";
    inner.append("📧 ");
    inner.appendChild(makeEmailLink("info@rs-expert.fi"));
    bar.appendChild(inner);
    document.body.appendChild(bar);
  }
})();
