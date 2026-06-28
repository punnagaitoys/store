/**
 * order.js — Pure order logic (Punnagai / Punnagai Toy Store)
 *
 * Pure-logic module: NO DOM, NO Firebase, NO localStorage, NO direct network.
 * Works in the browser (as `window.PunnagaiOrder`) and under Node/Jest (via
 * `module.exports`). Persisting orders is the data layer's job
 * (`js/data.js` → createOrder / updateOrder); this module holds only the pure,
 * deterministic business rules so they can be tested in isolation.
 *
 * Implements parts of Requirement 6 (Checkout and UPI Payment Processing):
 *  - computeOrderTotal({ subtotal, shippingFee, taxAmount, discount }) → Req 6.6
 *    (Invariant: total = subtotal + shipping + tax − discount, no surprises)
 *  - Order status state machine                                       → Req 6.8
 *    (canTransition / applyTransition; Property 16)
 *  - Checkout-phase progression                                       → Req 6.1/6.2
 *    (Cart → Checkout → Payment Processing → Confirmed)
 *  - isDuplicateOrder(newOrder, existingOrders, opts)                 → Req 6
 *    (design error handling: "Payment Already Processed: duplicate
 *     submission within 2 seconds → detect and prevent duplicate orders")
 *
 * ──────────────────────────────────────────────────────────────────────────
 * TWO state machines, reconciled (read this before editing):
 *
 * The spec describes order progression two ways, and BOTH are modelled here:
 *
 *  1. CHECKOUT PHASE (Requirement 6 correctness property / UI flow):
 *        cart → checkout → payment_processing → confirmed
 *     This tracks where the customer is in the checkout funnel, BEFORE an order
 *     is durably persisted with a fulfilment status. Use canCheckoutTransition /
 *     applyCheckoutTransition. A failed payment can return to `checkout` for a
 *     retry (Req 6.9); a customer may abandon to `cancelled`.
 *
 *  2. PERSISTED ORDER STATUS (Requirement 10 / orders schema `orderStatus`,
 *     enum: pending | confirmed | shipped | delivered | cancelled, plus the
 *     `refunded` outcome from the payment/refund flow). This is what is stored
 *     on the order document and what Property 16 governs:
 *        pending → confirmed (always allowed after successful UPI payment),
 *        then confirmed → shipped → delivered (in that order only).
 *     Illegal jumps (e.g. confirmed → delivered, shipped → confirmed,
 *     pending → shipped) are rejected. Use canTransition / applyTransition.
 *
 *  Bridge: a successful checkout (`payment_processing` → `confirmed`) corresponds
 *  to the persisted order moving `pending` → `confirmed`. The checkout funnel's
 *  final `confirmed` is the same moment the order document's `orderStatus`
 *  becomes `confirmed`.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Correctness properties this module is built to satisfy:
 *  - Property 16 (Req 6.8): pending → confirmed is always allowed; subsequent
 *    transitions follow confirmed → shipped → delivered only.
 *  - Invariant (Req 6.6): order total equals subtotal + shipping + tax −
 *    discount, floored at 0, with no unexplained changes.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiOrder = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  // --------------------------------------------------------------------------
  // Numeric helpers
  // --------------------------------------------------------------------------

  /**
   * Coerce a value to a finite number, falling back to `fallback` for
   * non-finite input. Keeps every public function total.
   * @param {*} value
   * @param {number} [fallback=0]
   * @returns {number}
   */
  function toNumber(value, fallback) {
    const n = Number(value);
    return isFinite(n) ? n : (fallback || 0);
  }

  /**
   * Coerce a value to a finite, NON-negative number (negatives clamp to 0).
   * Used for the money components so a malformed input can never make the
   * total drift in an unexplained direction.
   * @param {*} value
   * @returns {number}
   */
  function toNonNegative(value) {
    const n = toNumber(value, 0);
    return n < 0 ? 0 : n;
  }

  // --------------------------------------------------------------------------
  // Order total (Requirement 6.6 — Invariant)
  // --------------------------------------------------------------------------

  /**
   * Compute the order total from its money components (Req 6.6).
   *
   *   total = max(0, subtotal + shippingFee + taxAmount − discount)
   *
   * Field names mirror the `orders` collection schema (subtotal, shippingFee,
   * taxAmount, discount, total). Each input is coerced to a non-negative finite
   * number first, so the result is deterministic and the invariant holds:
   * the total equals subtotal + shipping + tax − discount with no surprises,
   * floored at 0 (a discount can never push the total below zero).
   *
   * @param {Object} parts
   * @param {number} parts.subtotal    - Sum of line totals.
   * @param {number} [parts.shippingFee=0]
   * @param {number} [parts.taxAmount=0]
   * @param {number} [parts.discount=0] - Coupon/discount amount.
   * @returns {number} The order total, floored at 0.
   */
  function computeOrderTotal(parts) {
    const p = parts || {};
    const subtotal = toNonNegative(p.subtotal);
    const shippingFee = toNonNegative(p.shippingFee);
    const taxAmount = toNonNegative(p.taxAmount);
    const discount = toNonNegative(p.discount);
    return Math.max(0, subtotal + shippingFee + taxAmount - discount);
  }

  // --------------------------------------------------------------------------
  // Persisted order-status state machine (Requirement 10 / Property 16)
  // --------------------------------------------------------------------------

  /**
   * The persisted `orderStatus` values. Mirrors the design `orders` schema
   * enum (pending | confirmed | shipped | delivered | cancelled) plus the
   * `refunded` terminal outcome produced by the refund flow (Req 10.5).
   */
  const ORDER_STATES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'];

  /**
   * Allowed `orderStatus` transitions (documented map).
   *
   *   pending   → confirmed        (after successful UPI payment, Req 6.8)
   *   pending   → cancelled        (abandoned / failed before confirmation)
   *   confirmed → shipped          (admin marks shipped, Req 10.4)
   *   confirmed → cancelled        (cancel a paid-but-unshipped order)
   *   confirmed → refunded         (refund a paid order, Req 10.5)
   *   shipped   → delivered        (delivery completes)
   *   shipped   → refunded         (refund after dispatch)
   *   delivered → refunded         (post-delivery refund / return, Req 10.5/10.6)
   *   cancelled → (terminal)
   *   refunded  → (terminal)
   *
   * The fulfilment happy-path is therefore strictly pending → confirmed →
   * shipped → delivered; any jump that skips a step (e.g. confirmed → delivered,
   * pending → shipped) or moves backwards (e.g. shipped → confirmed) is illegal
   * and rejected (Property 16).
   */
  const ORDER_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled', 'refunded'],
    shipped: ['delivered', 'refunded'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: []
  };

  /**
   * @param {string} state
   * @returns {boolean} True if `state` is a known order status.
   */
  function isOrderState(state) {
    return ORDER_STATES.indexOf(state) !== -1;
  }

  /**
   * Determine whether an `orderStatus` transition is allowed (Req 6.8).
   * @param {string} from - Current order status.
   * @param {string} to   - Desired next order status.
   * @returns {boolean}
   */
  function canTransition(from, to) {
    if (!isOrderState(from) || !isOrderState(to)) {
      return false;
    }
    const allowed = ORDER_TRANSITIONS[from] || [];
    return allowed.indexOf(to) !== -1;
  }

  /**
   * Apply an `orderStatus` transition, returning a NEW order object with the
   * updated status (the input order is never mutated). Illegal transitions
   * throw an Error (Property 16: illegal jumps are rejected).
   *
   * As a convenience, fulfilment timestamps are stamped to match the schema:
   *  - moving to `shipped`   sets `shippedAt`
   *  - moving to `delivered` sets `deliveredAt`
   * The timestamp source is injectable via `opts.now` (ms) for deterministic
   * tests; it defaults to Date.now().
   *
   * @param {Object} order - An order with an `orderStatus` field.
   * @param {string} to    - The desired next order status.
   * @param {Object} [opts] - { now }
   * @returns {Object} A new order object with `orderStatus` updated.
   * @throws {Error} If `order` is missing or the transition is illegal.
   */
  function applyTransition(order, to, opts) {
    if (!order || typeof order !== 'object') {
      throw new Error('applyTransition: order must be an object');
    }
    opts = opts || {};
    const from = order.orderStatus;
    if (!canTransition(from, to)) {
      throw new Error(
        'Illegal order status transition: ' + String(from) + ' \u2192 ' + String(to)
      );
    }
    const now = typeof opts.now === 'number' ? opts.now : Date.now();
    const next = Object.assign({}, order, { orderStatus: to });
    if (to === 'shipped' && next.shippedAt === undefined) {
      next.shippedAt = now;
    }
    if (to === 'delivered' && next.deliveredAt === undefined) {
      next.deliveredAt = now;
    }
    return next;
  }

  // --------------------------------------------------------------------------
  // Checkout-phase progression (Requirement 6.1 / 6.2 — UI funnel)
  // --------------------------------------------------------------------------

  /**
   * Checkout funnel phases, separate from the persisted order status. These
   * describe where the customer is in the checkout flow before/at order
   * confirmation: Cart → Checkout → Payment Processing → Confirmed.
   */
  const CHECKOUT_PHASES = ['cart', 'checkout', 'payment_processing', 'confirmed', 'cancelled'];

  /**
   * Allowed checkout-phase transitions (documented map).
   *
   *   cart               → checkout            (Proceed to Checkout, Req 6.1)
   *   cart               → cancelled
   *   checkout           → payment_processing  (Initiate UPI payment, Req 6.7)
   *   checkout           → cancelled
   *   payment_processing → confirmed           (payment success, Req 6.8)
   *   payment_processing → checkout            (payment failed → retry, Req 6.9)
   *   payment_processing → cancelled
   *   confirmed          → (terminal)
   *   cancelled          → (terminal)
   */
  const CHECKOUT_TRANSITIONS = {
    cart: ['checkout', 'cancelled'],
    checkout: ['payment_processing', 'cancelled'],
    payment_processing: ['confirmed', 'checkout', 'cancelled'],
    confirmed: [],
    cancelled: []
  };

  /**
   * @param {string} phase
   * @returns {boolean} True if `phase` is a known checkout phase.
   */
  function isCheckoutPhase(phase) {
    return CHECKOUT_PHASES.indexOf(phase) !== -1;
  }

  /**
   * Determine whether a checkout-phase transition is allowed.
   * @param {string} from
   * @param {string} to
   * @returns {boolean}
   */
  function canCheckoutTransition(from, to) {
    if (!isCheckoutPhase(from) || !isCheckoutPhase(to)) {
      return false;
    }
    const allowed = CHECKOUT_TRANSITIONS[from] || [];
    return allowed.indexOf(to) !== -1;
  }

  /**
   * Apply a checkout-phase transition, returning a NEW state object with the
   * updated `phase` (input never mutated). Illegal transitions throw.
   * @param {Object} state - An object with a `phase` field.
   * @param {string} to
   * @returns {Object} New state object with `phase` updated.
   * @throws {Error} If state is missing or the transition is illegal.
   */
  function applyCheckoutTransition(state, to) {
    if (!state || typeof state !== 'object') {
      throw new Error('applyCheckoutTransition: state must be an object');
    }
    const from = state.phase;
    if (!canCheckoutTransition(from, to)) {
      throw new Error(
        'Illegal checkout phase transition: ' + String(from) + ' \u2192 ' + String(to)
      );
    }
    return Object.assign({}, state, { phase: to });
  }

  // --------------------------------------------------------------------------
  // Duplicate-order detection (Requirement 6 — error handling)
  // --------------------------------------------------------------------------

  // Default duplicate-detection window: 2 seconds (design "Payment Already
  // Processed: duplicate submission within 2 seconds").
  const DEFAULT_DUPLICATE_WINDOW_MS = 2000;

  /**
   * Build a canonical, order-independent signature of an order's line items so
   * two orders with the same products/quantities compare equal regardless of
   * item ordering. Each item is keyed by its most specific identifier
   * (skuId → variantId → productId) plus its quantity.
   * @param {Object} order
   * @returns {string}
   */
  function itemsSignature(order) {
    const items = order && Array.isArray(order.items) ? order.items : [];
    const parts = items.map(function (it) {
      const id = (it && (it.skuId || it.variantId || it.productId)) || '';
      const qty = it ? toNumber(it.quantity, 0) : 0;
      return String(id) + 'x' + qty;
    });
    parts.sort();
    return parts.join('|');
  }

  /**
   * Resolve an order's creation time (ms). Accepts a numeric ms timestamp, a
   * Date, or a Firestore-style { seconds } / { toMillis() } value. Returns
   * `fallback` when no usable time is present.
   * @param {*} createdAt
   * @param {number} fallback
   * @returns {number}
   */
  function resolveTime(createdAt, fallback) {
    if (createdAt === undefined || createdAt === null) {
      return fallback;
    }
    if (typeof createdAt === 'number' && isFinite(createdAt)) {
      return createdAt;
    }
    if (createdAt instanceof Date) {
      return createdAt.getTime();
    }
    if (typeof createdAt.toMillis === 'function') {
      const ms = createdAt.toMillis();
      return isFinite(ms) ? ms : fallback;
    }
    if (typeof createdAt.seconds === 'number') {
      return createdAt.seconds * 1000;
    }
    const parsed = Date.parse(createdAt);
    return isFinite(parsed) ? parsed : fallback;
  }

  /**
   * Determine whether `newOrder` is a duplicate submission of an order already
   * in `existingOrders` (design error handling: "Payment Already Processed").
   *
   * Equivalence rule — two orders are considered the SAME submission when ALL
   * of the following hold:
   *   1. same `userId`,
   *   2. same line items (same set of product/variant/SKU + quantity, order
   *      independent — see itemsSignature), and
   *   3. same `total`,
   * AND the existing order was created within `windowMs` of the new order
   * (default 2000ms). Pure function: callers pass the existing orders in; no
   * storage or network access here.
   *
   * The new order's reference time is taken from its `createdAt`, or from
   * `opts.now` (ms), or Date.now() when neither is present.
   *
   * @param {Object} newOrder - The order being submitted.
   * @param {Array<Object>} existingOrders - Recently created orders to compare.
   * @param {Object} [opts] - { windowMs, now }
   * @returns {boolean} True if an equivalent recent order already exists.
   */
  function isDuplicateOrder(newOrder, existingOrders, opts) {
    if (!newOrder || typeof newOrder !== 'object') {
      return false;
    }
    opts = opts || {};
    const windowMs = opts.windowMs !== undefined
      ? toNonNegative(opts.windowMs)
      : DEFAULT_DUPLICATE_WINDOW_MS;
    const list = Array.isArray(existingOrders) ? existingOrders : [];

    const refNow = typeof opts.now === 'number' ? opts.now : Date.now();
    const newTime = resolveTime(newOrder.createdAt, refNow);
    const newUser = newOrder.userId !== undefined ? newOrder.userId : null;
    const newItemsSig = itemsSignature(newOrder);
    const newTotal = toNumber(newOrder.total, NaN);

    return list.some(function (existing) {
      if (!existing || typeof existing !== 'object') {
        return false;
      }
      // Same customer.
      const existingUser = existing.userId !== undefined ? existing.userId : null;
      if (existingUser !== newUser) {
        return false;
      }
      // Same total (guard against NaN === NaN being false by intent: if either
      // total is non-numeric they are not considered equal).
      const existingTotal = toNumber(existing.total, NaN);
      if (!(newTotal === existingTotal)) {
        return false;
      }
      // Same items (order independent).
      if (itemsSignature(existing) !== newItemsSig) {
        return false;
      }
      // Within the time window.
      const existingTime = resolveTime(existing.createdAt, refNow);
      return Math.abs(newTime - existingTime) <= windowMs;
    });
  }

  return {
    // Order total (Req 6.6)
    computeOrderTotal: computeOrderTotal,

    // Persisted order-status state machine (Req 6.8 / Property 16)
    canTransition: canTransition,
    applyTransition: applyTransition,
    isOrderState: isOrderState,

    // Checkout-phase progression (Req 6.1 / 6.2)
    canCheckoutTransition: canCheckoutTransition,
    applyCheckoutTransition: applyCheckoutTransition,
    isCheckoutPhase: isCheckoutPhase,

    // Duplicate-order detection (Req 6 error handling)
    isDuplicateOrder: isDuplicateOrder,
    itemsSignature: itemsSignature,

    // Constants / maps exposed for reuse and tests.
    ORDER_STATES: ORDER_STATES,
    ORDER_TRANSITIONS: ORDER_TRANSITIONS,
    CHECKOUT_PHASES: CHECKOUT_PHASES,
    CHECKOUT_TRANSITIONS: CHECKOUT_TRANSITIONS,
    DEFAULT_DUPLICATE_WINDOW_MS: DEFAULT_DUPLICATE_WINDOW_MS
  };
});
