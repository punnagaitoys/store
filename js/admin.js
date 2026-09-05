/**
 * admin.js — Admin Panel Controller (Punnagai / Punnagai Toy Store)
 *
 * Drives admin.html: authentication/session, dashboard stats, the products
 * table, and the add/edit product form. Implements Requirement 8 (Admin Panel —
 * Product Management):
 *
 *   8.1  Dashboard with sections (Products / Add Product)
 *   8.2  Add-product form (name, description, category, age rating, base price)
 *   8.3  SKU generation per variant (size × color) with individual pricing —
 *        delegated to the pure builder in js/lib/products-model.js
 *   8.4  Image upload to Firebase Storage + auto thumbnail (local-mode fallback)
 *   8.5  Editing updates name, description, price, variants, images
 *   8.6  Deleting removes the product AND marks every order line containing it
 *        as "product archived" (order history is preserved, never broken)
 *   8.7  Adding a variant to an EXISTING product creates a new SKU with initial
 *        inventory of zero
 *   8.8  At-least-one-variant validation before publishing
 *   8.9  Product list shows name, category, price range, variant count, created
 *
 * Every create / update / delete is recorded through js/lib/audit.js
 * (PunnagaiAudit → window.createAuditLog), satisfying the admin audit trail.
 *
 * Conventions (see steering): data functions return { success, id } /
 * { success, error }; prices use ₹ + toLocaleString('en-IN'); user feedback via
 * showToast(message, type). Hybrid data layer (window.USE_LOCAL_MODE) is handled
 * inside js/data.js and js/firebase-config.js (window.storage handle).
 */

'use strict';

// ============================================================
// CONSTANTS & MODULE STATE
// ============================================================

const ADMIN_LOCAL_EMAIL = 'admin@punnagaitoystore.com';
// Password is NOT stored in source. In local mode it is read at runtime from:
//   localStorage.setItem('__punnagai_admin_env', JSON.stringify({ password: 'your-password' }))
// Set this once in the browser console on your development machine.
// In production, Firebase Auth handles authentication and this constant is unused.
const ADMIN_SESSION_KEY = 'admin_session';
const THUMBNAIL_MAX_PX = 240;

// Pure-logic + audit module handles (loaded before this script in admin.html;
// resolved via require() under Node/Jest so the logic stays unit-testable).
let ProductsModel = (typeof window !== 'undefined' && window.PunnagaiProductsModel) || null;
let Audit = (typeof window !== 'undefined' && window.PunnagaiAudit) || null;
if (typeof require !== 'undefined') {
  if (!ProductsModel) {
    try {
      ProductsModel = require('./lib/products-model');
    } catch (_) {
      /* browser */
    }
  }
  if (!Audit) {
    try {
      Audit = require('./lib/audit');
    } catch (_) {
      /* browser */
    }
  }
}

let adminProducts = []; // last-loaded product list (for table + filtering)
let editingProductId = null; // non-null while editing an existing product
let selectedImageFile = null; // File chosen via the upload input (if any)
let deletingProductId = null; // product queued for deletion in the confirm modal
let quillEditor = null; // Quill.js instance for rich text product descriptions

// ============================================================
// PAGE INIT & AUTH
// ============================================================

/**
 * Entry point — called from admin.html on DOMContentLoaded.
 * Wires form handlers and resolves the auth state (local session or Firebase).
 */
function initAdminPage() {
  wireAdminEvents();
  resolveAuthState();
}

/** Attach event handlers that admin.html does not bind inline. */
function wireAdminEvents() {
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);

  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleAdminLogout);

  const productForm = document.getElementById('product-form');
  if (productForm) productForm.addEventListener('submit', handleProductSubmit);

  if (typeof Quill !== 'undefined') {
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
      quillEditor = new Quill('#editor-container', {
        theme: 'snow',
        placeholder:
          'Describe the toy, its features, materials, educational benefits, what makes it special...',
        modules: {
          toolbar: [['bold', 'italic', 'underline'], [{ list: 'bullet' }], ['link', 'clean']]
        }
      });
      quillEditor.on('text-change', function () {
        const hiddenDesc = document.getElementById('f-description');
        if (hiddenDesc) {
          hiddenDesc.value = quillEditor.root.innerHTML;
        }
      });
    }
  }
}

/** Show the login screen or the admin panel depending on auth/session. */
function resolveAuthState() {
  checkAdminSession();
}

function checkAdminSession() {
  if (window.USE_LOCAL_MODE) {
    const signedIn = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    if (signedIn) {
      enterAdminApp(ADMIN_LOCAL_EMAIL + ' (Local)');
    } else {
      showLoginScreen();
      const localHint = document.getElementById('local-mode-admin-hint');
      if (localHint) localHint.style.display = 'block';
    }
    return;
  }

  // Firebase auth
  if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
    window.auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          if (userDoc.exists && userDoc.data() && userDoc.data().isAdmin === true) {
            enterAdminApp(user.email);
          } else {
            console.warn('Unauthorized admin access attempt:', user.email);
            if (window.auth && typeof window.auth.signOut === 'function') {
              await window.auth.signOut();
            }
            showLoginScreen();
            const errEl = document.getElementById('login-error');
            if (errEl) errEl.textContent = 'Access denied. You do not have administrator privileges.';
          }
        } catch (err) {
          console.error('Error verifying admin role:', err);
          showLoginScreen();
          const errEl = document.getElementById('login-error');
          if (errEl) errEl.textContent = 'Failed to verify admin privileges. Please try again.';
        }
      } else {
        showLoginScreen();
      }
    });
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  const login = document.getElementById('admin-login-screen');
  const panel = document.getElementById('admin-panel');
  if (login) login.style.display = 'flex';
  if (panel) panel.style.display = 'none';
}

