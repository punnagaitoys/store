/**
 * checkout-page.js — UI orchestration for checkout.html
 *
 * Handles:
 *  1. In-store pickup customer contact details (Name, Phone, Email, Pickup Notes)
 *  2. Shop Merchant UPI ID display + 1-click clipboard copy
 *  3. Dynamic Shop UPI QR Code generation for the exact payable order total
 *  4. Mobile UPI Intent link (opens GPay / PhonePe / Paytm directly)
 *  5. Payment screenshot file upload (drag & drop / file picker) with preview
 *  6. Cloud Storage upload + Firestore order persistence (status: pending_verification)
 *  7. Cart clearing and redirect to order-confirmation.html
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderNavbar === 'function') renderNavbar();
  if (typeof renderFooter === 'function') renderFooter();
  initCheckoutPage();
});

// ============================================================
// STATE
// ============================================================

let appliedCouponCode = '';
let appliedCouponDiscount = 0;
let selectedProofFile = null;
let selectedProofDataUrl = null;
let currentPayableTotal = 0;

// ============================================================
// INIT
// ============================================================

async function initCheckoutPage() {
  const cart = loadCart();
  if (cart.length === 0) {
    window.location.href = 'cart.html';
    return;
  }

  // Pre-fill customer fields if logged in
  const user = getCurrentSessionUser();
  if (user) {
    const emailField = document.getElementById('email');
    if (emailField && !emailField.value) emailField.value = user.email || '';

    if (typeof getUserById === 'function' && user.userId) {
      getUserById(user.userId)
        .then((profile) => {
          if (profile) {
            const nameField = document.getElementById('fullName');
            const phoneField = document.getElementById('phone');
            if (nameField && !nameField.value) nameField.value = profile.name || '';
            if (phoneField && !phoneField.value) phoneField.value = profile.phone || '';
          }
        })
        .catch((e) => console.warn('Could not fetch user profile:', e));
    }
  }

  // Read coupon state from cart page
  try {
    const savedCoupon = JSON.parse(sessionStorage.getItem('punnagai_checkout_coupon') || 'null');
    if (savedCoupon) {
      appliedCouponCode = savedCoupon.code || '';
      appliedCouponDiscount = savedCoupon.discount || 0;
    }
  } catch (e) {
    /* ignore */
  }

  // Render Order Summary & calculate total
  renderOrderSummary(cart);

  // Setup Shop UPI info and dynamic QR code
  setupShopUPI();

  // Wire Copy UPI ID button
  const copyBtn = document.getElementById('copy-upi-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopyUpiId);
  }

  // Wire Payment Proof File Upload & Drag-and-Drop
  setupPaymentProofUpload();

  // Wire Place Order Button
  const placeOrderBtn = document.getElementById('place-order-btn');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', handleSubmitOrder);
  }
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
  } catch {
    return [];
  }
}

function getCurrentSessionUser() {
  if (typeof window !== 'undefined' && window.PunnagaiAuth) {
    return window.PunnagaiAuth.getCurrentUser();
  }
  return null;
}

function computeCartSubtotal(cart) {
  return cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );
}

function formatPriceINR(amount) {
  return '₹' + (Number(amount) || 0).toLocaleString('en-IN');
}

function getActiveShopUpiId() {
  if (typeof getStoreSettings === 'function') {
    const s = getStoreSettings();
    if (s && s.upiId) return s.upiId.trim();
  }
  return 'thenaadikappan@ok-axis';
}

