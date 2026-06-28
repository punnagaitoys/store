/**
 * admin-coupons.js — Admin discount & coupon management (Punnagai / Punnagai Toy Store)
 *
 * Implements Requirement 11 (Admin Panel — Discount and Coupon Management):
 *  - 11.1/11.2/11.3: Create product discounts (percentage | fixed) and derive
 *    the discounted price shown on cards / detail pages.
 *  - 11.4/11.5: Generate a unique, alphanumeric coupon code with discount type,
 *    value, expiry date, and usage limit, and store it.
 *  - 11.6/11.7/11.8: Validate a code at checkout against expiry + usage limit,
 *    applying the discount when valid or rejecting with an error otherwise.
 *  - 11.9: List active coupons for the admin (code, discount, usage, expiry).
 *  - 11.10: Deactivate a coupon to prevent future use.
 *
 * Correctness properties this module is built to satisfy (Req 11):
 *  - Invariant: a coupon's usageCount SHALL never exceed its usageLimit
 *    (`incrementUsage`).
 *  - Idempotence: applying the SAME coupon twice at checkout applies the
 *    discount only once (`applyCouponOnce`).
 *
 * Structure: this file follows the UMD-style dual-export pattern (see
 * js/lib/_umd-template.js / js/lib/README.md). The PURE business rules
 * (code generation, discounted-price math, usage-limit enforcement, single
 * application) have no DOM / Firebase / localStorage dependency so they are
 * unit- and property-testable under Jest. The side-effectful glue
 * (create/validate/deactivate against the data layer) is browser-oriented and
 * delegates persistence to the hybrid data layer in `js/data.js`
 * (USE_LOCAL_MODE aware) and audit logging to `js/lib/audit.js`. Coupon
 * VALIDATION reuses `validateCoupon` from `js/lib/cart-logic.js` rather than
 * duplicating the expiry / usage / min-order checks.
 *
 * Data-layer functions (createCoupon, getCoupons, getCouponByCode,
 * updateCoupon, updateProduct, createAuditLog) and dependency modules are
 * resolved at call time from browser globals first, then via require() under
 * Node, so the pure core stays import-safe in Jest.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiAdminCoupons = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  // --------------------------------------------------------------------------
  // Constants
  // --------------------------------------------------------------------------

  // Unambiguous uppercase alphanumeric alphabet for generated codes. Excludes
  // visually confusable characters (0/O, 1/I) so codes are easy to read aloud
  // and type. Codes are stored upper-cased to match the data layer.
  const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const DEFAULT_CODE_LENGTH = 8;
  const MAX_UNIQUE_ATTEMPTS = 50;
  const VALID_DISCOUNT_TYPES = ['percentage', 'fixed'];

  // --------------------------------------------------------------------------
  // Lazy dependency resolution (browser globals first, then Node require)
  // --------------------------------------------------------------------------

  function getCartLogic() {
    if (typeof window !== 'undefined' && window.PunnagaiCartLogic) {
      return window.PunnagaiCartLogic;
    }
    if (typeof require === 'function') {
      try { return require('./lib/cart-logic'); } catch (e) { /* not available */ }
    }
    return null;
  }

  function getAudit() {
    if (typeof window !== 'undefined' && window.PunnagaiAudit) {
      return window.PunnagaiAudit;
    }
    if (typeof require === 'function') {
      try { return require('./lib/audit'); } catch (e) { /* not available */ }
    }
    return null;
  }

  /**
   * Resolve a data-layer function by name. In the browser the functions in
   * `js/data.js` are globals on `window`; under Node they are not loaded, so
   * callers degrade gracefully.
   * @param {string} name
   * @returns {Function|null}
   */
  function dataFn(name) {
    if (typeof window !== 'undefined' && typeof window[name] === 'function') {
      return window[name];
    }
    if (typeof globalThis !== 'undefined' && typeof globalThis[name] === 'function') {
      return globalThis[name];
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Pure numeric / string helpers
  // --------------------------------------------------------------------------

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  /** Normalize a coupon code for comparison/storage (trimmed, upper-cased). */
  function normalizeCode(code) {
    return (code === undefined || code === null ? '' : String(code)).trim().toUpperCase();
  }

  // --------------------------------------------------------------------------
  // PURE: unique alphanumeric coupon-code generation (Req 11.5)
  // --------------------------------------------------------------------------

  /**
   * Generate a single random alphanumeric coupon code.
   *
   * Pure & deterministic when a `randomFn` is supplied (it must return a float
   * in [0, 1), like Math.random). The result is always uppercase alphanumeric
   * and exactly `length` characters long.
   *
   * @param {number} [length=DEFAULT_CODE_LENGTH] - desired code length (min 4).
   * @param {() => number} [randomFn=Math.random] - RNG returning [0,1).
   * @returns {string}
   */
  function generateCouponCode(length, randomFn) {
    const rng = typeof randomFn === 'function' ? randomFn : Math.random;
    let n = Math.floor(toNumber(length, DEFAULT_CODE_LENGTH));
    if (!Number.isFinite(n) || n < 4) {
      n = DEFAULT_CODE_LENGTH;
    }
    let code = '';
    for (let i = 0; i < n; i += 1) {
      const r = rng();
      const idx = Math.abs(Math.floor(r * CODE_ALPHABET.length)) % CODE_ALPHABET.length;
      code += CODE_ALPHABET.charAt(idx);
    }
    return code;
  }

  /**
   * Whether `code` is NOT already present in `existingCodes` (case-insensitive).
   * @param {string} code
   * @param {Array<string>} existingCodes
   * @returns {boolean}
   */
  function isCodeUnique(code, existingCodes) {
    const target = normalizeCode(code);
    if (!target) {
      return false;
    }
    const taken = Array.isArray(existingCodes) ? existingCodes.map(normalizeCode) : [];
    return taken.indexOf(target) === -1;
  }

  /**
   * Generate a coupon code guaranteed to be unique against `existingCodes`.
   *
   * Pure & deterministic when `randomFn` is supplied. Retries up to
   * MAX_UNIQUE_ATTEMPTS, growing the length on the final attempts to guarantee
   * termination even for small alphabets / large existing sets.
   *
   * @param {Array<string>} existingCodes - codes already in use.
   * @param {{ length?: number, randomFn?: () => number }} [opts]
   * @returns {string} a unique, uppercase alphanumeric code.
   */
  function generateUniqueCouponCode(existingCodes, opts) {
    const options = opts || {};
    const baseLength = Math.floor(toNumber(options.length, DEFAULT_CODE_LENGTH));
    const rng = typeof options.randomFn === 'function' ? options.randomFn : Math.random;

    for (let attempt = 0; attempt < MAX_UNIQUE_ATTEMPTS; attempt += 1) {
      // Grow the code length on later attempts to expand the keyspace.
      const length = baseLength + Math.floor(attempt / 10);
      const candidate = generateCouponCode(length, rng);
      if (isCodeUnique(candidate, existingCodes)) {
        return candidate;
      }
    }
    // Extremely unlikely fallback: append entropy until unique.
    let fallback = generateCouponCode(baseLength + 4, rng);
    while (!isCodeUnique(fallback, existingCodes)) {
      fallback += CODE_ALPHABET.charAt(Math.floor(rng() * CODE_ALPHABET.length));
    }
    return fallback;
  }

  // --------------------------------------------------------------------------
  // PURE: product discount math (Req 11.1, 11.3)
  // --------------------------------------------------------------------------

  /**
   * Whether a discount type string is valid.
   * @param {string} type
   * @returns {boolean}
   */
  function isValidDiscountType(type) {
    return VALID_DISCOUNT_TYPES.indexOf(String(type)) !== -1;
  }

  /**
   * Compute the discounted price for a product (Req 11.1, 11.3).
   *
   *  - 'percentage' → price − floor(price × value / 100)
   *  - 'fixed'      → price − value
   * The result is floored at 0 and never exceeds the original price. Invalid
   * input returns the original price unchanged.
   *
   * @param {number} price - original (base) price.
   * @param {string} discountType - 'percentage' | 'fixed'.
   * @param {number} discountValue - percentage points or flat amount.
   * @returns {number} the discounted price.
   */
  function computeDiscountedPrice(price, discountType, discountValue) {
    const base = toNumber(price);
    if (base <= 0 || !isValidDiscountType(discountType)) {
      return Math.max(0, base);
    }
    const value = toNumber(discountValue);
    if (value <= 0) {
      return base;
    }
    let discounted;
    if (discountType === 'percentage') {
      discounted = base - Math.floor((base * Math.min(value, 100)) / 100);
    } else {
      discounted = base - value;
    }
    if (!Number.isFinite(discounted) || discounted < 0) {
      return 0;
    }
    return Math.min(discounted, base);
  }

  /**
   * Build the discount fields to persist on a product so the storefront can
   * show original vs. discounted price (Req 11.2, 11.3). Returns null when the
   * discount is invalid.
   *
   * @param {number} price - the product's base price.
   * @param {string} discountType - 'percentage' | 'fixed'.
   * @param {number} discountValue
   * @returns {{ discountType: string, discountValue: number, price: number, originalPrice: number }|null}
   */
  function buildProductDiscountUpdate(price, discountType, discountValue) {
    if (!isValidDiscountType(discountType)) {
      return null;
    }
    const base = toNumber(price);
    const value = toNumber(discountValue);
    if (base <= 0 || value <= 0) {
      return null;
    }
    const discounted = computeDiscountedPrice(base, discountType, value);
    return {
      discountType: discountType,
      discountValue: value,
      // Keep `originalPrice` so cards/detail pages can show the strike-through.
      originalPrice: base,
      price: discounted
    };
  }

  // --------------------------------------------------------------------------
  // PURE: usage-limit enforcement (Req 11 Invariant) & single application
  // --------------------------------------------------------------------------

  /**
   * Whether a coupon has remaining usages. A usageLimit of 0 (or missing) is
   * treated as unlimited.
   * @param {object} coupon
   * @returns {boolean}
   */
  function hasRemainingUsage(coupon) {
    if (!coupon || typeof coupon !== 'object') {
      return false;
    }
    const limit = toNumber(coupon.usageLimit);
    const count = toNumber(coupon.usageCount);
    if (limit <= 0) {
      return true; // unlimited
    }
    return count < limit;
  }

  /**
   * Increment a coupon's usage count by one WITHOUT ever exceeding its limit
   * (Req 11 Invariant: usageCount SHALL never exceed usageLimit).
   *
   * Pure: returns a NEW coupon object; the input is never mutated. When the
   * coupon is already at its limit the call fails and the count is left
   * unchanged, so the invariant `usageCount <= usageLimit` always holds.
   *
   * @param {object} coupon - a coupon record.
   * @returns {{ success: boolean, coupon: object, reason?: string }}
   */
  function incrementUsage(coupon) {
    if (!coupon || typeof coupon !== 'object') {
      return { success: false, coupon: coupon, reason: 'Invalid coupon' };
    }
    const limit = toNumber(coupon.usageLimit);
    const count = toNumber(coupon.usageCount);

    if (limit > 0 && count >= limit) {
      // Already exhausted — do not increment; preserve the invariant.
      return {
        success: false,
        coupon: Object.assign({}, coupon, { usageCount: Math.min(count, limit) }),
        reason: 'This coupon has reached its usage limit'
      };
    }

    const nextCount = count + 1;
    const cappedCount = limit > 0 ? Math.min(nextCount, limit) : nextCount;
    return {
      success: true,
      coupon: Object.assign({}, coupon, { usageCount: cappedCount })
    };
  }

  /**
   * Apply a (validated) coupon to a checkout state exactly once
   * (Req 11 Idempotence: applying the SAME coupon twice applies the discount
   * only once).
   *
   * The checkout state carries the list of already-applied codes and the
   * accumulated discount. Re-applying a code that is already present is a no-op
   * (the discount is not added a second time). Pure: returns a NEW state; the
   * input is not mutated.
   *
   * @param {{ appliedCodes?: Array<string>, discountAmount?: number }} state
   * @param {string} code - the coupon code being applied.
   * @param {number} discountAmount - the discount this code contributes.
   * @returns {{ appliedCodes: Array<string>, discountAmount: number, applied: boolean }}
   */
  function applyCouponOnce(state, code, discountAmount) {
    const src = (state && typeof state === 'object') ? state : {};
    const applied = Array.isArray(src.appliedCodes) ? src.appliedCodes.map(normalizeCode) : [];
    const current = toNumber(src.discountAmount);
    const normalized = normalizeCode(code);

    if (!normalized || applied.indexOf(normalized) !== -1) {
      // Already applied (or empty code): no change — discount counted once.
      return { appliedCodes: applied.slice(), discountAmount: current, applied: false };
    }

    return {
      appliedCodes: applied.concat(normalized),
      discountAmount: current + Math.max(0, toNumber(discountAmount)),
      applied: true
    };
  }

  // --------------------------------------------------------------------------
  // Glue: validation at checkout (Req 11.6, 11.7, 11.8) — reuses cart-logic
  // --------------------------------------------------------------------------

  /**
   * Validate a coupon record against a cart, delegating the expiry / usage /
   * min-order / active / code-match checks to `cart-logic.validateCoupon`
   * (single source of truth — no duplication). Pure when `now` is supplied.
   *
   * @param {string} code
   * @param {Array<object>} cart
   * @param {object} coupon - the coupon record (already fetched).
   * @param {number|Date} [now]
   * @returns {{ valid: boolean, reason?: string, discountAmount: number, code?: string }}
   */
  function validateCouponRecord(code, cart, coupon, now) {
    const cartLogic = getCartLogic();
    if (!cartLogic || typeof cartLogic.validateCoupon !== 'function') {
      return { valid: false, reason: 'Coupon validation unavailable', discountAmount: 0 };
    }
    return cartLogic.validateCoupon(code, cart, coupon, now);
  }

  /**
   * Validate a coupon code entered at checkout (Req 11.6/11.7/11.8).
   *
   * Fetches the coupon by code via the data layer, then validates it against
   * the cart. On the standard reject path it surfaces the spec's customer-facing
   * error message "Coupon code expired or invalid" (Req 11.8) while preserving
   * the detailed reason from validation for the UI/log.
   *
   * @param {string} code
   * @param {Array<object>} cart
   * @param {number|Date} [now]
   * @returns {Promise<{ valid: boolean, discountAmount: number, code?: string,
   *   message?: string, reason?: string, coupon?: object }>}
   */
  async function validateCouponAtCheckout(code, cart, now) {
    const getByCode = dataFn('getCouponByCode');
    if (!getByCode) {
      return { valid: false, discountAmount: 0, message: 'Coupon code expired or invalid', reason: 'data layer unavailable' };
    }

    const coupon = await getByCode(normalizeCode(code));
    const result = validateCouponRecord(code, cart, coupon, now);

    if (!result.valid) {
      return {
        valid: false,
        discountAmount: 0,
        // Req 11.8 customer-facing message; `reason` keeps the specific cause.
        message: 'Coupon code expired or invalid',
        reason: result.reason,
        coupon: coupon || null
      };
    }

    return {
      valid: true,
      discountAmount: result.discountAmount,
      code: result.code,
      coupon: coupon
    };
  }

  // --------------------------------------------------------------------------
  // Glue: admin create discount (Req 11.1, 11.2, 11.3)
  // --------------------------------------------------------------------------

  /**
   * Create / apply a product discount and persist it so it shows immediately on
   * the storefront (Req 11.1, 11.2, 11.3). Logs the operation via the audit log.
   *
   * @param {string} productId
   * @param {{ discountType: string, discountValue: number, price?: number }} discount
   *   `price` is the product's base price; when omitted the current product
   *   price is read from the data layer.
   * @param {string} [adminUserId]
   * @returns {Promise<{ success: boolean, discounted?: object, error?: string }>}
   */
  async function createProductDiscount(productId, discount, adminUserId) {
    if (!productId) {
      return { success: false, error: 'productId is required' };
    }
    const d = discount || {};
    if (!isValidDiscountType(d.discountType)) {
      return { success: false, error: 'discountType must be "percentage" or "fixed"' };
    }

    const updateProduct = dataFn('updateProduct');
    const getProductById = dataFn('getProductById');
    if (!updateProduct) {
      return { success: false, error: 'data layer (updateProduct) unavailable' };
    }

    // Resolve the base price: prefer the supplied price, else read the product.
    let basePrice = toNumber(d.price);
    if (basePrice <= 0 && getProductById) {
      const product = await getProductById(productId);
      basePrice = toNumber(product && (product.originalPrice || product.price));
    }

    const discountUpdate = buildProductDiscountUpdate(basePrice, d.discountType, d.discountValue);
    if (!discountUpdate) {
      return { success: false, error: 'Invalid discount: check price and discountValue' };
    }

    const result = await updateProduct(productId, discountUpdate);
    if (!result || !result.success) {
      return { success: false, error: (result && result.error) || 'Failed to update product' };
    }

    await writeAudit(adminUserId, 'CREATE_DISCOUNT', { type: 'product', id: productId }, {
      discountType: discountUpdate.discountType,
      discountValue: discountUpdate.discountValue,
      originalPrice: discountUpdate.originalPrice,
      discountedPrice: discountUpdate.price
    });

    return { success: true, discounted: discountUpdate };
  }

  // --------------------------------------------------------------------------
  // Glue: admin create coupon (Req 11.4, 11.5)
  // --------------------------------------------------------------------------

  /**
   * Create a coupon with a unique, generated alphanumeric code (Req 11.4, 11.5).
   *
   * The code is generated to be unique against all existing coupons (a caller
   * may also pass an explicit `code` to use, which is still uniqueness-checked).
   * Persists via the data layer and logs the operation.
   *
   * @param {{ discountType: string, discountValue: number, expiryDate?: *,
   *   usageLimit?: number, minOrderValue?: number, applicableCategories?: Array,
   *   code?: string, codeLength?: number }} couponData
   * @param {string} [adminUserId]
   * @returns {Promise<{ success: boolean, id?: string, code?: string, error?: string }>}
   */
  async function createCouponCode(couponData, adminUserId) {
    const data = couponData || {};
    if (!isValidDiscountType(data.discountType)) {
      return { success: false, error: 'discountType must be "percentage" or "fixed"' };
    }
    if (toNumber(data.discountValue) <= 0) {
      return { success: false, error: 'discountValue must be greater than 0' };
    }

    const createCoupon = dataFn('createCoupon');
    const getCoupons = dataFn('getCoupons');
    if (!createCoupon) {
      return { success: false, error: 'data layer (createCoupon) unavailable' };
    }

    // Gather existing codes to guarantee uniqueness (Req 11.5).
    let existingCodes = [];
    if (getCoupons) {
      const existing = await getCoupons();
      existingCodes = (Array.isArray(existing) ? existing : []).map(function (c) {
        return c && c.code;
      });
    }

    let code = normalizeCode(data.code);
    if (!code || !isCodeUnique(code, existingCodes)) {
      code = generateUniqueCouponCode(existingCodes, { length: data.codeLength });
    }

    const result = await createCoupon({
      code: code,
      discountType: data.discountType,
      discountValue: toNumber(data.discountValue),
      expiryDate: data.expiryDate || null,
      usageLimit: toNumber(data.usageLimit),
      usageCount: 0,
      minOrderValue: toNumber(data.minOrderValue),
      applicableCategories: data.applicableCategories || [],
      active: true
    });

    if (!result || !result.success) {
      return { success: false, error: (result && result.error) || 'Failed to create coupon' };
    }

    await writeAudit(adminUserId, 'CREATE_COUPON', { type: 'coupon', id: result.id }, {
      code: code,
      discountType: data.discountType,
      discountValue: toNumber(data.discountValue),
      usageLimit: toNumber(data.usageLimit),
      expiryDate: data.expiryDate || null
    });

    return { success: true, id: result.id, code: code };
  }

  // --------------------------------------------------------------------------
  // Glue: redeem (increment usage) at order completion (Req 11 Invariant)
  // --------------------------------------------------------------------------

  /**
   * Record one redemption of a coupon, enforcing the usage-count limit
   * (Req 11 Invariant). Reads the current coupon, increments its usage via the
   * pure `incrementUsage` (which never exceeds the limit), and persists the new
   * count. Refuses when the limit is already reached.
   *
   * @param {string} couponId
   * @returns {Promise<{ success: boolean, usageCount?: number, error?: string }>}
   */
  async function redeemCoupon(couponId) {
    if (!couponId) {
      return { success: false, error: 'couponId is required' };
    }
    const getDocById = dataFn('getDocById');
    const updateCoupon = dataFn('updateCoupon');
    if (!getDocById || !updateCoupon) {
      return { success: false, error: 'data layer unavailable' };
    }

    const coupon = await getDocById('coupons', couponId);
    if (!coupon) {
      return { success: false, error: 'Coupon not found' };
    }

    const step = incrementUsage(coupon);
    if (!step.success) {
      return { success: false, error: step.reason || 'Coupon usage limit reached' };
    }

    const result = await updateCoupon(couponId, { usageCount: step.coupon.usageCount });
    if (!result || !result.success) {
      return { success: false, error: (result && result.error) || 'Failed to update coupon usage' };
    }

    return { success: true, usageCount: step.coupon.usageCount };
  }

  // --------------------------------------------------------------------------
  // Glue: list active coupons (Req 11.9) & deactivate (Req 11.10)
  // --------------------------------------------------------------------------

  /**
   * List active coupons for the admin view (Req 11.9): each entry exposes code,
   * discount, usage count, usage limit, and expiry date.
   * @returns {Promise<Array<object>>}
   */
  async function listActiveCoupons() {
    const getCoupons = dataFn('getCoupons');
    if (!getCoupons) {
      return [];
    }
    const coupons = await getCoupons({ active: true });
    return (Array.isArray(coupons) ? coupons : []).map(function (c) {
      return {
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        usageCount: toNumber(c.usageCount),
        usageLimit: toNumber(c.usageLimit),
        expiryDate: c.expiryDate || null,
        active: c.active !== false
      };
    });
  }

  /**
   * Deactivate a coupon so it can no longer be used (Req 11.10). Sets
   * `active: false` via the data layer and logs the operation.
   *
   * @param {string} couponId
   * @param {string} [adminUserId]
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function deactivateCoupon(couponId, adminUserId) {
    if (!couponId) {
      return { success: false, error: 'couponId is required' };
    }
    const updateCoupon = dataFn('updateCoupon');
    if (!updateCoupon) {
      return { success: false, error: 'data layer (updateCoupon) unavailable' };
    }

    const result = await updateCoupon(couponId, { active: false });
    if (!result || !result.success) {
      return { success: false, error: (result && result.error) || 'Failed to deactivate coupon' };
    }

    await writeAudit(adminUserId, 'DEACTIVATE_COUPON', { type: 'coupon', id: couponId }, {});
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // Internal: audit logging helper (best-effort; never blocks the operation)
  // --------------------------------------------------------------------------

  /**
   * Write an admin audit entry via js/lib/audit.js. Failures are swallowed
   * (logged to console) so a logging hiccup never fails the main operation.
   * @param {string} adminUserId
   * @param {string} operationKey - a key in PunnagaiAudit.OPERATION_TYPES.
   * @param {object} entity
   * @param {object} details
   * @returns {Promise<void>}
   */
  async function writeAudit(adminUserId, operationKey, entity, details) {
    try {
      const audit = getAudit();
      if (!audit || typeof audit.writeAuditLog !== 'function') {
        return;
      }
      const operationType = audit.OPERATION_TYPES && audit.OPERATION_TYPES[operationKey];
      if (!operationType) {
        return;
      }
      await audit.writeAuditLog({
        adminUserId: adminUserId || null,
        operationType: operationType,
        entity: entity,
        details: details || {}
      });
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('admin-coupons: audit log failed:', err);
      }
    }
  }

  return {
    // constants
    CODE_ALPHABET: CODE_ALPHABET,
    DEFAULT_CODE_LENGTH: DEFAULT_CODE_LENGTH,
    VALID_DISCOUNT_TYPES: VALID_DISCOUNT_TYPES,
    // pure: code generation
    generateCouponCode: generateCouponCode,
    isCodeUnique: isCodeUnique,
    generateUniqueCouponCode: generateUniqueCouponCode,
    // pure: discount math
    isValidDiscountType: isValidDiscountType,
    computeDiscountedPrice: computeDiscountedPrice,
    buildProductDiscountUpdate: buildProductDiscountUpdate,
    // pure: usage limit & single application
    hasRemainingUsage: hasRemainingUsage,
    incrementUsage: incrementUsage,
    applyCouponOnce: applyCouponOnce,
    normalizeCode: normalizeCode,
    // glue: validation
    validateCouponRecord: validateCouponRecord,
    validateCouponAtCheckout: validateCouponAtCheckout,
    // glue: admin operations
    createProductDiscount: createProductDiscount,
    createCouponCode: createCouponCode,
    redeemCoupon: redeemCoupon,
    listActiveCoupons: listActiveCoupons,
    deactivateCoupon: deactivateCoupon
  };
});