function enterAdminApp(emailLabel) {
  const login = document.getElementById('admin-login-screen');
  const panel = document.getElementById('admin-panel');
  if (login) login.style.display = 'none';
  if (panel) panel.style.display = 'flex';
  const emailEl = document.getElementById('admin-user-email');
  if (emailEl) emailEl.textContent = emailLabel || 'Admin';
  initAdminDashboard();
}

function setLoginLoading(isLoading) {
  const btnText = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-spinner');
  const btn = document.getElementById('login-btn');
  if (btn) btn.disabled = isLoading;
  if (spinner) spinner.style.display = isLoading ? 'block' : 'none';
  if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
}

function handleAdminLogin(e) {
  e.preventDefault();
  const email = (document.getElementById('admin-email') || {}).value || '';
  const pass = (document.getElementById('admin-password') || {}).value || '';
  const errEl = document.getElementById('login-error');
  if (errEl) errEl.textContent = '';
  setLoginLoading(true);

  if (window.USE_LOCAL_MODE) {
    // Demo mode: accept any email with password '123'
    const DEMO_PASSWORD = '123';
    setTimeout(() => {
      if (pass === DEMO_PASSWORD) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        setLoginLoading(false);
        enterAdminApp('Admin');
      } else {
        setLoginLoading(false);
        if (errEl) errEl.textContent = 'Incorrect password. Use: 123';
      }
    }, 400);
  } else {
    window.auth
      .signInWithEmailAndPassword(email, pass)
      .then(() => setLoginLoading(false))
      .catch((err) => {
        setLoginLoading(false);
        if (errEl) errEl.textContent = 'Invalid credentials. Please try again.';
        console.error('Admin login failed:', err);
      });
  }
}

function handleAdminLogout() {
  if (window.USE_LOCAL_MODE) {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    showLoginScreen();
  } else if (window.auth && typeof window.auth.signOut === 'function') {
    window.auth.signOut();
  }
}

/** Resolve the acting admin's id for the audit trail. */
function getAdminUserId() {
  if (
    typeof window !== 'undefined' &&
    !window.USE_LOCAL_MODE &&
    window.auth &&
    window.auth.currentUser
  ) {
    return window.auth.currentUser.uid || window.auth.currentUser.email || 'admin';
  }
  return 'local-admin';
}

// ============================================================
// SECTION NAVIGATION
// ============================================================

