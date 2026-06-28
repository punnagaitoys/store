// checkout-page.js - UI orchestration for checkout.html

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initCheckoutPage === 'function') {
    initCheckoutPage();
  }
});

async function initCheckoutPage() {
  if (typeof renderNavbar === 'function') renderNavbar();
  if (typeof renderFooter === 'function') renderFooter();

  const cart = typeof PunnagaiCartStorage !== 'undefined' ? PunnagaiCartStorage.loadCartFromLocalStorage() : [];
  if (cart.length === 0) {
    window.location.href = 'cart.html';
    return;
  }

  // Populate user data if logged in
  const user = typeof window.PunnagaiAuth !== 'undefined' ? window.PunnagaiAuth.getCurrentUser() : null;
  if (user) {
    const emailField = document.getElementById('email');
    if (emailField) emailField.value = user.email || '';
    
    // Optionally fetch profile
    if (typeof getUserById === 'function') {
      getUserById(user.uid).then(profile => {
        if (profile) {
          const nameField = document.getElementById('fullName');
          const phoneField = document.getElementById('phone');
          if (nameField && !nameField.value) nameField.value = profile.name || '';
          if (phoneField && !phoneField.value) phoneField.value = profile.phone || '';
        }
      }).catch(e => console.error("Error fetching profile", e));
    }
  }

  renderOrderSummary(cart);
  
  // Attach PIN code listener to fetch shipping methods
  const pinInput = document.getElementById('postalCode');
  if (pinInput) {
    pinInput.addEventListener('input', debounce(async (e) => {
      const pin = e.target.value.trim();
      if (pin.length === 6 && /^\d{6}$/.test(pin)) {
        await handlePinChange(pin);
      }
    }, 500));
  }

  const placeOrderBtn = document.getElementById('place-order-btn');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', handlePlaceOrder);
  }
}

