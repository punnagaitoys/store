/**
 * checkout-page.js — UI orchestration for checkout.html
 *
 * Wires the checkout form, shipping method selection, and UPI payment overlay
 * to the pure logic in:
 *   - js/lib/order.js       (PunnagaiOrder)
 *   - js/lib/shipping.js    (PunnagaiShipping)
 *   - js/lib/cart-storage.js (PunnagaiCartStorage)
 *   - js/checkout.js        (PunnagaiCheckout)
 *   - js/data.js            (createOrder, updateOrder)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderNavbar === 'function') renderNavbar();
  if (typeof renderFooter === 'function') renderFooter();
  initCheckoutPage();
});

// ============================================================
// STATE
// ============================================================

let selectedShippingMethod = null;
let currentShippingCost = 0;
let appliedCouponCode = '';
let appliedCouponDiscount = 0;

// ============================================================
// INIT
// ============================================================

async function initCheckoutPage() {
  const cart = loadCart();
  if (cart.length === 0) {
    window.location.href = 'cart.html';
    return;
  }

  // Pre-fill user fields if logged in
  const user = getCurrentSessionUser();
  if (user) {
    const emailField = document.getElementById('email');
    if (emailField) emailField.value = user.email || '';

    // userId (not uid) per auth.js session schema
    if (typeof getUserById === 'function' && user.userId) {
      getUserById(user.userId).then(profile => {
        if (profile) {
          const nameField = document.getElementById('fullName');
          const phoneField = document.getElementById('phone');
          if (nameField && !nameField.value) nameField.value = profile.name || '';
          if (phoneField && !phoneField.value) phoneField.value = profile.phone || '';
        }
      }).catch(e => console.warn('Could not fetch user profile:', e));
    }
  }

  // Read coupon state from cart page (stored temporarily in sessionStorage)
  try {
    const savedCoupon = JSON.parse(sessionStorage.getItem('punnagai_checkout_coupon') || 'null');
    if (savedCoupon) {
      appliedCouponCode = savedCoupon.code || '';
      appliedCouponDiscount = savedCoupon.discount || 0;
    }
  } catch (e) { /* ignore */ }

  renderOrderSummary(cart);

  // Wire PIN code → shipping methods
  const pinInput = document.getElementById('postalCode');
  if (pinInput) {
    pinInput.addEventListener('input', debounce(async (e) => {
      const pin = e.target.value.trim();
      if (pin.length === 6 && /^\d{6}$/.test(pin)) {
        await loadShippingMethods(pin);
      }
    }, 500));
  }

  // Wire Place Order
  const placeOrderBtn = document.getElementById('place-order-btn');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', handlePlaceOrder);
  }

  // Wire retry/change UPI
  document.getElementById('retry-payment')?.addEventListener('click', () => {
    hidePaymentOverlay();
  });

  document.getElementById('change-upi')?.addEventListener('click', () => {
    hidePaymentOverlay();
    document.getElementById('upiId')?.focus();
  });
}

// ============================================================
// HELPERS
// ============================================================

function loadCart() {
  if (typeof PunnagaiCartStorage !== 'undefined') {
    return PunnagaiCartStorage.loadCartFromLocalStorage();
  }
  try {
    const parsed = JSON.parse(localStorage.getItem('punnagai_cart'));
    return parsed && Array.isArray(parsed.cart) ? parsed.cart : [];
  } catch { return []; }
}

function getCurrentSessionUser() {
  if (typeof window !== 'undefined' && window.PunnagaiAuth) {
    return window.PunnagaiAuth.getCurrentUser();
  }
  return null;
}

function computeCartSubtotal(cart) {
  return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
}

