// Enhanced smooth transitions + white screen spinner loader
(() => {
  const loaderEl = () => document.getElementById("page-loader");
  const rootEl = () => document.documentElement;

  const showLoader = () => {
    const el = loaderEl();
    if (!el) return;
    el.classList.remove("is-hidden");
    el.setAttribute("aria-hidden", "false");
  };

  const hideLoader = () => {
    const el = loaderEl();
    if (!el) return;
    // fade out loader smoothly
    el.style.transition = "opacity 180ms ease";
    el.style.opacity = "0";
    el.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      el.classList.add("is-hidden");
      el.style.opacity = "";
      el.style.transition = "";
    }, 190);
  };

  const fadeOutPage = () => {
    const body = document.body;
    body.classList.add("page-fade-out");
  };

  const isSameOrigin = (href) => {
    try {
      const url = new URL(href, window.location.href);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  };

  const shouldHandleLink = (a) => {
    if (!a) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    if (!isSameOrigin(a.href)) return false;
    const url = new URL(a.href, window.location.href);
    // skip hash-only navigation
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return false;
    return true;
  };

  const withDelay = (ms) => new Promise((r) => setTimeout(r, ms));

  window.addEventListener("DOMContentLoaded", () => {
    // Initial: show loader until full paint; then hide
    // (loader is visible by default in HTML)
    document.body.classList.add("page-fade-in");
  });

  window.addEventListener("load", () => {
    hideLoader();
  });

  // Handle BFCache restore (Safari/Firefox)
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      // page restored from cache, ensure loader hidden
      hideLoader();
      document.body.classList.remove("page-fade-out");
      document.body.classList.add("page-fade-in");
    }
  });

  document.addEventListener("click", async (e) => {
    const a = e.target.closest("a.navlink");
    if (!shouldHandleLink(a)) return;

    // For the best UX: fade out + show loader, then navigate
    e.preventDefault();
    showLoader();
    fadeOutPage();
    await withDelay(140);
    window.location.href = a.href;
  });

  document.addEventListener("submit", () => {
    showLoader();
    fadeOutPage();
  });

  // Protected API demo with automatic refresh and retry
  const apiFetch = async (url, opts = {}) => {
    const res = await fetch(url, { credentials: "include", ...opts });
    if (res.status !== 401) return res.json();

    const r = await fetch("/refresh", { method: "POST", credentials: "include" });
    if (!r.ok) throw new Error("Session expired (refresh failed). Please login again.");

    const res2 = await fetch(url, { credentials: "include", ...opts });
    if (!res2.ok) throw new Error(`Request failed: ${res2.status}`);
    return res2.json();
  };

  window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-protected");
    const out = document.getElementById("api-out");
    if (btn && out) {
      btn.addEventListener("click", async () => {
        out.textContent = "Loading...";
        try {
          const data = await apiFetch("/api/protected");
          out.textContent = JSON.stringify(data, null, 2);
        } catch (err) {
          out.textContent = String(err?.message || err);
        }
      });
    }
  });
})();