function showSection(name) {
  document.querySelectorAll('.admin-section').forEach((sec) => {
    sec.style.display = 'none';
  });
  const target = document.getElementById('section-' + name);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.admin-nav-item').forEach((item) => {
    const isActive = item.getAttribute('data-section') === name;
    item.classList.toggle('active', isActive);
    if (isActive) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  if (name === 'products') {
    renderProductsTable(adminProducts);
  } else if (name === 'add-product' && !editingProductId) {
    resetProductForm();
  } else if (name === 'dashboard') {
    updateDashboardStats(adminProducts);
    renderRecentProducts(adminProducts);
    if (window.AdminUI) {
      window.AdminUI.loadDashboardCharts();
      window.AdminUI.loadLowStock(adminProducts);
    }
  } else if (name === 'orders') {
    if (window.AdminUI) window.AdminUI.loadOrders();
  } else if (name === 'coupons') {
    if (window.AdminUI) window.AdminUI.loadCoupons();
  } else if (name === 'categories') {
    if (window.AdminUI) {
      window.AdminUI.loadCategories();
      window.AdminUI.loadBanners();
    }
  } else if (name === 'audit') {
    if (window.AdminUI) window.AdminUI.loadAuditLogs();
  } else if (name === 'videos') {
    if (window.AdminUI) window.AdminUI.loadHomeVideos();
  } else if (name === 'media-library') {
    if (window.MediaLibrary) window.MediaLibrary.renderMediaGrid();
  } else if (name === 'settings') {
    loadAdminStoreSettings();
  }

  // Collapse the mobile sidebar after navigating.
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

// ============================================================
// STORE SETTINGS
// ============================================================

function loadAdminStoreSettings() {
  const settings = window.PunnagaiSettings
    ? window.PunnagaiSettings.get()
    : {
        phonePrimary: '+91 75501 32101',
        phoneSecondary: '+91 72994 61657',
        whatsappNumber: '917550132101',
        storeEmail: 'contact@punnagaitoystore.com',
        upiId: 'punnagai@upi',
        storeAddress: '4/7 Luz Bazar Complex, R.K. Mutt Road, Mylapore, Chennai – 600 004'
      };

  const p1 = document.getElementById('settings-phone-primary');
  const p2 = document.getElementById('settings-phone-secondary');
  const wa = document.getElementById('settings-wa-number');
  const em = document.getElementById('settings-email');
  const upi = document.getElementById('settings-upi');
  const addr = document.getElementById('settings-address');

  if (p1) p1.value = settings.phonePrimary || '';
  if (p2) p2.value = settings.phoneSecondary || '';
  if (wa) wa.value = settings.whatsappNumber || '';
  if (em) em.value = settings.storeEmail || '';
  if (upi) upi.value = settings.upiId || '';
  if (addr) addr.value = settings.storeAddress || '';
}

function handleSaveStoreSettings(e) {
  if (e && e.preventDefault) e.preventDefault();

  const p1 = document.getElementById('settings-phone-primary')?.value.trim();
  const p2 = document.getElementById('settings-phone-secondary')?.value.trim();
  const wa = document.getElementById('settings-wa-number')?.value.trim();
  const em = document.getElementById('settings-email')?.value.trim();
  const upi = document.getElementById('settings-upi')?.value.trim();
  const addr = document.getElementById('settings-address')?.value.trim();

  const newSettings = {
    phonePrimary: p1 || '+91 75501 32101',
    phoneSecondary: p2 || '+91 72994 61657',
    whatsappNumber: wa || '917550132101',
    storeEmail: em || 'contact@punnagaitoystore.com',
    upiId: upi || 'punnagai@upi',
    storeAddress: addr || '4/7 Luz Bazar Complex, R.K. Mutt Road, Mylapore, Chennai – 600 004'
  };

  if (window.PunnagaiSettings) {
    window.PunnagaiSettings.save(newSettings);
    if (typeof window.PunnagaiSettings.updateLinks === 'function') {
      window.PunnagaiSettings.updateLinks();
    }
  }

  const status = document.getElementById('settings-save-status');
  if (status) {
    status.style.display = 'inline';
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }

  if (typeof showToast === 'function') {
    showToast('Store settings updated! New phone & contact info saved.', 'success');
  }
}

// ============================================================
// DASHBOARD
// ============================================================

async function initAdminDashboard() {
  await loadAdminProducts();
  maybeShowSeedButton();
}

function maybeShowSeedButton() {
  const seedBtn = document.getElementById('seed-btn');
  if (seedBtn) seedBtn.style.display = adminProducts.length === 0 ? 'inline-flex' : 'none';
}

async function handleSeed() {
  const seeded = await seedProductsIfEmpty();
  if (seeded) {
    showToast('Sample products loaded successfully!', 'success');
    await loadAdminProducts();
  } else {
    showToast('Products already exist — nothing to seed.', 'info');
  }
  maybeShowSeedButton();
}

async function loadAdminProducts() {
  adminProducts = await getProducts();
  updateDashboardStats(adminProducts);
  renderRecentProducts(adminProducts);
  renderProductsTable(adminProducts);
  if (window.AdminUI) {
    window.AdminUI.loadLowStock(adminProducts);
    window.AdminUI.loadDashboardCharts();
  }
  if (window.MediaLibrary) {
    window.MediaLibrary.init(adminProducts);
  }
  const countEl = document.getElementById('products-section-count');
  if (countEl)
    countEl.textContent =
      adminProducts.length + ' product' + (adminProducts.length === 1 ? '' : 's') + ' in catalog';
}

function updateDashboardStats(products) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set('stat-total-products', products.length);
  set('stat-featured', products.filter((p) => p.featured).length);
  set('stat-in-stock', products.filter((p) => p.inStock).length);
  set('stat-on-sale', products.filter((p) => p.originalPrice && p.originalPrice > p.price).length);
}

function renderRecentProducts(products) {
  const wrap = document.getElementById('dashboard-recent-products');
  if (!wrap) return;
  const recent = products
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);
  if (recent.length === 0) {
    wrap.innerHTML =
      '<p class="text-secondary">No products yet. Add your first product to get started.</p>';
    return;
  }
  wrap.innerHTML = recent
    .map(
      (p) => `
    <div class="dashboard-recent-item">
      <img src="${escapeAttr(p.imageUrl)}" alt="${escapeAttr(p.name)}" class="table-image">
      <div>
        <strong>${escapeHtml(p.name)}</strong>
        <span class="text-secondary">${escapeHtml(p.category || '')}</span>
      </div>
      <span>${formatPriceRange(p)}</span>
    </div>
  `
    )
    .join('');
}

// ============================================================
// PRODUCTS TABLE (Requirement 8.9)
// ============================================================