function formatPriceINR(amount) {
  return '₹' + (Number(amount) || 0).toLocaleString('en-IN');
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ============================================================
// ORDER SUMMARY RENDER
// ============================================================

function renderOrderSummary(cart) {
  const container = document.getElementById('order-summary');
  if (!container) return;

  const subtotal = computeCartSubtotal(cart);
  const discount = appliedCouponDiscount;
  const shipping = currentShippingCost;

  // Use the pure order total logic if available
  let total = subtotal + shipping - discount;
  if (typeof PunnagaiOrder !== 'undefined' && typeof PunnagaiOrder.computeOrderTotal === 'function') {
    total = PunnagaiOrder.computeOrderTotal({ subtotal, shippingFee: shipping, taxAmount: 0, discount });
  }
  total = Math.max(0, total);

  const discountRow = discount > 0
    ? `<div style="display:flex; justify-content:space-between; margin-bottom:8px; color:var(--success);">
         <span>Discount (${escapeHtml(appliedCouponCode)})</span>
         <span>−${formatPriceINR(discount)}</span>
       </div>`
    : '';

  const shippingText = currentShippingCost === 0
    ? (selectedShippingMethod ? '<span style="color:var(--success)">Free</span>' : '<span id="summary-shipping" style="color:var(--text-secondary); font-size:0.85rem">Enter PIN code</span>')
    : `<span id="summary-shipping">${formatPriceINR(currentShippingCost)}</span>`;

  const html = `
    <div class="summary-items">
      ${cart.map(item => `
        <div class="summary-item" style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
          <div style="flex:1; padding-right:8px;">${Number(item.quantity)}× ${escapeHtml(item.name || '')}</div>
          <div style="font-weight:600; white-space:nowrap;">${formatPriceINR((Number(item.price) || 0) * (Number(item.quantity) || 1))}</div>
        </div>
      `).join('')}
    </div>
    <div style="border-top:1px solid var(--border); padding-top:12px; margin-top:12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span>Subtotal</span>
        <span>${formatPriceINR(subtotal)}</span>
      </div>
      ${discountRow}
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span>Shipping</span>
        ${shippingText}
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:12px; font-weight:700; font-size:18px; border-top:1px solid var(--border); padding-top:12px;">
        <span>Total</span>
        <span id="summary-total">${formatPriceINR(total)}</span>
      </div>
    </div>
  `;
  container.innerHTML = html;
}

function updateSummaryTotals() {
  const cart = loadCart();
  renderOrderSummary(cart);
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// SHIPPING METHODS
// ============================================================

async function loadShippingMethods(pin) {
  const container = document.getElementById('shipping-methods');
  if (!container) return;

  container.innerHTML = '<div class="loading-spinner"></div><p style="margin-top:8px; color:var(--text-secondary);">Calculating shipping options...</p>';

  let methods = [];

  if (typeof PunnagaiShipping !== 'undefined') {
    methods = PunnagaiShipping.getMethodsForPostalCode(pin);
  }

  if (!methods || methods.length === 0) {
    container.innerHTML = '<p style="color:var(--danger); font-size:14px;">Sorry, we do not currently ship to this PIN code.</p>';
    document.getElementById('place-order-btn').disabled = true;
    selectedShippingMethod = null;
    currentShippingCost = 0;
    return;
  }

  // Default: select first method
  selectedShippingMethod = methods[0];
  currentShippingCost = selectedShippingMethod.cost;

  container.innerHTML = methods.map((m, idx) => `
    <label class="shipping-option ${idx === 0 ? 'selected' : ''}" style="display:flex; align-items:center; gap:12px; border:1px solid var(--border); border-radius:var(--radius); padding:12px 16px; margin-bottom:8px; cursor:pointer; transition:border-color .2s;">
      <input type="radio" name="shipping" value="${m.id}" data-cost="${m.cost}" data-label="${escapeHtml(m.label)}" ${idx === 0 ? 'checked' : ''} style="accent-color:var(--primary);">
      <div style="flex:1;">
        <div style="font-weight:600; font-size:14px;">${escapeHtml(m.label)}</div>
        <div style="font-size:12px; color:var(--text-secondary);">Estimated ${m.estimatedDays} day${m.estimatedDays !== 1 ? 's' : ''}</div>
      </div>
      <div style="font-weight:700; color:var(--primary);">${m.cost === 0 ? '<span style="color:var(--success)">Free</span>' : formatPriceINR(m.cost)}</div>
    </label>
  `).join('');

  // Wire radio change
  container.querySelectorAll('input[name="shipping"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const cost = Number(radio.dataset.cost) || 0;
      selectedShippingMethod = { id: radio.value, name: radio.dataset.label, cost };
      currentShippingCost = cost;
      // Highlight selected
      container.querySelectorAll('.shipping-option').forEach(el => el.classList.remove('selected'));
      radio.closest('.shipping-option').classList.add('selected');
      updateSummaryTotals();
    });
  });

  document.getElementById('place-order-btn').disabled = false;
  updateSummaryTotals();
}