if (!window.escapeHtml) {
  window.escapeHtml = function (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
}
var escapeHtml = window.escapeHtml;

// ============================================================
// SHOP UPI & DYNAMIC QR CODE GENERATION
// ============================================================

function setupShopUPI() {
  const shopUpiId = getActiveShopUpiId();
  const upiTextEl = document.getElementById('shop-upi-id-text');
  if (upiTextEl) {
    upiTextEl.textContent = shopUpiId;
  }

  const payableBadge = document.getElementById('upi-payable-amount');
  if (payableBadge) {
    payableBadge.textContent = formatPriceINR(currentPayableTotal);
  }

  // Standard Indian UPI Intent URI format
  const orderRef = 'Order_' + Date.now().toString().slice(-6);
  const upiUri = `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent('Punnagai Toy Store')}&am=${currentPayableTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(orderRef)}`;

  // Update dynamic QR image
  const qrImg = document.getElementById('shop-upi-qr-image');
  if (qrImg) {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiUri)}`;
    qrImg.src = qrApiUrl;
  }

  // Update mobile intent link
  const intentBtn = document.getElementById('mobile-upi-intent-btn');
  if (intentBtn) {
    intentBtn.href = upiUri;
  }
}

async function handleCopyUpiId() {
  const shopUpiId = getActiveShopUpiId();
  const btn = document.getElementById('copy-upi-btn');

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shopUpiId);
    } else {
      const tempInput = document.createElement('input');
      tempInput.value = shopUpiId;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }

    if (btn) {
      const origText = btn.innerHTML;
      btn.innerHTML = '✓ Copied!';
      btn.style.borderColor = 'var(--success, #16a34a)';
      btn.style.color = 'var(--success, #16a34a)';
      setTimeout(() => {
        btn.innerHTML = origText;
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    }
    if (typeof showToast === 'function') {
      showToast('Shop UPI ID copied to clipboard!', 'success');
    }
  } catch (err) {
    console.warn('Could not copy UPI ID:', err);
    if (typeof showToast === 'function') {
      showToast('UPI ID: ' + shopUpiId, 'info');
    }
  }
}

// ============================================================
// PAYMENT PROOF SCREENSHOT UPLOAD & PREVIEW
// ============================================================

function setupPaymentProofUpload() {
  const fileInput = document.getElementById('payment-proof-file');
  const dropzone = document.getElementById('proof-dropzone');
  const removeBtn = document.getElementById('remove-proof-btn');

  if (!fileInput || !dropzone) return;

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleProofFileSelected(e.target.files[0]);
    }
  });

  // Drag & drop feedback
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = 'var(--primary, #dc2626)';
      dropzone.style.background = 'var(--primary-50, #fef2f2)';
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProofFileSelected(e.dataTransfer.files[0]);
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearProofFile();
    });
  }
}

function handleProofFileSelected(file) {
  if (!file) return;

  // Validate MIME type
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);
  if (!isImage) {
    if (typeof showToast === 'function') {
      showToast('Please upload a valid image file (PNG, JPG, or WEBP).', 'error');
    }
    return;
  }

  // Validate file size: 5MB maximum
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    if (typeof showToast === 'function') {
      showToast('File size exceeds 5MB. Please choose a smaller image.', 'error');
    }
    return;
  }

  selectedProofFile = file;

  const reader = new FileReader();
  reader.onload = (event) => {
    selectedProofDataUrl = event.target.result;
    showProofPreview(file.name, file.size, selectedProofDataUrl);
  };
  reader.readAsDataURL(file);
}

function showProofPreview(fileName, fileSize, dataUrl) {
  const idleContent = document.getElementById('dropzone-idle-content');
  const previewContent = document.getElementById('dropzone-preview-content');
  const thumbImg = document.getElementById('proof-preview-thumbnail');
  const nameEl = document.getElementById('proof-filename');
  const sizeEl = document.getElementById('proof-filesize');

  if (idleContent) idleContent.style.display = 'none';
  if (previewContent) previewContent.style.display = 'flex';
  if (thumbImg) thumbImg.src = dataUrl;
  if (nameEl) nameEl.textContent = fileName;
  if (sizeEl) {
    const kb = (fileSize / 1024).toFixed(1);
    sizeEl.textContent = kb > 1000 ? (fileSize / (1024 * 1024)).toFixed(2) + ' MB' : kb + ' KB';
  }
}

function clearProofFile() {
  selectedProofFile = null;
  selectedProofDataUrl = null;

  const fileInput = document.getElementById('payment-proof-file');
  if (fileInput) fileInput.value = '';

  const idleContent = document.getElementById('dropzone-idle-content');
  const previewContent = document.getElementById('dropzone-preview-content');
  if (idleContent) idleContent.style.display = 'block';
  if (previewContent) previewContent.style.display = 'none';
}

// ============================================================
// ORDER SUMMARY RENDER
// ============================================================

function renderOrderSummary(cart) {
  const container = document.getElementById('order-summary');
  if (!container) return;

  const subtotal = computeCartSubtotal(cart);
  const discount = appliedCouponDiscount;

  let total = subtotal - discount;
  if (
    typeof PunnagaiOrder !== 'undefined' &&
    typeof PunnagaiOrder.computeOrderTotal === 'function'
  ) {
    total = PunnagaiOrder.computeOrderTotal({
      subtotal,
      shippingFee: 0,
      taxAmount: 0,
      discount
    });
  }
  total = Math.max(0, total);
  currentPayableTotal = total;

  const discountRow =
    discount > 0
      ? `<div style="display:flex; justify-content:space-between; margin-bottom:8px; color:var(--success, #16a34a);">
         <span>Discount (${escapeHtml(appliedCouponCode)})</span>
         <span>−${formatPriceINR(discount)}</span>
       </div>`
      : '';

  const html = `
    <div class="summary-items">
      ${cart
        .map(
          (item) => `
        <div class="summary-item" style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
          <div style="flex:1; padding-right:8px;">${Number(item.quantity)}× ${escapeHtml(item.name || '')}</div>
          <div style="font-weight:600; white-space:nowrap;">${formatPriceINR((Number(item.price) || 0) * (Number(item.quantity) || 1))}</div>
        </div>
      `
        )
        .join('')}
    </div>
    <div style="border-top:1px solid var(--border); padding-top:12px; margin-top:12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span>Subtotal</span>
        <span>${formatPriceINR(subtotal)}</span>
      </div>
      ${discountRow}
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:var(--text-secondary);">
        <span>Fulfillment</span>
        <span style="font-weight:700; color:var(--primary, #dc2626);">🏪 Store Pickup (Free)</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:12px; font-weight:700; font-size:18px; border-top:1px solid var(--border); padding-top:12px;">
        <span>Total Payable</span>
        <span id="summary-total" style="color:var(--primary, #dc2626);">${formatPriceINR(total)}</span>
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// ============================================================
// ORDER SUBMISSION
// ============================================================

async function handleSubmitOrder() {
  const fullName = (document.getElementById('fullName')?.value || '').trim();
  const phone = (document.getElementById('phone')?.value || '').trim();
  const email = (document.getElementById('email')?.value || '').trim();
  const pickupNotes = (document.getElementById('pickupNotes')?.value || '').trim();
  const transactionRef = (document.getElementById('transactionRef')?.value || '').trim();

  // Validate Customer Contact
  if (!fullName) {
    if (typeof showToast === 'function') showToast('Please enter your Full Name.', 'error');
    document.getElementById('fullName')?.focus();
    return;
  }

  if (!phone) {
    if (typeof showToast === 'function') showToast('Please enter your Phone Number.', 'error');
    document.getElementById('phone')?.focus();
    return;
  }

  if (
    typeof PunnagaiValidation !== 'undefined' &&
    typeof PunnagaiValidation.isValidIndianPhone === 'function' &&
    !PunnagaiValidation.isValidIndianPhone(phone)
  ) {
    if (typeof showToast === 'function') {
      showToast('Please enter a valid 10-digit Indian mobile number.', 'error');
    }
    document.getElementById('phone')?.focus();
    return;
  }

  // Validate Screenshot Proof Upload
  if (!selectedProofFile && !selectedProofDataUrl) {
    if (typeof showToast === 'function') {
      showToast('Please upload a screenshot of your completed UPI payment to proceed.', 'error');
    }
    const dropzone = document.getElementById('proof-dropzone');
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dropzone.style.borderColor = 'var(--primary, #dc2626)';
      dropzone.style.background = 'var(--primary-50, #fef2f2)';
      setTimeout(() => {
        dropzone.style.borderColor = '';
        dropzone.style.background = '';
      }, 2500);
    }
    return;
  }

  const cart = loadCart();
  if (cart.length === 0) {
    if (typeof showToast === 'function') showToast('Your cart is empty!', 'error');
    window.location.href = 'cart.html';
    return;
  }

  // Show submission modal
  showSubmissionOverlay('Uploading payment screenshot & submitting order...');
  const submitBtn = document.getElementById('place-order-btn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const user = getCurrentSessionUser();
    const subtotal = computeCartSubtotal(cart);
    const shopUpiId = getActiveShopUpiId();

    // 1. Upload payment screenshot
    let proofUrl = selectedProofDataUrl;
    if (
      selectedProofFile &&
      typeof window !== 'undefined' &&
      !window.USE_LOCAL_MODE &&
      window.storage &&
      typeof window.storage.ref === 'function'
    ) {
      try {
        const cleanName = selectedProofFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `payment_proofs/${Date.now()}_${cleanName}`;
        const proofRef = window.storage.ref().child(storagePath);
        await proofRef.put(selectedProofFile);
        proofUrl = await proofRef.getDownloadURL();
      } catch (storageErr) {
        console.warn(
          '[checkout] Firebase Storage upload failed, using data URL fallback:',
          storageErr
        );
        proofUrl = selectedProofDataUrl;
      }
    }

    // 2. Build order payload
    const orderData = {
      userId: user && user.userId ? user.userId : null,
      items: cart.map((item) => ({
        productId: item.productId || item.id,
        variantId: item.variantId || '',
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        imageUrl: item.imageUrl || ''
      })),
      subtotal,
      shippingFee: 0,
      taxAmount: 0,
      discount: appliedCouponDiscount,
      total: currentPayableTotal,
      couponCode: appliedCouponCode || null,
      fulfillmentType: 'store_pickup',
      customer: {
        name: fullName,
        phone: phone,
        email: email || '',
        pickupNotes: pickupNotes || ''
      },
      // Preserved for backwards compatibility with existing views
      shippingAddress: {
        name: fullName,
        phone: phone,
        email: email || '',
        address: 'Direct Shop Pickup (Mylapore, Chennai)',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600004'
      },
      shippingMethod: 'local',
      paymentMethod: 'shop_upi_qr',
      paymentStatus: 'pending_verification',
      orderStatus: 'pending_verification',
      paymentProofUrl: proofUrl,
      shopUpiId: shopUpiId,
      transactionRef: transactionRef || null,
      notes: pickupNotes || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 3. Persist order in Firestore / local database
    let persistedOrderId = null;
    if (typeof createOrder === 'function') {
      const res = await createOrder(orderData);
      if (res && res.success) {
        persistedOrderId = res.id;
      } else {
        throw new Error((res && res.error) || 'Failed to save order in database');
      }
    } else {
      persistedOrderId = 'ORD-' + Date.now().toString().slice(-6);
    }

    const completedOrder = {
      ...orderData,
      id: persistedOrderId,
      orderId: persistedOrderId
    };

    // 4. Save to session cache for instantaneous order-confirmation rendering
    try {
      sessionStorage.setItem('punnagai_last_order', JSON.stringify(completedOrder));
      sessionStorage.removeItem('punnagai_checkout_coupon');
    } catch (_) {}

    // 5. Clear cart
    if (typeof PunnagaiCartStorage !== 'undefined') {
      PunnagaiCartStorage.clearCart();
    } else {
      try {
        localStorage.removeItem('punnagai_cart');
      } catch (_) {}
    }

    // 6. Redirect to confirmation page
    window.location.href = `order-confirmation.html?orderId=${encodeURIComponent(persistedOrderId)}`;
  } catch (err) {
    console.error('[checkout] Order submission failed:', err);
    hideSubmissionOverlay();
    if (submitBtn) submitBtn.disabled = false;
    if (typeof showToast === 'function') {
      showToast('Submission error: ' + (err.message || 'Please try again'), 'error');
    }
  }
}

function showSubmissionOverlay(message) {
  const overlay = document.getElementById('payment-overlay');
  const statusEl = document.getElementById('payment-status');
  if (statusEl && message) statusEl.textContent = message;
  if (overlay) overlay.style.display = 'flex';
}

function hideSubmissionOverlay() {
  const overlay = document.getElementById('payment-overlay');
  if (overlay) overlay.style.display = 'none';
}