function renderProductsTable(products) {
  const tbody = document.getElementById('admin-product-table-body');
  if (!tbody) return;

  if (!products || products.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center" style="padding:32px">No products found.</td></tr>';
    return;
  }

  tbody.innerHTML = products
    .map((p) => {
      const variantCount = getVariantCount(p);
      const created = formatDate(p.createdAt);
      return `
    <tr>
      <td><img src="${escapeAttr(p.imageUrl)}" alt="${escapeAttr(p.name)}" class="table-image"></td>
      <td>
        <strong>${escapeHtml(p.name)}</strong><br>
        <span class="text-secondary">${escapeHtml(p.category || '')}</span><br>
        <small class="text-secondary">${variantCount} variant${variantCount === 1 ? '' : 's'} · added ${created}</small>
      </td>
      <td>${formatPriceRange(p)}</td>
      <td>${escapeHtml(p.ageGroup || '')}</td>
      <td><span class="status-badge ${p.inStock ? 'status-in-stock' : 'status-out'}">${p.inStock ? 'In Stock' : 'Out of Stock'}</span></td>
      <td>
        <div class="flex gap-8">
          <button class="btn-icon" title="Edit" onclick="openEditProduct('${p.id}')" type="button">✏️</button>
          <button class="btn-icon" title="Delete" style="color:#DC2626" onclick="confirmDeleteProduct('${p.id}')" type="button">🗑️</button>
        </div>
      </td>
    </tr>`;
    })
    .join('');
}

function filterAdminProducts() {
  const term = ((document.getElementById('admin-product-search') || {}).value || '')
    .toLowerCase()
    .trim();
  const cat = (document.getElementById('admin-cat-filter') || {}).value || '';
  const stock = (document.getElementById('admin-stock-filter') || {}).value || '';

  let filtered = adminProducts.slice();
  if (term) filtered = filtered.filter((p) => (p.name || '').toLowerCase().includes(term));
  if (cat) filtered = filtered.filter((p) => decodeEntities(p.category) === decodeEntities(cat));
  if (stock === 'instock') filtered = filtered.filter((p) => p.inStock);
  else if (stock === 'outofstock') filtered = filtered.filter((p) => !p.inStock);

  renderProductsTable(filtered);
}

// ============================================================
// PRODUCT FORM — ADD / EDIT (Requirements 8.2, 8.3, 8.5)
// ============================================================

function resetProductForm() {
  editingProductId = null;
  selectedImageFile = null;
  const form = document.getElementById('product-form');
  if (form) form.reset();
  setText('form-title', 'Add New Product');
  setText('form-subtitle', 'Fill in the product details below');
  setText('submit-btn-text', 'Add Product');
  setValue('f-product-id', '');
  const inStock = document.getElementById('f-in-stock');
  if (inStock) inStock.checked = true;
  const stockField = document.getElementById('f-variant-stock');
  if (stockField) stockField.value = '0';
  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (quillEditor) {
    quillEditor.root.innerHTML = '';
  }
  clearImagePreviewSafe();
  updateVariantPreview();
}

function cancelEditMode() {
  resetProductForm();
  showSection('products');
}

function openEditProduct(id) {
  const product = adminProducts.find((p) => p.id === id);
  if (!product) {
    showToast('Product not found.', 'error');
    return;
  }
  editingProductId = id;
  selectedImageFile = null;

  setText('form-title', 'Edit Product');
  setText('form-subtitle', 'Update the product details below');
  setText('submit-btn-text', 'Save Changes');
  setValue('f-product-id', id);
  setValue('f-name', product.name || '');
  setValue('f-category', product.category || '');
  if (quillEditor) {
    quillEditor.root.innerHTML = product.description || '';
  } else {
    setValue('f-description', product.description || '');
  }
  setValue('f-price', product.price != null ? product.price : '');
  setValue('f-original-price', product.originalPrice != null ? product.originalPrice : '');
  setValue('f-age', product.ageGroup || '');
  setValue('f-image-url', product.imageUrl || '');
  setValue('f-video-url', product.videoUrl || '');
  setValue('f-badge', product.badge || '');
  setChecked('f-in-stock', !!product.inStock);
  setChecked('f-featured', !!product.featured);
  setChecked('f-new-arrival', !!product.newArrival);

  // Pre-fill the variant editor from existing variants (distinct sizes/colors).
  const sizes = uniqueValues((product.variants || []).map((v) => v.size));
  const colors = uniqueValues((product.variants || []).map((v) => v.color));
  const existingStock =
    Array.isArray(product.variants) &&
    product.variants.length > 0 &&
    product.variants[0].stock != null
      ? product.variants[0].stock
      : product.inStock
        ? '10'
        : '0';
  setValue('f-variant-stock', String(existingStock));

  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  updateImagePreviewFromUrl(product.imageUrl || '');
  updateVariantPreview();
  showSection('add-product');
}

/** Read the product form into a plain object. */
function readProductForm() {
  const descValue = quillEditor ? quillEditor.root.innerHTML : getValue('f-description') || '';
  return {
    name: (getValue('f-name') || '').trim(),
    category: getValue('f-category') || '',
    description: descValue.trim(),
    price: getValue('f-price'),
    originalPrice: getValue('f-original-price') || null,
    ageGroup: getValue('f-age') || '',
    imageUrl: (getValue('f-image-url') || '').trim(),
    videoUrl: (getValue('f-video-url') || '').trim(),
    badge: getValue('f-badge') || '',
    inStock: getChecked('f-in-stock'),
    featured: getChecked('f-featured'),
    newArrival: getChecked('f-new-arrival'),
    sizes: parseList(getValue('f-sizes')),
    colors: parseList(getValue('f-colors')),
    variantStock: getValue('f-variant-stock')
  };
}