// ============================================================
// PAYMENT OVERLAY
// ============================================================

function showPaymentOverlay(message) {
  const overlay = document.getElementById('payment-overlay');
  const status = document.getElementById('payment-status');
  const actions = document.querySelector('.payment-actions');
  if (overlay) overlay.style.display = 'flex';
  if (status) status.innerHTML = message || 'Processing payment...';
  if (actions) actions.style.display = 'none';
}

function hidePaymentOverlay() {
  const overlay = document.getElementById('payment-overlay');
  if (overlay) overlay.style.display = 'none';
}

function showPaymentError(message) {
  const status = document.getElementById('payment-status');
  const actions = document.querySelector('.payment-actions');
  if (status) status.innerHTML = `<span style="color:var(--danger)">${escapeHtml(message)}</span>`;
  if (actions) actions.style.display = 'flex';
}

// ============================================================
// PLACE ORDER — main handler
// ============================================================

async function handlePlaceOrder() {
  // 1. Validate shipping form
  const form = document.getElementById('shipping-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // 2. Require shipping method
  if (!selectedShippingMethod) {
    if (typeof showToast === 'function') showToast('Please enter your PIN code to select a shipping method.', 'error');
    document.getElementById('postalCode')?.focus();
    return;
  }

  const formData = new FormData(form);
  const shippingAddress = {
    name: formData.get('fullName'),
    phone: formData.get('phone'),
    email: formData.get('email') || '',
    address: formData.get('address') || 'Direct Shop Pickup (Mylapore, Chennai)',
    city: formData.get('city') || 'Chennai',
    state: formData.get('state') || 'Tamil Nadu',
    postalCode: formData.get('postalCode')
  };
  const upiId = (document.getElementById('upiId')?.value || '').trim();

  showPaymentOverlay('Redirecting to UPI payment...');

  try {
    const user = getCurrentSessionUser();
    const cart = loadCart();

    if (cart.length === 0) {
      hidePaymentOverlay();
      window.location.href = 'cart.html';
      return;
    }

    const subtotal = computeCartSubtotal(cart);

    // 3. Compute total using pure order logic
    let total = subtotal;
    if (typeof PunnagaiOrder !== 'undefined') {
      total = PunnagaiOrder.computeOrderTotal({
        subtotal,
        shippingFee: currentShippingCost,
        taxAmount: 0,
        discount: appliedCouponDiscount
      });
    } else {
      total = Math.max(0, subtotal + currentShippingCost - appliedCouponDiscount);
    }

    // 4. Build the order document
    const orderData = {
      userId: user ? user.userId : 'guest',
      items: cart.map(item => ({
        productId: item.productId || item.id,
        variantId: item.variantId || '',
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        imageUrl: item.imageUrl || ''
      })),
      subtotal,
      shippingFee: currentShippingCost,
      taxAmount: 0,
      discount: appliedCouponDiscount,
      total,
      couponCode: appliedCouponCode || null,
      shippingAddress,
      shippingMethod: selectedShippingMethod ? selectedShippingMethod.id : 'standard',
      paymentMethod: 'upi',
      paymentStatus: 'pending',
      upiTransactionId: null,
      orderStatus: 'pending',
      notes: ''
    };

    // 5. Persist the pending order
    let persistedOrderId = null;
    if (typeof createOrder === 'function') {
      const res = await createOrder(orderData);
      if (res && res.success) {
        persistedOrderId = res.id;
      } else {
        throw new Error((res && res.error) || 'Failed to create order record');
      }
    } else {
      // Fallback: generate a local ID for demo
      persistedOrderId = 'LOCAL-' + Math.random().toString(36).slice(2, 9).toUpperCase();
    }

    const order = { ...orderData, id: persistedOrderId, orderId: persistedOrderId };

    // 6. Run payment flow via PunnagaiCheckout
    if (typeof PunnagaiCheckout !== 'undefined') {
      const Checkout = PunnagaiCheckout;

      // In local mode, use the mock gateway. In Firebase mode, swap for real gateway.
      const gateway = Checkout.createMockPaymentGateway({ shouldSucceed: true });

      // Initiate payment (simulates redirect in local mode)
      const initResult = Checkout.initiatePayment(order, {
        gateway,
        upiId,
        performRedirect: false // local mode: don't actually navigate away
      });

      if (!initResult.success) {
        throw new Error(initResult.error || 'Payment initiation failed');
      }

      showPaymentOverlay('Verifying payment...');

      // Simulate the gateway callback (in production this comes from a webhook)
      const verificationPayload = {
        transactionRef: initResult.redirect.transactionRef,
        signature: initResult.redirect.signature,
        status: 'success'
      };

      // Complete checkout: verify → confirm order → clear cart
      const result = await Checkout.completeCheckout(order, verificationPayload, {
        gateway,
        persistOrder: async (confirmedOrder) => {
          if (typeof updateOrder === 'function' && confirmedOrder.id) {
            return updateOrder(confirmedOrder.id, {
              orderStatus: confirmedOrder.orderStatus,
              paymentStatus: confirmedOrder.paymentStatus,
              upiTransactionId: confirmedOrder.upiTransactionId
            });
          }
          return { success: true };
        },
        clearCart: () => {
          if (typeof PunnagaiCartStorage !== 'undefined') {
            return PunnagaiCartStorage.clearCart();
          }
          try { localStorage.removeItem('punnagai_cart'); } catch (_) {}
          return true;
        }
      });

      if (!result.success || !result.confirmed) {
        showPaymentError((result.error === 'payment_failed' || result.error === 'payment_not_verified')
          ? 'Payment could not be verified. Please try again.'
          : (result.error || 'Payment failed. Please try again.'));
        return;
      }

      // 7. Success — clean up coupon state and redirect to confirmation
      try { sessionStorage.removeItem('punnagai_checkout_coupon'); } catch (_) {}

      showPaymentOverlay('<span style="color:var(--success)">✓ Payment confirmed! Redirecting...</span>');

      setTimeout(() => {
        window.location.href = `order-confirmation?orderId=${encodeURIComponent(persistedOrderId)}`;
      }, 1200);

    } else {
      // PunnagaiCheckout not loaded — minimal fallback
      if (typeof PunnagaiCartStorage !== 'undefined') {
        PunnagaiCartStorage.clearCart();
      } else {
        try { localStorage.removeItem('punnagai_cart'); } catch (_) {}
      }

      showPaymentOverlay('<span style="color:var(--success)">✓ Order placed! Redirecting...</span>');
      setTimeout(() => {
        window.location.href = `order-confirmation?orderId=${encodeURIComponent(persistedOrderId)}`;
      }, 1200);
    }

  } catch (err) {
    console.error('[Checkout] Error placing order:', err);
    showPaymentError('Something went wrong. Please try again.');
  }
}
