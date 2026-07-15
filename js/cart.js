/**
 * cart.js — Shopping Cart Management
 *
 * Cart state is persisted in localStorage under the `punnagai_cart` schema and
 * the cart math/coupon validation is delegated to the pure-logic modules:
 *   - js/lib/cart-storage.js  → window.PunnagaiCartStorage
 *   - js/lib/cart-logic.js    → window.PunnagaiCartLogic
 *
 * Those libs are loaded before this file on the cart page. On other pages that
 * only need add-to-cart/badge behavior they may not be present, so every access
 * goes through a small accessor that falls back to an equivalent inline
 * implementation using the SAME `punnagai_cart` schema and item-key format —
 * keeping cart data consistent regardless of which page wrote it.
 *
 * Cart items are denormalized snapshots:
 *   { productId, variantId, name, price, imageUrl, category, ageGroup, quantity, stock? }
 *
 * Requirements: 3.5 (item list with name/variant/qty/unit price/line total),
 * 3.6 (real-time total on quantity/coupon change), 3.8 (proceed to checkout).
 */

const WHATSAPP_NUMBER = '917550132101';

// ============================================================
// LIB ACCESSORS (prefer pure logic; fall back when not loaded)
// ============================================================

function cartStorageLoad() {
  if (typeof PunnagaiCartStorage !== 'undefined') {
    return PunnagaiCartStorage.loadCartFromLocalStorage();
  }
  try {
    const parsed = JSON.parse(localStorage.getItem('punnagai_cart'));
    return parsed && Array.isArray(parsed.cart) ? parsed.cart : [];
  } catch { return []; }
}

function cartStorageSave(items) {
  if (typeof PunnagaiCartStorage !== 'undefined') {
    return PunnagaiCartStorage.saveCartToLocalStorage(items);
  }
  try {
    localStorage.setItem('punnagai_cart', JSON.stringify({
      cart: Array.isArray(items) ? items : [],
      updatedAt: Date.now(),
    }));
  } catch { /* storage unavailable — ignore */ }
}

function cartStorageClear() {
  if (typeof PunnagaiCartStorage !== 'undefined') {
    return PunnagaiCartStorage.clearCart();
  }
  try { localStorage.removeItem('punnagai_cart'); } catch { /* ignore */ }
}

function cartItemKey(item) {
  if (typeof PunnagaiCartLogic !== 'undefined') {
    return PunnagaiCartLogic.itemKey(item);
  }
  const pid = item && item.productId != null ? String(item.productId) : '';
  const variant = item && item.variantId != null ? String(item.variantId)
    : (item && item.skuId != null ? String(item.skuId) : '');
  return pid + '::' + variant;
}

function cartAddItem(items, item) {
  if (typeof PunnagaiCartLogic !== 'undefined') {
    return PunnagaiCartLogic.addItem(items, item);
  }
  const current = Array.isArray(items) ? items.slice() : [];
  const key = cartItemKey(item);
  const addQty = Math.max(1, Math.floor(Number(item.quantity)) || 1);
  const existing = current.find(i => cartItemKey(i) === key);
  if (existing) {
    existing.quantity = (Math.floor(Number(existing.quantity)) || 1) + addQty;
  } else {
    current.push(Object.assign({}, item, { quantity: addQty }));
  }
  return current;
}

function cartUpdateQuantity(items, key, quantity, stock) {
  if (typeof PunnagaiCartLogic !== 'undefined') {
    return PunnagaiCartLogic.updateQuantity(items, key, quantity, stock);
  }
  let next = Math.max(1, Math.floor(Number(quantity)) || 1);
  if (Number.isFinite(Number(stock)) && Number(stock) >= 1 && next > Number(stock)) {
    next = Math.floor(Number(stock));
  }
  return (Array.isArray(items) ? items : []).map(i =>
    cartItemKey(i) === key ? Object.assign({}, i, { quantity: next }) : i
  );
}

function cartRemoveItem(items, key) {
  if (typeof PunnagaiCartLogic !== 'undefined') {
    return PunnagaiCartLogic.removeItem(items, key);
  }
  return (Array.isArray(items) ? items : []).filter(i => cartItemKey(i) !== key);
}

function cartCalculateSubtotal(items) {
  if (typeof PunnagaiCartLogic !== 'undefined') {
    return PunnagaiCartLogic.calculateSubtotal(items);
  }
  return (Array.isArray(items) ? items : []).reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Math.floor(Number(i.quantity)) || 0), 0
  );
}

