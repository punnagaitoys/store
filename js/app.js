/**
 * app.js — Shared components and page-specific logic
 * Handles: Navbar, Footer, Toast notifications, Product rendering
 */

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================
// NAVBAR INJECTION
// ============================================================

function getWishlistCount() {
  const Wishlist = (typeof window !== 'undefined' && window.PunnagaiWishlist)
    ? window.PunnagaiWishlist
    : (typeof PunnagaiWishlist !== 'undefined' ? PunnagaiWishlist : null);
  return Wishlist ? Wishlist.getWishlistCount() : 0;
}

function updateWishlistBadge() {
  const count = getWishlistCount();
  const badges = document.querySelectorAll('.wishlist-badge');
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
  const mobileBadges = document.querySelectorAll('.wishlist-badge-mobile');
  mobileBadges.forEach(badge => { badge.textContent = count; });
}

function renderNavbar(activePage = '') {
  const cartCount = typeof getCartCount === 'function' ? getCartCount() : 0;
  const wishlistCount = typeof getWishlistCount === 'function' ? getWishlistCount() : 0;
  const pages = [
    { href: 'index.html', label: 'Home', id: 'home' },
    { href: 'shop.html', label: 'Shop', id: 'shop' },
    { href: 'shop.html?sale=true', label: '🏷️ Sale', id: 'sale' },
    { href: 'index.html#contact', label: 'Contact', id: 'contact' }
  ];

  const navLinks = pages.map(p => 
    `<li><a href="${p.href}" class="nav-link ${activePage === p.id ? 'active' : ''}">${p.label}</a></li>`
  ).join('');

  const html = `
    <nav class="navbar" id="main-navbar">
      <div class="container">
        <div class="navbar-inner">
          <a href="index.html" class="navbar-logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill="#DC2626"/>
              <text x="20" y="26" text-anchor="middle" font-size="20" fill="white" font-family="Fredoka">K</text>
            </svg>
            <div class="logo-text-group">
              <span class="logo-text">Punnagai</span>
              <span class="logo-sub">Toy Store</span>
            </div>
          </a>

          <ul class="navbar-links" id="nav-links">
            ${navLinks}
          </ul>

          <div class="navbar-actions">
            <a href="wishlist.html" class="wishlist-btn ${activePage === 'wishlist' ? 'active' : ''}" aria-label="Wishlist">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span class="wishlist-badge" style="display:${wishlistCount > 0 ? 'flex' : 'none'}">${wishlistCount}</span>
            </a>
            <a href="cart.html" class="cart-btn" aria-label="Shopping Cart">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span class="cart-badge" style="display:${cartCount > 0 ? 'flex' : 'none'}">${cartCount}</span>
            </a>
            <button class="hamburger" id="hamburger" aria-label="Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="mobile-menu" id="mobile-menu">
          ${pages.map(p => `<a href="${p.href}" class="mobile-nav-link ${activePage === p.id ? 'active' : ''}">${p.label}</a>`).join('')}
          <a href="wishlist.html" class="mobile-nav-link ${activePage === 'wishlist' ? 'active' : ''}">❤️ Wishlist (<span class="wishlist-badge-mobile">${wishlistCount}</span>)</a>
          <a href="cart.html" class="mobile-nav-link">🛒 Cart (<span class="cart-badge-mobile">${cartCount}</span>)</a>
        </div>
      </div>
    </nav>
  `;

  const navContainer = document.getElementById('navbar');
  if (navContainer) {
    navContainer.innerHTML = html;
  } else {
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  // Hamburger toggle
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
  }

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('main-navbar');
    if (navbar) {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });
}

// ============================================================
// FOOTER INJECTION
// ============================================================

