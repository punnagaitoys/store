/**
 * Inventory model — Punnagai Toys E-Commerce Platform
 *
 * Pure, framework-free logic for per-SKU stock tracking, the stock-based
 * variant visibility rule, requested-quantity clamping, and stock-adjustment
 * helpers used later by orders (deplete) and refunds (restore).
 *
 * This module follows the UMD-style dual-export pattern (see
 * `js/lib/_umd-template.js` and `js/lib/README.md`): it attaches its API to
 * `window.PunnagaiInventoryModel` in the browser AND to `module.exports` under
 * Node/Jest. It contains NO DOM, NO Firebase, and NO localStorage access.
 *
 * Requirements covered:
 *  - 9.5: When inventory reaches zero for a variant, hide that variant from the
 *         product detail page (NOT shown with an "Out of Stock" label).
 *  - 9.7: When inventory reaches zero, the variant is hidden.
 *  - 9.8: When inventory is replenished, the variant becomes available again.
 *  - 3.2: Quantity changes are bounded (minimum 1, maximum available stock).
 *
 * Property 20 (Variant Stock Visibility Rule): a variant is visible if and only
 * if its stock is strictly greater than zero. This is implemented as a pure
 * function of current stock, so 9.7 (hide at zero) and 9.8 (show when
 * replenished) are both satisfied automatically as stock changes.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiInventoryModel = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  /**
   * Normalize a stock value to a safe, non-negative integer.
   *
   * Any non-finite, negative, or fractional input is coerced: negatives become
   * 0, fractions are floored, and non-numbers become 0. This keeps every other
   * function in the module total (defined for all inputs).
   *
   * @param {*} stock - Raw stock value (ideally a non-negative integer).
   * @returns {number} A non-negative integer stock level.
   */
  function normalizeStock(stock) {
    const n = Number(stock);
    if (!Number.isFinite(n) || n <= 0) {
      return 0;
    }
    return Math.floor(n);
  }

  /**
   * Read the current stock level of a variant as a non-negative integer.
   *
   * @param {{ stock?: number }} variant - A variant/SKU record.
   * @returns {number} The variant's normalized stock (0 if missing/invalid).
   */
  function getStock(variant) {
    if (!variant || typeof variant !== 'object') {
      return 0;
    }
    return normalizeStock(variant.stock);
  }

  /**
   * Determine whether a variant is in stock (stock > 0).
   *
   * @param {{ stock?: number }} variant - A variant/SKU record.
   * @returns {boolean} True when normalized stock is strictly greater than 0.
   */
  function isInStock(variant) {
    return getStock(variant) > 0;
  }

  /**
   * Stock visibility rule (Property 20 — Requirement 9.5).
   *
   * A variant is visible as a selectable option if and only if it has stock
   * remaining. Out-of-stock variants are hidden entirely; they are NOT shown
   * with an "Out of Stock" label. Because visibility is a pure function of the
   * current stock value, replenishing stock (9.8) automatically makes the
   * variant visible again, and depleting it to zero (9.7) hides it.
   *
   * @param {{ stock?: number }} variant - A variant/SKU record.
   * @returns {boolean} True when the variant should be shown to customers.
   */
  function isVariantVisible(variant) {
    return isInStock(variant);
  }

  /**
   * Filter a list of variants down to only those that should be visible.
   *
   * @param {Array<{ stock?: number }>} variants - Variant/SKU records.
   * @returns {Array<{ stock?: number }>} Only the in-stock (visible) variants.
   */
  function visibleVariants(variants) {
    if (!Array.isArray(variants)) {
      return [];
    }
    return variants.filter(isVariantVisible);
  }

  /**
   * Clamp a requested quantity to the purchasable range for a given stock
   * level (Requirement 3.2: minimum 1, maximum available stock).
   *
   * Behavior:
   *  - When stock is 0 the variant is unavailable, so this returns 0 (there is
   *    no valid quantity to purchase; callers should treat 0 as "cannot add").
   *  - Otherwise the result is bounded to the inclusive range [1, stock].
   *  - Requests below 1 are raised to 1; requests above stock are lowered to
   *    stock; fractional requests are floored.
   *
   * @param {number} requested - The quantity the customer asked for.
   * @param {number} stock - Available stock for the variant.
   * @returns {number} A clamped quantity: 0 when stock is 0, otherwise within
   *                   [1, stock].
   */
  function clampQuantity(requested, stock) {
    const available = normalizeStock(stock);
    if (available === 0) {
      // No stock available — there is no valid purchasable quantity.
      return 0;
    }

    const req = Number(requested);
    if (!Number.isFinite(req) || req < 1) {
      // Anything below the minimum (including invalid input) clamps to 1.
      return 1;
    }

    const flooredReq = Math.floor(req);
    if (flooredReq > available) {
      return available;
    }
    return flooredReq;
  }

  /**
   * Return a NEW variant object with its stock adjusted by `delta`, never
   * dropping below zero. The input variant is not mutated.
   *
   * Positive deltas add stock (e.g. refund restoration); negative deltas remove
   * stock (e.g. order fulfilment). The resulting stock is a non-negative
   * integer.
   *
   * @param {object} variant - The variant/SKU record to adjust.
   * @param {number} delta - Amount to add (positive) or remove (negative).
   * @returns {object} A new variant object with updated, non-negative stock.
   */
  function adjustStock(variant, delta) {
    const base = variant && typeof variant === 'object' ? variant : {};
    const current = getStock(base);
    const change = Number(delta);
    const safeChange = Number.isFinite(change) ? Math.trunc(change) : 0;
    const nextStock = Math.max(0, current + safeChange);
    return Object.assign({}, base, { stock: nextStock });
  }

  /**
   * Deplete a variant's stock by `quantity` (used when an order is placed).
   *
   * @param {object} variant - The variant/SKU record.
   * @param {number} quantity - Units to remove (treated as a magnitude).
   * @returns {object} A new variant object with reduced, non-negative stock.
   */
  function depleteStock(variant, quantity) {
    const qty = Math.abs(Number(quantity)) || 0;
    return adjustStock(variant, -qty);
  }

  /**
   * Restore a variant's stock by `quantity` (used when an order is refunded or
   * cancelled — Requirement 10.6 inventory restoration relies on this helper).
   *
   * @param {object} variant - The variant/SKU record.
   * @param {number} quantity - Units to add back (treated as a magnitude).
   * @returns {object} A new variant object with increased stock.
   */
  function restoreStock(variant, quantity) {
    const qty = Math.abs(Number(quantity)) || 0;
    return adjustStock(variant, qty);
  }

  return {
    normalizeStock,
    getStock,
    isInStock,
    isVariantVisible,
    visibleVariants,
    clampQuantity,
    adjustStock,
    depleteStock,
    restoreStock,
  };
});
