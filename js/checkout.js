/**
 * checkout.js — UPI checkout orchestration (Punnagai / Kamaal Toy Store)
 *
 * Wires the pure order logic (`js/lib/order.js`), the cart persistence glue
 * (`js/lib/cart-storage.js`), and the data layer (`js/data.js`) into the
 * end-to-end UPI checkout flow described by Requirement 6:
 *
 *   6.7  Initiate UPI payment → redirect to the UPI payment gateway.
 *   6.8  On successful payment → receive confirmation from the gateway and
 *        mark the order "Confirmed".
 *   6.9  On payment failure → surface an error and allow a retry, optionally
 *        with a DIFFERENT UPI ID.
 *   6.10 On confirmation → send a confirmation email with order ID + tracking.
 *   6.11 Clear the cart after a successful order completion.
 *
 * Property 17 (Cart Clears After Checkout): for ANY successful order completion
 * (payment confirmed) the LocalStorage cart SHALL be cleared, and ONLY then.
 * A failed/unverified payment SHALL leave the cart intact. The decision is
 * isolated in the pure helper `shouldClearCart(outcome)` and the orchestrator
 * `completeCheckout(...)` so it is independently testable (task 10.4).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SECURITY — READ THIS BEFORE TRUSTING ANYTHING HERE:
 *
 * This is a STATIC site with no real backend. Client-side JavaScript CANNOT be
 * trusted to authorise a payment: a malicious client could call
 * `completeCheckout` with a forged "success" and confirm an unpaid order.
 *
 * Therefore payment verification is deliberately abstracted behind an
 * INJECTABLE `paymentGateway` interface with two seams:
 *
 *   gateway.redirect(order, opts) -> { success, redirectUrl, transactionRef }
 *       Begins payment and hands the customer to the UPI app/gateway (Req 6.7).
 *
 *   gateway.verify(verificationPayload) -> { verified, transactionId, reason }
 *       MUST be backed by a SERVER endpoint (or the gateway's signed webhook
 *       callback) that validates the payment signature server-side. The client
 *       NEVER decides on its own that a payment succeeded — it only relays the
 *       gateway/server's verified verdict. In production this becomes the
 *       Razorpay/PayU webhook + a Cloud Function that checks the HMAC signature.
 *
 * In USE_LOCAL_MODE the injected gateway is a MOCK
 * (`createMockPaymentGateway`) that simulates a trusted server verifying a
 * signature, so the flow is exercisable offline. Swapping in a real
 * Razorpay/PayU adapter that implements the same { redirect, verify } shape is
 * the only change needed for production — no orchestration code changes.
 *
 * The confirmation-email sender (Req 6.10) is likewise injectable/stubbed
 * (`createConsoleEmailSender`) because a static site cannot send email; in
 * production this is swapped for a transactional-email service call.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Module shape: UMD-style dual export (see `js/lib/README.md`). Attaches to
 * `window.PunnagaiCheckout` in the browser AND `module.exports` under Node/Jest.
 * Dependencies are resolved through injection first (`deps.*`), then globals,
 * then a defensive `require`, so the orchestrators stay pure and testable.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  if (typeof window !== 'undefined') {
    window.PunnagaiCheckout = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  // --------------------------------------------------------------------------
  // Dependency resolution (injection → global → require). Keeps orchestrators
  // pure: tests inject everything; the browser uses the loaded globals.
  // --------------------------------------------------------------------------

  /** Defensive require that never throws in the browser. */
  function safeRequire(path) {
    try {
      if (typeof require === 'function') {
        return require(path);
      }
    } catch (e) {
      // Module not resolvable in this environment — fall through to null.
    }
    return null;
  }

  /** Resolve the pure order logic module (`js/lib/order.js`). */
  function resolveOrderLib(deps) {
    if (deps && deps.orderLib) return deps.orderLib;
    if (typeof window !== 'undefined' && window.PunnagaiOrder) return window.PunnagaiOrder;
    return safeRequire('./lib/order.js');
  }

  /** Resolve the cart persistence module (`js/lib/cart-storage.js`). */
  function resolveCartStorage(deps) {
    if (deps && deps.cartStorage) return deps.cartStorage;
    if (typeof window !== 'undefined' && window.PunnagaiCartStorage) return window.PunnagaiCartStorage;
    return safeRequire('./lib/cart-storage.js');
  }

  /**
   * Resolve a cart-clearing function (Req 6.11). Prefers an explicit
   * `deps.clearCart`, then the resolved cart-storage module's `clearCart`.
   * Returns a no-op (returning false) when none is available so the flow never
   * crashes in a headless test without storage.
   */
  function resolveClearCart(deps) {
    if (deps && typeof deps.clearCart === 'function') return deps.clearCart;
    const cs = resolveCartStorage(deps);
    if (cs && typeof cs.clearCart === 'function') return cs.clearCart;
    return function () { return false; };
  }

  // --------------------------------------------------------------------------
  // Mock UPI payment gateway (USE_LOCAL_MODE) — stands in for Razorpay/PayU.
  // --------------------------------------------------------------------------

  /**
   * A tiny, deterministic, NON-cryptographic signature used ONLY by the mock to
   * demonstrate that verification is signature-based and performed by the
   * (simulated) server — not by trusting raw client state. A real gateway uses
   * an HMAC computed server-side with a secret the client never sees.
   * @param {string} payload
   * @param {string} secret
   * @returns {string}
   */
  function mockSign(payload, secret) {
    const str = String(payload) + '|' + String(secret);
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return 'sig_' + (h >>> 0).toString(16);
  }

  /**
   * Create a mock UPI payment gateway implementing the { redirect, verify }
   * interface. Used in USE_LOCAL_MODE so the checkout flow works offline.
   *
   * Options:
   *  - shouldSucceed {boolean} - whether a payment "succeeds" (default true).
   *      Set false to exercise the failure/retry path (Req 6.9).
   *  - secret {string}        - the server-side signing secret (never sent to
   *      the client in reality). The mock uses it to sign + verify.
   *  - transactionIdPrefix {string} - prefix for generated transaction ids.
   *  - now {Function}         - clock injection for deterministic ids/tests.
   *
   * @param {Object} [options]
   * @returns {{redirect: Function, verify: Function}}
   */
  function createMockPaymentGateway(options) {
    const opts = options || {};
    const secret = opts.secret || 'punnagai_mock_secret';
    const prefix = opts.transactionIdPrefix || 'UPI';
    const clock = typeof opts.now === 'function' ? opts.now : function () { return Date.now(); };
    let shouldSucceed = opts.shouldSucceed !== false;

    return {
      /** Allow tests/UI to flip the simulated outcome between attempts. */
      setShouldSucceed: function (value) { shouldSucceed = value !== false; },

      /**
       * Begin a payment (Req 6.7). Returns the redirect descriptor a real
       * gateway would hand back; in local mode the caller simulates the
       * round-trip rather than actually navigating away.
       */
      redirect: function (order, redirectOpts) {
        const o = redirectOpts || {};
        const orderId = (order && (order.id || order.orderId)) || 'unknown';
        const txnRef = prefix + '-' + orderId + '-' + clock();
        const upiId = o.upiId || (order && order.upiId) || 'customer@upi';
        // A real gateway returns a hosted checkout URL / UPI intent string.
        const redirectUrl = 'upi://pay?pa=' + encodeURIComponent(upiId) +
          '&tr=' + encodeURIComponent(txnRef);
        return {
          success: true,
          redirectUrl: redirectUrl,
          transactionRef: txnRef,
          // The "server" pre-signs the reference; the eventual webhook payload
          // echoes this signature so verify() can validate it server-side.
          signature: mockSign(txnRef, secret)
        };
      },

      /**
       * Verify a payment result (Req 6.8). In reality this runs on the SERVER
       * against the gateway's signed webhook. The mock recomputes the signature
       * from the transaction reference and the server-only secret and refuses
       * to confirm anything whose signature does not match — modelling why the
       * client alone cannot forge a success.
       *
       * @param {Object} payload - { transactionRef, signature, status, upiId }
       * @returns {{verified:boolean, transactionId:(string|null), reason:string}}
       */
      verify: function (payload) {
        const p = payload || {};
        if (!shouldSucceed || p.status === 'failed') {
          return { verified: false, transactionId: null, reason: p.reason || 'payment_failed' };
        }
        if (!p.transactionRef || !p.signature) {
          return { verified: false, transactionId: null, reason: 'missing_signature' };
        }
        const expected = mockSign(p.transactionRef, secret);
        if (expected !== p.signature) {
          return { verified: false, transactionId: null, reason: 'invalid_signature' };
        }
        return { verified: true, transactionId: p.transactionRef, reason: 'ok' };
      }
    };
  }

  // --------------------------------------------------------------------------
  // Confirmation email (Req 6.10) — injectable/stubbed sender.
  // --------------------------------------------------------------------------

  /**
   * Build the confirmation email payload for a confirmed order (Req 6.10).
   * Pure: no side effects. Includes the order ID and tracking information so
   * the caller/sender has everything it needs.
   * @param {Object} order
   * @returns {{to:(string|null), subject:string, body:string, orderId:(string|null), trackingNumber:(string|null)}}
   */
  function buildConfirmationEmail(order) {
    const o = order || {};
    const orderId = o.id || o.orderId || null;
    const trackingNumber = o.trackingNumber || null;
    const to =
      (o.shippingAddress && o.shippingAddress.email) ||
      o.email ||
      (o.customer && o.customer.email) ||
      null;
    const trackingLine = trackingNumber
      ? 'Tracking number: ' + trackingNumber
      : 'Tracking details will follow once your order ships.';
    const subject = 'Your Punnagai Toys order ' + (orderId ? '#' + orderId : '') + ' is confirmed';
    const body =
      'Thank you for your order!\n\n' +
      'Order ID: ' + (orderId || 'N/A') + '\n' +
      trackingLine + '\n\n' +
      'We will notify you when your toys are on the way.';
    return {
      to: to,
      subject: subject,
      body: body,
      orderId: orderId,
      trackingNumber: trackingNumber
    };
  }

  /**
   * Create a stub email sender that logs to the console. Stands in for a real
   * transactional-email service on this static site. Returns the standard
   * `{ success }` / `{ success, error }` shape.
   * @returns {{send: Function}}
   */
  function createConsoleEmailSender() {
    return {
      send: function (email) {
        try {
          if (typeof console !== 'undefined' && console.info) {
            console.info('[Punnagai] Confirmation email (stub):', email && email.subject, '→', email && email.to);
          }
          return { success: true };
        } catch (e) {
          return { success: false, error: e && e.message ? e.message : String(e) };
        }
      }
    };
  }

  // --------------------------------------------------------------------------
  // Pure decision helper (Property 17).
  // --------------------------------------------------------------------------

  /**
   * Decide whether the cart should be cleared for a given checkout outcome
   * (Req 6.11 / Property 17). The cart is cleared IF AND ONLY IF the order was
   * successfully confirmed. Pure and total so the property test can drive it
   * directly with arbitrary outcomes.
   * @param {Object} outcome - a result like { success, confirmed }
   * @returns {boolean}
   */
  function shouldClearCart(outcome) {
    if (!outcome || typeof outcome !== 'object') return false;
    return outcome.success === true && outcome.confirmed === true;
  }

  // --------------------------------------------------------------------------
  // Orchestration
  // --------------------------------------------------------------------------

  /**
   * Initiate UPI payment by handing off to the gateway (Req 6.7).
   *
   * Does NOT confirm the order or clear the cart — it only starts the payment
   * and returns the redirect descriptor. In the browser, pass
   * `deps.navigate(url)` (defaults to setting `window.location.href`) to
   * actually redirect; in local mode the caller simulates the callback and then
   * calls `completeCheckout`.
   *
   * @param {Object} order - The order being paid for (should already exist /
   *   be persisted with orderStatus 'pending').
   * @param {Object} [deps] - { gateway, navigate, upiId, redirect: false }
   * @returns {{success:boolean, redirect?:Object, error?:string}}
   */
  function initiatePayment(order, deps) {
    deps = deps || {};
    if (!order || typeof order !== 'object') {
      return { success: false, error: 'initiatePayment: order is required' };
    }
    const gateway = deps.gateway;
    if (!gateway || typeof gateway.redirect !== 'function') {
      return { success: false, error: 'initiatePayment: a payment gateway with redirect() is required' };
    }

    let redirect;
    try {
      redirect = gateway.redirect(order, { upiId: deps.upiId });
    } catch (e) {
      return { success: false, error: e && e.message ? e.message : String(e) };
    }
    if (!redirect || redirect.success !== true || !redirect.redirectUrl) {
      return { success: false, error: (redirect && redirect.error) || 'gateway_redirect_failed' };
    }

    // Optionally perform the browser redirect (skipped in local mode / tests).
    if (deps.performRedirect === true) {
      const navigate = typeof deps.navigate === 'function'
        ? deps.navigate
        : function (url) {
            if (typeof window !== 'undefined' && window.location) {
              window.location.href = url;
            }
          };
      try {
        navigate(redirect.redirectUrl);
      } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    }

    return { success: true, redirect: redirect };
  }

  /**
   * Complete checkout from a payment gateway/webhook result (Req 6.8, 6.10,
   * 6.11). This is the heart of the flow:
   *
   *   1. Verify the payment via the gateway's SERVER-SIDE verify() seam. The
   *      client never decides success on its own (see the security note above).
   *   2. If NOT verified → return a failure that allows a retry (Req 6.9). The
   *      cart is LEFT INTACT and the order stays unconfirmed.
   *   3. If verified → transition the order pending → confirmed using the pure
   *      state machine (`PunnagaiOrder.applyTransition`, Property 16), stamp the
   *      UPI transaction id + paymentStatus, persist via `deps.persistOrder`,
   *      send the confirmation email (Req 6.10), and ONLY THEN clear the cart
   *      (Req 6.11 / Property 17).
   *
   * Duplicate submissions within the dedupe window (Req 6 error handling) are
   * detected via `PunnagaiOrder.isDuplicateOrder` when `deps.existingOrders` is
   * supplied, and rejected without re-confirming or re-clearing.
   *
   * All side-effectful seams are injectable:
   *  - deps.gateway        : { verify } (required)
   *  - deps.emailSender    : { send }   (defaults to console stub)
   *  - deps.clearCart      : () => bool (defaults to cart-storage.clearCart)
   *  - deps.persistOrder   : (order) => any (e.g. data.js updateOrder); optional
   *  - deps.orderLib       : PunnagaiOrder (defaults to global/require)
   *  - deps.existingOrders : recent orders for duplicate detection; optional
   *  - deps.now            : clock for timestamps; optional
   *
   * @param {Object} order - The pending order to confirm.
   * @param {Object} verificationPayload - Gateway/webhook result to verify
   *   (e.g. { transactionRef, signature, status }).
   * @param {Object} [deps]
   * @returns {Promise<Object>} A result object:
   *   success — { success:true, confirmed:true, order, transactionId, email, cartCleared }
   *   failure — { success:false, confirmed:false, error, canRetry, allowDifferentUpiId }
   */
  async function completeCheckout(order, verificationPayload, deps) {
    deps = deps || {};

    if (!order || typeof order !== 'object') {
      return { success: false, confirmed: false, error: 'completeCheckout: order is required', canRetry: false };
    }
    const gateway = deps.gateway;
    if (!gateway || typeof gateway.verify !== 'function') {
      return { success: false, confirmed: false, error: 'completeCheckout: a payment gateway with verify() is required', canRetry: false };
    }
    const orderLib = resolveOrderLib(deps);
    if (!orderLib || typeof orderLib.applyTransition !== 'function') {
      return { success: false, confirmed: false, error: 'completeCheckout: order logic (PunnagaiOrder) is unavailable', canRetry: false };
    }

    // 1) Verify the payment server-side (Req 6.8). NEVER trust the client.
    let verification;
    try {
      verification = await gateway.verify(verificationPayload);
    } catch (e) {
      // Treat verification errors (e.g. gateway timeout, Req error table) as a
      // retryable failure — the cart is preserved.
      return {
        success: false,
        confirmed: false,
        error: e && e.message ? e.message : String(e),
        canRetry: true,
        allowDifferentUpiId: true
      };
    }

    if (!verification || verification.verified !== true) {
      // Payment failed / unverified (Req 6.9). Allow retry, possibly with a
      // different UPI ID. Cart is intentionally NOT cleared (Property 17).
      return {
        success: false,
        confirmed: false,
        error: (verification && verification.reason) || 'payment_not_verified',
        canRetry: true,
        allowDifferentUpiId: true,
        order: order
      };
    }

    // 2) Duplicate-submission guard (Req 6 error handling). If this order is an
    // equivalent recent submission, do not confirm/clear again.
    if (Array.isArray(deps.existingOrders) && typeof orderLib.isDuplicateOrder === 'function') {
      const dupOpts = {};
      if (typeof deps.now === 'number') dupOpts.now = deps.now;
      if (orderLib.isDuplicateOrder(order, deps.existingOrders, dupOpts)) {
        return {
          success: false,
          confirmed: false,
          error: 'duplicate_order',
          canRetry: false,
          order: order
        };
      }
    }

    // 3) Confirm the order via the pure state machine (Property 16). A pending
    // order always transitions to confirmed after a successful payment.
    let confirmedOrder;
    try {
      const transitionOpts = (typeof deps.now === 'number') ? { now: deps.now } : undefined;
      confirmedOrder = orderLib.applyTransition(order, 'confirmed', transitionOpts);
    } catch (e) {
      // The order was not in a confirmable state (e.g. already shipped). This
      // is not a payment retry situation.
      return {
        success: false,
        confirmed: false,
        error: e && e.message ? e.message : String(e),
        canRetry: false,
        order: order
      };
    }
    confirmedOrder = Object.assign({}, confirmedOrder, {
      paymentStatus: 'confirmed',
      paymentMethod: confirmedOrder.paymentMethod || 'upi',
      upiTransactionId: verification.transactionId || confirmedOrder.upiTransactionId || null
    });

    // 4) Persist the confirmed order (data layer seam, e.g. data.js updateOrder).
    let persistError = null;
    if (typeof deps.persistOrder === 'function') {
      try {
        const persistResult = await deps.persistOrder(confirmedOrder);
        if (persistResult && persistResult.success === false) {
          persistError = persistResult.error || 'persist_failed';
        }
      } catch (e) {
        persistError = e && e.message ? e.message : String(e);
      }
    }

    // 5) Send the confirmation email (Req 6.10). A failure here must NOT undo a
    // confirmed payment — it is reported but non-fatal.
    const emailSender = (deps.emailSender && typeof deps.emailSender.send === 'function')
      ? deps.emailSender
      : createConsoleEmailSender();
    const email = buildConfirmationEmail(confirmedOrder);
    let emailResult;
    try {
      emailResult = await emailSender.send(email);
    } catch (e) {
      emailResult = { success: false, error: e && e.message ? e.message : String(e) };
    }

    // 6) Clear the cart — ONLY now that the order is confirmed (Req 6.11 /
    // Property 17). Gated through the pure shouldClearCart() decision.
    const outcome = { success: true, confirmed: true };
    let cartCleared = false;
    if (shouldClearCart(outcome)) {
      const clearCart = resolveClearCart(deps);
      try {
        cartCleared = clearCart() === true;
      } catch (e) {
        cartCleared = false;
      }
    }

    return {
      success: true,
      confirmed: true,
      order: confirmedOrder,
      transactionId: confirmedOrder.upiTransactionId,
      email: email,
      emailSent: !!(emailResult && emailResult.success),
      emailError: emailResult && emailResult.success === false ? emailResult.error : null,
      persistError: persistError,
      cartCleared: cartCleared
    };
  }

  /**
   * Retry a failed payment (Req 6.9), optionally with a DIFFERENT UPI ID. This
   * re-initiates payment with the new UPI id and (in the simulated/local flow)
   * returns the fresh redirect descriptor the caller then completes via
   * `completeCheckout`. The order itself is unchanged and remains 'pending'.
   *
   * @param {Object} order
   * @param {Object} [deps] - same shape as initiatePayment, plus { upiId }
   * @returns {{success:boolean, redirect?:Object, error?:string}}
   */
  function retryPayment(order, deps) {
    deps = deps || {};
    // Simply re-run the initiation with the (possibly new) UPI id.
    return initiatePayment(order, deps);
  }

  return {
    // Gateway + email seams (mocks for USE_LOCAL_MODE; swap for Razorpay/PayU).
    createMockPaymentGateway: createMockPaymentGateway,
    createConsoleEmailSender: createConsoleEmailSender,

    // Pure helpers (testable in isolation).
    buildConfirmationEmail: buildConfirmationEmail,
    shouldClearCart: shouldClearCart,

    // Orchestration.
    initiatePayment: initiatePayment,
    completeCheckout: completeCheckout,
    retryPayment: retryPayment
  };
});
