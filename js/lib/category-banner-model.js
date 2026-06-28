/**
 * category-banner-model.js — Pure category & banner logic (Punnagai / Punnagai Toy Store)
 *
 * Pure-logic module: NO DOM, NO Firebase, NO localStorage. Works in the browser
 * (as `window.PunnagaiCategoryBanner`) and under Node/Jest (via `module.exports`).
 *
 * Responsibilities (Requirement 12):
 *  - Build category/banner objects matching the design.md schema.
 *  - Maintain a category's product count so it ALWAYS equals the number of
 *    products assigned (Req 12.1 invariant; design correctness "Invariant").
 *  - Assign products to a category idempotently — assigning the same product to
 *    the same category twice yields ONE assignment (Req 12.3; design
 *    correctness "Idempotence").
 *  - Optimize banner images into responsive renditions for mobile + desktop
 *    (Req 12.6).
 *  - Enforce a maximum of 5 active banners at any time (Req 12.9) and support
 *    active/inactive toggling (Req 12.8).
 *
 * Uses the UMD-style dual-export pattern — see js/lib/_umd-template.js and
 * js/lib/README.md.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiCategoryBanner = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  // ----------------------------------------------------------------
  // Constants
  // ----------------------------------------------------------------

  /** Maximum number of banners that may be active at any given time (Req 12.9). */
  const MAX_ACTIVE_BANNERS = 5;

  /** Valid banner link destinations (design.md `banners.linkType`). */
  const BANNER_LINK_TYPES = Object.freeze(['product', 'category', 'external']);

  /** Allowed source image formats accepted for banner uploads. */
  const ALLOWED_IMAGE_FORMATS = Object.freeze(['jpeg', 'jpg', 'png', 'webp', 'gif']);

  /**
   * Responsive rendition targets used when optimizing a banner image (Req 12.6).
   * Widths are upper bounds — images are never upscaled past their source width.
   */
  const RESPONSIVE_RENDITIONS = Object.freeze([
    { label: 'mobile', maxWidth: 640 },
    { label: 'desktop', maxWidth: 1280 }
  ]);

  /** Output format all optimized renditions are encoded to (design: WebP). */
  const OPTIMIZED_FORMAT = 'webp';

  // ----------------------------------------------------------------
  // Small helpers
  // ----------------------------------------------------------------

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function toFiniteNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * Normalize a list of product ids into a de-duplicated array of non-empty
   * string ids, preserving first-seen order. This is the canonical "assigned
   * products" representation used for count maintenance.
   * @param {Array} ids
   * @returns {string[]}
   */
  function normalizeProductIds(ids) {
    const seen = new Set();
    const out = [];
    toArray(ids).forEach(function (raw) {
      if (raw === undefined || raw === null) return;
      const id = String(raw);
      if (id === '') return;
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    });
    return out;
  }

  // ----------------------------------------------------------------
  // Category model + product-count maintenance
  // ----------------------------------------------------------------

  /**
   * Build a category object matching the design.md `categories` schema, plus a
   * normalized `productIds` set used for assignment/count maintenance.
   *
   * `productCount` is ALWAYS derived from `productIds` so the invariant
   * (count === number of assigned products) holds by construction (Req 12.1).
   *
   * @param {Object} [data]
   * @returns {{categoryId:(string|null), name:string, description:string,
   *   icon:string, imageUrl:string, productIds:string[], productCount:number,
   *   displayOrder:number, createdAt:*}}
   */
  function buildCategory(data) {
    data = data || {};
    const productIds = normalizeProductIds(data.productIds);
    return {
      categoryId: data.categoryId !== undefined ? data.categoryId : null,
      name: data.name !== undefined ? String(data.name) : '',
      description: data.description !== undefined ? String(data.description) : '',
      icon: data.icon !== undefined ? String(data.icon) : '',
      imageUrl: data.imageUrl !== undefined ? String(data.imageUrl) : '',
      productIds: productIds,
      productCount: productIds.length,
      displayOrder: toFiniteNumber(data.displayOrder, 0),
      createdAt: data.createdAt !== undefined ? data.createdAt : null
    };
  }

  /**
   * Recompute and return a category whose `productCount` equals the number of
   * uniquely assigned products. Idempotent: calling it repeatedly is a no-op.
   * @param {Object} category
   * @returns {Object} a new category object with a consistent count.
   */
  function recomputeProductCount(category) {
    const productIds = normalizeProductIds(category && category.productIds);
    return Object.assign({}, category, {
      productIds: productIds,
      productCount: productIds.length
    });
  }

  /**
   * Assign a product to a category IDEMPOTENTLY (Req 12.3, design Idempotence).
   * Assigning the same product twice yields exactly one assignment, and the
   * resulting `productCount` equals the number of assigned products.
   *
   * @param {Object} category
   * @param {string|number} productId
   * @returns {Object} a new category object (input is not mutated).
   */
  function assignProductToCategory(category, productId) {
    const next = recomputeProductCount(category);
    if (productId === undefined || productId === null || String(productId) === '') {
      return next;
    }
    const id = String(productId);
    if (next.productIds.indexOf(id) !== -1) {
      // Already assigned — idempotent no-op.
      return next;
    }
    const productIds = next.productIds.concat([id]);
    return Object.assign({}, next, {
      productIds: productIds,
      productCount: productIds.length
    });
  }

  /**
   * Remove a product from a category, keeping `productCount` consistent.
   * @param {Object} category
   * @param {string|number} productId
   * @returns {Object} a new category object (input is not mutated).
   */
  function removeProductFromCategory(category, productId) {
    const next = recomputeProductCount(category);
    if (productId === undefined || productId === null) {
      return next;
    }
    const id = String(productId);
    const productIds = next.productIds.filter(function (existing) {
      return existing !== id;
    });
    return Object.assign({}, next, {
      productIds: productIds,
      productCount: productIds.length
    });
  }

  /**
   * Count how many products in a product list are assigned to a given category.
   * Matches a product's `categoryId` (preferred) or legacy `category` field
   * against `categoryId`. Used to reconcile a category's stored count with the
   * actual product collection (Req 12.1 invariant).
   *
   * @param {Array<Object>} products
   * @param {string|number} categoryId
   * @returns {number}
   */
  function countProductsInCategory(products, categoryId) {
    if (categoryId === undefined || categoryId === null) return 0;
    const target = String(categoryId);
    return toArray(products).reduce(function (acc, product) {
      if (!product || typeof product !== 'object') return acc;
      const pid = product.categoryId !== undefined && product.categoryId !== null
        ? String(product.categoryId)
        : (product.category !== undefined && product.category !== null ? String(product.category) : null);
      return pid === target ? acc + 1 : acc;
    }, 0);
  }

  /**
   * Reconcile a category's `productCount`/`productIds` against the live product
   * list so the invariant holds: count === number of products assigned.
   * @param {Object} category
   * @param {Array<Object>} products
   * @returns {Object} a new category object with a reconciled count.
   */
  function reconcileCategoryWithProducts(category, products) {
    const cat = category || {};
    const target = cat.categoryId !== undefined && cat.categoryId !== null
      ? String(cat.categoryId)
      : null;
    const assignedIds = [];
    if (target !== null) {
      toArray(products).forEach(function (product) {
        if (!product || typeof product !== 'object') return;
        const pid = product.categoryId !== undefined && product.categoryId !== null
          ? String(product.categoryId)
          : (product.category !== undefined && product.category !== null ? String(product.category) : null);
        if (pid !== target) return;
        const productId = product.productId !== undefined ? product.productId
          : (product.id !== undefined ? product.id : null);
        if (productId !== null) assignedIds.push(productId);
      });
    }
    const productIds = normalizeProductIds(assignedIds);
    return Object.assign({}, cat, {
      productIds: productIds,
      productCount: productIds.length
    });
  }

  // ----------------------------------------------------------------
  // Banner model
  // ----------------------------------------------------------------

  /**
   * Normalize a banner link type to one of BANNER_LINK_TYPES (default product).
   * @param {*} linkType
   * @returns {string}
   */
  function normalizeLinkType(linkType) {
    const lt = typeof linkType === 'string' ? linkType.trim().toLowerCase() : '';
    return BANNER_LINK_TYPES.indexOf(lt) !== -1 ? lt : 'product';
  }

  /**
   * Build a banner object matching the design.md `banners` schema.
   * @param {Object} [data]
   * @returns {Object}
   */
  function buildBanner(data) {
    data = data || {};
    return {
      bannerId: data.bannerId !== undefined ? data.bannerId : null,
      title: data.title !== undefined ? String(data.title) : '',
      imageUrl: data.imageUrl !== undefined ? String(data.imageUrl) : '',
      linkType: normalizeLinkType(data.linkType),
      linkId: data.linkId !== undefined ? data.linkId : null,
      displayOrder: toFiniteNumber(data.displayOrder, 0),
      active: data.active !== undefined ? Boolean(data.active) : true,
      createdAt: data.createdAt !== undefined ? data.createdAt : null,
      createdBy: data.createdBy !== undefined ? data.createdBy : null
    };
  }

  // ----------------------------------------------------------------
  // Banner image optimization (Req 12.6)
  // ----------------------------------------------------------------

  /**
   * Detect/normalize a source image format string.
   * @param {*} format
   * @returns {string} lower-cased format or '' if unknown.
   */
  function normalizeImageFormat(format) {
    if (typeof format !== 'string') return '';
    return format.trim().toLowerCase().replace(/^image\//, '');
  }

  /**
   * Validate a banner source image descriptor.
   * @param {Object} image - { width, height, format, sizeBytes }
   * @param {Object} [options] - { maxSizeBytes }
   * @returns {{valid:boolean, errors:string[]}}
   */
  function validateBannerImage(image, options) {
    options = options || {};
    const maxSizeBytes = toFiniteNumber(options.maxSizeBytes, 5 * 1024 * 1024); // 5MB default
    const errors = [];
    const img = image || {};

    const width = toFiniteNumber(img.width, NaN);
    const height = toFiniteNumber(img.height, NaN);
    const format = normalizeImageFormat(img.format);

    if (!Number.isFinite(width) || width <= 0) errors.push('image width must be a positive number');
    if (!Number.isFinite(height) || height <= 0) errors.push('image height must be a positive number');
    if (!format || ALLOWED_IMAGE_FORMATS.indexOf(format) === -1) {
      errors.push('unsupported image format: ' + (format || 'unknown'));
    }
    if (img.sizeBytes !== undefined && img.sizeBytes !== null) {
      const sizeBytes = toFiniteNumber(img.sizeBytes, NaN);
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        errors.push('image sizeBytes must be a positive number');
      } else if (sizeBytes > maxSizeBytes) {
        errors.push('image exceeds maximum size of ' + maxSizeBytes + ' bytes');
      }
    }

    return { valid: errors.length === 0, errors: errors };
  }

  /**
   * Produce a responsive optimization plan for a banner image (Req 12.6).
   *
   * Pure logic only: it computes the target renditions (mobile + desktop) with
   * WebP output, preserving the source aspect ratio and never upscaling beyond
   * the source width. The actual encoding/upload is performed by the browser
   * glue in `js/admin-categories.js` using this plan.
   *
   * @param {Object} image - { width, height, format }
   * @param {Object} [options] - { renditions, format }
   * @returns {{format:string, sourceWidth:number, sourceHeight:number,
   *   aspectRatio:number, renditions:Array<{label:string,width:number,height:number,format:string}>}}
   */
  function buildImageOptimizationPlan(image, options) {
    options = options || {};
    const img = image || {};
    const sourceWidth = Math.max(1, Math.round(toFiniteNumber(img.width, 1)));
    const sourceHeight = Math.max(1, Math.round(toFiniteNumber(img.height, 1)));
    const aspectRatio = sourceWidth / sourceHeight;
    const format = isNonEmptyString(options.format) ? options.format.toLowerCase() : OPTIMIZED_FORMAT;
    const renditionTargets = toArray(options.renditions).length
      ? options.renditions
      : RESPONSIVE_RENDITIONS;

    const renditions = renditionTargets.map(function (target) {
      const maxWidth = Math.max(1, Math.round(toFiniteNumber(target.maxWidth, sourceWidth)));
      // Never upscale: cap the rendition width at the source width.
      const width = Math.min(sourceWidth, maxWidth);
      const height = Math.max(1, Math.round(width / aspectRatio));
      return {
        label: target.label !== undefined ? String(target.label) : ('w' + width),
        width: width,
        height: height,
        format: format
      };
    });

    return {
      format: format,
      sourceWidth: sourceWidth,
      sourceHeight: sourceHeight,
      aspectRatio: aspectRatio,
      renditions: renditions
    };
  }

  // ----------------------------------------------------------------
  // Active-banner cap enforcement (Req 12.9) + toggling (Req 12.8)
  // ----------------------------------------------------------------

  function isActive(banner) {
    return !!(banner && banner.active);
  }

  /**
   * Count the active banners in a list.
   * @param {Array<Object>} banners
   * @returns {number}
   */
  function countActiveBanners(banners) {
    return toArray(banners).filter(isActive).length;
  }

  /**
   * Get a banner's id from either `bannerId` (schema) or `id` (data layer).
   * @param {Object} banner
   * @returns {string|null}
   */
  function bannerKey(banner) {
    if (!banner || typeof banner !== 'object') return null;
    if (banner.bannerId !== undefined && banner.bannerId !== null) return String(banner.bannerId);
    if (banner.id !== undefined && banner.id !== null) return String(banner.id);
    return null;
  }

  /**
   * Whether a given (currently inactive) banner can be activated without
   * exceeding the max active cap (Req 12.9). If the banner is already active,
   * activation is always allowed (it does not increase the count).
   *
   * @param {Array<Object>} banners - the full banner list (current state)
   * @param {string|number} bannerId - banner being activated
   * @param {number} [max=MAX_ACTIVE_BANNERS]
   * @returns {boolean}
   */
  function canActivateBanner(banners, bannerId, max) {
    const cap = toFiniteNumber(max, MAX_ACTIVE_BANNERS);
    const targetKey = bannerId === undefined || bannerId === null ? null : String(bannerId);
    const list = toArray(banners);

    const target = list.find(function (b) { return bannerKey(b) === targetKey; });
    if (target && isActive(target)) return true; // already active, no net change

    return countActiveBanners(list) < cap;
  }

  /**
   * Toggle a banner's active flag (Req 12.8). Activating is refused when it
   * would exceed the active cap (Req 12.9).
   *
   * Pure: returns a result describing the outcome and the new banner list
   * without mutating the input.
   *
   * @param {Array<Object>} banners
   * @param {string|number} bannerId
   * @param {boolean} active - desired active state
   * @param {number} [max=MAX_ACTIVE_BANNERS]
   * @returns {{success:boolean, error?:string, banners:Array<Object>, banner:(Object|null)}}
   */
  function setBannerActive(banners, bannerId, active, max) {
    const cap = toFiniteNumber(max, MAX_ACTIVE_BANNERS);
    const desired = Boolean(active);
    const targetKey = bannerId === undefined || bannerId === null ? null : String(bannerId);
    const list = toArray(banners).map(function (b) { return Object.assign({}, b); });

    const target = list.find(function (b) { return bannerKey(b) === targetKey; });
    if (!target) {
      return { success: false, error: 'banner not found', banners: list, banner: null };
    }

    if (desired && !isActive(target)) {
      // Activating an inactive banner: enforce the cap.
      if (countActiveBanners(list) >= cap) {
        return {
          success: false,
          error: 'cannot exceed maximum of ' + cap + ' active banners',
          banners: list,
          banner: target
        };
      }
    }

    target.active = desired;
    return { success: true, banners: list, banner: target };
  }

  /**
   * Enforce the active-banner cap across a list (Req 12.9). Keeps at most `max`
   * banners active — preferring lower `displayOrder`, then earlier `createdAt`
   * — and marks any excess active banners inactive.
   *
   * Pure: returns a new list; the input is not mutated.
   *
   * @param {Array<Object>} banners
   * @param {number} [max=MAX_ACTIVE_BANNERS]
   * @returns {Array<Object>}
   */
  function enforceMaxActiveBanners(banners, max) {
    const cap = Math.max(0, toFiniteNumber(max, MAX_ACTIVE_BANNERS));
    const list = toArray(banners).map(function (b) { return Object.assign({}, b); });

    const active = list.filter(isActive);
    if (active.length <= cap) return list;

    // Rank active banners: lower displayOrder first, then earlier createdAt.
    const ranked = active.slice().sort(function (a, b) {
      const orderA = toFiniteNumber(a.displayOrder, Number.MAX_SAFE_INTEGER);
      const orderB = toFiniteNumber(b.displayOrder, Number.MAX_SAFE_INTEGER);
      if (orderA !== orderB) return orderA - orderB;
      const createdA = toFiniteNumber(a.createdAt, Number.MAX_SAFE_INTEGER);
      const createdB = toFiniteNumber(b.createdAt, Number.MAX_SAFE_INTEGER);
      return createdA - createdB;
    });

    const keep = new Set(ranked.slice(0, cap).map(bannerKey));
    return list.map(function (banner) {
      if (isActive(banner) && !keep.has(bannerKey(banner))) {
        return Object.assign({}, banner, { active: false });
      }
      return banner;
    });
  }

  /**
   * Select the banners that should display on the home page: active banners
   * (capped at `max`) ordered by creation date (Req 12.7 carousel ordering).
   * @param {Array<Object>} banners
   * @param {number} [max=MAX_ACTIVE_BANNERS]
   * @returns {Array<Object>}
   */
  function selectDisplayBanners(banners, max) {
    const cap = Math.max(0, toFiniteNumber(max, MAX_ACTIVE_BANNERS));
    return toArray(banners)
      .filter(isActive)
      .slice()
      .sort(function (a, b) {
        const createdA = toFiniteNumber(a.createdAt, 0);
        const createdB = toFiniteNumber(b.createdAt, 0);
        return createdA - createdB;
      })
      .slice(0, cap);
  }

  return {
    // constants
    MAX_ACTIVE_BANNERS: MAX_ACTIVE_BANNERS,
    BANNER_LINK_TYPES: BANNER_LINK_TYPES,
    ALLOWED_IMAGE_FORMATS: ALLOWED_IMAGE_FORMATS,
    RESPONSIVE_RENDITIONS: RESPONSIVE_RENDITIONS,
    OPTIMIZED_FORMAT: OPTIMIZED_FORMAT,
    // category
    buildCategory: buildCategory,
    normalizeProductIds: normalizeProductIds,
    recomputeProductCount: recomputeProductCount,
    assignProductToCategory: assignProductToCategory,
    removeProductFromCategory: removeProductFromCategory,
    countProductsInCategory: countProductsInCategory,
    reconcileCategoryWithProducts: reconcileCategoryWithProducts,
    // banner
    buildBanner: buildBanner,
    normalizeLinkType: normalizeLinkType,
    // image optimization
    normalizeImageFormat: normalizeImageFormat,
    validateBannerImage: validateBannerImage,
    buildImageOptimizationPlan: buildImageOptimizationPlan,
    // active cap + toggling
    countActiveBanners: countActiveBanners,
    canActivateBanner: canActivateBanner,
    setBannerActive: setBannerActive,
    enforceMaxActiveBanners: enforceMaxActiveBanners,
    selectDisplayBanners: selectDisplayBanners
  };
});