function cartValidateCoupon(code, cart, coupon, now) {
  if (typeof PunnagaiCartLogic !== 'undefined') {
    return PunnagaiCartLogic.validateCoupon(code, cart, coupon, now);
  }
  // Minimal fallback: without the logic lib we cannot validate, so reject.
  return { valid: false, reason: 'Coupon code not found or expired', discountAmount: 0 };
}

// ============================================================
// CART STATE
// ============================================================

function getCart() {
  return cartStorageLoad();
}

function saveCart(cart) {
  cartStorageSave(cart);
  updateCartBadge();
}

// ============================================================
// CART OPERATIONS
// ============================================================

function addToCart(product, quantity = 1, variant = null) {
  const snapshot = {
    productId: product.id,
    variantId: (variant && variant.variantId) ? variant.variantId : (product.variantId || ''),
    name: product.name + (variant && variant.size ? ` - ${variant.size}` : '') + (variant && variant.color ? ` - ${variant.color}` : ''),
    price: (variant && variant.price !== undefined) ? variant.price : product.price,
    imageUrl: product.imageUrl,
    category: product.category,
    ageGroup: product.ageGroup,
    quantity,
  };
  // Carry numeric stock through to the cart for the max-quantity rule, if known.
  if (variant && Number.isFinite(Number(variant.stock))) {
    snapshot.stock = Number(variant.stock);
  } else if (Number.isFinite(Number(product.stock))) {
    snapshot.stock = Number(product.stock);
  }

  const next = cartAddItem(getCart(), snapshot);
  saveCart(next);
  showToast(`"${product.name}" added to cart!`, 'success');
  return next;
}

function removeFromCart(key) {
  const next = cartRemoveItem(getCart(), key);
  saveCart(next);
  return next;
}

function updateCartQuantity(key, quantity, stock) {
  if (Number(quantity) <= 0) {
    return removeFromCart(key);
  }
  const next = cartUpdateQuantity(getCart(), key, quantity, stock);
  saveCart(next);
  return next;
}

function clearCart() {
  cartStorageClear();
  updateCartBadge();
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + (Math.floor(Number(item.quantity)) || 0), 0);
}

function getCartSubtotal() {
  return cartCalculateSubtotal(getCart());
}

function formatPrice(amount) {
  return '₹' + (Number(amount) || 0).toLocaleString('en-IN');
}

/**
 * Resolve the maximum selectable quantity for a cart line. Returns a finite
 * positive stock value when the snapshot carries one (so the "+" control can be
 * capped at available stock per Requirement 3.2), otherwise null (no cap).
 */
function getItemMaxStock(item) {
  const stock = Number(item && (item.stock != null ? item.stock : item.maxStock));
  return Number.isFinite(stock) && stock >= 1 ? Math.floor(stock) : null;
}

// ============================================================
// WHATSAPP CHECKOUT (pre-book flow)
// ============================================================

function buildWhatsAppMessage() {
  const cart = getCart();
  if (cart.length === 0) return null;

  const subtotal = getCartSubtotal();

  // Recompute discount from applied coupon
  let discountAmount = 0;
  if (appliedCouponRecord && appliedCouponCode) {
    const res = cartValidateCoupon(appliedCouponCode, cart, appliedCouponRecord);
    if (res.valid) discountAmount = res.discountAmount;
  }
  const total = Math.max(0, subtotal - discountAmount);

  let message = `Hello! 👋 I'd like to *pre-book* the following toys from *Punnagai Toy Store, Mylapore* 🎉\n\n`;
  message += `*My Order:*\n`;

  cart.forEach((item, index) => {
    message += `${index + 1}. ${item.name}\n`;
    message += `   Qty: ${item.quantity} × ${formatPrice(item.price)} = ${formatPrice(item.price * item.quantity)}\n`;
  });

  message += `\n*Subtotal: ${formatPrice(subtotal)}*`;

  if (discountAmount > 0) {
    message += `\n*Discount (${appliedCouponCode}): −${formatPrice(discountAmount)}*`;
    message += `\n*Total: ${formatPrice(total)}*`;
  } else {
    message += `\n*Total: ${formatPrice(total)}*`;
  }

  message += `\n\nPlease confirm availability and let me know the next steps. Thank you! 🙏`;

  return encodeURIComponent(message);
}

function openWhatsAppCheckout() {
  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }

  const message = buildWhatsAppMessage();
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  window.open(url, '_blank');
}

// ============================================================
// CART PAGE RENDERING (cart.html)
// ============================================================

