/**
 * product-detail.js — Pure product detail / variant-selection logic
 * (Punnagai / Punnagai Toy Store)
 *
 * Pure-logic module: NO DOM, NO Firebase, NO localStorage. Works in the browser
 * (as `window.PunnagaiProductDetail`) and under Node/Jest (via `module.exports`).
 *
 * Responsibilities (Requirement 2 — product detail page):
 *  - resolveVariant: deterministically resolve a selected variant from a
 *    { size, color } selection or a variantId/skuId (Requirement 2.4, Property 6).
 *  - getVariantPrice: the effective price for a resolved variant (Req 2.3/2.4).
 *  - getDiscountedPrice: apply a product discount {type,value,active} to a price
 *    (Req 2.4 price update). Floored at 0.
 *  - getVariantStockStatus: in-stock boolean/status via the inventory model rule
 *    stock > 0 (Req 2.3/2.4), reusing js/lib/inventory-model.js when available.
 *  - getDisplayPriceInfo: { original, discounted, hasDiscount } for the price
 *    display (Req 2.9 metadata is UI; the pricing math lives here).
 *  - getRelatedProducts: products sharing category OR ageGroup, excluding the
 *    product itself, in a deterministic order (Requirement 2.8).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * TWO SUPPORTED PRODUCT SHAPES (handled gracefully)
 *
 *  1. Rich variant model (js/lib/products-model.js / design `products` schema):
 *       { ..., basePrice, category|categoryId, ageGroup|ageRating,
 *         variants: [{ variantId, skuId, size, color, price, stock }],
 *         discount: { type:'percentage'|'fixed', value, active } }
 *
 *  2. Simple storefront product (js/data.js seed shape):
 *       { ..., price, originalPrice, category, ageGroup, inStock }
 *     A simple product has NO `variants[]`. It is treated as a SINGLE implicit
 *     variant built from its own fields:
 *       { variantId: product.id|null, skuId: null, size: null, color: null,
 *         price: product.price, stock: (inStock ? 1 : 0) }
 *     This lets the same detail-page logic drive both data sources.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * DETERMINISM (Property 6 — Requirement 2.4)
 *  Every function here is a PURE function of its inputs with NO hidden state.
 *  Resolving variant A, then B, then A again returns equal pricing and product
 *  info each time, because resolution only reads the passed-in product/selection.
 *
 * ROUNDING (documented)
 *  Prices are treated as whole Indian Rupees (₹). `getDiscountedPrice` floors
 *  the result with Math.floor so a discounted price is never a fraction and is
 *  never below 0. A 'percentage' discount computes price - floor(price*value/100)
 *  via flooring the FINAL price (Math.floor(price - price*value/100)); a 'fixed'
 *  discount subtracts the value directly. This matches the cart's
 *  floor-discount / floor-at-0 convention (design Property 9 example).
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiProductDetail = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  // ──────────────────────────────────────────────────────────────────────
  // Inventory model resolution (defensive, dual-environment)
  //
  // Reuse js/lib/inventory-model.js so the stock-visibility rule (stock > 0)
  // stays in ONE place. In the browser it is `window.PunnagaiInventoryModel`;
  // under Node/Jest we require() it. If neither is available we fall back to a
  // local stock>0 implementation so this module is always total.
  // ──────────────────────────────────────────────────────────────────────
  function localGetStock(variant) {
    if (!variant || typeof variant !== 'object') {
      return 0;
    }
    const n = Number(variant.stock);
    if (!isFinite(n) || n <= 0) {
      return 0;
    }
    return Math.floor(n);
  }

  const FALLBACK_INVENTORY = {
    getStock: localGetStock,
    isInStock: function (variant) {
      return localGetStock(variant) > 0;
    },
    isVariantVisible: function (variant) {
      return localGetStock(variant) > 0;
    }
  };

  function resolveInventoryModel() {
    // Browser global takes precedence (matches HTML load-order usage).
    if (typeof window !== 'undefined' && window.PunnagaiInventoryModel) {
      return window.PunnagaiInventoryModel;
    }
    // Node / Jest: require the sibling module if present.
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try {
        const mod = require('./inventory-model.js');
        if (mod) {
          return mod;
        }
      } catch (err) {
        // Sibling not resolvable — fall through to the local implementation.
      }
    }
    return FALLBACK_INVENTORY;
  }

  // Resolve lazily per call so the browser picks up the global even if this
  // module loaded first, and tests stay deterministic.
  function inventory() {
    return resolveInventoryModel();
  }

  // ──────────────────────────────────────────────────────────────────────
  // Small, total helpers
  // ──────────────────────────────────────────────────────────────────────
  function toNumber(value, fallback) {
    const n = Number(value);
    return isFinite(n) ? n : fallback;
  }

  function isObject(value) {
    return value !== null && typeof value === 'object';
  }

  /**
   * Return a product's variant array, normalizing a simple (no-variant) product
   * into a single implicit variant derived from its own fields.
   *
   * @param {Object} product
   * @returns {Array<Object>} variant objects (possibly synthesized)
   */
  function getVariants(product) {
    if (!isObject(product)) {
      return [];
    }
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants;
    }
    // Simple storefront product → one implicit variant from product fields.
    const price = toNumber(product.price, toNumber(product.basePrice, 0));
    const inStock = product.inStock === undefined ? true : Boolean(product.inStock);
    return [
      {
        variantId:
          product.variantId !== undefined
            ? product.variantId
            : product.id !== undefined
              ? product.id
              : product.productId !== undefined
                ? product.productId
                : null,
        skuId: product.skuId !== undefined ? product.skuId : null,
        size: product.size !== undefined ? product.size : null,
        color: product.color !== undefined ? product.color : null,
        price: price,
        // Implicit variant carries no real per-unit count; use 1 (in stock) or
        // 0 (out of stock) so the stock>0 visibility rule behaves correctly.
        stock: inStock ? 1 : 0
      }
    ];
  }

  /**
   * True when the product has a real (explicit) variant matrix.
   * @param {Object} product
   * @returns {boolean}
   */
  function hasVariants(product) {
    return isObject(product) && Array.isArray(product.variants) && product.variants.length > 0;
  }

  /**
   * Resolve the selected variant for a product.
   *
   * Selection forms (deterministic, pure — Property 6 / Requirement 2.4):
   *  - A string: matched against `variantId` first, then `skuId`.
   *  - An object { variantId } or { skuId }: matched by that id.
   *  - An object { size, color }: matched against variant size/color. Both must
   *    match when both are supplied; a single supplied field matches on that
   *    field alone. The FIRST matching variant (in array order) is returned, so
   *    resolution is stable across repeated selections.
   *  - Empty / null / undefined selection: returns the first variant (default
   *    selection) when one exists.
   *
   * Returns the matching variant object, or null when nothing matches.
   *
   * @param {Object} product
   * @param {(string|{variantId?:string,skuId?:string,size?:*,color?:*})} [selection]
   * @returns {Object|null}
   */
  function resolveVariant(product, selection) {
    const variants = getVariants(product);
    if (variants.length === 0) {
      return null;
    }

    // No selection → default to the first variant.
    if (selection === undefined || selection === null || selection === '') {
      return variants[0];
    }

    // String selection → variantId then skuId.
    if (typeof selection === 'string') {
      return findById(variants, selection, selection) || null;
    }

    if (isObject(selection)) {
      // Explicit id selection wins over size/color.
      if (selection.variantId !== undefined || selection.skuId !== undefined) {
        return findById(variants, selection.variantId, selection.skuId) || null;
      }

      const hasSize = selection.size !== undefined && selection.size !== null;
      const hasColor = selection.color !== undefined && selection.color !== null;

      if (!hasSize && !hasColor) {
        // Empty object → default to the first variant.
        return variants[0];
      }

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (!isObject(v)) {
          continue;
        }
        const sizeOk = !hasSize || v.size === selection.size;
        const colorOk = !hasColor || v.color === selection.color;
        if (sizeOk && colorOk) {
          return v;
        }
      }
      return null;
    }

    return null;
  }

  /**
   * Find a variant by variantId (preferred) or skuId.
   * @param {Array<Object>} variants
   * @param {*} variantId
   * @param {*} skuId
   * @returns {Object|undefined}
   */
  function findById(variants, variantId, skuId) {
    let bySku;
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!isObject(v)) {
        continue;
      }
      if (variantId !== undefined && variantId !== null && v.variantId === variantId) {
        return v;
      }
      if (bySku === undefined && skuId !== undefined && skuId !== null && v.skuId === skuId) {
        bySku = v;
      }
    }
    return bySku;
  }

  /**
   * Resolve the effective (pre-discount) price for a variant of a product.
   *
   * Order of preference:
   *  1. The variant's own `price` (variant model — independent per-SKU pricing).
   *  2. The product's `basePrice` (rich model) then `price` (simple model).
   *  3. 0 when nothing usable is present.
   *
   * @param {Object} product
   * @param {Object} [variant] a variant already resolved via resolveVariant
   * @returns {number}
   */
  function getVariantPrice(product, variant) {
    if (isObject(variant) && variant.price !== undefined && variant.price !== null) {
      const vp = toNumber(variant.price, NaN);
      if (isFinite(vp)) {
        return vp;
      }
    }
    if (isObject(product)) {
      if (product.basePrice !== undefined && product.basePrice !== null) {
        return toNumber(product.basePrice, 0);
      }
      if (product.price !== undefined && product.price !== null) {
        return toNumber(product.price, 0);
      }
    }
    return 0;
  }

  /**
   * Apply a product discount to a price, flooring the result at 0.
   *
   * Discount shape: { type: 'percentage' | 'fixed', value: number, active: bool }
   *  - Inactive (`active === false`), absent, or malformed discount → returns the
   *    original price unchanged (still coerced to a finite number).
   *  - 'percentage' → Math.floor(price - price * value / 100).
   *  - 'fixed'      → Math.floor(price - value).
   *  - Negative discount values are clamped to 0 (never increase the price).
   *  - Result is never below 0 and never a fraction (see module ROUNDING note).
   *
   * @param {number} price
   * @param {{type?:string,value?:number,active?:boolean}} [discount]
   * @returns {number}
   */
  function getDiscountedPrice(price, discount) {
    const base = Math.max(0, toNumber(price, 0));

    if (!isObject(discount) || discount.active === false) {
      return Math.floor(base);
    }

    const value = Math.max(0, toNumber(discount.value, 0));
    if (value === 0) {
      return Math.floor(base);
    }

    let result;
    if (discount.type === 'percentage') {
      // Cap percentage at 100 so the price can reach but not pass 0.
      const pct = Math.min(value, 100);
      result = base - (base * pct) / 100;
    } else if (discount.type === 'fixed') {
      result = base - value;
    } else {
      // Unknown discount type → treat as no discount.
      return Math.floor(base);
    }

    return Math.max(0, Math.floor(result));
  }

  /**
   * Determine the stock status of a variant using the shared inventory rule
   * (a variant is in stock iff stock > 0). Reuses js/lib/inventory-model.js.
   *
   * @param {Object} variant
   * @returns {{ inStock: boolean, stock: number, status: ('in-stock'|'out-of-stock') }}
   */
  function getVariantStockStatus(variant) {
    const inv = inventory();
    const stock =
      typeof inv.getStock === 'function' ? inv.getStock(variant) : localGetStock(variant);
    const inStock = typeof inv.isInStock === 'function' ? inv.isInStock(variant) : stock > 0;
    return {
      inStock: inStock,
      stock: stock,
      status: inStock ? 'in-stock' : 'out-of-stock'
    };
  }

  /**
   * Build the display price info for the selected variant of a product.
   *
   * @param {Object} product
   * @param {(string|Object)} [selection] passed to resolveVariant
   * @returns {{ original:number, discounted:number, hasDiscount:boolean, variant:(Object|null), stock:Object }}
   */
  function getDisplayPriceInfo(product, selection) {
    const variant = resolveVariant(product, selection);
    const original = getVariantPrice(product, variant);
    const discount = isObject(product) ? product.discount : null;
    const discounted = getDiscountedPrice(original, discount);
    return {
      original: Math.floor(Math.max(0, original)),
      discounted: discounted,
      hasDiscount: discounted < Math.floor(Math.max(0, original)),
      variant: variant,
      stock: getVariantStockStatus(variant)
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Related products (Requirement 2.8)
  // ──────────────────────────────────────────────────────────────────────
  function getCategory(product) {
    if (!isObject(product)) {
      return undefined;
    }
    return product.category !== undefined ? product.category : product.categoryId;
  }

  function getAgeGroup(product) {
    if (!isObject(product)) {
      return undefined;
    }
    return product.ageGroup !== undefined ? product.ageGroup : product.ageRating;
  }

  /**
   * Identity key used to exclude the current product from its own related list.
   * Prefers an explicit id field; falls back to object reference equality.
   * @param {Object} product
   * @returns {*}
   */
  function productKey(product) {
    if (!isObject(product)) {
      return undefined;
    }
    if (product.id !== undefined && product.id !== null) {
      return product.id;
    }
    if (product.productId !== undefined && product.productId !== null) {
      return product.productId;
    }
    return undefined;
  }

  function isSameProduct(a, b) {
    if (a === b) {
      return true; // reference equality (covers id-less products)
    }
    const ka = productKey(a);
    const kb = productKey(b);
    return ka !== undefined && kb !== undefined && ka === kb;
  }

  /**
   * Compute related products for a product: those sharing its category OR its
   * age group, excluding the product itself (Requirement 2.8).
   *
   * Deterministic ordering (stable):
   *  1. Same-category AND same-age-group matches (most relevant) first.
   *  2. Same-category-only matches next.
   *  3. Same-age-group-only matches last.
   *  Within each tier, original input order is preserved (stable). The result
   *  is then truncated to `limit` items.
   *
   * @param {Array<Object>} allProducts
   * @param {Object} product the current product
   * @param {{limit?:number}} [options] limit defaults to 4 (design says 4–6)
   * @returns {Array<Object>}
   */
  function getRelatedProducts(allProducts, product, options) {
    options = options || {};
    const list = Array.isArray(allProducts) ? allProducts : [];
    const limit = clampLimit(options.limit);

    const cat = getCategory(product);
    const age = getAgeGroup(product);

    // No basis for relatedness → nothing related.
    if ((cat === undefined || cat === null) && (age === undefined || age === null)) {
      return [];
    }

    const tierBoth = [];
    const tierCat = [];
    const tierAge = [];

    for (let i = 0; i < list.length; i++) {
      const candidate = list[i];
      if (!isObject(candidate) || isSameProduct(candidate, product)) {
        continue;
      }
      const sameCat = cat !== undefined && cat !== null && getCategory(candidate) === cat;
      const sameAge = age !== undefined && age !== null && getAgeGroup(candidate) === age;

      if (sameCat && sameAge) {
        tierBoth.push(candidate);
      } else if (sameCat) {
        tierCat.push(candidate);
      } else if (sameAge) {
        tierAge.push(candidate);
      }
    }

    const ordered = tierBoth.concat(tierCat, tierAge);
    return ordered.slice(0, limit);
  }

  /**
   * Clamp the related-products limit to the design's 4–6 window, defaulting to
   * 4 when unspecified/invalid.
   * @param {*} limit
   * @returns {number}
   */
  function clampLimit(limit) {
    const n = Number(limit);
    if (!isFinite(n) || n <= 0) {
      return 4;
    }
    return Math.floor(n);
  }

  return {
    resolveVariant: resolveVariant,
    getVariantPrice: getVariantPrice,
    getDiscountedPrice: getDiscountedPrice,
    getVariantStockStatus: getVariantStockStatus,
    getDisplayPriceInfo: getDisplayPriceInfo,
    getRelatedProducts: getRelatedProducts,
    // Exposed helpers (useful for the UI layer and tests / reuse).
    getVariants: getVariants,
    hasVariants: hasVariants
  };
});
