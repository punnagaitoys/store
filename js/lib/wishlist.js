/**
 * Wishlist logic + session storage — Punnagai Toys E-Commerce Platform
 *
 * Manages the customer's wishlist, which is intentionally **session-scoped**:
 * it lives in `sessionStorage` under the key `punnagai_wishlist` so it clears
 * automatically when the tab/session ends, AND it is explicitly emptied on
 * logout via `clearOnLogout()` (Requirement 4.5 / Property 13).
 *
 * Storage schema (see design.md → LocalStorage Schema → Wishlist):
 *
 *   sessionStorage['punnagai_wishlist'] = JSON.stringify({
 *     wishlist: [ { productId: "prod_001" }, { productId: "prod_005" } ],
 *     updatedAt: 1700000000000
 *   })
 *
 * This module follows the UMD-style dual-export pattern (see
 * `js/lib/_umd-template.js` and `js/lib/README.md`): it attaches its API to
 * `window.PunnagaiWishlist` in the browser AND to `module.exports` under
 * Node/Jest.
 *
 * Unlike the pure modules in this folder, the wishlist is **storage glue**: it
 * reads/writes `sessionStorage`. To remain unit/property testable under Jest
 * (which has no real `sessionStorage`), every public function accepts an
 * OPTIONAL trailing `storage` argument, and `getStorage()` resolves storage in
 * this order:
 *   1. an explicitly passed `storage` argument (tests inject a shim here),
 *   2. a storage object set via `setStorage()` (convenience for test setup),
 *   3. the global `sessionStorage` if present,
 *   4. otherwise `null` — in which case reads return an empty wishlist and
 *      writes become safe no-ops (the module never throws on a missing store).
 *
 * Requirements covered:
 *  - 4.1: Add to wishlist (idempotent — one entry per product; Property 12).
 *  - 4.3: Remove an item from the wishlist.
 *  - 4.4: Add a wishlist item to the cart (decoupled bridge — see
 *         `addWishlistItemToCart`).
 *  - 4.5: Logout clears the wishlist (`clearOnLogout`; Property 13).
 *  - 4.6: After logout, the next session starts with an empty wishlist.
 *  - 4.7: Wishlist is stored in the session (sessionStorage), not persisted
 *         across logout.
 *
 * A `getWishlistCount()` is also provided for the navbar count (Req 4.8, whose
 * UI wiring lives in task 6.4).
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiWishlist = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  /** sessionStorage key holding the serialized wishlist state. */
  const STORAGE_KEY = 'punnagai_wishlist';

  /**
   * Storage object injected via `setStorage()`. When non-null it takes
   * precedence over the global `sessionStorage` but is still overridden by an
   * explicit `storage` argument on a function call.
   * @type {?Storage}
   */
  let injectedStorage = null;

  /**
   * Inject a storage shim used as the default for all subsequent calls that do
   * not pass an explicit `storage` argument. Primarily a convenience for tests.
   * Pass `null` to clear the override and fall back to global sessionStorage.
   *
   * @param {?Storage} storage - A Storage-like object (getItem/setItem/removeItem).
   */
  function setStorage(storage) {
    injectedStorage = storage || null;
  }

  /**
   * Resolve which storage object to use for an operation.
   *
   * Resolution order: explicit argument → injected override → global
   * sessionStorage → null. Access to the global is guarded so the module works
   * in non-browser/Jest environments without throwing.
   *
   * @param {Storage} [storage] - Explicit storage to use (highest priority).
   * @returns {?Storage} A storage object, or null when none is available.
   */
  function getStorage(storage) {
    if (storage) {
      return storage;
    }
    if (injectedStorage) {
      return injectedStorage;
    }
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage) {
        return sessionStorage;
      }
    } catch (e) {
      // Accessing sessionStorage can throw (e.g. sandboxed iframe). Treat as
      // unavailable rather than crashing.
    }
    return null;
  }

  /** @returns {number} Current epoch milliseconds. */
  function now() {
    return Date.now();
  }

  /**
   * Normalize a product id into a comparable string, or return null when it is
   * not a usable identifier. Empty/whitespace-only and nullish ids are
   * rejected so they are never written to the wishlist.
   *
   * @param {*} productId
   * @returns {?string}
   */
  function normalizeProductId(productId) {
    if (productId === null || productId === undefined) {
      return null;
    }
    // Accept strings and numbers; coerce to string for stable comparison.
    if (typeof productId !== 'string' && typeof productId !== 'number') {
      return null;
    }
    const id = String(productId).trim();
    return id.length > 0 ? id : null;
  }

  /**
   * Read and parse the wishlist state from storage.
   *
   * Always returns a well-formed state object `{ wishlist: Array<{productId}>,
   * updatedAt: ?number }`. Missing storage, missing key, malformed JSON, or an
   * unexpected shape all degrade gracefully to an empty wishlist. Entries are
   * sanitized so the returned `wishlist` only contains `{ productId }` objects
   * with valid, de-duplicated ids.
   *
   * @param {Storage} [storage]
   * @returns {{ wishlist: Array<{ productId: string }>, updatedAt: ?number }}
   */
  function readState(storage) {
    const store = getStorage(storage);
    const empty = { wishlist: [], updatedAt: null };
    if (!store) {
      return empty;
    }

    let raw;
    try {
      raw = store.getItem(STORAGE_KEY);
    } catch (e) {
      return empty;
    }
    if (!raw) {
      return empty;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return empty;
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.wishlist)) {
      return empty;
    }

    // Sanitize entries: keep only valid ids, drop duplicates, normalize shape.
    const seen = Object.create(null);
    const wishlist = [];
    for (let i = 0; i < parsed.wishlist.length; i++) {
      const entry = parsed.wishlist[i];
      const id = normalizeProductId(entry && entry.productId);
      if (id && !seen[id]) {
        seen[id] = true;
        wishlist.push({ productId: id });
      }
    }

    const updatedAt =
      typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
        ? parsed.updatedAt
        : null;

    return { wishlist: wishlist, updatedAt: updatedAt };
  }

  /**
   * Persist a wishlist array to storage with a fresh `updatedAt` timestamp.
   * Safe no-op (returns false) when no storage is available.
   *
   * @param {Array<{ productId: string }>} wishlist
   * @param {Storage} [storage]
   * @returns {boolean} True when the write succeeded.
   */
  function writeState(wishlist, storage) {
    const store = getStorage(storage);
    if (!store) {
      return false;
    }
    const payload = JSON.stringify({
      wishlist: Array.isArray(wishlist) ? wishlist : [],
      updatedAt: now(),
    });
    try {
      store.setItem(STORAGE_KEY, payload);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get the current wishlist as an array of entry objects.
   *
   * Contract: returns an array of `{ productId: string }` objects (NOT bare
   * id strings). Use `.map(e => e.productId)` if you need raw ids. The returned
   * array is a fresh copy and safe to mutate without affecting storage.
   *
   * @param {Storage} [storage]
   * @returns {Array<{ productId: string }>}
   */
  function getWishlist(storage) {
    return readState(storage).wishlist;
  }

  /**
   * Number of items currently in the wishlist (Property 12 / navbar count).
   *
   * @param {Storage} [storage]
   * @returns {number}
   */
  function getWishlistCount(storage) {
    return readState(storage).wishlist.length;
  }

  /**
   * Whether a product is already in the wishlist.
   *
   * @param {*} productId
   * @param {Storage} [storage]
   * @returns {boolean}
   */
  function isInWishlist(productId, storage) {
    const id = normalizeProductId(productId);
    if (!id) {
      return false;
    }
    const wishlist = readState(storage).wishlist;
    for (let i = 0; i < wishlist.length; i++) {
      if (wishlist[i].productId === id) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add a product to the wishlist (Requirement 4.1).
   *
   * IDEMPOTENT (Property 12): adding the same `productId` more than once yields
   * exactly ONE entry. Invalid ids (nullish/empty) are ignored and leave the
   * wishlist unchanged. On a genuine add, the count increases by exactly one.
   *
   * @param {*} productId
   * @param {Storage} [storage]
   * @returns {Array<{ productId: string }>} The updated wishlist.
   */
  function addToWishlist(productId, storage) {
    const id = normalizeProductId(productId);
    const state = readState(storage);
    if (!id) {
      // Nothing valid to add — return the current wishlist unchanged.
      return state.wishlist;
    }

    // Idempotence: do not add a duplicate entry.
    for (let i = 0; i < state.wishlist.length; i++) {
      if (state.wishlist[i].productId === id) {
        return state.wishlist;
      }
    }

    const updated = state.wishlist.concat([{ productId: id }]);
    writeState(updated, storage);
    return updated;
  }

  /**
   * Remove a product from the wishlist (Requirement 4.3).
   *
   * Removing an id that is not present is a no-op. Returns the updated wishlist.
   *
   * @param {*} productId
   * @param {Storage} [storage]
   * @returns {Array<{ productId: string }>} The updated wishlist.
   */
  function removeFromWishlist(productId, storage) {
    const id = normalizeProductId(productId);
    const state = readState(storage);
    if (!id) {
      return state.wishlist;
    }

    const updated = state.wishlist.filter(function (entry) {
      return entry.productId !== id;
    });

    if (updated.length !== state.wishlist.length) {
      writeState(updated, storage);
    }
    return updated;
  }

  /**
   * Bridge a wishlist item into the cart (Requirement 4.4).
   *
   * This module is intentionally decoupled from the cart implementation
   * (`js/lib/cart-logic.js` / `js/cart.js`) so it stays pure-ish and testable.
   *
   * Contract:
   *  - Builds a minimal cart payload `{ productId }` for the given id.
   *  - If `addToCart` is a function, it is invoked with `(payload)` and this
   *    function returns `{ added: true, productId, result }` where `result` is
   *    whatever the callback returned (e.g. the updated cart).
   *  - If no callback is provided, returns `{ added: false, productId, payload }`
   *    so the caller can perform the cart add itself.
   *  - For an invalid id, returns `{ added: false, productId: null }` and does
   *    not call the callback.
   *  - The wishlist itself is left unchanged (Req 4.4 only requires adding to
   *    the cart; removal, if desired, is the caller's decision).
   *
   * @param {*} productId
   * @param {function({ productId: string }): *} [addToCart] - Cart-add callback.
   * @param {Storage} [storage]
   * @returns {{ added: boolean, productId: ?string, payload?: object, result?: * }}
   */
  function addWishlistItemToCart(productId, addToCart, storage) {
    const id = normalizeProductId(productId);
    if (!id) {
      return { added: false, productId: null };
    }

    const payload = { productId: id };

    if (typeof addToCart === 'function') {
      const result = addToCart(payload);
      return { added: true, productId: id, result: result };
    }

    return { added: false, productId: id, payload: payload };
  }

  /**
   * Empty the wishlist (shared by `clearOnLogout`).
   *
   * Fully removes the `punnagai_wishlist` key from storage so the next read
   * starts from a clean, empty state.
   *
   * @param {Storage} [storage]
   * @returns {Array<{ productId: string }>} Always an empty array.
   */
  function clearWishlist(storage) {
    const store = getStorage(storage);
    if (store) {
      try {
        store.removeItem(STORAGE_KEY);
      } catch (e) {
        // If removeItem is unavailable/throws, fall back to writing empty.
        writeState([], storage);
      }
    }
    return [];
  }

  /**
   * Clear the wishlist on logout (Requirement 4.5 / Property 13).
   *
   * Guarantees that, for any prior wishlist contents, the wishlist is empty for
   * the next session: after this call `getWishlist()` returns `[]` and
   * `getWishlistCount()` returns 0 (Req 4.6). Implemented by fully clearing the
   * `punnagai_wishlist` key.
   *
   * @param {Storage} [storage]
   * @returns {Array<{ productId: string }>} Always an empty array.
   */
  function clearOnLogout(storage) {
    return clearWishlist(storage);
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    setStorage: setStorage,
    getStorage: getStorage,
    getWishlist: getWishlist,
    getWishlistCount: getWishlistCount,
    isInWishlist: isInWishlist,
    addToWishlist: addToWishlist,
    removeFromWishlist: removeFromWishlist,
    addWishlistItemToCart: addWishlistItemToCart,
    clearWishlist: clearWishlist,
    clearOnLogout: clearOnLogout,
  };
});