// Applied-coupon state, kept across re-renders so quantity changes recompute
// the discount and re-validate (e.g. min-order-value) automatically.
let appliedCouponCode = '';
let appliedCouponRecord = null;
let couponFeedback = null; // { message, type: 'success' | 'error' }

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCartItemHtml(item) {
  const key = cartItemKey(item);
  const qty = Math.max(1, Math.floor(Number(item.quantity)) || 1);
  const maxStock = getItemMaxStock(item);
  const lineTotal = (Number(item.price) || 0) * qty;
  const atMax = maxStock !== null && qty >= maxStock;
  const variantLine = item.variantId
    ? `<p class="cart-item-variant text-muted" style="font-size:0.8rem;margin-bottom:6px">Variant: ${escapeHtml(item.variantId)}</p>`
    : '';

  return `
    <div class="cart-item" data-key="${escapeHtml(key)}">
      <img src="${escapeHtml(item.imageUrl || 'https://via.placeholder.com/120x120?text=Toy')}" alt="${escapeHtml(item.name)}" class="cart-item-image">
      <div class="cart-item-info">
        <p class="cart-item-category">${escapeHtml(item.category || '')}</p>
        <h3 class="cart-item-name">${escapeHtml(item.name || 'Item')}</h3>
        ${variantLine}
        <div class="cart-item-price">${formatPrice(item.price)} <span class="text-muted" style="font-size:0.8rem;font-weight:400">each</span></div>
      </div>
      <div class="cart-item-controls">
        <div class="cart-qty-row">
          <button class="cart-qty-btn" data-action="dec" aria-label="Decrease quantity"${qty <= 1 ? ' disabled' : ''}>−</button>
          <span class="cart-qty-value">${qty}</span>
          <button class="cart-qty-btn" data-action="inc" aria-label="Increase quantity"${atMax ? ' disabled' : ''}>+</button>
        </div>
        <div class="cart-line-total">${formatPrice(lineTotal)}</div>
        <button class="cart-remove" data-action="remove" aria-label="Remove item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Remove
        </button>
      </div>
    </div>
  `;
}

function renderCartSummaryHtml(cart) {
  const subtotal = cartCalculateSubtotal(cart);
  const count = cart.reduce((sum, i) => sum + (Math.floor(Number(i.quantity)) || 0), 0);

  // Recompute discount from the applied coupon against the CURRENT cart so the
  // total stays correct after quantity changes (Requirement 3.6).
  let discountAmount = 0;
  if (appliedCouponRecord && appliedCouponCode) {
    const res = cartValidateCoupon(appliedCouponCode, cart, appliedCouponRecord);
    if (res.valid) {
      discountAmount = res.discountAmount;
    } else {
      // Coupon no longer applies (e.g. min order not met after reducing qty).
      appliedCouponRecord = null;
      appliedCouponCode = '';
      couponFeedback = { message: res.reason || 'Coupon no longer applies', type: 'error' };
    }
  }

  const total = Math.max(0, subtotal - discountAmount);

  const discountRow = discountAmount > 0
    ? `<div class="summary-row summary-discount"><span>Discount (${escapeHtml(appliedCouponCode)})</span><span>−${formatPrice(discountAmount)}</span></div>`
    : '';

  const feedbackHtml = couponFeedback
    ? `<div class="coupon-feedback coupon-feedback-${couponFeedback.type}">${escapeHtml(couponFeedback.message)}</div>`
    : '';

  return `
    <div class="cart-summary">
      <h3 class="summary-title">Order Summary</h3>
      <div class="summary-row">
        <span>Subtotal (${count} item${count === 1 ? '' : 's'})</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      ${discountRow}
      <hr class="summary-divider">
      <div class="coupon-block">
        <label class="coupon-label" for="coupon-input">Have a coupon?</label>
        <div class="coupon-row">
          <input type="text" id="coupon-input" class="coupon-input" placeholder="Enter coupon code" value="${escapeHtml(appliedCouponCode)}" autocomplete="off">
          <button type="button" id="coupon-apply" class="btn btn-outline coupon-apply-btn">Apply</button>
        </div>
        ${feedbackHtml}
      </div>
      <div class="summary-total">
        <span>Total</span>
        <span>${formatPrice(total)}</span>
      </div>
      <button type="button" id="checkout-btn" class="btn btn-primary cart-checkout-btn">
        Proceed to Checkout
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
      <button type="button" id="whatsapp-btn" class="whatsapp-btn">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
        Pre-book via WhatsApp
      </button>
    </div>
  `;
}

/**
 * Render the full cart page (items + summary) and wire interactions. Reads cart
 * state from localStorage on every call so re-renders reflect the latest data.
 */