function renderFooter() {
  const html = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <!-- Brand -->
          <div class="footer-brand">
            <div class="footer-logo">
              <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="#22C55E"/>
                <text x="20" y="26" text-anchor="middle" font-size="20" fill="white" font-family="Fredoka">K</text>
              </svg>
              <span class="footer-brand-name">Punnagai Toy Store</span>
            </div>
            <p class="footer-tagline">Bringing joy and wonder to children across Mylapore and beyond. Quality toys for every age, every imagination.</p>
            <div class="footer-socials">
              <a href="#" class="social-btn" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" class="social-btn" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://wa.me/916381801640" class="social-btn" aria-label="WhatsApp" target="_blank">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              </a>
            </div>
          </div>

          <!-- Quick Links -->
          <div>
            <h4 class="footer-col-title">Quick Links</h4>
            <ul class="footer-links">
              <li><a href="index.html">Home</a></li>
              <li><a href="shop.html">All Toys</a></li>
              <li><a href="shop.html?sale=true">Sale & Offers</a></li>
              <li><a href="shop.html?ageGroup=0-2">Baby Toys (0–2)</a></li>
              <li><a href="shop.html?ageGroup=3-5">Toddler Toys (3–5)</a></li>
              <li><a href="shop.html?ageGroup=6-8">Kids Toys (6–8)</a></li>
            </ul>
          </div>

          <!-- Categories -->
          <div>
            <h4 class="footer-col-title">Shop by Category</h4>
            <ul class="footer-links">
              <li><a href="shop.html?category=Educational+%26+Learning">Educational</a></li>
              <li><a href="shop.html?category=Building+Blocks">Building Blocks</a></li>
              <li><a href="shop.html?category=Board+Games+%26+Puzzles">Board Games</a></li>
              <li><a href="shop.html?category=Outdoor+%26+Sports">Outdoor & Sports</a></li>
              <li><a href="shop.html?category=Arts+%26+Crafts">Arts & Crafts</a></li>
              <li><a href="shop.html?category=Remote+Control">Remote Control</a></li>
            </ul>
          </div>

          <!-- Contact & Policies -->
          <div>
            <h4 class="footer-col-title">Help & Info</h4>
            <ul class="footer-links">
              <li><a href="privacy.html">Privacy & Cookies</a></li>
              <li><a href="terms.html">Terms & Conditions</a></li>
              <li><a href="sale-terms.html">Sale Terms</a></li>
              <li><a href="delivery.html">Delivery Policy</a></li>
              <li><a href="returns.html">Returns & Refunds</a></li>
              <li><a href="payments.html">Fees & Payment</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-contact-strip">
          <div class="footer-contact-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>[STORE-ADDRESS-PLACEHOLDER], Mylapore, Chennai – 600 004</span>
          </div>
          <div class="footer-contact-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
            <span>[PHONE-PLACEHOLDER]</span>
          </div>
          <div class="footer-contact-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Mon–Sat 10AM–10PM &nbsp;|&nbsp; Sun 11AM–6PM</span>
          </div>
        </div>

        <div class="footer-bottom">
          <p>© 2025 Punnagai Toy Store, Mylapore, Chennai. All rights reserved.</p>
          <div class="footer-bottom-links">
            <a href="privacy.html">Privacy</a>
            <a href="terms.html">Terms</a>
            <a href="returns.html">Refunds</a>
          </div>
        </div>
      </div>
    </footer>
  `;

  const footerContainer = document.getElementById('footer');
  if (footerContainer) {
    footerContainer.innerHTML = html;
  } else {
    document.body.insertAdjacentHTML('beforeend', html);
  }
}

// ============================================================
// PRODUCT CARD RENDERER
// ============================================================

function renderProductCard(product) {
  const isOnSale = product.originalPrice && product.originalPrice > product.price;
  const discount = isOnSale ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const badgeHtml = product.badge ? `<span class="product-badge badge-${product.badge.toLowerCase().replace(' ', '-')}">${product.badge}</span>` : '';

  // Business rule (Req 1.8 / 9.7): out-of-stock items are HIDDEN by callers, so
  // a rendered card is always purchasable. We never render an "Out of Stock"
  // label or overlay.
  return `
    <div class="product-card" data-id="${product.id}" onclick="window.location='product.html?id=${product.id}'">
      <div class="product-card-image">
        <img src="${product.imageUrl || 'https://via.placeholder.com/400x400?text=Toy'}" alt="${product.name}" loading="lazy"/>
        ${badgeHtml}
      </div>
      <div class="product-card-body">
        <p class="product-category">${product.category}</p>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-age">Age: ${product.ageGroup} yrs</p>
        <div class="product-price-row">
          <div class="price-group">
            <span class="product-price">₹${product.price.toLocaleString('en-IN')}</span>
            ${isOnSale ? `<span class="product-original-price">₹${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
          </div>
          ${isOnSale ? `<span class="discount-tag">−${discount}%</span>` : ''}
        </div>
      </div>
      <div class="product-card-footer">
        <button class="btn-cart" onclick="event.stopPropagation(); handleAddToCart('${product.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Add to Cart
        </button>
      </div>
    </div>
  `;
}

// ============================================================
// AVAILABILITY (Req 1.8, 9.7) — hide out-of-stock, no label
// ============================================================
// A product is shown only when it is available. We defer to the shared,
// tested stock-visibility rule in js/lib/inventory-model.js
// (`isVariantVisible`): a product with explicit `variants` is available when
// at least one variant is visible (stock > 0); otherwise we map the legacy
// product-level `inStock` flag onto a pseudo-variant so the SAME rule applies.
function isProductAvailable(product) {
  if (!product) return false;
  const Inv = (typeof window !== 'undefined' && window.PunnagaiInventoryModel)
    ? window.PunnagaiInventoryModel
    : (typeof PunnagaiInventoryModel !== 'undefined' ? PunnagaiInventoryModel : null);

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    if (Inv) return Inv.visibleVariants(product.variants).length > 0;
    return product.variants.some(v => Number(v && v.stock) > 0);
  }

  const pseudoVariant = { stock: product.inStock ? 1 : 0 };
  if (Inv) return Inv.isVariantVisible(pseudoVariant);
  return product.inStock === true;
}

