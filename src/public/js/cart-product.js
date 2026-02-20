
(() => {
  // ─────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────
  const isLoggedIn = window.__IS_LOGGED_IN__ === true;
  const unitPrice = Number(window.__UNIT_PRICE__ || 0);
  const maxStock = Number(window.__MAX_STOCK__ || 99);

  const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  // ─────────────────────────────────────────
  // ELEMENTS
  // ─────────────────────────────────────────
  const mainQtyInput = document.getElementById('main-qty');          // the real <input>
  const stickyDisplay = document.getElementById('sticky-qty-display'); // sticky <span>
  const successPanel = document.querySelector('.tf-add-cart-success');
  const successClose = document.querySelector('.tf-add-cart-close');
  const successImg = document.getElementById('cart-success-img');
  const successTitleEl = successPanel?.querySelector('.tf-add-cart-product .content .text-title a.link');
  const successPriceEl = successPanel?.querySelector('.tf-add-cart-product .content .text-title:last-child');

  // ─────────────────────────────────────────
  // QUANTITY  — single source of truth
  // ─────────────────────────────────────────
  const getQty = () => {
    const v = parseInt(mainQtyInput?.value || '1', 10);
    return Number.isFinite(v) && v > 0 ? Math.min(maxStock, v) : 1;
  };

  const setQty = (v) => {
    const clamped = Math.min(maxStock, Math.max(1, v));
    if (mainQtyInput) mainQtyInput.value = String(clamped);
    if (stickyDisplay) stickyDisplay.textContent = String(clamped); // mirror to sticky
    updateTotalPriceUI(clamped);
  };

  const updateTotalPriceUI = (qty) => {
    const q = qty ?? getQty();
    document.querySelectorAll('.total-price').forEach(el => {
      el.textContent = formatINR(unitPrice * q);
    });
  };

  // ─────────────────────────────────────────
  // SINGLE delegated click for + / -
  // Works for BOTH the main bar and sticky bar
  // because both use data-action="increase/decrease"
  // ─────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action !== 'increase' && action !== 'decrease') return;

    e.preventDefault();
    const next = action === 'increase' ? getQty() + 1 : getQty() - 1;
    setQty(next);  // clamps, syncs both inputs + price label
  }, { passive: false });

  // If user types directly in the input
  mainQtyInput?.addEventListener('input', () => {
    const v = parseInt(mainQtyInput.value, 10);
    if (Number.isFinite(v)) setQty(v);
  });

  // ─────────────────────────────────────────
  // SUCCESS PANEL
  // ─────────────────────────────────────────
  const showSuccess = () => successPanel?.classList.add('show');
  const hideSuccess = () => successPanel?.classList.remove('show');
  successClose?.addEventListener('click', hideSuccess);

  // ─────────────────────────────────────────
  // NAVBAR COUNT  — reads from server on load
  // and updates after every add-to-cart
  // ─────────────────────────────────────────
  const setNavCount = (count) => {
    // Supports multiple badge elements in your navbar
    document.querySelectorAll('#nav-cart-count, .nav-cart-count').forEach(el => {
      el.textContent = String(count ?? 0);
    });
  };

  const fetchNavCount = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch('/api/cart/count');
      if (!res.ok) return;
      const data = await res.json();
      setNavCount(data.count ?? 0);
    } catch { /* silent */ }
  };

  // ─────────────────────────────────────────
  // ADD TO CART
  // ─────────────────────────────────────────
  const addToCart = async (btn) => {
    const productId = btn.getAttribute('data-product-id');
    if (!productId) return;

    if (!isLoggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const quantity = getQty();

    // Disable button while request is in-flight
    btn.classList.add('loading');
    btn.style.pointerEvents = 'none';

    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401 && data.redirectTo) {
          window.location.href = data.redirectTo;
          return;
        }
        alert(data.message || 'Could not add to cart');
        return;
      }

      // ✅ Update navbar badge with count returned from server
      setNavCount(data.count ?? 0);

      // ✅ Update success panel
      if (data.addedItem) {
        const it = data.addedItem;
        if (successImg && it.image) successImg.src = it.image;
        if (successTitleEl && it.name) successTitleEl.textContent = it.name;
        if (successPriceEl && it.price) successPriceEl.textContent = formatINR(it.price);
      }
      showSuccess();

    } catch {
      alert('Network error. Please try again.');
    } finally {
      btn.classList.remove('loading');
      btn.style.pointerEvents = '';
    }
  };

  // ─────────────────────────────────────────
  // SINGLE delegated click for Add to Cart
  // Covers BOTH main button and sticky button
  // ─────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add-to-cart');
    if (!btn) return;
    e.preventDefault();
    addToCart(btn);
  });

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────
  setQty(1);         // sync sticky display + price label on first load
  fetchNavCount();   // load correct count from server on page load

})();
