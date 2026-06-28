/**
 * admin-orders.js — Admin order management & refunds (Punnagai / Kamaal Toy Store)
 *
 * Implements Requirement 10 (Admin Panel — Order Management):
 *  - 10.1: list all orders with id, date, customer name, total, status.
 *  - 10.2: filter orders by status (pending/confirmed/shipped/delivered/cancelled).
 *  - 10.3: full order details (delegated to the data layer reader).
 *  - 10.4: "Mark as Shipped" → move order to `shipped` AND email the customer a
 *          tracking link.
 *  - 10.5: refund → process through the original payment method (UPI) and mark
 *          the order `refunded`. On gateway failure, log + allow retry (no state
 *          change, no inventory restoration).
 *  - 10.6: on refund, return inventory for ALL items in the order back to stock
 *          (increase each item's stock by its refunded quantity) — Property 21.
 *  - 10.7: prevent marking an order shipped if ANY item's inventory has been
 *          depleted since the order was placed.
 *  - 10.8: search orders by order id or customer name.
 *
 * Every admin operation (mark shipped, refund) is recorded via the audit log
 * builder/writer in js/lib/audit.js (Requirement 17.8 / Property 23).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Design (mirrors js/admin-inventory.js):
 *  - The PURE logic — status filtering, search, the shipped-blocking check, and
 *    the refund inventory-restoration computation — has NO DOM / Firebase /
 *    localStorage dependency, so task 15.2 can property-test Property 21
 *    (refund inventory restoration) and the rest can be unit-tested directly.
 *  - The side-effectful glue (markOrderShipped / processRefund) reads/writes
 *    through the data layer (js/data.js) and has its collaborators INJECTABLE:
 *    the tracking-email sender, the UPI refund call, and a tracking-number
 *    generator default to safe mocks under USE_LOCAL_MODE and to a
 *    "not configured" failure otherwise, so nothing is silently faked in a real
 *    deployment.
 *  - Stock adjustments reuse js/lib/inventory-model.js (restoreStock), order
 *    transitions reuse js/lib/order.js (canTransition / applyTransition), and
 *    audit entries reuse js/lib/audit.js (OPERATION_TYPES.MARK_SHIPPED / REFUND).
 *
 * Uses the UMD-style dual-export pattern — see js/lib/_umd-template.js.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiAdminOrders = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  // ----------------------------------------------------------------------
  // Dependency resolution (browser globals → CommonJS require fallback)
  // ----------------------------------------------------------------------

  /**
   * Resolve a sibling pure-logic module, preferring an explicitly injected
   * implementation, then the browser global, then a CommonJS require. Returns
   * null when none is available so callers can degrade gracefully.
   * @param {*} injected - caller-provided implementation (highest priority).
   * @param {string} globalName - window.<globalName> in the browser.
   * @param {string} requirePath - relative path for Node/Jest require.
   * @returns {*}
   */
  function resolveModule(injected, globalName, requirePath) {
    if (injected) return injected;
    if (typeof window !== 'undefined' && window[globalName]) {
      return window[globalName];
    }
    if (typeof require === 'function') {
      try {
        return require(requirePath);
      } catch (err) {
        /* not available in this environment */
      }
    }
    return null;
  }

  function getInventoryModel(injected) {
    return resolveModule(injected, 'PunnagaiInventoryModel', './lib/inventory-model');
  }

  function getOrderModel(injected) {
    return resolveModule(injected, 'PunnagaiOrder', './lib/order');
  }

  function getAudit(injected) {
    return resolveModule(injected, 'PunnagaiAudit', './lib/audit');
  }

  // ----------------------------------------------------------------------
  // Small pure helpers
  // ----------------------------------------------------------------------

  /**
   * Coerce a value to a finite, non-negative integer (negatives/fractions/
   * non-numbers floor toward a safe 0). Used for item quantities and stock.
   * @param {*} value
   * @returns {number}
   */
  function toQuantity(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      return 0;
    }
    return Math.floor(n);
  }

  /**
   * Resolve the most specific stock-keeping identifier for an order line item
   * (skuId → variantId → productId). This is the key used to look an item up in
   * a stock map and to aggregate restoration deltas. Returns '' when none.
   * @param {Object} item
   * @returns {string}
   */
  function itemStockKey(item) {
    if (!item || typeof item !== 'object') return '';
    const id = item.skuId || item.variantId || item.productId || '';
    return String(id);
  }

  /**
   * Best-effort customer-name extraction for listing/search (Req 10.1/10.8).
   * Prefers an explicit field, then the shipping address name.
   * @param {Object} order
   * @returns {string}
   */
  function orderCustomerName(order) {
    if (!order || typeof order !== 'object') return '';
    if (order.customerName) return String(order.customerName);
    if (order.shippingAddress && order.shippingAddress.name) {
      return String(order.shippingAddress.name);
    }
    return '';
  }

  // ----------------------------------------------------------------------
  // Status filtering (Requirement 10.2)
  // ----------------------------------------------------------------------

  /**
   * Filter orders by `orderStatus`. A falsy status or the sentinel `'all'`
   * returns the full list (a defensive copy). Comparison is case-insensitive.
   *
   * @param {Array<Object>} orders
   * @param {string} [status] - pending | confirmed | shipped | delivered |
   *   cancelled | refunded | 'all'.
   * @returns {Array<Object>} matching orders (new array).
   */
  function filterOrdersByStatus(orders, status) {
    const list = Array.isArray(orders) ? orders : [];
    if (!status || String(status).toLowerCase() === 'all') {
      return list.slice();
    }
    const wanted = String(status).toLowerCase();
    return list.filter(function (order) {
      return order && String(order.orderStatus || '').toLowerCase() === wanted;
    });
  }

  // ----------------------------------------------------------------------
  // Search (Requirement 10.8)
  // ----------------------------------------------------------------------

  /**
   * Search orders by order id or customer name (case-insensitive substring).
   * An empty/blank query returns the full list (a defensive copy). The order id
   * is matched against both `id` and `orderId` to tolerate either schema key.
   *
   * @param {Array<Object>} orders
   * @param {string} query
   * @returns {Array<Object>} matching orders (new array).
   */
  function searchOrders(orders, query) {
    const list = Array.isArray(orders) ? orders : [];
    const term = String(query == null ? '' : query).trim().toLowerCase();
    if (term === '') {
      return list.slice();
    }
    return list.filter(function (order) {
      if (!order || typeof order !== 'object') return false;
      const id = String(order.id || order.orderId || '').toLowerCase();
      const name = orderCustomerName(order).toLowerCase();
      return id.indexOf(term) !== -1 || name.indexOf(term) !== -1;
    });
  }

  // ----------------------------------------------------------------------
  // Shipped-blocking check (Requirement 10.7)
  // ----------------------------------------------------------------------

  /**
   * Determine whether an order can be marked as shipped given the CURRENT
   * per-SKU stock levels (Requirement 10.7: block shipping if any item's
   * inventory has been depleted since the order was placed).
   *
   * `stockMap` maps a stock key (skuId / variantId / productId — see
   * {@link itemStockKey}) to the current available stock for that item. An item
   * is considered DEPLETED, and therefore blocks shipment, when its current
   * stock is known AND has fallen to/below `opts.threshold` (default 0).
   *
   * Items whose stock is not present in `stockMap` are treated as
   * unverifiable: by default they do NOT block (we only block on a confirmed
   * depletion). Pass `opts.treatMissingAsDepleted = true` to be strict and
   * block when stock cannot be confirmed.
   *
   * Pure and total: never throws, never touches the data layer.
   *
   * @param {Object} order - order with an `items[]` array.
   * @param {Object<string, number>} stockMap - current stock by stock key.
   * @param {Object} [opts] - { threshold = 0, treatMissingAsDepleted = false }
   * @returns {{shippable: boolean, blockedItems: Array<{key:string, stock:(number|null), required:number}>}}
   */
  function checkShippable(order, stockMap, opts) {
    opts = opts || {};
    const threshold = typeof opts.threshold === 'number' ? opts.threshold : 0;
    const treatMissingAsDepleted = opts.treatMissingAsDepleted === true;
    const map = (stockMap && typeof stockMap === 'object') ? stockMap : {};
    const items = (order && Array.isArray(order.items)) ? order.items : [];

    const blockedItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = itemStockKey(item);
      const required = toQuantity(item && item.quantity);
      const hasStock = Object.prototype.hasOwnProperty.call(map, key) && key !== '';

      if (!hasStock) {
        if (treatMissingAsDepleted) {
          blockedItems.push({ key: key, stock: null, required: required });
        }
        continue;
      }

      const stock = Number(map[key]);
      const current = Number.isFinite(stock) ? stock : 0;
      if (current <= threshold) {
        blockedItems.push({ key: key, stock: current, required: required });
      }
    }

    return { shippable: blockedItems.length === 0, blockedItems: blockedItems };
  }

  // ----------------------------------------------------------------------
  // Refund inventory restoration (Requirement 10.6 — Property 21)
  // ----------------------------------------------------------------------

  /**
   * Compute the per-SKU restoration deltas for a refunded order: each item's
   * quantity is added back to stock. Quantities for repeated SKUs are summed,
   * so the result is a `{ stockKey: totalQuantityToRestore }` map.
   *
   * @param {Object} order - order with an `items[]` array.
   * @returns {Object<string, number>} stock key → total quantity to restore.
   */
  function restorationDeltas(order) {
    const items = (order && Array.isArray(order.items)) ? order.items : [];
    const deltas = {};
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = itemStockKey(item);
      if (key === '') continue;
      const qty = toQuantity(item && item.quantity);
      deltas[key] = (deltas[key] || 0) + qty;
    }
    return deltas;
  }

  /**
   * Restore inventory for a refunded order against a flat per-SKU stock map
   * (Requirement 10.6 / Property 21). Returns a NEW map in which every item's
   * stock has been increased by its refunded quantity; the input map is not
   * mutated. SKUs not present in the input map start from 0.
   *
   * Uses inventory-model's `restoreStock` helper (via a `{ stock }` shim) so the
   * non-negative, integer stock semantics stay consistent across the codebase;
   * falls back to `Math.max(0, current + qty)` when the model is unavailable.
   *
   * Key invariant (Property 21): for the resulting map, for every item key k,
   *   newStock[k] === oldStock[k] (or 0) + sum(quantities of that item).
   *
   * @param {Object} order - the refunded order (with `items[]`).
   * @param {Object<string, number>} stockMap - current stock by stock key.
   * @param {Object} [opts] - { inventoryModel } injectable for tests.
   * @returns {Object<string, number>} a new per-SKU stock map.
   */
  function restoreInventoryForOrder(order, stockMap, opts) {
    opts = opts || {};
    const inventoryModel = getInventoryModel(opts.inventoryModel);
    const base = (stockMap && typeof stockMap === 'object') ? stockMap : {};
    const next = Object.assign({}, base);
    const deltas = restorationDeltas(order);

    Object.keys(deltas).forEach(function (key) {
      const current = Number(next[key]);
      const safeCurrent = Number.isFinite(current) && current > 0 ? Math.floor(current) : 0;
      const qty = deltas[key];

      if (inventoryModel && typeof inventoryModel.restoreStock === 'function') {
        next[key] = inventoryModel.restoreStock({ stock: safeCurrent }, qty).stock;
      } else {
        next[key] = Math.max(0, safeCurrent + qty);
      }
    });

    return next;
  }

  /**
   * Build a SKU index from the product catalog: maps a stock key (skuId →
   * variantId → productId) to { product, variantIndex }. Mirrors the indexing
   * used by admin-inventory so restoration can target the right variant.
   *
   * Products are expected to carry a `variants[]` array; for products without
   * variants the product-level entry is keyed by its id and updates the
   * product's own `stock` field.
   *
   * @param {Array<Object>} products
   * @returns {{index: Object, stockMap: Object<string, number>}}
   */
  function buildOrderSkuIndex(products) {
    const index = {};
    const stockMap = {};
    const list = Array.isArray(products) ? products : [];

    for (let p = 0; p < list.length; p++) {
      const product = list[p];
      if (!product || typeof product !== 'object') continue;
      const pid = product.id || product.productId;
      const variants = Array.isArray(product.variants) ? product.variants : null;

      if (variants && variants.length > 0) {
        for (let v = 0; v < variants.length; v++) {
          const variant = variants[v];
          if (!variant || typeof variant !== 'object') continue;
          const key = String(variant.skuId || variant.variantId || (pid + '-' + v));
          index[key] = { product: product, variantIndex: v };
          const s = Number(variant.stock);
          stockMap[key] = Number.isFinite(s) ? s : 0;
        }
      } else if (pid) {
        const key = String(pid);
        index[key] = { product: product, variantIndex: null };
        const s = Number(product.stock);
        stockMap[key] = Number.isFinite(s) ? s : 0;
      }
    }

    return { index: index, stockMap: stockMap };
  }

  // ----------------------------------------------------------------------
  // Default (mockable) collaborators for the browser glue
  // ----------------------------------------------------------------------

  function isLocalMode() {
    return typeof window !== 'undefined' && window.USE_LOCAL_MODE === true;
  }

  /**
   * Default tracking-number generator. Injectable; produces a TR-prefixed id.
   * @returns {string}
   */
  function defaultGenerateTrackingNumber() {
    return 'TR' + Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  /**
   * Default tracking-email sender (Requirement 10.4). Mockable: under
   * USE_LOCAL_MODE it logs and resolves success; otherwise it reports that no
   * real email integration is configured (so a deployment must inject one).
   * @param {Object} payload - { to, orderId, trackingNumber }
   * @returns {Promise<{success:boolean, mocked?:boolean, error?:string}>}
   */
  async function defaultSendTrackingEmail(payload) {
    if (isLocalMode()) {
      try {
        console.log('[admin-orders] (mock) tracking email →', payload);
      } catch (e) { /* ignore */ }
      return { success: true, mocked: true };
    }
    return {
      success: false,
      error: 'No tracking-email sender configured. Inject deps.sendTrackingEmail.'
    };
  }

  /**
   * Default UPI refund call (Requirement 10.5). Mockable: under USE_LOCAL_MODE
   * it logs and resolves with a mock refund id; otherwise it reports that no
   * real UPI refund integration is configured.
   * @param {Object} payload - { orderId, amount, upiTransactionId }
   * @returns {Promise<{success:boolean, refundId?:string, mocked?:boolean, error?:string}>}
   */
  async function defaultRefundViaUPI(payload) {
    if (isLocalMode()) {
      try {
        console.log('[admin-orders] (mock) UPI refund →', payload);
      } catch (e) { /* ignore */ }
      return {
        success: true,
        mocked: true,
        refundId: 'refund_local_' + Math.random().toString(36).slice(2, 10)
      };
    }
    return {
      success: false,
      error: 'No UPI refund gateway configured. Inject deps.refundViaUPI.'
    };
  }

  // ----------------------------------------------------------------------
  // High-level browser glue: load / filter / search orders
  // ----------------------------------------------------------------------

  /**
   * Fetch orders via the data layer and apply optional status filtering and
   * search (Requirements 10.1, 10.2, 10.8). Returns the order list.
   *
   * @param {Object} [deps] - { getOrders, status, search }
   * @returns {Promise<Array<Object>>}
   */
  async function loadOrders(deps) {
    deps = deps || {};
    const getOrdersFn = deps.getOrders || (typeof window !== 'undefined' ? window.getOrders : null);
    if (typeof getOrdersFn !== 'function') {
      console.error('admin-orders: data layer unavailable (getOrders not found)');
      return [];
    }
    let orders = await getOrdersFn({});
    if (!Array.isArray(orders)) orders = [];
    if (deps.status) {
      orders = filterOrdersByStatus(orders, deps.status);
    }
    if (deps.search) {
      orders = searchOrders(orders, deps.search);
    }
    return orders;
  }

  // ----------------------------------------------------------------------
  // High-level browser glue: mark as shipped (Requirements 10.4, 10.7)
  // ----------------------------------------------------------------------

  /**
   * Mark an order as shipped and email the customer a tracking link.
   *
   * Flow (Requirements 10.4 & 10.7):
   *  1. Load the order; reject if missing.
   *  2. Build the current stock index from the catalog and run the
   *     shipped-blocking check — if any item's inventory is depleted, abort
   *     with a descriptive error (10.7), making NO changes.
   *  3. Verify the order-status transition (current → shipped) is legal via the
   *     order state machine, then stamp `shippedAt` and assign/keep a tracking
   *     number.
   *  4. Persist the update, send the tracking email (injectable sender), and
   *     write a MARK_SHIPPED audit entry.
   *
   * @param {string} orderId
   * @param {Object} [deps] - injectable collaborators (see resolveModule /
   *   default* helpers). Defaults to the page globals under the browser.
   * @returns {Promise<{success:boolean, error?:string, trackingNumber?:string,
   *   emailed?:boolean, blockedItems?:Array<Object>}>}
   */
  async function markOrderShipped(orderId, deps) {
    deps = deps || {};
    const getOrderByIdFn = deps.getOrderById || (typeof window !== 'undefined' ? window.getOrderById : null);
    const updateOrderFn = deps.updateOrder || (typeof window !== 'undefined' ? window.updateOrder : null);
    const getProductsFn = deps.getProducts || (typeof window !== 'undefined' ? window.getProducts : null);
    const getUserByIdFn = deps.getUserById || (typeof window !== 'undefined' ? window.getUserById : null);
    const sendTrackingEmailFn = deps.sendTrackingEmail || defaultSendTrackingEmail;
    const generateTrackingNumberFn = deps.generateTrackingNumber || defaultGenerateTrackingNumber;
    const orderModel = getOrderModel(deps.orderModel);
    const audit = getAudit(deps.audit);
    const adminUserId = deps.adminUserId || null;

    if (typeof getOrderByIdFn !== 'function' || typeof updateOrderFn !== 'function') {
      return { success: false, error: 'Data layer unavailable (getOrderById/updateOrder not found)' };
    }
    if (!orderModel || typeof orderModel.canTransition !== 'function') {
      return { success: false, error: 'Order state machine unavailable (js/lib/order.js not loaded)' };
    }

    // 1. Load order.
    const order = await getOrderByIdFn(orderId);
    if (!order) {
      return { success: false, error: 'Order not found: ' + String(orderId) };
    }

    // 2. Shipped-blocking check against current inventory (Req 10.7).
    let products = [];
    if (typeof getProductsFn === 'function') {
      products = await getProductsFn({});
    }
    const skuIndex = buildOrderSkuIndex(products);
    const shippable = checkShippable(order, skuIndex.stockMap, {
      // Be strict only when we actually have catalog stock to compare against.
      treatMissingAsDepleted: false
    });
    if (!shippable.shippable) {
      const keys = shippable.blockedItems.map(function (b) { return b.key; }).join(', ');
      return {
        success: false,
        error: 'Cannot mark as shipped: inventory depleted for item(s): ' + keys,
        blockedItems: shippable.blockedItems
      };
    }

    // 3. Validate + apply the status transition (Property 16 enforced here).
    if (!orderModel.canTransition(order.orderStatus, 'shipped')) {
      return {
        success: false,
        error: 'Illegal status transition: ' + String(order.orderStatus) + ' → shipped'
      };
    }
    const now = typeof deps.now === 'number' ? deps.now : Date.now();
    const shipped = orderModel.applyTransition(order, 'shipped', { now: now });
    const trackingNumber = order.trackingNumber || generateTrackingNumberFn();

    // 4a. Persist the order update.
    const updateResult = await updateOrderFn(orderId, {
      orderStatus: 'shipped',
      shippedAt: shipped.shippedAt,
      trackingNumber: trackingNumber
    });
    if (updateResult && updateResult.success === false) {
      return { success: false, error: updateResult.error || 'Failed to update order' };
    }

    // 4b. Resolve the recipient and send the tracking email (Req 10.4).
    let recipient = order.customerEmail || null;
    if (!recipient && order.userId && typeof getUserByIdFn === 'function') {
      try {
        const user = await getUserByIdFn(order.userId);
        recipient = user && user.email ? user.email : null;
      } catch (e) { /* email lookup is best-effort */ }
    }
    let emailed = false;
    try {
      const emailResult = await sendTrackingEmailFn({
        to: recipient,
        orderId: orderId,
        trackingNumber: trackingNumber,
        customerName: orderCustomerName(order)
      });
      emailed = !!(emailResult && emailResult.success);
    } catch (err) {
      console.error('admin-orders: tracking email failed:', err);
    }

    // 4c. Audit (Req 17.8 / Property 23).
    await writeAudit(audit, {
      adminUserId: adminUserId,
      operationType: audit && audit.OPERATION_TYPES ? audit.OPERATION_TYPES.MARK_SHIPPED : 'mark_shipped',
      entity: { type: 'order', id: orderId },
      details: { trackingNumber: trackingNumber, emailed: emailed, shippedAt: shipped.shippedAt }
    });

    return { success: true, trackingNumber: trackingNumber, emailed: emailed };
  }

  // ----------------------------------------------------------------------
  // High-level browser glue: process refund (Requirements 10.5, 10.6)
  // ----------------------------------------------------------------------

  /**
   * Process a refund for an order through UPI, restore inventory, and mark the
   * order refunded.
   *
   * Flow (Requirements 10.5 & 10.6):
   *  1. Load the order; reject if missing.
   *  2. Verify the order-status transition (current → refunded) is legal.
   *  3. Call the UPI refund (injectable). On failure: log and return an error
   *     so the admin can retry — NO inventory restoration, NO status change
   *     (design "Refund Failed" handling).
   *  4. On success: restore inventory for every item (increase each variant's
   *     stock by the refunded quantity — Property 21), persisting per product.
   *  5. Mark the order `refunded` (orderStatus + paymentStatus), persist, and
   *     write a REFUND audit entry.
   *
   * @param {string} orderId
   * @param {Object} [deps] - injectable collaborators. Defaults to page globals.
   * @returns {Promise<{success:boolean, error?:string, refundId?:string,
   *   restoredItems?:Array<Object>}>}
   */
  async function processRefund(orderId, deps) {
    deps = deps || {};
    const getOrderByIdFn = deps.getOrderById || (typeof window !== 'undefined' ? window.getOrderById : null);
    const updateOrderFn = deps.updateOrder || (typeof window !== 'undefined' ? window.updateOrder : null);
    const getProductsFn = deps.getProducts || (typeof window !== 'undefined' ? window.getProducts : null);
    const updateProductFn = deps.updateProduct || (typeof window !== 'undefined' ? window.updateProduct : null);
    const createInventoryLogFn = deps.createInventoryLog || (typeof window !== 'undefined' ? window.createInventoryLog : null);
    const refundViaUPIFn = deps.refundViaUPI || defaultRefundViaUPI;
    const inventoryModel = getInventoryModel(deps.inventoryModel);
    const orderModel = getOrderModel(deps.orderModel);
    const audit = getAudit(deps.audit);
    const adminUserId = deps.adminUserId || null;

    if (typeof getOrderByIdFn !== 'function' || typeof updateOrderFn !== 'function') {
      return { success: false, error: 'Data layer unavailable (getOrderById/updateOrder not found)' };
    }
    if (!orderModel || typeof orderModel.canTransition !== 'function') {
      return { success: false, error: 'Order state machine unavailable (js/lib/order.js not loaded)' };
    }

    // 1. Load order.
    const order = await getOrderByIdFn(orderId);
    if (!order) {
      return { success: false, error: 'Order not found: ' + String(orderId) };
    }

    // 2. Validate the transition before touching the payment gateway.
    if (!orderModel.canTransition(order.orderStatus, 'refunded')) {
      return {
        success: false,
        error: 'Illegal status transition: ' + String(order.orderStatus) + ' → refunded'
      };
    }

    // 3. Process the UPI refund first (Req 10.5). On failure, stop here.
    let refundResult;
    try {
      refundResult = await refundViaUPIFn({
        orderId: orderId,
        amount: Number(order.total) || 0,
        upiTransactionId: order.upiTransactionId || null
      });
    } catch (err) {
      console.error('admin-orders: UPI refund threw:', err);
      return { success: false, error: 'Refund failed: ' + (err && err.message ? err.message : String(err)) };
    }
    if (!refundResult || refundResult.success !== true) {
      const reason = (refundResult && refundResult.error) || 'UPI gateway returned an error';
      console.error('admin-orders: UPI refund failed for order', orderId, '-', reason);
      return { success: false, error: 'Refund failed: ' + reason };
    }

    // 4. Restore inventory for every item (Req 10.6 / Property 21).
    let products = [];
    if (typeof getProductsFn === 'function') {
      products = await getProductsFn({});
    }
    const skuIndex = buildOrderSkuIndex(products);
    const deltas = restorationDeltas(order);
    const productsToUpdate = {}; // pid -> { product, variants }
    const restoredItems = [];

    Object.keys(deltas).forEach(function (key) {
      const qty = deltas[key];
      const entry = skuIndex.index[key];
      if (!entry) {
        // No matching catalog SKU — record intent but cannot persist stock.
        restoredItems.push({ key: key, quantity: qty, persisted: false });
        return;
      }
      const product = entry.product;
      const pid = product.id || product.productId;
      if (!productsToUpdate[pid]) {
        productsToUpdate[pid] = {
          product: product,
          variants: Array.isArray(product.variants)
            ? product.variants.map(function (v) { return Object.assign({}, v); })
            : null
        };
      }
      const bundle = productsToUpdate[pid];

      if (entry.variantIndex === null) {
        // Product-level stock.
        const previousStock = Number(product.stock) || 0;
        const restored = inventoryModel && typeof inventoryModel.restoreStock === 'function'
          ? inventoryModel.restoreStock({ stock: previousStock }, qty).stock
          : Math.max(0, previousStock + qty);
        bundle.productStock = restored;
        restoredItems.push({ key: key, quantity: qty, previousStock: previousStock, newStock: restored, persisted: true });
      } else {
        const variant = bundle.variants[entry.variantIndex];
        const previousStock = Number(variant.stock) || 0;
        bundle.variants[entry.variantIndex] = inventoryModel && typeof inventoryModel.restoreStock === 'function'
          ? inventoryModel.restoreStock(variant, qty)
          : Object.assign({}, variant, { stock: Math.max(0, previousStock + qty) });
        const newStock = bundle.variants[entry.variantIndex].stock;
        restoredItems.push({ key: key, quantity: qty, previousStock: previousStock, newStock: newStock, persisted: true });
      }
    });

    // Persist the restored stock per product.
    if (typeof updateProductFn === 'function') {
      const pids = Object.keys(productsToUpdate);
      for (let i = 0; i < pids.length; i++) {
        const bundle = productsToUpdate[pids[i]];
        const updates = {};
        if (bundle.variants) updates.variants = bundle.variants;
        if (typeof bundle.productStock === 'number') updates.stock = bundle.productStock;
        if (Object.keys(updates).length > 0) {
          await updateProductFn(pids[i], updates);
        }
      }
    }

    // Optional inventory_logs entries for the restoration (Req 9.5 audit trail).
    if (typeof createInventoryLogFn === 'function') {
      for (let i = 0; i < restoredItems.length; i++) {
        const r = restoredItems[i];
        if (!r.persisted) continue;
        await createInventoryLogFn({
          skuId: r.key,
          previousStock: r.previousStock,
          newStock: r.newStock,
          changeReason: 'refund_restock',
          orderId: orderId,
          quantityChanged: r.quantity,
          uploadedBy: adminUserId
        });
      }
    }

    // 5. Mark the order refunded (orderStatus + paymentStatus) and persist.
    const refunded = orderModel.applyTransition(order, 'refunded');
    const orderUpdate = await updateOrderFn(orderId, {
      orderStatus: refunded.orderStatus,
      paymentStatus: 'refunded',
      refundId: refundResult.refundId || null,
      refundedAt: typeof deps.now === 'number' ? deps.now : Date.now()
    });
    if (orderUpdate && orderUpdate.success === false) {
      return { success: false, error: orderUpdate.error || 'Refund processed but failed to update order' };
    }

    // Audit (Req 17.8 / Property 23).
    await writeAudit(audit, {
      adminUserId: adminUserId,
      operationType: audit && audit.OPERATION_TYPES ? audit.OPERATION_TYPES.REFUND : 'refund',
      entity: { type: 'order', id: orderId },
      details: {
        refundId: refundResult.refundId || null,
        amount: Number(order.total) || 0,
        restoredItems: restoredItems
      }
    });

    return { success: true, refundId: refundResult.refundId || null, restoredItems: restoredItems };
  }

  /**
   * Write an audit entry, swallowing/logging errors so an audit-write failure
   * never corrupts the operation result. No-op when no audit writer is present.
   * @param {Object} audit - PunnagaiAudit-compatible module.
   * @param {Object} entry - raw input for buildAuditEntry/writeAuditLog.
   * @returns {Promise<void>}
   */
  async function writeAudit(audit, entry) {
    if (!audit || typeof audit.writeAuditLog !== 'function') {
      return;
    }
    try {
      await audit.writeAuditLog(entry);
    } catch (err) {
      console.error('admin-orders: audit log write failed:', err);
    }
  }

  return {
    // Pure logic (unit/property testable)
    filterOrdersByStatus: filterOrdersByStatus,
    searchOrders: searchOrders,
    checkShippable: checkShippable,
    restorationDeltas: restorationDeltas,
    restoreInventoryForOrder: restoreInventoryForOrder,
    buildOrderSkuIndex: buildOrderSkuIndex,
    itemStockKey: itemStockKey,
    orderCustomerName: orderCustomerName,
    // Browser glue (injectable collaborators)
    loadOrders: loadOrders,
    markOrderShipped: markOrderShipped,
    processRefund: processRefund,
    // Default (mockable) collaborators, exposed for reuse/testing
    defaultGenerateTrackingNumber: defaultGenerateTrackingNumber,
    defaultSendTrackingEmail: defaultSendTrackingEmail,
    defaultRefundViaUPI: defaultRefundViaUPI
  };
});