// Keep only products that should be visible to customers.
function filterAvailableProducts(products) {
  return (Array.isArray(products) ? products : []).filter(isProductAvailable);
}

let productCache = {};

async function handleAddToCart(productId) {
  let product = productCache[productId];
  if (!product) {
    product = await getProductById(productId);
    if (product) productCache[productId] = product;
  }
  if (product && isProductAvailable(product)) {
    addToCart(product);
  }
}

// ============================================================
// PAGE INITIALIZERS
// ============================================================

async function initHomePage() {
  renderNavbar('home');
  renderFooter();

  const featuredContainer = document.getElementById('featured-products');
  const newArrivalsContainer = document.getElementById('new-arrivals');

  function renderGrid(products) {
    return `<div class="product-grid">${products.map(p => { productCache[p.id] = p; return renderProductCard(p); }).join('')}</div>`;
  }

  // Source from the cached data layer (Req 1.9) and hide out-of-stock items.
  const allProducts = filterAvailableProducts(await getAllProductsCached());

  if (featuredContainer) {
    const featured = (typeof window.PunnagaiCatalog !== 'undefined'
      ? window.PunnagaiCatalog.applySort(allProducts.filter(p => p.featured === true), 'popularity')
      : allProducts.filter(p => p.featured === true)).slice(0, 4);
    featuredContainer.innerHTML = featured.length
      ? renderGrid(featured)
      : '<p class="text-muted">No featured products available right now.</p>';
  }

  if (newArrivalsContainer) {
    const newest = (typeof window.PunnagaiCatalog !== 'undefined'
      ? window.PunnagaiCatalog.applySort(allProducts, 'newest')
      : allProducts).slice(0, 4);
    newArrivalsContainer.innerHTML = newest.length
      ? renderGrid(newest)
      : '<p class="text-muted">No new arrivals available right now.</p>';
  }

  // Initialize YouTube Player (Req 19)
  if (typeof window.PunnagaiYouTube !== 'undefined') {
    const ytPlayer = new window.PunnagaiYouTube();
    ytPlayer.render();
  }

  // Initialize Floating Reviews (Req 20)
  if (typeof window.PunnagaiFloatingReviews !== 'undefined') {
    window.PunnagaiFloatingReviewsInst = new window.PunnagaiFloatingReviews();
    window.PunnagaiFloatingReviewsInst.loadReviews();
  }
}