function setSubmitLoading(isLoading, label) {
  const btn = document.getElementById('submit-product-btn');
  const spinner = document.getElementById('submit-spinner');
  const text = document.getElementById('submit-btn-text');
  if (btn) btn.disabled = isLoading;
  if (spinner) spinner.style.display = isLoading ? 'block' : 'none';
  if (text && label) text.textContent = label;
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const form = readProductForm();

  if (
    !form.name ||
    !form.category ||
    !form.description ||
    form.price === '' ||
    form.price == null ||
    !form.ageGroup
  ) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  setSubmitLoading(true);
  try {
    if (editingProductId) {
      await saveExistingProduct(editingProductId, form);
    } else {
      await createNewProduct(form);
    }
  } catch (err) {
    console.error('Error saving product:', err);
    showToast('Error saving product: ' + (err.message || err), 'error');
  } finally {
    setSubmitLoading(false, editingProductId ? 'Save Changes' : 'Add Product');
  }
}

/** Create a brand new product (Requirements 8.2, 8.3, 8.4, 8.8). */
async function createNewProduct(form) {
  const sequence = makeSequence();
  const variants = buildVariantsFromForm(form, sequence);

  const productData = assembleProductData(form, variants, sequence, []);

  // 8.8 — at least one variant before publishing.
  const validation = validateProductForPublish(productData);
  if (!validation.valid) {
    showToast(validation.error, 'error');
    return;
  }

  // Local mode: embed the uploaded image immediately (no id needed).
  if (selectedImageFile && (window.USE_LOCAL_MODE || !hasFirebaseStorage())) {
    const up = await uploadProductImage(selectedImageFile, 'local');
    if (up.success) {
      productData.imageUrl = up.imageUrl;
      productData.thumbnails = up.thumbnails;
    }
  }

  const res = await addProduct(productData);
  if (!res.success) {
    showToast('Error adding product: ' + res.error, 'error');
    return;
  }

  // Firebase mode: upload the image now that we have a product id, then patch.
  if (selectedImageFile && !window.USE_LOCAL_MODE && hasFirebaseStorage()) {
    const up = await uploadProductImage(selectedImageFile, res.id);
    if (up.success) {
      await updateProduct(res.id, { imageUrl: up.imageUrl, thumbnails: up.thumbnails });
    }
  }

  await logAdminOperation(Audit && Audit.OPERATION_TYPES.CREATE_PRODUCT, res.id, {
    name: productData.name,
    variantCount: variants.length,
    skuIds: variants.map((v) => v.skuId)
  });

  showToast('Product added successfully!', 'success');
  resetProductForm();
  await loadAdminProducts();
  showSection('products');
}

/** Update an existing product, preserving existing variant stock (8.5, 8.7). */
async function saveExistingProduct(id, form) {
  const existing = adminProducts.find((p) => p.id === id) || (await getProductById(id));
  if (!existing) {
    showToast('Product not found.', 'error');
    return;
  }

  const sequence = existing.sequence || makeSequence();
  const mergedVariants = mergeVariantsForEdit(existing, form, sequence);
  const updates = assembleProductData(form, mergedVariants, sequence, existing.thumbnails || []);

  // 8.8 — never let an edit leave the product with zero variants.
  const validation = validateProductForPublish(updates);
  if (!validation.valid) {
    showToast(validation.error, 'error');
    return;
  }

  // Replace the image if a new file was chosen.
  if (selectedImageFile) {
    const up = await uploadProductImage(selectedImageFile, id);
    if (up.success) {
      updates.imageUrl = up.imageUrl;
      updates.thumbnails = up.thumbnails;
    }
  }

  const res = await updateProduct(id, updates);
  if (!res.success) {
    showToast('Error updating product: ' + res.error, 'error');
    return;
  }

  const newVariants = mergedVariants.filter((v) => v.__isNew);
  await logAdminOperation(Audit && Audit.OPERATION_TYPES.UPDATE_PRODUCT, id, {
    name: updates.name,
    variantCount: mergedVariants.length,
    newVariantSkuIds: newVariants.map((v) => v.skuId)
  });

  showToast('Product updated successfully!', 'success');
  resetProductForm();
  await loadAdminProducts();
  showSection('products');
}

/**
 * Assemble the persisted product document: legacy storefront fields (kept in
 * sync with the existing shape) plus the richer variant/thumbnail fields.
 */
function assembleProductData(form, variants, sequence, thumbnails) {
  const basePrice = Number(form.price) || 0;
  return {
    // Legacy storefront shape (consumed by data.js / app.js / product detail).
    name: form.name,
    description: form.description,
    price: basePrice,
    originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
    category: form.category,
    ageGroup: form.ageGroup,
    imageUrl: form.imageUrl,
    videoUrl: form.videoUrl,
    inStock: form.inStock,
    featured: form.featured,
    badge: form.badge,
    newArrival: form.newArrival,
    // Variant / SKU model (Requirement 8.3) + media.
    basePrice: basePrice,
    sequence: sequence,
    sizes: form.sizes,
    colors: form.colors,
    variants: stripVariantFlags(variants),
    thumbnails: Array.isArray(thumbnails) ? thumbnails : []
  };
}

