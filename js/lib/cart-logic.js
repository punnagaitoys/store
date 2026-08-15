/**
 * Cart logic — Punnagai Toys E-Commerce Platform
 *
 * Pure, framework-free shopping-cart math and coupon validation. This is the
 * calculation/logic counterpart to the browser/localStorage glue in
 * `js/cart.js`; it never touches the DOM, Firebase, or localStorage.
 *
 * It follows the UMD-style dual-export pattern (see `js/lib/_umd-template.js`
 * and `js/lib/README.md`): the API is attached to `window.PunnagaiCartLogic`
 * in the browser AND to `module.exports` under Node/Jest.
 *
 * Cart items handled here are denormalized snapshots keyed by a stable
 * `productId + variantId/skuId` key. Every operation is PURE: it takes the
 * items array and returns a NEW array, never mutating the input.
 *
 * Requirements covered:
 *  - 3.1: Adding an item increases the cart count by the quantity added; the
 *         same variant added again increments the existing line (Property 7).
 *  - 3.2: Updating quantity sets it (min 1, optionally clamped to stock) and
 *         recalculates the line total (Property 8).
 *  - 3.3: Removing an item removes the entire quantity of that variant.
 *  - 3.4: The cart total equals the line-item sum minus any discount, floored
 *         at 0 (Property 9).
 *  - 3.6: Coupon codes can be applied to the cart.
 *  - 3.7: Coupon validation is consistent — valid coupons within expiry and
 *         usage limits apply a discount; expired/invalid coupons are rejected
 *         with an appropriate reason (Property 10 / Property 22).
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiCartLogic = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  // --------------------------------------------------------------------------
  // Internal numeric helpers
  // --------------------------------------------------------------------------

  /**
   * Coerce a value to a finite number, falling back to `fallback` (default 0)
   * for non-finite input. Keeps every public function total.
   * @param {*} value
   * @param {number} [fallback=0]
   * @returns {number}
   */
  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback || 0;
  }

  /**
   * Coerce a value to a positive integer quantity (minimum 1). Fractions are
   * floored; anything below 1 or invalid becomes 1.
   * @param {*} value
   * @returns {number}
   */
  function toQuantity(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) {
      return 1;
    }
    return Math.floor(n);
  }

  /**
   * Read a cart item's unit price. Supports `unitPrice` first, then `price`
   * as a fallback (matching both the design's Property 9 items and the
   * denormalized cart snapshots used in `js/cart.js`).
   * @param {object} item
   * @returns {number}
   */
  function getUnitPrice(item) {
    if (!item || typeof item !== 'object') {
      return 0;
    }
    if (item.unitPrice !== undefined && item.unitPrice !== null) {
      return toNumber(item.unitPrice);
    }
    return toNumber(item.price);
  }

  // --------------------------------------------------------------------------
  // Item identity & line totals
  // --------------------------------------------------------------------------

  /**
   * Build a stable key for a cart item from its productId and variant/SKU id.
   *
   * The variant portion prefers `variantId`, then `skuId`, falling back to an
   * empty string for simple (variant-less) products. This is the key callers
   * pass to `updateQuantity` and `removeItem`.
   *
   * @param {{ productId?: string, variantId?: string, skuId?: string }} item
   * @returns {string}
   */
  function itemKey(item) {
    if (!item || typeof item !== 'object') {
      return '';
    }
    const productId =
      item.productId !== undefined && item.productId !== null ? String(item.productId) : '';
    const variant =
      item.variantId !== undefined && item.variantId !== null
        ? String(item.variantId)
        : item.skuId !== undefined && item.skuId !== null
          ? String(item.skuId)
          : '';
    return productId + '::' + variant;
  }

  /**
   * Compute the line total for a single item (quantity × unit price).
   * @param {object} item
   * @returns {number}
   */
  function lineTotal(item) {
    return toQuantity(item && item.quantity) * getUnitPrice(item);
  }

  /**
   * Normalize an array input to a real array (defensive against null/undefined).
   * @param {*} items
   * @returns {Array}
   */
  function asArray(items) {
    return Array.isArray(items) ? items : [];
  }

  // --------------------------------------------------------------------------
  // Pure cart operations (never mutate the input array or its items)
  // --------------------------------------------------------------------------

  /**
   * Add a variant to the cart (Requirement 3.1 / Property 7).
   *
   * If the same `productId + variantId/skuId` is already present, the existing
   * line's quantity is incremented by the added quantity; otherwise a new line
   * is appended. The cart's total item count therefore increases by exactly the
   * quantity added. Returns a NEW array; neither the input array nor its items
   * are mutated.
   *
   * @param {Array<object>} items - Current cart items.
   * @param {object} item - The variant to add; its `quantity` (default 1) is
   *                         the amount to add.
   * @returns {Array<object>} A new cart items array.
   */
  function addItem(items, item) {
    const current = asArray(items);
    if (!item || typeof item !== 'object') {
      return current.slice();
    }

    const key = itemKey(item);
    const addQty = toQuantity(item.quantity);
    let found = false;

    const next = current.map(function (existing) {
      if (!found && itemKey(existing) === key) {
        found = true;
        return Object.assign({}, existing, {
          quantity: toQuantity(existing.quantity) + addQty
        });
      }
      return existing;
    });

    if (!found) {
      next.push(Object.assign({}, item, { quantity: addQty }));
    }

    return next;
  }

  /**
   * Set the quantity of a cart line (Requirement 3.2 / Property 8).
   *
   * The quantity is bounded to a minimum of 1. When a positive `stock` is
   * supplied, the quantity is also clamped to that stock ceiling. The matching
   * line's `lineTotal` field is recalculated to keep it consistent with the new
   * quantity. Returns a NEW array; the input is not mutated. Lines that do not
   * match `key` are returned unchanged.
   *
   * @param {Array<object>} items - Current cart items.
   * @param {string} key - The stable item key (see `itemKey`).
   * @param {number} quantity - The desired quantity (min 1).
   * @param {number} [stock] - Optional available stock; when > 0 the quantity
   *                           is clamped to this maximum.
   * @returns {Array<object>} A new cart items array.
   */
  function updateQuantity(items, key, quantity, stock) {
    const current = asArray(items);
    let nextQty = toQuantity(quantity);

    const hasStock = stock !== undefined && stock !== null && Number.isFinite(Number(stock));
    const stockCeiling = hasStock ? Math.floor(Number(stock)) : null;
    if (stockCeiling !== null && stockCeiling >= 1 && nextQty > stockCeiling) {
      nextQty = stockCeiling;
    }

    return current.map(function (existing) {
      if (itemKey(existing) !== key) {
        return existing;
      }
      const updated = Object.assign({}, existing, { quantity: nextQty });
      updated.lineTotal = nextQty * getUnitPrice(updated);
      return updated;
    });
  }

  /**
   * Remove a variant entirely from the cart (Requirement 3.3).
   *
   * All quantity of the matching line is removed (a single call clears the line
   * regardless of its quantity). Returns a NEW array; the input is not mutated.
   *
   * @param {Array<object>} items - Current cart items.
   * @param {string} key - The stable item key to remove.
   * @returns {Array<object>} A new cart items array without the matching line.
   */
  function removeItem(items, key) {
    return asArray(items).filter(function (existing) {
      return itemKey(existing) !== key;
    });
  }

  // --------------------------------------------------------------------------
  // Totals & discounts
  // --------------------------------------------------------------------------

  /**
   * Sum of all line items (quantity × unit price), before any discount.
   * @param {Array<object>} items
   * @returns {number}
   */
  function calculateSubtotal(items) {
    return asArray(items).reduce(function (sum, item) {
      return sum + lineTotal(item);
    }, 0);
  }

  /**
   * Resolve a discount amount (in currency units) from a subtotal and a
   * flexible `discount` argument.
   *
   * Contract:
   *  - A plain number is treated as a PERCENTAGE: amount = floor(subtotal * n / 100).
   *    (This is the path the design's Property 9 test exercises with an integer
   *    percentage in 0..50.)
   *  - An object `{ discountType | type, discountValue | value }`:
   *      • 'percentage' → floor(subtotal * value / 100)
   *      • 'fixed'      → value (a flat amount off)
   *  - Anything else (null/undefined/invalid) → 0.
   * The amount is always clamped to the range [0, subtotal].
   *
   * @param {number} subtotal
   * @param {number|object} discount
   * @returns {number} Discount amount in currency units.
   */
  function resolveDiscountAmount(subtotal, discount) {
    const base = toNumber(subtotal);
    if (base <= 0 || discount === null || discount === undefined) {
      return 0;
    }

    let amount = 0;

    if (typeof discount === 'object') {
      const type = discount.discountType || discount.type || 'percentage';
      const value = toNumber(
        discount.discountValue !== undefined ? discount.discountValue : discount.value
      );
      if (type === 'fixed') {
        amount = value;
      } else {
        amount = Math.floor((base * value) / 100);
      }
    } else {
      // Number → percentage path (matches Property 9 test convention).
      const percent = toNumber(discount);
      amount = Math.floor((base * percent) / 100);
    }

    if (!Number.isFinite(amount) || amount < 0) {
      return 0;
    }
    return Math.min(amount, base);
  }

  /**
   * Calculate the cart total (Requirement 3.4 / Property 9).
   *
   * total = max(0, subtotal − discountAmount)
   *
   * where subtotal is the sum of (quantity × unit price) across all items and
   * discountAmount is resolved from `discount` (see `resolveDiscountAmount`).
   * For the common integer-percentage call `calculateCartTotal(items, p)` this
   * is exactly `subtotal − Math.floor(subtotal * p / 100)`.
   *
   * @param {Array<object>} items - Cart items with `quantity` and `unitPrice`
   *                                (or `price`).
   * @param {number|object} [discount=0] - Percentage number, or a discount
   *                                object `{ type/discountType, value/discountValue }`.
   * @returns {number} The cart total, floored at 0.
   */
  function calculateCartTotal(items, discount) {
    const subtotal = calculateSubtotal(items);
    const discountAmount = resolveDiscountAmount(subtotal, discount);
    return Math.max(0, subtotal - discountAmount);
  }

  // --------------------------------------------------------------------------
  // Coupon validation
  // --------------------------------------------------------------------------

  /**
   * Parse a date-like value (Date, ISO string, epoch number, or a Firestore-
   * style `{ seconds }` / `{ toDate() }` timestamp) into a millisecond
   * timestamp. Returns NaN when it cannot be parsed.
   * @param {*} value
   * @returns {number}
   */
  function toMillis(value) {
    if (value === null || value === undefined) {
      return NaN;
    }
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === 'object') {
      if (typeof value.toDate === 'function') {
        const d = value.toDate();
        return d instanceof Date ? d.getTime() : NaN;
      }
      if (typeof value.seconds === 'number') {
        return value.seconds * 1000;
      }
      return NaN;
    }
    if (typeof value === 'number') {
      return value;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? NaN : parsed;
  }

  /**
   * Validate a coupon against a cart (Requirements 3.6, 3.7 / Properties 10, 22).
   *
   * This is a PURE function: the coupon record is passed in (never fetched from
   * Firestore here), and `now` can be supplied for deterministic testing.
   *
   * Checks, in order:
   *  1. Coupon exists and its `code` matches the entered `code` (case-insensitive).
   *  2. Coupon is `active`.
   *  3. Not expired — the current time is not after `expiryDate`.
   *  4. Usage limit not reached — `usageCount` < `usageLimit` (a limit of 0 or
   *     missing means unlimited).
   *  5. Cart subtotal meets `minOrderValue`.
   *
   * On success returns `{ valid: true, discountAmount, code }`. On failure
   * returns `{ valid: false, reason, discountAmount: 0 }` with a user-facing
   * reason string.
   *
   * @param {string} code - The coupon code entered by the customer.
   * @param {Array<object>} cart - Current cart items (for subtotal/min-order).
   * @param {object} coupon - The coupon record (see `coupons` collection).
   * @param {number|Date} [now=Date.now()] - Current time, for testability.
   * @returns {{ valid: boolean, reason?: string, discountAmount: number, code?: string }}
   */
  function validateCoupon(code, cart, coupon, now) {
    const entered = (code === undefined || code === null ? '' : String(code)).trim();

    if (!entered) {
      return { valid: false, reason: 'No coupon code entered', discountAmount: 0 };
    }
    if (!coupon || typeof coupon !== 'object') {
      return { valid: false, reason: 'Coupon code not found or expired', discountAmount: 0 };
    }

    const couponCode = (
      coupon.code === undefined || coupon.code === null ? '' : String(coupon.code)
    ).trim();
    if (couponCode.toUpperCase() !== entered.toUpperCase()) {
      return { valid: false, reason: 'Coupon code not found or expired', discountAmount: 0 };
    }

    if (coupon.active === false) {
      return { valid: false, reason: 'This coupon is no longer active', discountAmount: 0 };
    }

    // Expiry check (Property 22): reject when current time is after expiry.
    const expiryMs = toMillis(coupon.expiryDate);
    if (Number.isFinite(expiryMs)) {
      const nowMs = now instanceof Date ? now.getTime() : toNumber(now, Date.now());
      if (nowMs > expiryMs) {
        return { valid: false, reason: 'This coupon has expired', discountAmount: 0 };
      }
    }

    // Usage limit check (Property 22): a limit of 0/missing means unlimited.
    const usageLimit = toNumber(coupon.usageLimit);
    const usageCount = toNumber(coupon.usageCount);
    if (usageLimit > 0 && usageCount >= usageLimit) {
      return { valid: false, reason: 'This coupon has reached its usage limit', discountAmount: 0 };
    }

    // Minimum order value check.
    const subtotal = calculateSubtotal(cart);
    const minOrderValue = toNumber(coupon.minOrderValue);
    if (minOrderValue > 0 && subtotal < minOrderValue) {
      return {
        valid: false,
        reason: 'Add more to your cart to use this coupon (minimum order ₹' + minOrderValue + ')',
        discountAmount: 0
      };
    }

    // Valid — compute the discount amount the coupon would apply.
    const discountAmount = resolveDiscountAmount(subtotal, {
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    });

    return { valid: true, discountAmount: discountAmount, code: couponCode };
  }

  return {
    itemKey,
    lineTotal,
    addItem,
    updateQuantity,
    removeItem,
    calculateSubtotal,
    resolveDiscountAmount,
    calculateCartTotal,
    validateCoupon
  };
});