async function initShopPage() {
  renderNavbar('shop');
  renderFooter();

  const PAGE_SIZE = 12; // Req 1.7: minimum 12 products per page.
  const Catalog = (typeof window.PunnagaiCatalog !== 'undefined') ? window.PunnagaiCatalog : null;

  // DOM references (markup lives in shop.html).
  const grid = document.getElementById('shop-product-grid');
  const countDisplay = document.getElementById('product-count');
  const emptyState = document.getElementById('shop-empty-state');
  const pagination = document.getElementById('shop-pagination');
  const activeFiltersBar = document.getElementById('active-filters');
  const filterCountBadge = document.getElementById('filter-count-badge');
  const searchInput = document.getElementById('search-input');
  const autocompleteBox = document.getElementById('search-autocomplete');
  const sortSelect = document.getElementById('sort-select');

  // Filter inputs.
  const ageInputs = Array.from(document.querySelectorAll('input[data-age]'));
  const catInputs = Array.from(document.querySelectorAll('input[data-cat]'));
  const priceInputs = Array.from(document.querySelectorAll('input[name="price-range"]'));
  const saleInput = document.querySelector('input[data-sale]');
  const featuredInput = document.querySelector('input[data-featured]');

  // State.
  let allProducts = [];          // available products only (out-of-stock hidden)
  let searchTerm = '';
  let currentSort = sortSelect ? sortSelect.value : 'popularity';
  let currentPage = 1;

  // ---- URL params seed the initial filter state ----
  const urlParams = new URLSearchParams(window.location.search);
  const urlCategory = urlParams.get('category');
  const urlAgeGroup = urlParams.get('ageGroup');
  const urlSale = urlParams.get('sale') === 'true';

  if (urlCategory) {
    const match = catInputs.find(i => i.dataset.cat === urlCategory);
    if (match) match.checked = true;
  }
  if (urlAgeGroup) {
    const match = ageInputs.find(i => i.dataset.age === urlAgeGroup);
    if (match) match.checked = true;
  }
  if (urlSale && saleInput) saleInput.checked = true;

  // ---- Read the current filter selections from the UI ----
  function readFilters() {
    const categories = catInputs.filter(i => i.checked).map(i => i.dataset.cat);
    const ages = ageInputs.filter(i => i.checked).map(i => i.dataset.age);
    const selectedPrice = priceInputs.find(i => i.checked);
    const priceMin = selectedPrice && selectedPrice.dataset.priceMin !== '' ? Number(selectedPrice.dataset.priceMin) : null;
    const priceMax = selectedPrice && selectedPrice.dataset.priceMax !== '' ? Number(selectedPrice.dataset.priceMax) : null;
    return {
      categories,
      ages,
      priceMin,
      priceMax,
      sale: !!(saleInput && saleInput.checked),
      featured: !!(featuredInput && featuredInput.checked)
    };
  }

  // ---- Apply all filters/search/sort using the tested catalog engine ----
  function computeResults(filters) {
    let list = allProducts.slice();

    // Category (multi-select): union of per-category subsets via the lib.
    if (filters.categories.length > 0) {
      const seen = new Set();
      const unioned = [];
      filters.categories.forEach(cat => {
        const subset = Catalog ? Catalog.filterProductsByCategory(list, cat) : list.filter(p => p.category === cat);
        subset.forEach(p => {
          if (!seen.has(p.id)) { seen.add(p.id); unioned.push(p); }
        });
      });
      list = unioned;
    }

    // Age group (multi-select).
    if (filters.ages.length > 0) {
      list = list.filter(p => filters.ages.includes(p.ageGroup));
    }

    // Price range (single preset) via the lib's combined filter.
    if (filters.priceMin !== null || filters.priceMax !== null) {
      const f = {};
      if (filters.priceMin !== null) f.priceMin = filters.priceMin;
      if (filters.priceMax !== null) f.priceMax = filters.priceMax;
      list = Catalog ? Catalog.applyFilters(list, f) : list.filter(p => {
        const okMin = filters.priceMin === null || p.price >= filters.priceMin;
        const okMax = filters.priceMax === null || p.price <= filters.priceMax;
        return okMin && okMax;
      });
    }

    // Offers.
    if (filters.sale) list = list.filter(p => p.originalPrice && p.originalPrice > p.price);
    if (filters.featured) list = list.filter(p => p.featured === true);

    // Search (name/description) via the lib.
    if (searchTerm.trim() !== '') {
      list = Catalog ? Catalog.searchProducts(list, searchTerm) : list.filter(p =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Sort via the lib.
    list = Catalog ? Catalog.applySort(list, currentSort) : list;

    return list;
  }

  // ---- Active-filter chips + count badge ----
  function renderActiveFilters(filters) {
    if (!activeFiltersBar) return;
    const chips = [];
    filters.categories.forEach(c => chips.push({ type: 'cat', value: c, label: c }));
    filters.ages.forEach(a => chips.push({ type: 'age', value: a, label: 'Age ' + a }));
    if (filters.priceMin !== null || filters.priceMax !== null) {
      const sel = priceInputs.find(i => i.checked);
      const label = sel ? sel.parentElement.querySelector('span:last-child').textContent.trim() : 'Price';
      chips.push({ type: 'price', value: '', label });
    }
    if (filters.sale) chips.push({ type: 'sale', value: '', label: 'On Sale' });
    if (filters.featured) chips.push({ type: 'featured', value: '', label: 'Featured' });

    const totalFilters = chips.length;
    if (filterCountBadge) {
      filterCountBadge.textContent = String(totalFilters);
      filterCountBadge.style.display = totalFilters > 0 ? 'inline-flex' : 'none';
    }

    if (totalFilters === 0) {
      activeFiltersBar.style.display = 'none';
      activeFiltersBar.innerHTML = '';
      return;
    }

    activeFiltersBar.style.display = 'flex';
    activeFiltersBar.innerHTML = chips.map(c =>
      `<button type="button" class="filter-chip" data-chip-type="${c.type}" data-chip-value="${String(c.value).replace(/"/g, '&quot;')}">
        ${c.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`
    ).join('') + `<button type="button" class="filter-chip filter-chip-clear" data-chip-type="clear">Clear all</button>`;

    activeFiltersBar.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.dataset.chipType;
        const value = chip.dataset.chipValue;
        if (type === 'clear') { clearAllFilters(); return; }
        if (type === 'cat') { const i = catInputs.find(x => x.dataset.cat === value); if (i) i.checked = false; }
        else if (type === 'age') { const i = ageInputs.find(x => x.dataset.age === value); if (i) i.checked = false; }
        else if (type === 'price') { const def = priceInputs.find(x => x.dataset.priceMin === '' && x.dataset.priceMax === ''); if (def) def.checked = true; }
        else if (type === 'sale' && saleInput) saleInput.checked = false;
        else if (type === 'featured' && featuredInput) featuredInput.checked = false;
        currentPage = 1;
        render();
      });
    });
  }

  // ---- Pagination controls ----
  function renderPagination(totalItems) {
    if (!pagination) return;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    if (totalPages <= 1) {
      pagination.style.display = 'none';
      pagination.innerHTML = '';
      return;
    }
    pagination.style.display = 'flex';
    let html = '';
    html += `<button type="button" class="page-btn page-nav" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`;
    for (let p = 1; p <= totalPages; p++) {
      html += `<button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}" aria-label="Page ${p}" ${p === currentPage ? 'aria-current="page"' : ''}>${p}</button>`;
    }
    html += `<button type="button" class="page-btn page-nav" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">›</button>`;
    pagination.innerHTML = html;

    pagination.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = Number(btn.dataset.page);
        if (!isFinite(target) || target < 1 || target > totalPages || target === currentPage) return;
        currentPage = target;
        render();
        const top = document.querySelector('.shop-toolbar');
        if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ---- Main render ----
  function render() {
    const filters = readFilters();
    const results = computeResults(filters);
    const total = results.length;

    renderActiveFilters(filters);

    // Matching-count display (Req 1.5).
    if (countDisplay) {
      countDisplay.innerHTML = total === 0
        ? 'No products found'
        : `Showing <strong>${total}</strong> ${total === 1 ? 'product' : 'products'}`;
    }

    if (total === 0) {
      grid.innerHTML = '';
      grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      if (pagination) { pagination.style.display = 'none'; pagination.innerHTML = ''; }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    grid.style.display = '';

    // Clamp page to valid range, then slice (pagination — Req 1.7).
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = results.slice(start, start + PAGE_SIZE);

    grid.innerHTML = pageItems.map(p => { productCache[p.id] = p; return renderProductCard(p); }).join('');
    renderPagination(total);
  }

  // ---- Autocomplete: top 5 product suggestions (Req 1.3 helper) ----
  function hideAutocomplete() {
    if (!autocompleteBox) return;
    autocompleteBox.hidden = true;
    autocompleteBox.innerHTML = '';
    if (searchInput) searchInput.setAttribute('aria-expanded', 'false');
  }

  function renderAutocomplete() {
    if (!autocompleteBox) return;
    const term = searchTerm.trim();
    if (term === '') { hideAutocomplete(); return; }
    const matches = (Catalog ? Catalog.searchProducts(allProducts, term) : allProducts).slice(0, 5);
    if (matches.length === 0) { hideAutocomplete(); return; }
    autocompleteBox.innerHTML = matches.map(p =>
      `<li role="option" class="autocomplete-item" data-id="${p.id}">
        <img src="${p.imageUrl || 'https://via.placeholder.com/40x40?text=Toy'}" alt="" loading="lazy">
        <span class="autocomplete-name">${p.name}</span>
        <span class="autocomplete-price">₹${p.price.toLocaleString('en-IN')}</span>
      </li>`
    ).join('');
    autocompleteBox.hidden = false;
    if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
    autocompleteBox.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        window.location = 'product.html?id=' + item.dataset.id;
      });
    });
  }

  // ---- Wire events ----
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      currentPage = 1;
      renderAutocomplete();
      render();
    });
    searchInput.addEventListener('focus', renderAutocomplete);
    searchInput.addEventListener('blur', () => setTimeout(hideAutocomplete, 150));
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      render();
    });
  }

  [...ageInputs, ...catInputs, ...priceInputs, saleInput, featuredInput]
    .filter(Boolean)
    .forEach(input => input.addEventListener('change', () => {
      currentPage = 1;
      render();
    }));

  // Expose a global reset for the inline onclick handlers in shop.html.
  window.clearAllFilters = function () {
    ageInputs.forEach(i => { i.checked = false; });
    catInputs.forEach(i => { i.checked = false; });
    if (saleInput) saleInput.checked = false;
    if (featuredInput) featuredInput.checked = false;
    const defaultPrice = priceInputs.find(i => i.dataset.priceMin === '' && i.dataset.priceMax === '');
    if (defaultPrice) defaultPrice.checked = true;
    if (searchInput) searchInput.value = '';
    searchTerm = '';
    currentPage = 1;
    hideAutocomplete();
    render();
  };

  // ---- Initial load: cached data layer (Req 1.9), out-of-stock hidden ----
  if (grid) grid.innerHTML = '<div class="skeleton-card"></div>'.repeat(8);
  allProducts = filterAvailableProducts(await getAllProductsCached());
  render();
}