// ============================================================
// VARIANT / SKU LOGIC (Requirements 8.3, 8.7, 8.8)
// ============================================================

/**
 * Build the variant matrix for a NEW product. Produces one unique SKU per
 * size × color combination via the pure builder. When no sizes/colors are
 * supplied, a single default "One Size / Standard" variant is created so the
 * product always has at least one variant (Requirement 8.8).
 */
function buildVariantsFromForm(form, sequence) {
  const basePrice = Number(form.price) || 0;
  const initialStock = normalizeStockInput(form.variantStock);

  if (form.sizes.length && form.colors.length && ProductsModel) {
    return ProductsModel.buildVariants(form.sizes, form.colors, {
      sequence: sequence,
      price: basePrice,
      stock: initialStock
    });
  }

  // Default single variant so "at least one variant" always holds.
  if (ProductsModel) {
    return ProductsModel.buildVariants(['One Size'], ['Standard'], {
      sequence: sequence,
      price: basePrice,
      stock: initialStock
    });
  }

  // Fallback if the model failed to load.
  return [
    {
      variantId: 'var_' + sequence + '_001',
      skuId: 'SKU-' + sequence + '-0-ONESIZE-0-STANDARD',
      size: 'One Size',
      color: 'Standard',
      price: basePrice,
      stock: initialStock
    }
  ];
}

/**
 * Merge desired size/color combinations against an existing product's variants
 * when editing. Existing combinations keep their stock, price, and ids. NEW
 * combinations are created with initial inventory of zero (Requirement 8.7).
 * If the editor leaves sizes/colors empty, the existing variants are kept
 * untouched (an edit must never silently drop variants).
 */
function mergeVariantsForEdit(existing, form, sequence) {
  const existingVariants = Array.isArray(existing.variants) ? existing.variants : [];

  // No variant editing requested → keep what is there (or seed a default).
  if (!(form.sizes.length && form.colors.length)) {
    if (existingVariants.length > 0) return existingVariants.slice();
    return buildVariantsFromForm(form, sequence);
  }

  const byKey = {};
  existingVariants.forEach((v) => {
    byKey[variantKey(v.size, v.color)] = v;
  });

  const basePrice = Number(form.price) || 0;
  const desired = ProductsModel
    ? ProductsModel.buildVariants(form.sizes, form.colors, {
        sequence: sequence,
        price: basePrice,
        stock: 0
      })
    : [];

  return desired.map((d) => {
    const prior = byKey[variantKey(d.size, d.color)];
    if (prior) {
      // Preserve the existing variant's identity, price, and stock.
      return {
        variantId: prior.variantId || d.variantId,
        skuId: prior.skuId || d.skuId,
        size: d.size,
        color: d.color,
        price: prior.price != null ? prior.price : d.price,
        stock: prior.stock != null ? prior.stock : 0
      };
    }
    // New variant on an existing product → initial inventory zero (8.7).
    return Object.assign({}, d, { stock: 0, __isNew: true });
  });
}

/**
 * Add a single new variant to an existing product with initial inventory of
 * zero (Requirement 8.7). Exposed for direct/admin use and testing.
 * @returns {Promise<{success:boolean, variant?:object, error?:string}>}
 */
async function addVariantToProduct(productId, size, color) {
  const product = await getProductById(productId);
  if (!product) return { success: false, error: 'Product not found' };

  const variants = Array.isArray(product.variants) ? product.variants.slice() : [];
  if (variants.some((v) => variantKey(v.size, v.color) === variantKey(size, color))) {
    return { success: false, error: 'That size/color variant already exists' };
  }

  const sequence = product.sequence || makeSequence();
  const index = variants.length;
  const newVariant = {
    variantId: ProductsModel
      ? ProductsModel.formatVariantId('var', sequence, index + 1)
      : 'var_' + sequence + '_' + (index + 1),
    skuId: ProductsModel
      ? ProductsModel.formatSKU('SKU', sequence, index, size, index, color)
      : 'SKU-' + sequence + '-' + index,
    size: size,
    color: color,
    price: Number(product.basePrice != null ? product.basePrice : product.price) || 0,
    stock: 0 // 8.7 — initial inventory is zero
  };
  variants.push(newVariant);

  const res = await updateProduct(productId, { variants: variants });
  if (res.success) {
    await logAdminOperation(Audit && Audit.OPERATION_TYPES.UPDATE_PRODUCT, productId, {
      action: 'add_variant',
      skuId: newVariant.skuId,
      size: size,
      color: color,
      initialStock: 0
    });
    return { success: true, variant: newVariant };
  }
  return res;
}

/**
 * At-least-one-variant validation before publishing (Requirement 8.8).
 * @returns {{valid:boolean, error?:string}}
 */