function renderCartPage() {
  const layout = document.querySelector('.cart-layout');
  const itemsContainer = document.getElementById('cart-items');
  const summaryContainer = document.getElementById('cart-summary');
  const emptyState = document.getElementById('cart-empty-state');
  const whatsappInfo = document.getElementById('cart-whatsapp-info');
  if (!itemsContainer || !summaryContainer) return;

  const cart = getCart();

  if (cart.length === 0) {
    if (layout) layout.style.display = 'none';
    if (whatsappInfo) whatsappInfo.style.display = 'none';
    if (emptyState) emptyState.style.display = '';
    return;
  }

  if (layout) layout.style.display = '';
  if (emptyState) emptyState.style.display = 'none';
  if (whatsappInfo) whatsappInfo.style.display = '';

  itemsContainer.innerHTML = `<div class="cart-items-wrapper">${cart.map(renderCartItemHtml).join('')}</div>`;
  summaryContainer.innerHTML = renderCartSummaryHtml(cart);

  wireCartInteractions(itemsContainer, summaryContainer);
}

function wireCartInteractions(itemsContainer, summaryContainer) {
  // Quantity +/- and remove via event delegation on the items list.
  itemsContainer.onclick = function (event) {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('.cart-item');
    if (!row) return;
    const key = row.getAttribute('data-key');
    const action = btn.getAttribute('data-action');

    const cart = getCart();
    const item = cart.find(i => cartItemKey(i) === key);
    if (!item && action !== 'remove') return;

    if (action === 'inc') {
      const maxStock = getItemMaxStock(item);
      const next = (Math.floor(Number(item.quantity)) || 1) + 1;
      updateCartQuantity(key, next, maxStock);
    } else if (action === 'dec') {
      const next = (Math.floor(Number(item.quantity)) || 1) - 1;
      if (next < 1) return; // min 1; use Remove to delete the line
      updateCartQuantity(key, next, getItemMaxStock(item));
    } else if (action === 'remove') {
      removeFromCart(key);
      showToast('Item removed from cart', 'info');
    }
    renderCartPage();
  };

  // Coupon apply (button click + Enter key).
  const couponBtn = summaryContainer.querySelector('#coupon-apply');
  const couponInput = summaryContainer.querySelector('#coupon-input');
  if (couponBtn) couponBtn.addEventListener('click', applyCouponFromInput);
  if (couponInput) {
    couponInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); applyCouponFromInput(); }
    });
  }

  // Proceed to checkout (Requirement 3.8).
  const checkoutBtn = summaryContainer.querySelector('#checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function () {
      if (getCart().length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
      }
      // Save applied coupon state so checkout-page.js can pick it up
      try {
        if (appliedCouponCode && appliedCouponRecord) {
          const cart = getCart();
          const res = cartValidateCoupon(appliedCouponCode, cart, appliedCouponRecord);
          sessionStorage.setItem('punnagai_checkout_coupon', JSON.stringify({
            code: appliedCouponCode,
            discount: res.valid ? res.discountAmount : 0
          }));
        } else {
          sessionStorage.removeItem('punnagai_checkout_coupon');
        }
      } catch (_) { /* ignore storage errors */ }
      window.location.href = 'checkout.html';
    });
  }

  // WhatsApp pre-book (secondary action).
  const waBtn = summaryContainer.querySelector('#whatsapp-btn');
  if (waBtn) waBtn.addEventListener('click', openWhatsAppCheckout);
}

async function applyCouponFromInput() {
  const input = document.getElementById('coupon-input');
  const code = (input && input.value ? input.value : '').trim();
  const cart = getCart();

  if (!code) {
    appliedCouponCode = '';
    appliedCouponRecord = null;
    couponFeedback = { message: 'Please enter a coupon code', type: 'error' };
    renderCartPage();
    return;
  }

  let coupon = null;
  if (typeof getCouponByCode === 'function') {
    try { coupon = await getCouponByCode(code); } catch { coupon = null; }
  }

  const result = cartValidateCoupon(code, cart, coupon);
  if (result.valid) {
    appliedCouponCode = code;
    appliedCouponRecord = coupon;
    couponFeedback = {
      message: `Coupon "${code}" applied — you saved ${formatPrice(result.discountAmount)}!`,
      type: 'success',
    };
    showToast('Coupon applied!', 'success');
  } else {
    appliedCouponCode = '';
    appliedCouponRecord = null;
    couponFeedback = { message: result.reason || 'Coupon code not found or expired', type: 'error' };
  }
  renderCartPage();
}

// ============================================================
// UI UPDATES
// ============================================================

function updateCartBadge() {
  const count = getCartCount();
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
  const mobileBadges = document.querySelectorAll('.cart-badge-mobile');
  mobileBadges.forEach(badge => { badge.textContent = count; });
}

// Initialize badge on load
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
});