let currentProduct = null;
let currentVariantSelection = { size: null, color: null };

async function initProductPage() {
  renderNavbar('shop');
  renderFooter();

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = 'shop.html';
    return;
  }

  const product = await getProductById(productId);
  if (!product) {
    document.getElementById('product-detail-content').innerHTML = '<div class="container section text-center"><h2>Product not found</h2><a href="shop.html" class="btn btn-primary">Back to Shop</a></div>';
    return;
  }

  productCache[product.id] = product;
  currentProduct = product;
  currentVariantSelection = { size: null, color: null };

  if (window.PunnagaiProductDetail && window.PunnagaiProductDetail.hasVariants(product)) {
    const firstVariant = window.PunnagaiProductDetail.getVariants(product)[0];
    if (firstVariant) {
      currentVariantSelection.size = firstVariant.size;
      currentVariantSelection.color = firstVariant.color;
    }
  }

  const breadcrumbName = document.getElementById('breadcrumb-product-name');
  if (breadcrumbName) breadcrumbName.textContent = product.name;

  renderProductDetailsUI();

  const relatedContainer = document.getElementById('related-products-grid');
  if (relatedContainer) {
    let filtered = [];
    if (window.PunnagaiProductDetail) {
      const allProducts = await getAllProductsCached();
      filtered = window.PunnagaiProductDetail.getRelatedProducts(allProducts, product, { limit: 4 });
    } else {
      const related = await getProducts({ category: product.category });
      filtered = related.filter(p => p.id !== product.id).slice(0, 4);
    }
    
    if (filtered.length > 0) {
      document.getElementById('related-section').style.display = 'block';
      relatedContainer.innerHTML = filtered.map(p => { productCache[p.id] = p; return renderProductCard(p); }).join('');
    }
  }
}