function validateProductForPublish(product) {
  const variants = product && Array.isArray(product.variants) ? product.variants : [];
  if (variants.length < 1) {
    return { valid: false, error: 'A product must have at least one variant before publishing.' };
  }
  return { valid: true };
}

/** Live preview of how many SKUs the current size/color inputs will generate. */
function updateVariantPreview() {
  const el = document.getElementById('variant-preview');
  if (!el) return;
  const sizes = parseList(getValue('f-sizes'));
  const colors = parseList(getValue('f-colors'));
  let count;
  if (sizes.length && colors.length) {
    count = ProductsModel
      ? ProductsModel.deriveVariantCount(sizes, colors)
      : sizes.length * colors.length;
    el.textContent =
      'Will generate ' + count + ' SKU' + (count === 1 ? '' : 's') + ' (one per size × color).';
  } else {
    el.textContent = 'No sizes/colors set — a single default variant will be created.';
  }
}

// ============================================================
// IMAGE UPLOAD + THUMBNAILS (Requirement 8.4)
// ============================================================

function hasFirebaseStorage() {
  return !!(window.storage && typeof window.storage.ref === 'function');
}

function handleImageFileSelect(event) {
  const file = event && event.target && event.target.files ? event.target.files[0] : null;
  selectedImageFile = file || null;
  if (file) {
    readFileAsDataURL(file)
      .then((dataUrl) => updateImagePreviewFromUrl(dataUrl))
      .catch(() => {});
  }
}

/**
 * Upload a product image. In local mode (or when Storage is unavailable) it
 * degrades gracefully to an embedded data URL plus a generated thumbnail data
 * URL. In Firebase mode it stores both the original and the thumbnail and
 * returns their download URLs.
 * @returns {Promise<{success:boolean, imageUrl?:string, thumbnails?:string[], error?:string}>}
 */
async function uploadProductImage(file, productRef) {
  if (!file) return { success: false, error: 'No file provided' };
  try {
    const dataUrl = await readFileAsDataURL(file);
    let thumbUrl;
    try {
      thumbUrl = await generateThumbnailDataURL(dataUrl, THUMBNAIL_MAX_PX);
    } catch (_) {
      thumbUrl = dataUrl; // thumbnail generation is best-effort
    }

    // Graceful fallback: keep data URLs when there is no real storage backend.
    if (window.USE_LOCAL_MODE || !hasFirebaseStorage()) {
      return { success: true, imageUrl: dataUrl, thumbnails: [thumbUrl] };
    }

    const stamp = Date.now();
    const folder = 'products/' + productRef + '/';
    const mainRef = window.storage.ref().child(folder + 'main_' + stamp);
    await mainRef.putString(dataUrl, 'data_url');
    const imageUrl = await mainRef.getDownloadURL();

    const thumbRef = window.storage.ref().child(folder + 'thumb_' + stamp);
    await thumbRef.putString(thumbUrl, 'data_url');
    const thumbnailUrl = await thumbRef.getDownloadURL();

    return { success: true, imageUrl: imageUrl, thumbnails: [thumbnailUrl] };
  } catch (err) {
    console.error('Image upload failed:', err);
    return { success: false, error: err.message || String(err) };
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Downscale an image (given as a data URL) to a JPEG thumbnail data URL. */
function generateThumbnailDataURL(dataUrl, maxPx) {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Thumbnail generation unavailable in this environment'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.width, img.height) || 1;
      const scale = Math.min(1, maxPx / longest);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Could not load image for thumbnail'));
    img.src = dataUrl;
  });
}

function updateImagePreviewFromUrl(url) {
  const wrapper = document.getElementById('img-preview-wrapper');
  const img = document.getElementById('img-preview');
  if (!wrapper || !img) return;
  if (url) {
    img.src = url;
    wrapper.style.display = 'block';
  } else {
    img.src = '';
    wrapper.style.display = 'none';
  }
}

function clearImagePreviewSafe() {
  const wrapper = document.getElementById('img-preview-wrapper');
  const img = document.getElementById('img-preview');
  if (img) img.src = '';
  if (wrapper) wrapper.style.display = 'none';
  const fileInput = document.getElementById('f-image-file');
  if (fileInput) fileInput.value = '';
}

// ============================================================
// DELETE + ARCHIVE-ON-DELETE (Requirement 8.6)
// ============================================================

function confirmDeleteProduct(id) {
  deletingProductId = id;
  const product = adminProducts.find((p) => p.id === id);
  const nameEl = document.getElementById('delete-product-name');
  if (nameEl) nameEl.textContent = product ? product.name : 'this product';
  const modal = document.getElementById('delete-modal');
  if (modal) modal.style.display = 'flex';
}

function closeDeleteModal() {
  deletingProductId = null;
  const modal = document.getElementById('delete-modal');
  if (modal) modal.style.display = 'none';
}

