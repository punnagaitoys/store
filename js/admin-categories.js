/**
 * admin-categories.js — Admin category & banner management (Punnagai / Punnagai Toy Store)
 *
 * Browser-side glue for Requirement 12 (Admin Panel — Category and Banner
 * Management). The PURE logic (product-count maintenance, idempotent product
 * assignment, image optimization, max-5-active enforcement, active/inactive
 * toggling) lives in `js/lib/category-banner-model.js` so it stays unit- and
 * property-testable (task 17.2). This file wires that logic to:
 *   - the hybrid data layer in `js/data.js` (Firestore / LocalStorage), and
 *   - the admin audit log builder in `js/lib/audit.js`.
 *
 * Load order in HTML (after the data layer + libs):
 *   firebase-config.js → data.js → js/lib/audit.js →
 *   js/lib/category-banner-model.js → admin-categories.js → admin.js
 *
 * Data functions return `{ success, id }` / `{ success, error }` per project
 * convention; this module follows the same shape.
 *
 * Exposed as `window.AdminCategories` to avoid clobbering the global data-layer
 * functions (addCategory, createBanner, etc.) defined in data.js.
 */
(function () {
  'use strict';

  // ----------------------------------------------------------------
  // Dependency resolution (browser globals, with Node/require fallback)
  // ----------------------------------------------------------------

  function resolveModel() {
    if (typeof window !== 'undefined' && window.PunnagaiCategoryBanner) {
      return window.PunnagaiCategoryBanner;
    }
    if (typeof require === 'function') {
      try {
        return require('./lib/category-banner-model');
      } catch (e) {
        /* not available */
      }
    }
    return null;
  }

  function resolveAudit() {
    if (typeof window !== 'undefined' && window.PunnagaiAudit) {
      return window.PunnagaiAudit;
    }
    if (typeof require === 'function') {
      try {
        return require('./lib/audit');
      } catch (e) {
        /* not available */
      }
    }
    return null;
  }

  const Model = resolveModel();
  const Audit = resolveAudit();

  /**
   * Resolve a data-layer function by name from the global scope (data.js
   * defines them as globals). Returns null if unavailable.
   * @param {string} name
   * @returns {Function|null}
   */
  function dataFn(name) {
    const scope =
      typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : null;
    if (scope && typeof scope[name] === 'function') return scope[name];
    return null;
  }

  async function callData(name, args) {
    const fn = dataFn(name);
    if (!fn) {
      return { success: false, error: 'data layer function unavailable: ' + name };
    }
    return fn.apply(null, args || []);
  }

  // ----------------------------------------------------------------
  // Admin identity + audit helper
  // ----------------------------------------------------------------

  /**
   * Best-effort lookup of the acting admin's id for audit entries.
   * @returns {string|null}
   */
  function getCurrentAdminId() {
    if (typeof window === 'undefined') return null;
    if (
      window.currentAdminUser &&
      (window.currentAdminUser.uid || window.currentAdminUser.userId)
    ) {
      return window.currentAdminUser.uid || window.currentAdminUser.userId;
    }
    try {
      if (window.auth && window.auth.currentUser && window.auth.currentUser.uid) {
        return window.auth.currentUser.uid;
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  /**
   * Fire-and-forget audit log write. Never throws into the caller — audit
   * failures must not block the primary operation.
   * @param {string} operationType - one of Audit.OPERATION_TYPES
   * @param {{type:string, id:*}} entity
   * @param {Object} [details]
   */
  async function audit(operationType, entity, details) {
    if (!Audit || typeof Audit.writeAuditLog !== 'function') return;
    try {
      await Audit.writeAuditLog({
        adminUserId: getCurrentAdminId(),
        operationType: operationType,
        entity: entity,
        details: details || {}
      });
    } catch (e) {
      if (typeof console !== 'undefined') console.error('Audit log failed:', e);
    }
  }

  // ================================================================
  // CATEGORY MANAGEMENT (Req 12.1, 12.2, 12.3)
  // ================================================================

  /**
   * List all categories, each with a `productCount` reconciled against the live
   * product collection so the invariant holds (Req 12.1: count === number of
   * products assigned).
   * @returns {Promise<Array<Object>>}
   */
  async function listCategoriesWithCounts() {
    const categories = (await callData('getCategories', [true])) || [];
    const products = (await callData('getProducts', [{}])) || [];
    if (!Model) return categories;
    return categories.map(function (cat) {
      const withId = Object.assign({}, cat, {
        categoryId: cat.categoryId !== undefined ? cat.categoryId : cat.id
      });
      const reconciled = Model.reconcileCategoryWithProducts(withId, products);
      return Object.assign({}, cat, {
        productCount: reconciled.productCount,
        productIds: reconciled.productIds
      });
    });
  }

  /**
   * Create a category. Requires a name; description and icon/image are optional
   * (Req 12.2). `productCount` starts at 0 (no products assigned yet).
   * @param {Object} input - { name, description, icon, imageUrl, displayOrder }
   * @returns {Promise<{success:boolean, id?:string, error?:string}>}
   */
  async function createCategory(input) {
    input = input || {};
    if (!input.name || String(input.name).trim() === '') {
      return { success: false, error: 'Category name is required' };
    }
    const category = Model ? Model.buildCategory(input) : input;
    const result = await callData('addCategory', [
      {
        name: category.name,
        description: category.description,
        icon: category.icon,
        imageUrl: category.imageUrl,
        productCount: category.productCount || 0,
        displayOrder: category.displayOrder || 0
      }
    ]);
    if (result && result.success) {
      await audit(
        opType('CREATE_CATEGORY'),
        { type: 'category', id: result.id },
        { name: category.name }
      );
    }
    return result;
  }

  /**
   * Update a category's editable fields (Req 12.2).
   * @param {string} categoryId
   * @param {Object} updates
   * @returns {Promise<{success:boolean, error?:string}>}
   */
  async function updateCategoryDetails(categoryId, updates) {
    if (!categoryId) return { success: false, error: 'categoryId is required' };
    const result = await callData('updateCategory', [categoryId, updates || {}]);
    if (result && result.success) {
      await audit(
        opType('UPDATE_CATEGORY'),
        { type: 'category', id: categoryId },
        { fields: Object.keys(updates || {}) }
      );
    }
    return result;
  }

  /**
   * Delete a category (Req 12.1 edit/delete options).
   * @param {string} categoryId
   * @returns {Promise<{success:boolean, error?:string}>}
   */
  async function deleteCategory(categoryId) {
    if (!categoryId) return { success: false, error: 'categoryId is required' };
    const result = await callData('deleteCategory', [categoryId]);
    if (result && result.success) {
      await audit(opType('DELETE_CATEGORY'), { type: 'category', id: categoryId }, {});
    }
    return result;
  }

  /**
   * Recompute a category's `productCount` from the live product collection and
   * persist it, keeping the invariant (Req 12.1). Returns the new count.
   * @param {string} categoryId
   * @returns {Promise<{success:boolean, productCount?:number, error?:string}>}
   */
  async function syncCategoryProductCount(categoryId) {
    if (!categoryId) return { success: false, error: 'categoryId is required' };
    if (!Model) return { success: false, error: 'category model unavailable' };
    const products = (await callData('getProducts', [{}])) || [];
    const productCount = Model.countProductsInCategory(products, categoryId);
    const result = await callData('updateCategory', [categoryId, { productCount: productCount }]);
    if (result && result.success) {
      return { success: true, productCount: productCount };
    }
    return result || { success: false, error: 'update failed' };
  }

  /**
   * Assign a product to a category IDEMPOTENTLY (Req 12.3 + design Idempotence).
   * Assigning the same product to the same category twice results in one
   * assignment and leaves the category's product count consistent (Req 12.1).
   *
   * @param {string} productId
   * @param {string} categoryId
   * @returns {Promise<{success:boolean, assigned?:boolean, productCount?:number, error?:string}>}
   *   `assigned` is true when this call changed the product's category, false
   *   when it was already assigned (the idempotent no-op case).
   */
  async function assignProductToCategory(productId, categoryId) {
    if (!productId) return { success: false, error: 'productId is required' };
    if (!categoryId) return { success: false, error: 'categoryId is required' };

    const product = await callData('getProductById', [productId]);
    const current = product
      ? product.categoryId !== undefined && product.categoryId !== null
        ? String(product.categoryId)
        : product.category !== undefined && product.category !== null
          ? String(product.category)
          : null
      : null;

    // Idempotent no-op: the product is already in this category.
    if (current === String(categoryId)) {
      const count = await syncCategoryProductCount(categoryId);
      return { success: true, assigned: false, productCount: count && count.productCount };
    }

    const updateResult = await callData('updateProduct', [productId, { categoryId: categoryId }]);
    if (!updateResult || !updateResult.success) {
      return updateResult || { success: false, error: 'failed to update product' };
    }

    // Maintain counts: the new category gains a product; the old one loses it.
    const newCount = await syncCategoryProductCount(categoryId);
    if (current) await syncCategoryProductCount(current);

    await audit(
      opType('ASSIGN_PRODUCT_CATEGORY'),
      { type: 'product', id: productId },
      { categoryId: categoryId, previousCategoryId: current }
    );

    return { success: true, assigned: true, productCount: newCount && newCount.productCount };
  }

  // ================================================================
  // BANNER MANAGEMENT (Req 12.4, 12.5, 12.6, 12.8, 12.9)
  // ================================================================

  /**
   * Optimize a banner source image into responsive renditions (Req 12.6).
   * Pure planning happens in the model; this validates first and returns the
   * plan the upload pipeline should encode/store.
   *
   * @param {Object} image - { width, height, format, sizeBytes }
   * @param {Object} [options]
   * @returns {{success:boolean, plan?:Object, errors?:string[], error?:string}}
   */
  function optimizeBannerImage(image, options) {
    if (!Model) return { success: false, error: 'image model unavailable' };
    const validation = Model.validateBannerImage(image, options);
    if (!validation.valid) {
      return { success: false, errors: validation.errors, error: validation.errors.join('; ') };
    }
    return { success: true, plan: Model.buildImageOptimizationPlan(image, options) };
  }

  /**
   * Create a banner (Req 12.5). Accepts a title, image URL, and link
   * destination. If created as active, enforces the max-5-active cap (Req 12.9)
   * before persisting.
   *
   * @param {Object} input - { title, imageUrl, linkType, linkId, displayOrder, active }
   * @returns {Promise<{success:boolean, id?:string, error?:string}>}
   */
  async function createBanner(input) {
    input = input || {};
    if (!input.imageUrl || String(input.imageUrl).trim() === '') {
      return { success: false, error: 'Banner image is required' };
    }
    const banner = Model ? Model.buildBanner(input) : input;

    // Enforce the active cap before creating an active banner (Req 12.9).
    if (banner.active && Model) {
      const existing = (await callData('getBanners', [{}])) || [];
      if (Model.countActiveBanners(existing) >= Model.MAX_ACTIVE_BANNERS) {
        return {
          success: false,
          error: 'Cannot exceed maximum of ' + Model.MAX_ACTIVE_BANNERS + ' active banners'
        };
      }
    }

    const result = await callData('createBanner', [
      {
        title: banner.title,
        imageUrl: banner.imageUrl,
        linkType: banner.linkType,
        linkId: banner.linkId,
        displayOrder: banner.displayOrder,
        active: banner.active,
        createdBy: getCurrentAdminId()
      }
    ]);
    if (result && result.success) {
      await audit(
        opType('CREATE_BANNER'),
        { type: 'banner', id: result.id },
        { title: banner.title, active: banner.active }
      );
    }
    return result;
  }

  /**
   * Update banner fields (Req 12.4/12.5). If the update would activate the
   * banner, enforces the max-5-active cap (Req 12.9).
   * @param {string} bannerId
   * @param {Object} updates
   * @returns {Promise<{success:boolean, error?:string}>}
   */
  async function updateBanner(bannerId, updates) {
    if (!bannerId) return { success: false, error: 'bannerId is required' };
    updates = updates || {};

    if (updates.active === true && Model) {
      const existing = (await callData('getBanners', [{}])) || [];
      if (!Model.canActivateBanner(existing, bannerId)) {
        return {
          success: false,
          error: 'Cannot exceed maximum of ' + Model.MAX_ACTIVE_BANNERS + ' active banners'
        };
      }
    }

    const result = await callData('updateBanner', [bannerId, updates]);
    if (result && result.success) {
      await audit(
        opType('UPDATE_BANNER'),
        { type: 'banner', id: bannerId },
        { fields: Object.keys(updates) }
      );
    }
    return result;
  }

  /**
   * Delete a banner.
   * @param {string} bannerId
   * @returns {Promise<{success:boolean, error?:string}>}
   */
  async function deleteBanner(bannerId) {
    if (!bannerId) return { success: false, error: 'bannerId is required' };
    const result = await callData('deleteBanner', [bannerId]);
    if (result && result.success) {
      await audit(opType('DELETE_BANNER'), { type: 'banner', id: bannerId }, {});
    }
    return result;
  }

  /**
   * Toggle a banner active/inactive (Req 12.8). Setting inactive removes it from
   * the home page immediately; setting active is refused when it would exceed
   * the max-5-active cap (Req 12.9).
   *
   * @param {string} bannerId
   * @param {boolean} active
   * @returns {Promise<{success:boolean, active?:boolean, error?:string}>}
   */
  async function toggleBanner(bannerId, active) {
    if (!bannerId) return { success: false, error: 'bannerId is required' };
    const desired = Boolean(active);

    if (Model) {
      const existing = (await callData('getBanners', [{}])) || [];
      // Use the pure model to validate the cap before persisting.
      const outcome = Model.setBannerActive(existing, bannerId, desired);
      if (!outcome.success) {
        return { success: false, error: outcome.error };
      }
    }

    const result = await callData('updateBanner', [bannerId, { active: desired }]);
    if (result && result.success) {
      await audit(opType('TOGGLE_BANNER'), { type: 'banner', id: bannerId }, { active: desired });
      return { success: true, active: desired };
    }
    return result || { success: false, error: 'update failed' };
  }

  /**
   * Load the banners to show on the home page: active banners capped at the
   * max and ordered by creation date for the carousel (Req 12.7/12.9).
   * @returns {Promise<Array<Object>>}
   */
  async function listActiveBanners() {
    const banners = (await callData('getBanners', [{ active: true }])) || [];
    if (!Model) return banners;
    return Model.selectDisplayBanners(banners);
  }

  // ----------------------------------------------------------------
  // helpers
  // ----------------------------------------------------------------

  /**
   * Resolve an audit operation type constant by key, falling back to the
   * lower-case key if the audit module is unavailable.
   * @param {string} key
   * @returns {string}
   */
  function opType(key) {
    if (Audit && Audit.OPERATION_TYPES && Audit.OPERATION_TYPES[key]) {
      return Audit.OPERATION_TYPES[key];
    }
    return key.toLowerCase();
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  const api = {
    // categories
    listCategoriesWithCounts: listCategoriesWithCounts,
    createCategory: createCategory,
    updateCategoryDetails: updateCategoryDetails,
    deleteCategory: deleteCategory,
    syncCategoryProductCount: syncCategoryProductCount,
    assignProductToCategory: assignProductToCategory,
    // banners
    optimizeBannerImage: optimizeBannerImage,
    createBanner: createBanner,
    updateBanner: updateBanner,
    deleteBanner: deleteBanner,
    toggleBanner: toggleBanner,
    listActiveBanners: listActiveBanners,
    // identity (exposed for reuse/testing)
    getCurrentAdminId: getCurrentAdminId
  };

  if (typeof window !== 'undefined') {
    window.AdminCategories = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