function renderProductDetailsUI() {
  const product = currentProduct;
  if (!product) return;

  let displayInfo;
  if (window.PunnagaiProductDetail) {
    displayInfo = window.PunnagaiProductDetail.getDisplayPriceInfo(product, currentVariantSelection);
  } else {
    const isOnSale = product.originalPrice && product.originalPrice > product.price;
    displayInfo = {
      original: product.originalPrice || product.price,
      discounted: product.price,
      hasDiscount: isOnSale,
      stock: { inStock: product.inStock !== false, stock: 1, status: 'in-stock' }
    };
  }

  const discountPct = displayInfo.original > 0 
    ? Math.round((1 - displayInfo.discounted / displayInfo.original) * 100) 
    : 0;

  let selectorsHtml = '';
  if (window.PunnagaiProductDetail && window.PunnagaiProductDetail.hasVariants(product)) {
    const variants = window.PunnagaiProductDetail.getVariants(product);
    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
    const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];

    if (sizes.length > 0) {
      selectorsHtml += `<div class="variant-selector" style="margin-bottom: 12px;">
        <label style="display:block; margin-bottom:4px; font-weight:600; font-size:14px; color:var(--text-secondary)">Size</label>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${sizes.map(sz => `
            <button class="btn ${currentVariantSelection.size === sz ? 'btn-primary' : 'btn-outline'}" 
                    style="padding: 4px 12px; font-size: 14px;"
                    onclick="handleVariantSelect('size', '${sz}')">${sz}</button>
          `).join('')}
        </div>
      </div>`;
    }
    if (colors.length > 0) {
      selectorsHtml += `<div class="variant-selector" style="margin-bottom: 16px;">
        <label style="display:block; margin-bottom:4px; font-weight:600; font-size:14px; color:var(--text-secondary)">Color</label>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${colors.map(col => `
            <button class="btn ${currentVariantSelection.color === col ? 'btn-primary' : 'btn-outline'}" 
                    style="padding: 4px 12px; font-size: 14px;"
                    onclick="handleVariantSelect('color', '${col}')">${col}</button>
          `).join('')}
        </div>
      </div>`;
    }
  }

  const html = `
    <div class="product-detail-layout">
      <div class="product-gallery">
        <div class="main-image-container">
          <img src="${product.imageUrl || 'https://via.placeholder.com/600x600?text=Toy'}" alt="${product.name}" id="main-product-image">
        </div>
      </div>
      <div class="product-info-wrapper">
        <div class="detail-meta">
          <span class="badge">${product.category}</span>
          <span class="badge" style="background:#F3F4F6;color:#374151">Age: ${product.ageGroup} yrs</span>
          ${product.badge ? `<span class="badge" style="background:var(--accent);color:white">${product.badge}</span>` : ''}
        </div>
        <h1 class="detail-title">${product.name}</h1>
        <div class="detail-price-box">
          <div style="display:flex;align-items:center;margin-bottom:8px">
            <span class="detail-current-price">₹${displayInfo.discounted.toLocaleString('en-IN')}</span>
            ${displayInfo.hasDiscount ? `<span class="detail-original-price">₹${displayInfo.original.toLocaleString('en-IN')}</span>` : ''}
          </div>
          ${displayInfo.hasDiscount ? `<div class="discount-tag" style="display:inline-block">You save ${discountPct}%!</div>` : ''}
        </div>
        
        ${selectorsHtml}

        <div class="detail-description">
          <p>${product.description}</p>
        </div>
        
        <div class="add-to-cart-box">
          <div class="qty-selector">
            <button class="qty-btn" onclick="let inp=document.getElementById('detail-qty'); if(inp.value>1)inp.value--">-</button>
            <input type="number" id="detail-qty" class="qty-input" value="1" min="1" max="${displayInfo.stock.inStock ? Math.min(10, displayInfo.stock.stock) : 10}">
            <button class="qty-btn" onclick="let inp=document.getElementById('detail-qty'); let max=parseInt(inp.getAttribute('max'))||10; if(inp.value<max)inp.value++">+</button>
          </div>
          ${displayInfo.stock.inStock 
            ? `<button class="btn btn-primary btn-lg" style="flex-grow:1" onclick="handleDetailAddToCart()">Add to Cart</button>`
            : `<button class="btn btn-disabled btn-lg" style="flex-grow:1" disabled>Out of Stock</button>`
          }
        </div>
        <div style="margin-top:24px;border-top:1px solid var(--border);padding-top:24px;display:flex;flex-direction:column;gap:12px;color:var(--text-secondary)">
          <div class="flex align-center gap-8"><svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Available at Mylapore Store</div>
          <div class="flex align-center gap-8"><svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Safe & Non-toxic Materials</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('product-detail-content').innerHTML = html;
}

window.handleVariantSelect = function(type, value) {
  currentVariantSelection[type] = value;
  renderProductDetailsUI();
};

window.handleDetailAddToCart = function() {
  const qty = parseInt(document.getElementById('detail-qty').value) || 1;
  const product = currentProduct;
  if (!product) return;

  let variant = null;
  if (window.PunnagaiProductDetail) {
    variant = window.PunnagaiProductDetail.resolveVariant(product, currentVariantSelection);
  }
  
  if (typeof addToCart === 'function') {
    addToCart(product, qty, variant);
  }
};

async function initCartPage() {
  renderNavbar('');
  renderFooter();

  // Cart page rendering lives in js/cart.js (renderCartPage), backed by the
  // pure cart-logic + cart-storage libs.
  if (typeof renderCartPage === 'function') {
    renderCartPage();
  }
}

// ============================================================
// WISHLIST PAGE (Req 4.2, 4.8)
// ============================================================
// The wishlist stores only productIds (session-scoped, see js/lib/wishlist.js).
// We resolve those ids against the cached product catalog so the page always
// shows the CURRENT name, image, and price (Req 4.2). Out-of-stock / deleted
// products are skipped so the rendered list stays a subset of available
// products (Req 4 invariant).

function getWishlistApi() {
  if (typeof window !== 'undefined' && window.PunnagaiWishlist) return window.PunnagaiWishlist;
  if (typeof PunnagaiWishlist !== 'undefined') return PunnagaiWishlist;
  return null;
}

function renderWishlistCard(product) {
  const isOnSale = product.originalPrice && product.originalPrice > product.price;
  const discount = isOnSale ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const badgeHtml = product.badge ? `<span class="product-badge badge-${product.badge.toLowerCase().replace(' ', '-')}">${product.badge}</span>` : '';

  return `
    <div class="product-card wishlist-card" data-id="${product.id}">
      <button class="wishlist-remove-btn" type="button" aria-label="Remove from wishlist" onclick="event.stopPropagation(); handleRemoveFromWishlist('${product.id}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="product-card-image" onclick="window.location='product.html?id=${product.id}'">
        <img src="${product.imageUrl || 'https://via.placeholder.com/400x400?text=Toy'}" alt="${product.name}" loading="lazy"/>
        ${badgeHtml}
      </div>
      <div class="product-card-body" onclick="window.location='product.html?id=${product.id}'">
        <p class="product-category">${product.category}</p>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-age">Age: ${product.ageGroup} yrs</p>
        <div class="product-price-row">
          <div class="price-group">
            <span class="product-price">₹${product.price.toLocaleString('en-IN')}</span>
            ${isOnSale ? `<span class="product-original-price">₹${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
          </div>
          ${isOnSale ? `<span class="discount-tag">−${discount}%</span>` : ''}
        </div>
      </div>
      <div class="product-card-footer">
        <button class="btn-cart" onclick="event.stopPropagation(); handleWishlistAddToCart('${product.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Add to Cart
        </button>
      </div>
    </div>
  `;
}

