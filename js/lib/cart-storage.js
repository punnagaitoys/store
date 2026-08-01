/**
 * Cart LocalStorage persistence — Punnagai Toys E-Commerce Platform
 *
 * Persists the e-commerce shopping cart across browser sessions under the
 * `punnagai_cart` LocalStorage key, per the design.md LocalStorage schema:
 *
 *   localStorage.setItem('punnagai_cart', JSON.stringify({
 *     cart: [ { productId, variantId, quantity, price } ],
 *     updatedAt: <timestamp>
 *   }))
 *
 * This module follows the UMD-style dual-export pattern (see
 * `js/lib/_umd-template.js` and `js/lib/README.md`): it attaches its API to
 * `window.PunnagaiCartStorage` in the browser AND to `module.exports` under
 * Node/Jest.
 *
 * NOTE: Unlike the other `js/lib/` modules, this one DOES touch storage — it is
 * the storage glue for the cart. It is the documented exception to the "pure"
 * rule. To stay testable under Jest (where there is no global `localStorage`),
 * storage is accessed through `getStorage()`, which resolves the global
 * `localStorage` at call time and returns `null` when it is unavailable. Every
 * function guards against a missing/throwing store so it never crashes.
 *
 * This module is intentionally SEPARATE from `js/cart.js`, which uses its own
 * `punnagai_cart_v2` key for the WhatsApp pre-booking cart. The two do not share
 * state and must not interfere with each other.
 *
 * Requirements covered:
 *  - 3.9:  When the customer closes the browser session without completing
 *          checkout, the cart contents are preserved in local storage.
 *  - 6.11: The cart is cleared after a successful checkout.
 *
 * Property 11 (Cart Persistence Round-Trip): for any cart items,
 *   save -> (simulate browser close) -> load returns identical items,
 *   quantities, and prices, i.e. round-trip equality of the items array.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiCartStorage = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  /** LocalStorage key for the e-commerce cart (per design.md schema). */
  const CART_STORAGE_KEY = 'punnagai_cart';

  /**
   * Resolve the active storage backend.
   *
   * Returns the global `localStorage` when it exists (browser, or a Jest test
   * that has injected a shim onto the global object), otherwise `null`. The
   * lookup happens at call time — not at module load — so tests can attach a
   * `localStorage` shim before invoking these functions.
   *
   * @returns {Storage|null} A Storage-like object, or null when unavailable.
   */
  function getStorage() {
    try {
      // `globalThis` is available in modern browsers and Node; fall back to
      // `self`/`window` defensively for older environments.
      const g =
        typeof globalThis !== 'undefined'
          ? globalThis
          : typeof self !== 'undefined'
            ? self
            : typeof window !== 'undefined'
              ? window
              : null;
      if (g && g.localStorage) {
        return g.localStorage;
      }
    } catch (e) {
      // Accessing localStorage can throw (e.g. disabled cookies / privacy
      // mode). Treat that the same as "unavailable".
    }
    return null;
  }

  /**
   * Persist the cart items to LocalStorage under the `punnagai_cart` key.
   *
   * Writes an object of the shape `{ cart: items, updatedAt: <timestamp> }`.
   * If `items` is not an array it is normalized to an empty array so the stored
   * shape is always valid. Silently no-ops when storage is unavailable or a
   * write fails (e.g. quota exceeded) so callers never crash.
   *
   * @param {Array<{productId: string, variantId: string, quantity: number, price: number}>} items
   * @returns {boolean} True when the write succeeded, false otherwise.
   */
  function saveCartToLocalStorage(items) {
    const store = getStorage();
    if (!store) {
      return false;
    }

    const cart = Array.isArray(items) ? items : [];
    const payload = {
      cart: cart,
      updatedAt: Date.now()
    };

    try {
      store.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      // Write failed (e.g. quota exceeded / storage disabled). Don't crash.
      return false;
    }
  }

  /**
   * Load the cart items array from LocalStorage.
   *
   * Returns the items array exactly as it was saved so the round-trip preserves
   * the array shape (Property 11 compares `JSON.stringify(restored)` against the
   * original items array). Returns an empty array when the key is absent,
   * storage is unavailable, the stored value is corrupt/unparseable, or the
   * stored `cart` field is not an array.
   *
   * @returns {Array<{productId: string, variantId: string, quantity: number, price: number}>}
   */
  function loadCartFromLocalStorage() {
    const store = getStorage();
    if (!store) {
      return [];
    }

    let raw;
    try {
      raw = store.getItem(CART_STORAGE_KEY);
    } catch (e) {
      return [];
    }

    if (raw === null || raw === undefined) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.cart)) {
        return parsed.cart;
      }
    } catch (e) {
      // Corrupt / non-JSON value — treat as an empty cart.
    }

    return [];
  }

  /**
   * Remove the persisted cart from LocalStorage (Requirement 6.11 — cart
   * cleared after a successful checkout). Property 17 relies on this leaving the
   * cart empty. Safe to call when storage is unavailable or the key is absent.
   *
   * @returns {boolean} True when the key was removed (or already absent), false
   *                    when storage was unavailable or removal threw.
   */
  function clearCart() {
    const store = getStorage();
    if (!store) {
      return false;
    }
    try {
      store.removeItem(CART_STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    CART_STORAGE_KEY,
    getStorage,
    saveCartToLocalStorage,
    loadCartFromLocalStorage,
    clearCart
  };
});