function renderOrderSummary(cart) {
  const container = document.getElementById('order-summary');
  if (!container) return;

  const orderLogic = window.PunnagaiOrder;
  const cartLogic = window.PunnagaiCartLogic;
  
  let subtotal = 0;
  if (cartLogic) {
    subtotal = cartLogic.calculateCartTotal(cart, null);
  } else {
    subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  // For now, no shipping or tax
  const total = subtotal;

  const html = `
    <div class="summary-items">
      ${cart.map(item => `
        <div class="summary-item" style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
          <div style="flex:1;">${item.quantity}x ${item.name}</div>
          <div style="font-weight:600;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
        </div>
      `).join('')}
    </div>
    <div style="border-top:1px solid var(--border); padding-top:12px; margin-top:12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span>Subtotal</span>
        <span>₹${subtotal.toLocaleString('en-IN')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span>Shipping</span>
        <span id="summary-shipping">Calculated at next step</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:12px; font-weight:700; font-size:18px;">
        <span>Total</span>
        <span id="summary-total">₹${total.toLocaleString('en-IN')}</span>
      </div>
    </div>
  `;
  container.innerHTML = html;
}

let selectedShippingMethod = null;
let currentShippingCost = 0;

async function handlePinChange(pin) {
  const container = document.getElementById('shipping-methods');
  if (!container) return;
  
  container.innerHTML = '<div class="loading-spinner"></div><p>Calculating shipping options...</p>';

  if (typeof PunnagaiShipping !== 'undefined') {
    try {
      const methods = await PunnagaiShipping.getMethodsForPostalCode(pin);
      if (methods && methods.length > 0) {
        selectedShippingMethod = methods[0];
        currentShippingCost = selectedShippingMethod.cost;
        
        container.innerHTML = methods.map((m, idx) => `
          <div class="shipping-option ${idx === 0 ? 'selected' : ''}" style="border:1px solid var(--border); border-radius:var(--radius); padding:12px; margin-bottom:8px; display:flex; align-items:center; cursor:pointer;" onclick="selectShipping(${idx}, ${m.cost})">
            <input type="radio" name="shipping" value="${m.id}" ${idx === 0 ? 'checked' : ''} style="margin-right:12px;">
            <div style="flex:1;">
              <div style="font-weight:600;">${m.name}</div>
              <div style="font-size:12px; color:var(--text-secondary);">${m.estimatedDays}</div>
            </div>
            <div style="font-weight:600;">${m.cost === 0 ? 'Free' : '₹' + m.cost}</div>
          </div>
        `).join('');
        
        updateTotals();
        document.getElementById('place-order-btn').disabled = false;
      } else {
        container.innerHTML = '<p class="text-danger">Sorry, we do not ship to this PIN code.</p>';
        document.getElementById('place-order-btn').disabled = true;
      }
    } catch (e) {
      container.innerHTML = '<p class="text-danger">Error calculating shipping.</p>';
    }
  } else {
    // Mock
    currentShippingCost = 50;
    container.innerHTML = `<p>Standard Shipping (₹50)</p>`;
    updateTotals();
    document.getElementById('place-order-btn').disabled = false;
  }
}

window.selectShipping = function(idx, cost) {
  currentShippingCost = cost;
  updateTotals();
};

function updateTotals() {
  const cart = typeof PunnagaiCartStorage !== 'undefined' ? PunnagaiCartStorage.loadCartFromLocalStorage() : [];
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + currentShippingCost;
  
  const shipSpan = document.getElementById('summary-shipping');
  const totSpan = document.getElementById('summary-total');
  if (shipSpan) shipSpan.textContent = currentShippingCost === 0 ? 'Free' : '₹' + currentShippingCost;
  if (totSpan) totSpan.textContent = '₹' + total.toLocaleString('en-IN');
}

async function handlePlaceOrder() {
  const form = document.getElementById('shipping-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const formData = new FormData(form);
  const orderData = {
    customerName: formData.get('fullName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    postalCode: formData.get('postalCode'),
    shippingMethod: selectedShippingMethod ? selectedShippingMethod.id : 'standard',
    shippingCost: currentShippingCost,
    upiId: document.getElementById('upiId') ? document.getElementById('upiId').value : ''
  };

  const overlay = document.getElementById('payment-overlay');
  if (overlay) overlay.style.display = 'flex';

  try {
    const user = typeof window.PunnagaiAuth !== 'undefined' ? window.PunnagaiAuth.getCurrentUser() : null;
    const cart = typeof PunnagaiCartStorage !== 'undefined' ? PunnagaiCartStorage.loadCartFromLocalStorage() : [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Simulate order creation & payment
    const order = {
      userId: user ? user.uid : 'guest',
      status: 'confirmed',
      items: cart,
      subtotal: subtotal,
      shipping: currentShippingCost,
      tax: 0,
      discount: 0,
      total: subtotal + currentShippingCost,
      shippingAddress: {
        name: orderData.customerName,
        phone: orderData.phone,
        address: orderData.address,
        city: orderData.city,
        state: orderData.state,
        postalCode: orderData.postalCode
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (typeof createOrder === 'function') {
      const res = await createOrder(order);
      order.id = res.id;
    } else {
      order.id = 'TEST-' + Math.floor(Math.random()*10000);
    }
    
    if (typeof window.PunnagaiCheckout !== 'undefined') {
       // PunnagaiCheckout.completeCheckout uses cartStorageClear
       await window.PunnagaiCheckout.completeCheckout({ status: 'success' }, order);
    } else if (typeof PunnagaiCartStorage !== 'undefined') {
       PunnagaiCartStorage.clearCart();
    }

    const pStatus = document.getElementById('payment-status');
    if (pStatus) pStatus.innerHTML = '<span style="color:var(--success)">Payment successful! Redirecting...</span>';
    
    setTimeout(() => {
      window.location.href = 'account.html'; // Or order confirmation page
    }, 1500);
    
  } catch (err) {
    console.error(err);
    const pStatus = document.getElementById('payment-status');
    if (pStatus) pStatus.innerHTML = '<span style="color:var(--danger)">Payment failed. Please try again.</span>';
    const actions = document.querySelector('.payment-actions');
    if (actions) actions.style.display = 'flex';
  }
}

document.getElementById('retry-payment')?.addEventListener('click', () => {
  document.getElementById('payment-overlay').style.display = 'none';
  const actions = document.querySelector('.payment-actions');
  if (actions) actions.style.display = 'none';
});

// Utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