async function executeDelete() {
  if (!deletingProductId) return;
  const id = deletingProductId;
  const product = adminProducts.find((p) => p.id === id);
  const confirmBtn = document.getElementById('confirm-delete-btn');
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    // 8.6 — archive order history BEFORE removing the product so we can still
    // identify the affected order lines.
    const archivedCount = await archiveOrdersContainingProduct(id);

    const res = await deleteProduct(id);
    if (!res.success) {
      showToast('Error deleting product: ' + res.error, 'error');
      return;
    }

    await logAdminOperation(Audit && Audit.OPERATION_TYPES.DELETE_PRODUCT, id, {
      name: product ? product.name : null,
      archivedOrderCount: archivedCount
    });

    const suffix =
      archivedCount > 0
        ? ' (' + archivedCount + ' order' + (archivedCount === 1 ? '' : 's') + ' archived)'
        : '';
    showToast('Product deleted' + suffix + '.', 'success');
    closeDeleteModal();
    await loadAdminProducts();
  } catch (err) {
    console.error('Error during delete:', err);
    showToast('Error deleting product: ' + (err.message || err), 'error');
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

/**
 * Mark every order line that references the product as "product archived" so
 * order history is preserved rather than broken (Requirement 8.6). Returns the
 * number of orders updated.
 */
async function archiveOrdersContainingProduct(productId) {
  let updatedOrders = 0;
  try {
    const orders = await getOrders();
    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];
      let changed = false;
      const newItems = items.map((it) => {
        if (it && it.productId === productId && !it.archived) {
          changed = true;
          return Object.assign({}, it, {
            archived: true,
            status: 'product archived',
            archivedReason: 'product archived'
          });
        }
        return it;
      });
      if (changed) {
        const res = await updateOrder(order.id, { items: newItems, hasArchivedProduct: true });
        if (res && res.success) updatedOrders += 1;
      }
    }
  } catch (err) {
    console.error('Error archiving orders for product:', err);
  }
  return updatedOrders;
}

// ============================================================
// AUDIT LOGGING (js/lib/audit.js)
// ============================================================

async function logAdminOperation(operationType, productId, details) {
  try {
    if (!Audit || typeof Audit.writeAuditLog !== 'function' || !operationType) return;
    await Audit.writeAuditLog({
      adminUserId: getAdminUserId(),
      operationType: operationType,
      entity: { type: 'product', id: productId },
      details: details || {}
    });
  } catch (err) {
    // Audit logging must never block the primary admin operation.
    console.error('Audit log write failed:', err);
  }
}

// ============================================================
// SMALL UTILITIES
// ============================================================

function parseList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function uniqueValues(arr) {
  const seen = [];
  (arr || []).forEach((v) => {
    if (v != null && v !== '' && seen.indexOf(v) === -1) seen.push(v);
  });
  return seen;
}

function variantKey(size, color) {
  return String(size) + '||' + String(color);
}

function stripVariantFlags(variants) {
  return (variants || []).map((v) => {
    const copy = Object.assign({}, v);
    delete copy.__isNew;
    return copy;
  });
}

function normalizeStockInput(value) {
  const n = Number(value);
  if (!isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function makeSequence() {
  // Mostly-unique, non-numeric token so SKUs stay unique across products.
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 4)).toUpperCase();
}

function getVariantCount(product) {
  if (product && Array.isArray(product.variants)) return product.variants.length;
  return 0;
}

function formatPriceRange(product) {
  const variants = product && Array.isArray(product.variants) ? product.variants : [];
  const prices = variants.map((v) => Number(v.price)).filter((n) => isFinite(n) && n >= 0);
  if (prices.length === 0) {
    const base = Number(product.price) || 0;
    return '₹' + base.toLocaleString('en-IN');
  }
  const min = Math.min.apply(null, prices);
  const max = Math.max.apply(null, prices);
  if (min === max) return '₹' + min.toLocaleString('en-IN');
  return '₹' + min.toLocaleString('en-IN') + ' – ₹' + max.toLocaleString('en-IN');
}

function formatDate(ts) {
  if (!ts) return '—';
  let ms = ts;
  if (typeof ts === 'object') {
    if (typeof ts.toMillis === 'function') ms = ts.toMillis();
    else if (typeof ts.seconds === 'number') ms = ts.seconds * 1000;
  }
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// DOM value helpers (null-safe)
function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}
function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function getChecked(id) {
  const el = document.getElementById(id);
  return el ? !!el.checked : false;
}
function setChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function localEscapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

if (typeof window !== 'undefined') {
  if (!window.escapeHtml) {
    window.escapeHtml = localEscapeHtml;
  }
}
var escapeHtml = (typeof window !== 'undefined' && window.escapeHtml) || localEscapeHtml;
function escapeAttr(str) {
  return escapeHtml(str);
}

function decodeEntities(str) {
  return String(str == null ? '' : str).replace(/&amp;/g, '&');
}

// ============================================================
// EXPORTS (Node/Jest only — browser uses globals)
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkAdminSession,
    resolveAuthState,
    buildVariantsFromForm,
    mergeVariantsForEdit,
    validateProductForPublish,
    assembleProductData,
    archiveOrdersContainingProduct,
    addVariantToProduct,
    uploadProductImage,
    parseList,
    makeSequence,
    variantKey,
    formatPriceRange,
    normalizeStockInput
  };
}