async function renderWishlistPage() {
  const grid = document.getElementById('wishlist-grid');
  const emptyState = document.getElementById('wishlist-empty-state');
  const countDisplay = document.getElementById('wishlist-count');
  const Wishlist = getWishlistApi();

  const entries = Wishlist ? Wishlist.getWishlist() : [];
  const ids = entries.map(e => e.productId);

  // Resolve ids against the available catalog (Req 4.2 — current price/name/image).
  const available = filterAvailableProducts(await getAllProductsCached());
  const byId = {};
  available.forEach(p => { byId[p.id] = p; productCache[p.id] = p; });
  const products = ids.map(id => byId[id]).filter(Boolean);

  if (countDisplay) {
    const n = products.length;
    countDisplay.innerHTML = n === 0
      ? 'No saved toys yet'
      : `${n} saved ${n === 1 ? 'toy' : 'toys'}`;
  }

  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = '';
    grid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  grid.style.display = '';
  grid.innerHTML = products.map(renderWishlistCard).join('');
}

// Quick add-to-cart from the wishlist (Req 4.4 bridge in js/lib/wishlist.js).
window.handleWishlistAddToCart = function (productId) {
  const Wishlist = getWishlistApi();
  if (Wishlist && typeof Wishlist.addWishlistItemToCart === 'function') {
    Wishlist.addWishlistItemToCart(productId, function () {
      return handleAddToCart(productId);
    });
  } else {
    handleAddToCart(productId);
  }
};

// Remove an item and immediately update the display (Req 4.3) + navbar count.
window.handleRemoveFromWishlist = function (productId) {
  const Wishlist = getWishlistApi();
  if (Wishlist) Wishlist.removeFromWishlist(productId);
  if (typeof updateWishlistBadge === 'function') updateWishlistBadge();
  if (typeof showToast === 'function') showToast('Removed from wishlist', 'info');
  renderWishlistPage();
};

async function initWishlistPage() {
  renderNavbar('wishlist');
  renderFooter();
  if (typeof updateWishlistBadge === 'function') updateWishlistBadge();
  await renderWishlistPage();
}

// Router dispatcher based on filename
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
    if(typeof initHomePage === 'function') initHomePage();
  } else if (path.includes('shop.html')) {
    if(typeof initShopPage === 'function') initShopPage();
  } else if (path.includes('product.html')) {
    if(typeof initProductPage === 'function') initProductPage();
  } else if (path.includes('cart.html')) {
    if(typeof initCartPage === 'function') initCartPage();
  } else if (path.includes('wishlist.html')) {
    if(typeof initWishlistPage === 'function') initWishlistPage();
  } else if (path.includes('privacy.html') || path.includes('terms.html') || path.includes('returns.html')) {
    renderNavbar('');
    renderFooter();
  }

  // Keep the navbar wishlist count in sync once the page is ready (Req 4.8).
  if (typeof updateWishlistBadge === 'function') {
    updateWishlistBadge();
  }

  // Show Offline Mode Warning
  if (window.USE_LOCAL_MODE && typeof showToast === 'function') {
    setTimeout(() => {
      showToast('⚠️ Running in Local/Offline Mode (Data not synced to cloud)', 'info');
    }, 1000);
  }
});
