/**
 * app.js — Shared components and page-specific logic
 * Handles: Navbar, Footer, Toast notifications, Product rendering
 */

// ============================================================
// HTML ESCAPE UTILITY
// ============================================================

if (!window.escapeHtml) {
  window.escapeHtml = function (str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
}
var escapeHtml = window.escapeHtml;

// ============================================================
// STORE SETTINGS / CONTACT DETAILS
// ============================================================

const DEFAULT_STORE_SETTINGS = {
  phonePrimary: '+91 75501 32101',
  phoneSecondary: '+91 72994 61657',
  whatsappNumber: '917550132101',
  storeEmail: 'contact@punnagaitoysfancy.in',
  upiId: 'MAB0451035A0089284@Yesbank',
  storeAddress: '4/7 Luz Bazar Complex, R.K. Mutt Road, Mylapore, Chennai – 600 004',
  youtubeChannel: 'https://www.youtube.com/@PunnagaiRahim',
  instagramUrl: 'https://www.instagram.com/punnagaitoys.fancy/',
  facebookUrl: 'https://www.facebook.com/punnagaitoys/'
};

function getStoreSettings() {
  try {
    const saved = localStorage.getItem('punnagai_store_settings');
    if (saved) {
      return { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {}
  return { ...DEFAULT_STORE_SETTINGS };
}

function saveStoreSettings(settings) {
  try {
    const merged = { ...DEFAULT_STORE_SETTINGS, ...settings };
    localStorage.setItem('punnagai_store_settings', JSON.stringify(merged));
    if (typeof window !== 'undefined' && !window.USE_LOCAL_MODE && window.db) {
      window.db
        .collection('settings')
        .doc('store_info')
        .set(merged, { merge: true })
        .catch(console.error);
    }
    return merged;
  } catch (e) {
    console.error('Error saving store settings:', e);
    return DEFAULT_STORE_SETTINGS;
  }
}

function updateStoreContactLinks() {
  const settings = getStoreSettings();
  const cleanWa = (settings.whatsappNumber || '917550132101').replace(/\D/g, '');
  if (typeof document !== 'undefined') {
    document.querySelectorAll('a[href*="wa.me"]').forEach((link) => {
      try {
        const url = new URL(link.href);
        const textParam = url.searchParams.get('text');
        link.href = `https://wa.me/${cleanWa}${textParam ? `?text=${encodeURIComponent(textParam)}` : ''}`;
      } catch (e) {
        link.href = `https://wa.me/${cleanWa}`;
      }
    });
  }
}

async function syncStoreSettingsFromFirestore() {
  if (
    typeof window !== 'undefined' &&
    !window.USE_LOCAL_MODE &&
    window.db &&
    typeof window.db.collection === 'function'
  ) {
    try {
      const doc = await window.db.collection('settings').doc('store_info').get();
      if (doc && doc.exists && doc.data()) {
        const remote = doc.data();
        const merged = { ...DEFAULT_STORE_SETTINGS, ...remote };
        localStorage.setItem('punnagai_store_settings', JSON.stringify(merged));
        updateStoreContactLinks();
      }
    } catch (err) {
      console.warn(
        '[settings] Firestore settings fetch failed, using local settings:',
        err.message
      );
    }
  }
}

// Automatically sync settings on DOM ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateStoreContactLinks();
      syncStoreSettingsFromFirestore();
    });
  } else {
    updateStoreContactLinks();
    syncStoreSettingsFromFirestore();
  }
}

window.PunnagaiSettings = {
  get: getStoreSettings,
  save: saveStoreSettings,
  sync: syncStoreSettingsFromFirestore,
  updateLinks: updateStoreContactLinks,
  defaults: DEFAULT_STORE_SETTINGS
};

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = 'success', options = {}) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} ${options.image ? 'toast-with-media' : ''}`;

  let mediaHtml = '';
  if (options.image) {
    mediaHtml = `<img src="${options.image}" alt="" class="toast-media-img" onerror="this.src='logo.png'">`;
  } else {
    const icon =
      type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠️' : 'ℹ';
    mediaHtml = `<span class="toast-icon">${icon}</span>`;
  }

  let actionHtml = '';
  if (options.actionUrl && options.actionText) {
    actionHtml = `<a href="${options.actionUrl}" class="toast-action-btn">${options.actionText} →</a>`;
  }

  toast.innerHTML = `
    <div class="toast-content-wrapper">
      ${mediaHtml}
      <div class="toast-text-group">
        <span class="toast-msg">${escapeHtml(message)}</span>
      </div>
      ${actionHtml}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 350);
  }, 3600);
}

// ============================================================
// NAVBAR & MOBILE APP BOTTOM NAVIGATION INJECTION
// ============================================================

function getWishlistCount() {
  const Wishlist =
    typeof window !== 'undefined' && window.PunnagaiWishlist
      ? window.PunnagaiWishlist
      : typeof PunnagaiWishlist !== 'undefined'
        ? PunnagaiWishlist
        : null;
  return Wishlist ? Wishlist.getWishlistCount() : 0;
}

function updateWishlistBadge() {
  const count = getWishlistCount();
  const badges = document.querySelectorAll('.wishlist-badge, .bottom-nav-wishlist-badge');
  badges.forEach((badge) => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
  const mobileBadges = document.querySelectorAll('.wishlist-badge-mobile');
  mobileBadges.forEach((badge) => {
    badge.textContent = count;
  });

  // Micro-interaction: Playful wishlist pop
  const wishlistButtons = document.querySelectorAll(
    '.wishlist-btn, .bottom-nav-item[href="wishlist.html"]'
  );
  if (wishlistButtons.length > 0) {
    wishlistButtons.forEach((btn) => btn.classList.remove('wishlist-burst'));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wishlistButtons.forEach((btn) => btn.classList.add('wishlist-burst'));
      });
    });
  }
}

function renderMobileBottomNav(activePage = '') {
  let existing = document.getElementById('mobile-bottom-nav');
  if (existing) existing.remove();

  const cartCount = typeof getCartCount === 'function' ? getCartCount() : 0;
  const wishlistCount = typeof getWishlistCount === 'function' ? getWishlistCount() : 0;

  const bottomNavHtml = `
    <nav class="mobile-bottom-nav" id="mobile-bottom-nav" aria-label="Quick Mobile Navigation">
      <a href="index.html" class="bottom-nav-item ${activePage === 'home' ? 'active' : ''}">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Home</span>
      </a>
      <a href="shop.html" class="bottom-nav-item ${activePage === 'shop' ? 'active' : ''}">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
          <path d="M3 6h18"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <span>Shop</span>
      </a>
      <button type="button" class="bottom-nav-item bottom-nav-search-trigger" id="bottom-nav-search-btn" aria-label="Search toys">
        <div class="bottom-nav-search-bubble">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <span>Search</span>
      </button>
      <a href="wishlist.html" class="bottom-nav-item ${activePage === 'wishlist' ? 'active' : ''}">
        <div class="bottom-nav-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span class="bottom-nav-wishlist-badge" style="display:${wishlistCount > 0 ? 'flex' : 'none'}">${wishlistCount}</span>
        </div>
        <span>Wishlist</span>
      </a>
      <a href="cart.html" class="bottom-nav-item ${activePage === 'cart' ? 'active' : ''}">
        <div class="bottom-nav-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span class="bottom-nav-cart-badge" style="display:${cartCount > 0 ? 'flex' : 'none'}">${cartCount}</span>
        </div>
        <span>Cart</span>
      </a>
    </nav>
  `;

  document.body.insertAdjacentHTML('beforeend', bottomNavHtml);

  const searchBtn = document.getElementById('bottom-nav-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.openGlobalSearch === 'function') {
        window.openGlobalSearch();
      }
    });
  }

  // Initialize auto-hide on fast downscroll (reveals on upscroll)
  initMobileNavAutoHide();
}

/**
 * Mobile Bottom Nav Auto-Hide: Hides the fixed bottom nav bar on fast downscroll
 * liberating ~60px of screen real-estate for product cards, and immediately
 * restores it on upward scroll or near top/bottom boundaries.
 */
function initMobileNavAutoHide() {
  const bottomNav = document.getElementById('mobile-bottom-nav');
  if (!bottomNav) return;

  if (window._mobileNavScrollHandler) {
    window.removeEventListener('scroll', window._mobileNavScrollHandler);
  }

  let lastScrollY = window.scrollY || window.pageYOffset || 0;
  let ticking = false;
  let accumulatedDown = 0;
  let accumulatedUp = 0;
  const HIDE_THRESHOLD = 18; // Downscroll distance threshold
  const SHOW_THRESHOLD = 10; // Upscroll distance threshold

  window._mobileNavScrollHandler = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      const currentScrollY = window.scrollY || window.pageYOffset || 0;

      // Never hide on desktop screens (>768px)
      if (window.innerWidth > 768) {
        bottomNav.classList.remove('nav-hidden');
        document.body.classList.remove('mobile-nav-hidden');
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      // Always show near top of page (safeguard against iOS rubber-band bounce)
      if (currentScrollY < 60) {
        bottomNav.classList.remove('nav-hidden');
        document.body.classList.remove('mobile-nav-hidden');
        accumulatedDown = 0;
        accumulatedUp = 0;
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      // Always show near the very bottom of the document so footer links are accessible
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      if (currentScrollY + winHeight >= docHeight - 40) {
        bottomNav.classList.remove('nav-hidden');
        document.body.classList.remove('mobile-nav-hidden');
        accumulatedDown = 0;
        accumulatedUp = 0;
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      const delta = currentScrollY - lastScrollY;

      if (delta > 0) {
        // Fast downscroll: user is actively browsing down catalog/content
        accumulatedDown += delta;
        accumulatedUp = 0;
        if (accumulatedDown >= HIDE_THRESHOLD && currentScrollY > 70) {
          bottomNav.classList.add('nav-hidden');
          document.body.classList.add('mobile-nav-hidden');
        }
      } else if (delta < 0) {
        // Upscroll: user wants to navigate or go back up
        accumulatedUp += Math.abs(delta);
        accumulatedDown = 0;
        if (accumulatedUp >= SHOW_THRESHOLD) {
          bottomNav.classList.remove('nav-hidden');
          document.body.classList.remove('mobile-nav-hidden');
        }
      }

      lastScrollY = currentScrollY;
      ticking = false;
    });
  };

  window.addEventListener('scroll', window._mobileNavScrollHandler, { passive: true });
}

function renderNavbar(activePage = '') {
  const cartCount = typeof getCartCount === 'function' ? getCartCount() : 0;
  const wishlistCount = typeof getWishlistCount === 'function' ? getWishlistCount() : 0;
  const pages = [
    { href: 'index.html', label: 'Home', id: 'home' },
    { href: 'shop.html', label: 'Shop', id: 'shop' },
    { href: 'shop.html?sale=true', label: 'Sale', id: 'sale' },
    { href: 'index.html#contact', label: 'Contact', id: 'contact' }
  ];

  const navLinks = pages
    .map(
      (p) =>
        `<li><a href="${p.href}" class="nav-link ${activePage === p.id ? 'active' : ''}">${p.label}${
          p.id === 'sale'
            ? ' <span style="font-size:0.68rem;background:linear-gradient(135deg,#EF4444,#DC2626);color:white;padding:2px 7px;border-radius:99px;font-weight:800;letter-spacing:0.03em;vertical-align:middle">HOT</span>'
            : ''
        }</a></li>`
    )
    .join('');

  const html = `
    <nav class="navbar" id="main-navbar">
      <div class="container">
        <div class="navbar-inner">
          <a href="index.html" class="navbar-logo" aria-label="Punnagai Toys Home">
            <img src="logo.png" alt="Punnagai Toys Logo">
            <div class="logo-text-group">
              <span class="logo-text">Punnagai</span>
              <span class="logo-sub">Toys</span>
            </div>
          </a>

          <div class="navbar-search" onclick="if(typeof openGlobalSearch==='function')openGlobalSearch();" role="button" tabindex="0" aria-label="Search 500+ toys" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();if(typeof openGlobalSearch==='function')openGlobalSearch();}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <span class="navbar-search-text">Search 500+ toys, games, puzzles...</span>
            <span class="navbar-search-kbd">Ctrl+K</span>
          </div>

          <ul class="navbar-links" id="nav-links">
            ${navLinks}
          </ul>

          <div class="navbar-actions">
            <a href="wishlist.html" class="wishlist-btn ${activePage === 'wishlist' ? 'active' : ''}" aria-label="Wishlist">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span class="wishlist-badge" style="display:${wishlistCount > 0 ? 'flex' : 'none'}">${wishlistCount}</span>
            </a>
            <button class="search-trigger-btn" id="global-search-btn" aria-label="Search toys" onclick="openGlobalSearch()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <a href="cart.html" class="cart-btn" aria-label="Shopping Cart">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span class="cart-badge" style="display:${cartCount > 0 ? 'flex' : 'none'}">${cartCount}</span>
            </a>
            <button class="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="navbar-subnav" aria-label="Popular Categories">
          <div class="navbar-categories">
            <a href="shop.html" class="subnav-chip">All Toys</a>
            <a href="shop.html?category=Educational+%26+Learning" class="subnav-chip">🧠 Educational</a>
            <a href="shop.html?category=Building+Blocks" class="subnav-chip">🧱 Building Blocks</a>
            <a href="shop.html?category=Board+Games+%26+Puzzles" class="subnav-chip">♟️ Board Games</a>
            <a href="shop.html?category=Remote+Control" class="subnav-chip">🚗 Remote Control</a>
            <a href="shop.html?category=Soft+Toys+%26+Plush" class="subnav-chip">🧸 Soft Plush</a>
            <a href="shop.html?category=Musical+Toys" class="subnav-chip">🎵 Musical Toys</a>
            <a href="shop.html?category=Action+%26+Adventure" class="subnav-chip">⚡ Action Toys</a>
            <a href="shop.html?category=Dolls+%26+Fashion" class="subnav-chip">👑 Dolls &amp; Pretend</a>
            <a href="shop.html?category=Outdoor+%26+Sports" class="subnav-chip">⚽ Outdoor</a>
            <a href="shop.html?category=Special+Editions+%26+Gifts" class="subnav-chip">🎁 Gifts &amp; Vouchers</a>
            <a href="shop.html?sale=true" class="subnav-chip subnav-chip-sale">🔥 Deals &amp; Offers</a>
          </div>
        </div>

        <div class="mobile-menu-backdrop" id="mobile-menu-backdrop"></div>
        <div class="mobile-menu" id="mobile-menu">
          <div class="mobile-menu-header">
            <span class="mobile-menu-title">🧸 Browse Punnagai</span>
            <button type="button" class="mobile-menu-close" id="mobile-menu-close" aria-label="Close menu">✕</button>
          </div>
          <div class="mobile-menu-links">
            ${pages.map((p) => `<a href="${p.href}" class="mobile-nav-link ${activePage === p.id ? 'active' : ''}">${p.label}</a>`).join('')}
            <div class="mobile-menu-divider" style="height:1px;background:var(--border,#e2e8f0);margin:8px 0;"></div>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-secondary,#64748b);padding:4px 16px;">Product Menus</span>
            <a href="shop.html?category=Educational+%26+Learning" class="mobile-nav-link">🧠 Educational Toys</a>
            <a href="shop.html?category=Board+Games+%26+Puzzles" class="mobile-nav-link">🎲 Board Games &amp; Puzzles</a>
            <a href="shop.html?category=Remote+Control" class="mobile-nav-link">🚗 Remote Control Cars &amp; Jets</a>
            <a href="shop.html?category=Soft+Toys+%26+Plush" class="mobile-nav-link">🧸 Soft Toys &amp; Plush</a>
            <a href="shop.html?category=Musical+Toys" class="mobile-nav-link">🎵 Musical &amp; Sensory Toys</a>
            <a href="shop.html?category=Action+%26+Adventure" class="mobile-nav-link">⚡ Action &amp; Adventure</a>
            <a href="shop.html?category=Dolls+%26+Fashion" class="mobile-nav-link">👑 Dolls &amp; Pretend Play</a>
            <a href="shop.html?category=Outdoor+%26+Sports" class="mobile-nav-link">⚽ Outdoor &amp; Sports</a>
            <a href="shop.html?category=Special+Editions+%26+Gifts" class="mobile-nav-link">🎁 Special Editions &amp; Gifts</a>
            <div class="mobile-menu-divider" style="height:1px;background:var(--border,#e2e8f0);margin:8px 0;"></div>
            <a href="wishlist.html" class="mobile-nav-link ${activePage === 'wishlist' ? 'active' : ''}">Wishlist (<span class="wishlist-badge-mobile">${wishlistCount}</span>)</a>
            <a href="cart.html" class="mobile-nav-link ${activePage === 'cart' ? 'active' : ''}">Cart (<span class="cart-badge-mobile">${cartCount}</span>)</a>
            <a href="account.html" class="mobile-nav-link ${activePage === 'account' ? 'active' : ''}">My Account</a>
          </div>
          <div class="mobile-menu-footer">
            <a href="https://wa.me/917550132101?text=Hi! I have a question about toys at Punnagai." class="btn btn-whatsapp-subtle" target="_blank" rel="noopener">
              <span>💬 Chat with Store Owner</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  `;

  const navContainer = document.getElementById('navbar');
  if (navContainer) {
    navContainer.outerHTML = html.replace('id="main-navbar"', 'id="navbar"');
  } else {
    document.body.insertAdjacentHTML('afterbegin', html.replace('id="main-navbar"', 'id="navbar"'));
  }

  // Hamburger toggle with backdrop and close button
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileBackdrop = document.getElementById('mobile-menu-backdrop');
  const mobileCloseBtn = document.getElementById('mobile-menu-close');

  const closeMenu = () => {
    if (mobileMenu) mobileMenu.classList.remove('open');
    if (mobileBackdrop) mobileBackdrop.classList.remove('active');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-menu-locked');
  };

  const openMenu = () => {
    if (mobileMenu) mobileMenu.classList.add('open');
    if (mobileBackdrop) mobileBackdrop.classList.add('active');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-menu-locked');
  };

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('open');
      if (isOpen) closeMenu();
      else openMenu();
    });
  }

  if (mobileBackdrop) {
    mobileBackdrop.addEventListener('click', closeMenu);
  }

  if (mobileCloseBtn) {
    mobileCloseBtn.addEventListener('click', closeMenu);
  }

  // High-performance passive throttled navbar scroll listener (Deep scroll slim header)
  if (!window._navbarScrollListenerAttached) {
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const isScrolled = window.scrollY > 40;
            const navWrapper = document.getElementById('navbar');
            const mainNav = document.getElementById('main-navbar');
            if (navWrapper) {
              navWrapper.classList.toggle('scrolled', isScrolled);
              navWrapper.classList.toggle('navbar-slim', isScrolled);
            }
            if (mainNav) {
              mainNav.classList.toggle('scrolled', isScrolled);
              mainNav.classList.toggle('navbar-slim', isScrolled);
            }
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
    window._navbarScrollListenerAttached = true;
  }

  // Inject Mobile Bottom App Navigation
  renderMobileBottomNav(activePage);
}

// ============================================================
// FOOTER INJECTION
// ============================================================

function renderFooter() {
  const settings = window.PunnagaiSettings
    ? window.PunnagaiSettings.get()
    : {
        phonePrimary: '+91 75501 32101',
        phoneSecondary: '+91 72994 61657',
        whatsappNumber: '917550132101',
        storeAddress: '4/7 Luz Bazar Complex, R.K. Mutt Road, Mylapore, Chennai – 600 004'
      };
  const cleanWa = (settings.whatsappNumber || '917550132101').replace(/\D/g, '');
  const ytUrl = settings.youtubeChannel || 'https://www.youtube.com/@PunnagaiRahim';
  const instaUrl = settings.instagramUrl || 'https://www.instagram.com/punnagaitoys.fancy/';
  const fbUrl = settings.facebookUrl || 'https://www.facebook.com/punnagaitoys/';

  const html = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <!-- Brand -->
          <div class="footer-brand">
            <div class="footer-logo">
              <img src="logo.png" alt="Punnagai Toys Logo">
              <span class="footer-brand-name">Punnagai Toys</span>
            </div>
            <p class="footer-tagline">Bringing joy and wonder to children across Mylapore and beyond. Quality toys for every age, every imagination.</p>
            <div class="footer-socials">
              <a href="${escapeHtml(ytUrl)}" class="social-btn social-youtube" aria-label="YouTube Channel" target="_blank" rel="noopener">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="${escapeHtml(instaUrl)}" class="social-btn social-instagram" aria-label="Instagram" target="_blank" rel="noopener">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="${escapeHtml(fbUrl)}" class="social-btn social-facebook" aria-label="Facebook" target="_blank" rel="noopener">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://wa.me/${cleanWa}" class="social-btn social-whatsapp" aria-label="WhatsApp" target="_blank" rel="noopener">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              </a>
            </div>
          </div>

          <!-- Quick Links -->
          <div>
            <h4 class="footer-col-title">Quick Links</h4>
            <ul class="footer-links">
              <li><a href="index.html">Home</a></li>
              <li><a href="shop.html">All Toys</a></li>
              <li><a href="shop.html?sale=true">Sale &amp; Offers</a></li>
              <li><a href="shop.html?ageGroup=0-2">Baby Toys (0–2)</a></li>
              <li><a href="shop.html?ageGroup=3-5">Toddler Toys (3–5)</a></li>
              <li><a href="shop.html?ageGroup=6-8">Kids Toys (6–8)</a></li>
            </ul>
          </div>

          <!-- Categories -->
          <div>
            <h4 class="footer-col-title">Categories</h4>
            <ul class="footer-links">
              <li><a href="shop.html?category=Educational+%26+Learning">Educational</a></li>
              <li><a href="shop.html?category=Building+Blocks">Building Blocks</a></li>
              <li><a href="shop.html?category=Board+Games+%26+Puzzles">Board Games</a></li>
              <li><a href="shop.html?category=Outdoor+%26+Sports">Outdoor &amp; Sports</a></li>
              <li><a href="shop.html?category=Arts+%26+Crafts">Arts &amp; Crafts</a></li>
              <li><a href="shop.html?category=Remote+Control">Remote Control</a></li>
            </ul>
          </div>

          <!-- Help -->
          <div>
            <h4 class="footer-col-title">Help &amp; Info</h4>
            <ul class="footer-links">
              <li><a href="privacy.html">Privacy &amp; Cookies</a></li>
              <li><a href="terms.html">Terms &amp; Conditions</a></li>
              <li><a href="delivery.html">Store Pickup Policy</a></li>
              <li><a href="returns.html">Returns &amp; Refunds</a></li>
              <li><a href="payments.html">UPI &amp; Payment Policy</a></li>
              <li><a href="admin.html" style="color:rgba(255,255,255,0.25);font-size:0.75rem">Admin</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-contact-strip">
          <div class="footer-contact-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${escapeHtml(settings.storeAddress)}</span>
          </div>
          <div class="footer-contact-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
            <span>${escapeHtml(settings.phonePrimary)} / ${escapeHtml(settings.phoneSecondary)}</span>
          </div>
          <div class="footer-contact-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Mon–Sat 10AM–10PM &nbsp;|&nbsp; Sun 11AM–6PM</span>
          </div>
        </div>

        <div class="footer-bottom">
          <p>&copy; ${new Date().getFullYear()} Punnagai Toy Store, Mylapore, Chennai. All rights reserved.</p>
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
// GLOBAL SEARCH OVERLAY
// ============================================================

function renderSearchOverlay() {
  if (document.getElementById('global-search-overlay')) return;
  const el = document.createElement('div');
  el.id = 'global-search-overlay';
  el.className = 'search-overlay';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Search toys');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="search-overlay-box" id="search-overlay-box">
      <div class="search-overlay-input-row">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input id="global-search-input" class="search-overlay-input" type="text"
               placeholder="Search for toys, categories…"
               autocomplete="off" aria-label="Search toys" role="combobox"
               aria-expanded="false" aria-controls="global-search-results"/>
        <button class="search-overlay-close" onclick="closeGlobalSearch()" aria-label="Close search" title="Close">✕</button>
      </div>
      <div id="global-search-results" class="search-overlay-results" role="listbox"></div>
    </div>`;
  // Close on backdrop click
  el.addEventListener('click', (e) => {
    if (e.target === el) closeGlobalSearch();
  });
  document.body.appendChild(el);
}

let _searchTriggerEl = null;

window.openGlobalSearch = function () {
  _searchTriggerEl = document.activeElement;
  renderSearchOverlay();
  const overlay = document.getElementById('global-search-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const inp = document.getElementById('global-search-input');
  if (inp) {
    inp.value = '';
    inp.focus();
  }
  initGlobalSearch();
};

window.closeGlobalSearch = function () {
  const overlay = document.getElementById('global-search-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  if (_searchTriggerEl && typeof _searchTriggerEl.focus === 'function') {
    _searchTriggerEl.focus();
  }
};

function initGlobalSearch() {
  const overlay = document.getElementById('global-search-overlay');
  const inp = document.getElementById('global-search-input');
  const resultsBox = document.getElementById('global-search-results');
  if (!inp || !resultsBox) return;
  if (inp._searchInited) return; // avoid double-binding
  inp._searchInited = true;

  const catEmoji = {
    'Educational & Learning': '📚',
    'Building Blocks': '🧱',
    'Board Games & Puzzles': '♟️',
    'Outdoor & Sports': '⚽',
    'Arts & Crafts': '🎨',
    'Remote Control': '🚗',
    'Dolls & Fashion': '🪆',
    'Soft Toys & Plush': '🧸',
    'Musical Toys': '🎵',
    'Action & Adventure': '⚡'
  };

  let debounceTimer;
  inp.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const term = inp.value.trim();
      if (!term) {
        resultsBox.innerHTML = '';
        inp.setAttribute('aria-expanded', 'false');
        return;
      }

      const allProducts = await (typeof getAllProductsCached === 'function'
        ? getAllProductsCached()
        : Promise.resolve([]));
      const available = filterAvailableProducts(allProducts);

      // Fuzzy match: score by position of term in name/category/description
      const lower = term.toLowerCase();
      const matches = available
        .map((p) => {
          const haystack = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
          const score = haystack.indexOf(lower);
          return score >= 0 ? { p, score } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score)
        .slice(0, 6)
        .map((x) => x.p);

      if (!matches.length) {
        resultsBox.innerHTML = `<div class="search-overlay-empty">No toys found for "${window.escapeHtml(term)}" — try a different word.</div>`;
        inp.setAttribute('aria-expanded', 'false');
        return;
      }

      const items = matches
        .map((p) => {
          const emoji = catEmoji[p.category] || '🎁';
          const imgEl = p.imageUrl
            ? `<img src="${p.imageUrl}" alt="" loading="lazy" class="search-result-img" onerror="this.style.display='none'">`
            : `<div class="search-result-img-placeholder">${emoji}</div>`;
          return `<a href="product.html?id=${p.id}" class="search-result-item" role="option" tabindex="-1" onclick="closeGlobalSearch()">
          ${imgEl}
          <div class="search-result-info">
            <div class="search-result-name">${window.escapeHtml(p.name)}</div>
            <div class="search-result-cat">${window.escapeHtml(p.category)}</div>
          </div>
          <span class="search-result-price">&#8377;${p.price.toLocaleString('en-IN')}</span>
        </a>`;
        })
        .join('');

      const footer = `<div class="search-results-footer"><a href="shop.html?search=${encodeURIComponent(term)}" role="option" tabindex="-1" onclick="closeGlobalSearch()">See all results for "${window.escapeHtml(term)}" →</a></div>`;
      resultsBox.innerHTML = items + footer;
      inp.setAttribute('aria-expanded', 'true');
    }, 220);
  });

  // Keyboard navigation & search trigger
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeGlobalSearch();
    } else if (e.key === 'Enter') {
      const term = inp.value.trim();
      if (term) {
        closeGlobalSearch();
        window.location = 'shop.html?search=' + encodeURIComponent(term);
      }
    } else if (e.key === 'ArrowDown') {
      const firstItem = resultsBox.querySelector('.search-result-item, .search-results-footer a');
      if (firstItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }
  });

  // Navigate through options with ArrowDown / ArrowUp
  resultsBox.addEventListener('keydown', (e) => {
    const items = Array.from(
      resultsBox.querySelectorAll('.search-result-item, .search-results-footer a')
    );
    const currentIndex = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentIndex < items.length - 1) {
        items[currentIndex + 1].focus();
      } else {
        items[0].focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex > 0) {
        items[currentIndex - 1].focus();
      } else {
        inp.focus();
      }
    } else if (e.key === 'Escape') {
      closeGlobalSearch();
    }
  });

  // Focus trap inside search overlay
  if (overlay) {
    overlay.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(
        overlay.querySelectorAll('input, button, a[href], [tabindex]:not([tabindex="-1"])')
      ).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }
}

// Global keyboard shortcuts (Ctrl+K to open, Escape to close)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeGlobalSearch();
  } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    const overlay = document.getElementById('global-search-overlay');
    if (overlay && overlay.classList.contains('open')) {
      closeGlobalSearch();
    } else if (typeof window.openGlobalSearch === 'function') {
      window.openGlobalSearch();
    }
  }
});

function getProductStockLevel(product) {
  if (!product) return null;
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.reduce((sum, v) => {
      const s = Number(v && v.stock);
      return sum + (Number.isFinite(s) && s > 0 ? Math.floor(s) : 0);
    }, 0);
  }
  return product.inStock ? null : 0; // null = in stock but count unknown
}

/**
 * Helper to generate WebP-first picture markup with explicit dimensions and responsive srcset
 */
function buildOptimizedPictureHtml(imageUrl, altText, options = {}) {
  const width = options.width || 300;
  const height = options.height || 300;
  const loading = options.loading || 'lazy';
  const className = options.className || '';
  const imgClass = options.imgClass || '';
  const idAttr = options.id ? `id="${options.id}"` : '';
  const isCard = options.isCard !== false;
  const fallback = options.fallback || 'logo.png';
  const safeAlt = escapeHtml(altText || 'Toy');

  if (!imageUrl) {
    return `<img src="${fallback}" alt="${safeAlt}" width="${width}" height="${height}" loading="${loading}" decoding="async" class="${imgClass}" ${idAttr} />`;
  }

  // Check if image is external, data URL, or non-raster
  const isExternal = /^(https?:\/\/|data:|blob:)/i.test(imageUrl);
  const isRaster = /\.(jpe?g|png)$/i.test(imageUrl);

  if (isExternal || !isRaster) {
    return `<img src="${imageUrl}" alt="${safeAlt}" width="${width}" height="${height}" loading="${loading}" decoding="async" class="${imgClass}" ${idAttr} onerror="this.onerror=null; this.src='${fallback}';" />`;
  }

  const webpUrl = imageUrl.replace(/\.(jpe?g|png)$/i, '.webp');
  const thumbUrl = imageUrl.replace(/\.(jpe?g|png)$/i, '-thumb.webp');

  const srcset = isCard
    ? `${thumbUrl} 300w, ${webpUrl} 600w`
    : `${webpUrl}`;
  const sizes = isCard ? `(max-width: 768px) 50vw, 300px` : `${width}px`;

  // If WebP is not yet generated, automatically fallback to the original PNG/JPEG seamlessly
  const retryFallbackScript = `if(!this.dataset.retried){this.dataset.retried='1';const p=this.parentElement;if(p&&p.tagName==='PICTURE'){p.querySelectorAll('source').forEach(s=>s.remove());this.src='${imageUrl}';return;}}this.onerror=null;if(this.parentElement){this.parentElement.style.display='none';if(this.parentElement.nextElementSibling)this.parentElement.nextElementSibling.style.display='flex';}`;

  return `
    <picture class="${className}">
      <source type="image/webp" srcset="${srcset}" ${sizes ? `sizes="${sizes}"` : ''} />
      <img src="${imageUrl}" alt="${safeAlt}" width="${width}" height="${height}" loading="${loading}" decoding="async" class="${imgClass}" ${idAttr} onerror="${retryFallbackScript}" />
    </picture>
  `.trim();
}

function renderProductCard(product) {
  const isOnSale = product.originalPrice && product.originalPrice > product.price;
  const discount = isOnSale ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  // Badge determination
  let badgeHtml = '';
  if (product.badge && product.badge.trim()) {
    const badgeClass = product.badge.toLowerCase().replace(/[^a-z0-9]/g, '-');
    badgeHtml = `<span class="product-badge badge-${badgeClass}">${product.badge}</span>`;
  } else if (product.newArrival) {
    badgeHtml = `<span class="product-badge badge-new">New</span>`;
  } else if (isOnSale) {
    badgeHtml = `<span class="product-badge badge-sale">Sale</span>`;
  }

  // Category to emoji map for placeholder
  const catEmoji = {
    'Educational & Learning': '📚',
    'Building Blocks': '🧱',
    'Board Games & Puzzles': '♟️',
    'Outdoor & Sports': '⚽',
    'Arts & Crafts': '🎨',
    'Remote Control': '🚗',
    'Dolls & Fashion': '🪆',
    'Soft Toys & Plush': '🧸',
    'Musical Toys': '🎵',
    'Action & Adventure': '⚡'
  };
  const emoji = catEmoji[product.category] || '🎁';

  // Image or placeholder with WebP & explicit dimensions
  const imgHtml = product.imageUrl
    ? `${buildOptimizedPictureHtml(product.imageUrl, product.name, { width: 300, height: 300, loading: 'lazy', isCard: true, className: 'product-card-picture' })}
       <div class="product-img-placeholder" style="display:none">
         <span class="cat-emoji">${emoji}</span>
         <span class="cat-label">${product.category}</span>
       </div>`
    : `<div class="product-img-placeholder">
         <span class="cat-emoji">${emoji}</span>
         <span class="cat-label">${product.category}</span>
       </div>`;

  const videoBadge = product.videoUrl
    ? `<span class="product-video-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg> Video</span>`
    : '';

  // Scarcity badge
  const stockLevel = getProductStockLevel(product);
  let scarcityHtml = '';
  if (stockLevel !== null && stockLevel > 0 && stockLevel <= 5) {
    const cls = stockLevel === 1 ? 'last-one' : 'low';
    const msg = stockLevel === 1 ? 'Last one left!' : `Only ${stockLevel} left!`;
    scarcityHtml = `<div class="stock-scarcity ${cls}"><span class="scarcity-dot" aria-hidden="true"></span>${msg}</div>`;
  }

  // Mini star rating (if product has rating data)
  let miniStarsHtml = '';
  if (product.rating && product.reviewCount) {
    const starSvgs = typeof renderStars === 'function' ? renderStars(product.rating, '12') : '';
    miniStarsHtml = `<div class="product-mini-stars" aria-label="Rated ${product.rating} out of 5">
      ${starSvgs}
      <span class="review-count-mini">(${product.reviewCount})</span>
    </div>`;
  }

  const safeId = escapeHtml(String(product.id || ''));
  const safeName = escapeHtml(String(product.name || ''));
  const safeCategory = escapeHtml(String(product.category || ''));
  const safeAge = escapeHtml(String(product.ageGroup || ''));
  const encodedId = encodeURIComponent(String(product.id || ''));

  return `
    <div class="product-card" data-id="${safeId}"
         onclick="window.location='product.html?id=${encodedId}'"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.location='product.html?id=${encodedId}'}"
         tabindex="0" role="article"
         aria-label="${safeName}, &#8377;${product.price.toLocaleString('en-IN')}"
         style="cursor:pointer">
      <div class="product-card-image">
        ${imgHtml}
        ${badgeHtml}
        ${videoBadge}
        <button class="quick-view-btn" onclick="event.stopPropagation(); openQuickView('${safeId}')" aria-label="Quick preview of ${safeName}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Quick View
        </button>
        <button class="product-wishlist-btn ${typeof window !== 'undefined' && window.PunnagaiWishlist && window.PunnagaiWishlist.isInWishlist(product.id) ? 'active' : ''}" data-id="${safeId}" onclick="event.stopPropagation(); window.handleWishlistToggle && window.handleWishlistToggle('${safeId}')" aria-label="Add ${safeName} to wishlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div class="product-card-body">
        <p class="product-category">${safeCategory}</p>
        <h3 class="product-name">${safeName}</h3>
        <p class="product-age">Ages ${safeAge} yrs</p>
        ${miniStarsHtml}
        <div class="product-price-row">
          <div class="price-group">
            <span class="product-price">&#8377;${product.price.toLocaleString('en-IN')}</span>
            ${isOnSale ? `<span class="product-original-price">&#8377;${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
          </div>
          ${isOnSale ? `<span class="discount-tag">&minus;${discount}%</span>` : ''}
        </div>
        ${scarcityHtml}
      </div>
      <div class="product-card-footer">
        <button class="btn-cart" onclick="event.stopPropagation(); handleAddToCart('${product.id}')" aria-label="Add ${product.name} to cart">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
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
  const Inv =
    typeof window !== 'undefined' && window.PunnagaiInventoryModel
      ? window.PunnagaiInventoryModel
      : typeof PunnagaiInventoryModel !== 'undefined'
        ? PunnagaiInventoryModel
        : null;

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    if (Inv) return Inv.visibleVariants(product.variants).length > 0;
    return product.variants.some((v) => Number(v && v.stock) > 0);
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
// SEO: OpenGraph / Twitter Meta Update (product.html)
// ============================================================

function toAbsoluteUrl(url) {
  if (!url) return 'https://punnagaitoysfancy.in/images/store-hero.jpg';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  const clean = url.replace(/^\/+/, '');
  return `https://punnagaitoysfancy.in/${clean}`;
}

function updateProductPageMeta(product) {
  if (!product) return;
  const desc = (
    product.description ||
    'Quality educational toys, board games and return gifts at Punnagai Toy Store, Mylapore, Chennai.'
  ).slice(0, 160);
  const img = toAbsoluteUrl(product.imageUrl);
  const prodUrl = `https://punnagaitoysfancy.in/product.html?id=${encodeURIComponent(product.id || '')}`;

  document.title = `${product.name} — Buy Online | Punnagai Toy Store Chennai`;

  function setMeta(sel, val) {
    let el = document.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      document.head.appendChild(el);
    }
    el.setAttribute(
      sel.includes('[property') ? 'property' : 'name',
      sel.match(/["']([^"']+)["']/)[1]
    );
    el.setAttribute('content', val);
  }

  // Update Canonical
  let canEl = document.querySelector('link[rel="canonical"]');
  if (!canEl) {
    canEl = document.createElement('link');
    canEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canEl);
  }
  canEl.setAttribute('href', prodUrl);

  setMeta('meta[name="description"]', desc);
  setMeta('meta[property="og:title"]', `${product.name} | Punnagai Toy Store`);
  setMeta('meta[property="og:description"]', desc);
  setMeta('meta[property="og:image"]', img);
  setMeta('meta[property="og:url"]', prodUrl);
  setMeta('meta[property="og:type"]', 'product');
  setMeta('meta[name="twitter:card"]', 'summary_large_image');
  setMeta('meta[name="twitter:title"]', `${product.name} | Punnagai Toy Store`);
  setMeta('meta[name="twitter:description"]', desc);
  setMeta('meta[name="twitter:image"]', img);
}

// ============================================================
// SEO: JSON-LD Structured Data
// ============================================================

function injectProductStructuredData(product, reviewCount, avgRating) {
  if (!product) return;
  const availability = isProductAvailable(product)
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
  const prodUrl = `https://punnagaitoysfancy.in/product.html?id=${encodeURIComponent(product.id || '')}`;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: String(product.id || ''),
    category: product.category || 'Toys',
    description:
      product.description || 'Quality toy available at Punnagai Toy Store, Mylapore, Chennai.',
    image: [toAbsoluteUrl(product.imageUrl)],
    url: prodUrl,
    brand: { '@type': 'Brand', name: 'Punnagai Toy Store' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.price,
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability,
      url: prodUrl,
      seller: {
        '@type': 'ToyStore',
        name: 'Punnagai Toy Store',
        url: 'https://punnagaitoysfancy.in/'
      }
    }
  };

  if (reviewCount > 0 && avgRating > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(avgRating * 10) / 10,
      reviewCount
    };
  }

  let el = document.getElementById('ld-product');
  if (!el) {
    el = document.createElement('script');
    el.id = 'ld-product';
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(ld);
}

function injectLocalBusinessStructuredData() {
  if (document.getElementById('ld-local-business')) return;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ToyStore',
    name: 'Punnagai Toy Store',
    alternateName: 'Punnagai Toys & Fancy',
    description:
      "Mylapore's favourite toy destination. Quality toys for every age from babies to teens.",
    url: 'https://punnagaitoysfancy.in/',
    logo: 'https://punnagaitoysfancy.in/logo.png',
    image: 'https://punnagaitoysfancy.in/images/store-hero.jpg',
    telephone: ['+917550132101', '+917299461657'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '4/7 Luz Bazar Complex, R.K. Mutt Road',
      addressLocality: 'Mylapore, Chennai',
      addressRegion: 'Tamil Nadu',
      postalCode: '600004',
      addressCountry: 'IN'
    },
    geo: { '@type': 'GeoCoordinates', latitude: 13.0336, longitude: 80.2677 },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '22:00'
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday'],
        opens: '11:00',
        closes: '20:00'
      }
    ],
    priceRange: '₹₹',
    sameAs: [
      'https://www.youtube.com/@PunnagaiRahim',
      'https://www.instagram.com/punnagaitoys.fancy/',
      'https://www.facebook.com/punnagaitoys/'
    ]
  };
  const el = document.createElement('script');
  el.id = 'ld-local-business';
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(ld);
  document.head.appendChild(el);
}

// ============================================================
// PAGE INITIALIZERS
// ============================================================

async function initHomePage() {
  renderNavbar('home');
  renderFooter();

  // Load dynamic Hero Banner from Admin if available (Req 12)
  if (typeof getBanners === 'function') {
    getBanners({ active: true })
      .then((activeBanners) => {
        if (activeBanners && activeBanners.length > 0) {
          const primaryBanner = activeBanners.sort(
            (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
          )[0];
          const heroPicture = document.querySelector('.hero-horizontal-banner picture');
          const imgEl = document.querySelector('.hero-main-img');
          const titleEl = document.querySelector('.hero-title');
          if (imgEl && primaryBanner.imageUrl) {
            if (heroPicture) {
              heroPicture.querySelectorAll('source').forEach((s) => {
                s.srcset = primaryBanner.imageUrl;
              });
            }
            imgEl.removeAttribute('srcset');
            imgEl.src = primaryBanner.imageUrl;
          }
          if (titleEl && primaryBanner.title) {
            titleEl.innerHTML = window.escapeHtml
              ? window.escapeHtml(primaryBanner.title)
              : primaryBanner.title;
          }
        }
      })
      .catch((e) => console.warn('Error loading dynamic Hero Banner:', e));
  }

  const featuredContainer = document.getElementById('featured-products');
  const newArrivalsContainer = document.getElementById('new-arrivals');

  function renderGrid(products) {
    return `<div class="product-grid">${products
      .map((p) => {
        productCache[p.id] = p;
        return renderProductCard(p);
      })
      .join('')}</div>`;
  }

  // Source from the cached data layer (Req 1.9) and hide out-of-stock items.
  const allProducts = filterAvailableProducts(await getAllProductsCached());
  window.HOMEPAGE_ALL_PRODUCTS = allProducts;

  if (featuredContainer) {
    const featured = (
      typeof window.PunnagaiCatalog !== 'undefined'
        ? window.PunnagaiCatalog.applySort(
            allProducts.filter((p) => p.featured === true),
            'popularity'
          )
        : allProducts.filter((p) => p.featured === true)
    ).slice(0, 4);
    featuredContainer.innerHTML = featured.length
      ? renderGrid(featured)
      : '<p class="text-muted">No featured products available right now.</p>';
  }

  if (newArrivalsContainer) {
    const newest = (
      typeof window.PunnagaiCatalog !== 'undefined'
        ? window.PunnagaiCatalog.applySort(allProducts, 'newest')
        : allProducts
    ).slice(0, 4);
    newArrivalsContainer.innerHTML = newest.length
      ? renderGrid(newest)
      : '<p class="text-muted">No new arrivals available right now.</p>';
  }

  // Initialize YouTube Player (Req 19)
  if (typeof window.PunnagaiYouTube !== 'undefined') {
    window.PunnagaiYouTubeInstance = new window.PunnagaiYouTube();
    window.PunnagaiYouTubeInstance.render();
  }

  // Initialize Floating Reviews (Req 20)
  if (typeof window.PunnagaiFloatingReviews !== 'undefined') {
    window.PunnagaiFloatingReviewsInst = new window.PunnagaiFloatingReviews();
    window.PunnagaiFloatingReviewsInst.loadReviews();
  }

  // JSON-LD: LocalBusiness structured data
  injectLocalBusinessStructuredData();
}

async function initShopPage() {
  renderNavbar('shop');
  renderFooter();

  const PAGE_SIZE = 12; // Req 1.7: minimum 12 products per page.
  const Catalog = typeof window.PunnagaiCatalog !== 'undefined' ? window.PunnagaiCatalog : null;

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
  let allProducts = []; // available products only (out-of-stock hidden)
  let searchTerm = '';
  let currentSort = sortSelect ? sortSelect.value : 'popularity';
  let currentPage = 1;

  // ---- URL params seed the initial filter state ----
  const urlParams = new URLSearchParams(window.location.search);
  const urlCategory = urlParams.get('category');
  const urlAgeGroup = urlParams.get('ageGroup') || urlParams.get('age');
  const urlSale = urlParams.get('sale') === 'true';
  const urlFeatured = urlParams.get('featured') === 'true';
  const urlSearch = urlParams.get('search') || urlParams.get('q');
  const urlSort = urlParams.get('sort');
  const urlPage = parseInt(urlParams.get('page'), 10);

  if (urlCategory) {
    const cats = urlCategory.split(',');
    catInputs.forEach((i) => {
      if (cats.includes(i.dataset.cat)) i.checked = true;
    });
  }
  if (urlAgeGroup) {
    const ages = urlAgeGroup.split(',');
    ageInputs.forEach((i) => {
      if (ages.includes(i.dataset.age)) i.checked = true;
    });
  }
  if (urlSale && saleInput) saleInput.checked = true;
  if (urlFeatured && featuredInput) featuredInput.checked = true;
  if (urlSearch && searchInput) {
    searchTerm = urlSearch;
    searchInput.value = urlSearch;
  }
  if (urlSort && sortSelect) {
    currentSort = urlSort;
    sortSelect.value = urlSort;
  }
  if (urlPage && urlPage > 0) {
    currentPage = urlPage;
  }

  // ---- Read the current filter selections from the UI ----
  function readFilters() {
    const categories = catInputs.filter((i) => i.checked).map((i) => i.dataset.cat);
    const ages = ageInputs.filter((i) => i.checked).map((i) => i.dataset.age);
    const selectedPrice = priceInputs.find((i) => i.checked);
    const priceMin =
      selectedPrice && selectedPrice.dataset.priceMin !== ''
        ? Number(selectedPrice.dataset.priceMin)
        : null;
    const priceMax =
      selectedPrice && selectedPrice.dataset.priceMax !== ''
        ? Number(selectedPrice.dataset.priceMax)
        : null;
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
      filters.categories.forEach((cat) => {
        const subset = Catalog
          ? Catalog.filterProductsByCategory(list, cat)
          : list.filter((p) => p.category === cat);
        subset.forEach((p) => {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            unioned.push(p);
          }
        });
      });
      list = unioned;
    }

    // Age group (multi-select).
    if (filters.ages.length > 0) {
      list = list.filter((p) => filters.ages.includes(p.ageGroup));
    }

    // Price range (single preset) via the lib's combined filter.
    if (filters.priceMin !== null || filters.priceMax !== null) {
      const f = {};
      if (filters.priceMin !== null) f.priceMin = filters.priceMin;
      if (filters.priceMax !== null) f.priceMax = filters.priceMax;
      list = Catalog
        ? Catalog.applyFilters(list, f)
        : list.filter((p) => {
            const okMin = filters.priceMin === null || p.price >= filters.priceMin;
            const okMax = filters.priceMax === null || p.price <= filters.priceMax;
            return okMin && okMax;
          });
    }

    // Offers.
    if (filters.sale) list = list.filter((p) => p.originalPrice && p.originalPrice > p.price);
    if (filters.featured) list = list.filter((p) => p.featured === true);

    // Search (name/description) via the lib.
    if (searchTerm.trim() !== '') {
      list = Catalog
        ? Catalog.searchProducts(list, searchTerm)
        : list.filter(
            (p) =>
              (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
          );
    }

    // Sort via the lib.
    list = Catalog ? Catalog.applySort(list, currentSort) : list;

    return list;
  }

  // ---- Active-filter chips + count badge ----
  function renderActiveFilters(filters) {
    if (!activeFiltersBar) return;
    const chips = [];
    filters.categories.forEach((c) => chips.push({ type: 'cat', value: c, label: c }));
    filters.ages.forEach((a) => chips.push({ type: 'age', value: a, label: 'Age ' + a }));
    if (filters.priceMin !== null || filters.priceMax !== null) {
      const sel = priceInputs.find((i) => i.checked);
      const label = sel
        ? sel.parentElement.querySelector('span:last-child').textContent.trim()
        : 'Price';
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
    activeFiltersBar.innerHTML =
      chips
        .map(
          (c) =>
            `<button type="button" class="filter-chip" data-chip-type="${c.type}" data-chip-value="${String(c.value).replace(/"/g, '&quot;')}">
        ${c.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`
        )
        .join('') +
      `<button type="button" class="filter-chip filter-chip-clear" data-chip-type="clear">Clear all</button>`;

    activeFiltersBar.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const type = chip.dataset.chipType;
        const value = chip.dataset.chipValue;
        if (type === 'clear') {
          clearAllFilters();
          return;
        }
        if (type === 'cat') {
          const i = catInputs.find((x) => x.dataset.cat === value);
          if (i) i.checked = false;
        } else if (type === 'age') {
          const i = ageInputs.find((x) => x.dataset.age === value);
          if (i) i.checked = false;
        } else if (type === 'price') {
          const def = priceInputs.find(
            (x) => x.dataset.priceMin === '' && x.dataset.priceMax === ''
          );
          if (def) def.checked = true;
        } else if (type === 'sale' && saleInput) saleInput.checked = false;
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

    pagination.querySelectorAll('.page-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = Number(btn.dataset.page);
        if (!isFinite(target) || target < 1 || target > totalPages || target === currentPage)
          return;
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
      countDisplay.innerHTML =
        total === 0
          ? 'No products found'
          : `Showing <strong>${total}</strong> ${total === 1 ? 'product' : 'products'}`;
    }

    function syncUrl(currentFilters) {
      if (typeof history === 'undefined' || !history.replaceState) return;
      const params = new URLSearchParams();
      if (currentFilters.categories.length > 0) {
        params.set('category', currentFilters.categories.join(','));
      }
      if (currentFilters.ages.length > 0) {
        params.set('age', currentFilters.ages.join(','));
      }
      if (currentFilters.sale) params.set('sale', 'true');
      if (currentFilters.featured) params.set('featured', 'true');
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (currentSort && currentSort !== 'popularity') params.set('sort', currentSort);
      if (currentPage > 1) params.set('page', String(currentPage));

      const newQuery = params.toString();
      const targetUrl = window.location.pathname + (newQuery ? '?' + newQuery : '');
      const currentFullUrl = window.location.pathname + window.location.search;
      if (targetUrl !== currentFullUrl) {
        history.replaceState(null, '', targetUrl);
      }
    }

    if (total === 0) {
      grid.innerHTML = '';
      grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      if (pagination) {
        pagination.style.display = 'none';
        pagination.innerHTML = '';
      }
      syncUrl(filters);
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

    grid.innerHTML = pageItems
      .map((p) => {
        productCache[p.id] = p;
        return renderProductCard(p);
      })
      .join('');
    renderPagination(total);
    syncUrl(filters);
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
    if (term === '') {
      hideAutocomplete();
      return;
    }
    const matches = (Catalog ? Catalog.searchProducts(allProducts, term) : allProducts).slice(0, 5);
    if (matches.length === 0) {
      hideAutocomplete();
      return;
    }
    autocompleteBox.innerHTML = matches
      .map(
        (p) =>
          `<li role="option" class="autocomplete-item" data-id="${p.id}">
        <img src="${p.imageUrl || 'logo.png'}" alt="" loading="lazy" onerror="this.src='logo.png'">
        <span class="autocomplete-name">${p.name}</span>
        <span class="autocomplete-price">₹${p.price.toLocaleString('en-IN')}</span>
      </li>`
      )
      .join('');
    autocompleteBox.hidden = false;
    if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
    autocompleteBox.querySelectorAll('.autocomplete-item').forEach((item) => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        window.location = 'product.html?id=' + item.dataset.id;
      });
    });
  }

  // Wire events with 160ms debouncing for fast typing on mobile & desktop
  if (searchInput) {
    let searchDebounceTimer = null;
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      currentPage = 1;
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        renderAutocomplete();
        render();
      }, 160);
    });
    searchInput.addEventListener('focus', renderAutocomplete);
    searchInput.addEventListener('blur', () => setTimeout(hideAutocomplete, 180));
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      render();
    });
  }

  [...ageInputs, ...catInputs, ...priceInputs, saleInput, featuredInput]
    .filter(Boolean)
    .forEach((input) =>
      input.addEventListener('change', () => {
        currentPage = 1;
        render();
      })
    );

  // Expose a global reset for the inline onclick handlers in shop.html.
  window.clearAllFilters = function () {
    ageInputs.forEach((i) => {
      i.checked = false;
    });
    catInputs.forEach((i) => {
      i.checked = false;
    });
    if (saleInput) saleInput.checked = false;
    if (featuredInput) featuredInput.checked = false;
    const defaultPrice = priceInputs.find(
      (i) => i.dataset.priceMin === '' && i.dataset.priceMax === ''
    );
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
  // Handle browser Back / Forward history navigation
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    const age = params.get('age') || params.get('ageGroup');
    const cats = cat ? cat.split(',') : [];
    const ages = age ? age.split(',') : [];

    catInputs.forEach((i) => {
      i.checked = cats.includes(i.dataset.cat);
    });
    ageInputs.forEach((i) => {
      i.checked = ages.includes(i.dataset.age);
    });
    if (saleInput) saleInput.checked = params.get('sale') === 'true';
    if (featuredInput) featuredInput.checked = params.get('featured') === 'true';

    searchTerm = params.get('search') || params.get('q') || '';
    if (searchInput) searchInput.value = searchTerm;

    currentSort = params.get('sort') || 'popularity';
    if (sortSelect) sortSelect.value = currentSort;

    currentPage = parseInt(params.get('page'), 10) || 1;
    render();
  });

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
    document.getElementById('product-detail-content').innerHTML =
      '<div class="container section text-center"><h2>Product not found</h2><a href="shop.html" class="btn btn-primary">Back to Shop</a></div>';
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

  // SEO: Update OG meta + product JSON-LD
  updateProductPageMeta(product);
  injectProductStructuredData(product, 0, 0); // Reviews count injected later

  // Reviews section
  if (typeof window.initReviewsSection === 'function') {
    window.initReviewsSection(product.id);
  }

  const relatedContainer = document.getElementById('related-products-grid');
  if (relatedContainer) {
    let filtered = [];
    if (window.PunnagaiProductDetail) {
      const allProducts = await getAllProductsCached();
      filtered = window.PunnagaiProductDetail.getRelatedProducts(allProducts, product, {
        limit: 4
      });
    } else {
      const related = await getProducts({ category: product.category });
      filtered = related.filter((p) => p.id !== product.id).slice(0, 4);
    }

    if (filtered.length > 0) {
      document.getElementById('related-section').style.display = 'block';
      relatedContainer.innerHTML = filtered
        .map((p) => {
          productCache[p.id] = p;
          return renderProductCard(p);
        })
        .join('');
    }
  }
}

function renderProductDetailsUI() {
  const product = currentProduct;
  if (!product) return;

  let displayInfo;
  if (window.PunnagaiProductDetail) {
    displayInfo = window.PunnagaiProductDetail.getDisplayPriceInfo(
      product,
      currentVariantSelection
    );
  } else {
    const isOnSale = product.originalPrice && product.originalPrice > product.price;
    displayInfo = {
      original: product.originalPrice || product.price,
      discounted: product.price,
      hasDiscount: isOnSale,
      stock: { inStock: product.inStock !== false, stock: 1, status: 'in-stock' }
    };
  }

  const discountPct =
    displayInfo.original > 0
      ? Math.round((1 - displayInfo.discounted / displayInfo.original) * 100)
      : 0;

  let selectorsHtml = '';
  if (window.PunnagaiProductDetail && window.PunnagaiProductDetail.hasVariants(product)) {
    const variants = window.PunnagaiProductDetail.getVariants(product);
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

    if (sizes.length > 0) {
      selectorsHtml += `<div class="variant-selector" style="margin-bottom: 12px;">
        <label style="display:block; margin-bottom:4px; font-weight:600; font-size:14px; color:var(--text-secondary)">Size</label>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${sizes
            .map(
              (sz) => `
            <button class="btn ${currentVariantSelection.size === sz ? 'btn-primary' : 'btn-outline'}" 
                    style="padding: 4px 12px; font-size: 14px;"
                    onclick="handleVariantSelect('size', '${sz}')">${sz}</button>
          `
            )
            .join('')}
        </div>
      </div>`;
    }
    if (colors.length > 0) {
      selectorsHtml += `<div class="variant-selector" style="margin-bottom: 16px;">
        <label style="display:block; margin-bottom:4px; font-weight:600; font-size:14px; color:var(--text-secondary)">Color</label>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${colors
            .map(
              (col) => `
            <button class="btn ${currentVariantSelection.color === col ? 'btn-primary' : 'btn-outline'}" 
                    style="padding: 4px 12px; font-size: 14px;"
                    onclick="handleVariantSelect('color', '${col}')">${col}</button>
          `
            )
            .join('')}
        </div>
      </div>`;
    }
  }

  let videoEmbedHtml = '';
  if (product.videoUrl) {
    const match = String(product.videoUrl).match(
      /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    const videoId = match ? match[1] : product.videoUrl.length === 11 ? product.videoUrl : null;
    if (videoId) {
      videoEmbedHtml = `
        <div class="product-video-section" style="margin-top: 24px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: white;">
          <h3 style="font-size: 1.1rem; margin-bottom: 12px; display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.4rem;">🎬</span> Product Demonstration
          </h3>
          <div style="position: relative; width: 100%; padding-bottom: 56.25%; border-radius: 8px; overflow: hidden; background: #000; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <iframe 
              src="https://www.youtube.com/embed/${videoId}?rel=0" 
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
              title="${product.name} Video" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
        </div>
      `;
    }
  }

  const html = `
    <div class="product-detail-layout">
      <div class="product-gallery">
        <div class="main-image-container" id="pdp-main-image-container">
          ${buildOptimizedPictureHtml(product.imageUrl, product.name, { width: 600, height: 600, loading: 'eager', isCard: false, id: 'main-product-image', className: 'main-picture-wrap', imgClass: 'main-product-img' })}
          <div class="pdp-zoom-badge" id="pdp-zoom-badge" title="Tap to inspect toy details">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span id="pdp-zoom-text">Pinch or double-tap to zoom</span>
          </div>
          <button type="button" class="pdp-inspect-btn" id="pdp-inspect-btn" aria-label="Inspect toy details full screen" title="Inspect full screen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>
        </div>
        ${videoEmbedHtml}
      </div>
      <div class="product-info-wrapper">
        <div class="detail-meta">
          <span class="badge">${escapeHtml(product.category || '')}</span>
          <span class="badge" style="background:#F3F4F6;color:#374151">Age: ${escapeHtml(product.ageGroup || '')} yrs</span>
          ${product.badge ? `<span class="badge" style="background:var(--accent);color:white">${escapeHtml(product.badge)}</span>` : ''}
        </div>
        <h1 class="detail-title">${escapeHtml(product.name)}</h1>
        <div class="detail-price-box">
          <div style="display:flex;align-items:center;margin-bottom:8px">
            <span class="detail-current-price">₹${displayInfo.discounted.toLocaleString('en-IN')}</span>
            ${displayInfo.hasDiscount ? `<span class="detail-original-price">₹${displayInfo.original.toLocaleString('en-IN')}</span>` : ''}
          </div>
          ${displayInfo.hasDiscount ? `<div class="discount-tag" style="display:inline-block">You save ${discountPct}%!</div>` : ''}
        </div>
        
        ${selectorsHtml}

        <div class="detail-description">
          <p>${escapeHtml(product.description || '')}</p>
        </div>
        
        <div class="add-to-cart-box">
          <div class="qty-selector">
            <button class="qty-btn" onclick="let inp=document.getElementById('detail-qty'); if(inp.value>1)inp.value--">-</button>
            <input type="number" id="detail-qty" class="qty-input" value="1" min="1" max="${displayInfo.stock.inStock ? Math.min(10, displayInfo.stock.stock) : 10}" oninput="if(this.value!==''&&parseInt(this.value)<1)this.value=1" onblur="if(this.value===''||parseInt(this.value)<1)this.value=1">
            <button class="qty-btn" onclick="let inp=document.getElementById('detail-qty'); let max=parseInt(inp.getAttribute('max'))||10; if(inp.value<max)inp.value++">+</button>
          </div>
          ${
            displayInfo.stock.inStock
              ? `<button class="btn btn-primary btn-lg" style="flex-grow:1" onclick="handleDetailAddToCart()">Add to Cart</button>`
              : `<button class="btn btn-disabled btn-lg" style="flex-grow:1" disabled>Out of Stock</button>`
          }
        </div>
        ${
          displayInfo.stock.inStock
            ? `<button class="btn whatsapp-btn" style="width:100%; margin-top:10px; justify-content:center;" onclick="handleDetailWhatsApp()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              Order via WhatsApp
            </button>`
            : ''
        }
        
        <div class="product-urgency-badge">
          <span class="urgency-pulse"></span>
          <span>🔥 <strong>14 parents in Chennai</strong> viewed this toy today</span>
        </div>
        
        <div class="product-trust-badges-list">
          <div class="trust-badge-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <div>
              <strong>Available at Mylapore Store</strong>
              <small>Luz Bazar Complex, R.K. Mutt Rd</small>
            </div>
          </div>
          <div class="trust-badge-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div>
              <strong>100% Non-Toxic &amp; BIS Certified</strong>
              <small>Laboratory tested child-safe materials</small>
            </div>
          </div>
          <div class="trust-badge-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <div>
              <strong>In-Store Pickup Only</strong>
              <small>Reserve online &amp; collect at shop</small>
            </div>
          </div>
        </div>
        
        <!-- Store Pickup Location Card -->
        <div class="pincode-checker-box" style="background:#f8fafc; border:1.5px dashed var(--primary, #dc2626); border-radius:var(--radius-md, 14px); padding:16px;">
          <div class="pincode-header" style="color:var(--primary, #dc2626); font-weight:700; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>🏪 Direct Store Collection (Mylapore, Chennai)</span>
          </div>
          <p style="font-size:0.88rem; color:var(--text-secondary); margin:0 0 10px 0; line-height:1.5;">
            We offer in-store pickup only and do not provide delivery services. Reserve your toys online for free collection and pick them up directly from our Mylapore shop counter!
          </p>
          <div style="font-size:0.84rem; color:var(--text-primary); line-height:1.6; background:#ffffff; padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
            📍 <strong>Address:</strong> 4/7 Luz Bazar Complex, R.K. Mutt Road, Mylapore, Chennai – 600 004<br>
            🕒 <strong>Hours:</strong> Mon – Sat: 10:00 AM – 10:00 PM | Sun: 11:00 AM – 6:00 PM<br>
            📞 <strong>WhatsApp / Call:</strong> +91 75501 32101 / +91 72994 61657
          </div>
        </div>

        <!-- Parent FAQ Accordion -->
        <div class="product-faq-accordion">
          <h4 class="faq-accordion-title">Parent Questions &amp; Safety Details</h4>
          <details class="faq-item" open>
            <summary>Is this toy BIS certified &amp; safe for children?</summary>
            <p>Yes! All toys at Punnagai Toy Store undergo strict quality checks, comply with BIS (Bureau of Indian Standards) child-safety guidelines, and use 100% non-toxic, child-safe, BPA-free materials with smooth rounded edges.</p>
          </details>
          <details class="faq-item">
            <summary>Can I request complimentary gift wrapping &amp; a handwritten note?</summary>
            <p>Absolutely! We offer complimentary festive gift wrapping with ribbon and a personalized greeting card. Simply check "Gift Wrap" during checkout or send us a quick WhatsApp message with your order ID.</p>
          </details>
          <details class="faq-item">
            <summary>Can I see a demo or pick it up at the Mylapore store?</summary>
            <p>Yes! Visit us at Luz Bazar Complex, R.K. Mutt Road, Mylapore. You can also video call us on WhatsApp (+91 75501 32101) for a live product demo before purchasing!</p>
          </details>
          <details class="faq-item">
            <summary>What is your exchange and return policy?</summary>
            <p>We provide a 7-day hassle-free exchange or replacement policy for any transit damages or manufacturing defects. You can also exchange items in-person at our Mylapore store.</p>
          </details>
        </div>
      </div>
    </div>

    <!-- Mobile Sticky Bottom Buy Bar (visible on mobile only, slides up past hero button) -->
    <div class="mobile-sticky-buy-bar" id="mobile-sticky-buy-bar" aria-label="Quick Add to Cart Bar">
      <div class="sticky-buy-product-meta">
        <img src="${escapeHtml(product.imageUrl || 'images/logo.png')}" alt="${escapeHtml(product.name)}" class="sticky-buy-thumb" width="44" height="44" loading="lazy" decoding="async" />
        <div class="sticky-buy-info">
          <div class="sticky-buy-title">${escapeHtml(product.name)}</div>
          <div class="sticky-buy-price-wrap">
            <span class="sticky-buy-price">₹${displayInfo.discounted.toLocaleString('en-IN')}</span>
            ${displayInfo.hasDiscount ? `<span class="sticky-buy-orig">₹${displayInfo.original.toLocaleString('en-IN')}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="sticky-buy-btn-group">
        <button type="button" class="btn btn-whatsapp-sticky" onclick="handleDetailWhatsApp()" aria-label="Order on WhatsApp" title="WhatsApp Enquiry">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        </button>
        ${
          displayInfo.stock.inStock
            ? `<button type="button" class="btn btn-primary btn-sticky-cart" onclick="handleDetailAddToCart()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span>Add</span>
              </button>`
            : `<button type="button" class="btn btn-disabled btn-sticky-cart" disabled>Sold Out</button>`
        }
      </div>
    </div>
  `;

  document.getElementById('product-detail-content').innerHTML = html;
  initStickyBuyBar();
  initProductImagePinchZoom(product);
}

function initStickyBuyBar() {
  const stickyBar = document.getElementById('mobile-sticky-buy-bar');
  const heroBox = document.querySelector('.add-to-cart-box');
  if (!stickyBar || !heroBox) return;

  const updateVisibility = () => {
    if (window.innerWidth > 768) {
      stickyBar.classList.remove('visible');
      document.body.classList.remove('has-sticky-bar');
      return;
    }
    const rect = heroBox.getBoundingClientRect();
    // Show bar when hero add to cart box has scrolled above viewport or navbar
    if (rect.bottom < 60) {
      stickyBar.classList.add('visible');
      document.body.classList.add('has-sticky-bar');
    } else {
      stickyBar.classList.remove('visible');
      document.body.classList.remove('has-sticky-bar');
    }
  };

  if (window._stickyBarScrollHandler) {
    window.removeEventListener('scroll', window._stickyBarScrollHandler);
    window.removeEventListener('resize', window._stickyBarResizeHandler);
  }

  let ticking = false;
  window._stickyBarScrollHandler = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateVisibility();
        ticking = false;
      });
      ticking = true;
    }
  };
  window._stickyBarResizeHandler = updateVisibility;

  window.addEventListener('scroll', window._stickyBarScrollHandler, { passive: true });
  window.addEventListener('resize', window._stickyBarResizeHandler, { passive: true });
  updateVisibility();
}

/**
 * Mobile Product Image Pinch-to-Zoom:
 * Enables fluid touch pinch-to-zoom (up to 3.5x), smooth 1-finger pan/drag when zoomed,
 * double-tap to toggle zoom (1x <-> 2.2x), and tap-to-inspect trigger for full-screen inspection.
 */
function initProductImagePinchZoom(product) {
  const container = document.getElementById('pdp-main-image-container');
  if (!container) return;

  const img = container.querySelector('.main-product-img') || container.querySelector('img');
  if (!img) return;

  const zoomBadge = document.getElementById('pdp-zoom-badge');
  const zoomText = document.getElementById('pdp-zoom-text');
  const inspectBtn = document.getElementById('pdp-inspect-btn');

  const prod = product || currentProduct || { name: 'Toy Details', imageUrl: img.src };

  if (inspectBtn) {
    inspectBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMobileImageLightbox(prod);
    };
  }

  if (zoomBadge) {
    zoomBadge.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMobileImageLightbox(prod);
    };
  }

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let startDistance = 0;
  let startScale = 1;
  let startTouchX = 0;
  let startTouchY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;
  let lastTapTime = 0;
  let isPinching = false;

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  const applyTransform = (animate = false) => {
    img.style.transition = animate ? 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
    img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    container.classList.toggle('is-zoomed', scale > 1.05);
    if (zoomText) {
      zoomText.textContent =
        scale > 1.05
          ? `Zoom: ${scale.toFixed(1)}x • Double-tap to reset`
          : 'Pinch or double-tap to zoom';
    }
  };

  const resetZoom = (animate = true) => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform(animate);
  };

  container.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 2) {
        isPinching = true;
        startDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        startScale = scale;
        img.style.transition = 'none';
      } else if (e.touches.length === 1 && scale > 1.05) {
        startTouchX = e.touches[0].clientX;
        startTouchY = e.touches[0].clientY;
        startTranslateX = translateX;
        startTranslateY = translateY;
        img.style.transition = 'none';
      }
    },
    { passive: false }
  );

  container.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length === 2 && isPinching) {
        if (e.cancelable) e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (startDistance > 0) {
          const factor = currentDist / startDistance;
          scale = clamp(startScale * factor, 1, 3.5);

          const maxTx = ((scale - 1) * container.offsetWidth) / 2;
          const maxTy = ((scale - 1) * container.offsetHeight) / 2;
          translateX = clamp(translateX, -maxTx, maxTx);
          translateY = clamp(translateY, -maxTy, maxTy);

          applyTransform(false);
        }
      } else if (e.touches.length === 1 && scale > 1.05) {
        if (e.cancelable) e.preventDefault();
        const dx = e.touches[0].clientX - startTouchX;
        const dy = e.touches[0].clientY - startTouchY;

        const maxTx = ((scale - 1) * container.offsetWidth) / 2;
        const maxTy = ((scale - 1) * container.offsetHeight) / 2;
        translateX = clamp(startTranslateX + dx, -maxTx, maxTx);
        translateY = clamp(startTranslateY + dy, -maxTy, maxTy);

        applyTransform(false);
      }
    },
    { passive: false }
  );

  container.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      isPinching = false;
      if (scale < 1.05) {
        resetZoom(true);
      }
    }

    if (e.changedTouches.length === 1 && !isPinching) {
      const now = Date.now();
      if (now - lastTapTime < 320) {
        if (scale > 1.2) {
          resetZoom(true);
        } else {
          const rect = container.getBoundingClientRect();
          const tapX = e.changedTouches[0].clientX - rect.left - rect.width / 2;
          const tapY = e.changedTouches[0].clientY - rect.top - rect.height / 2;
          scale = 2.2;
          translateX = clamp(-tapX * 0.75, -container.offsetWidth * 0.4, container.offsetWidth * 0.4);
          translateY = clamp(-tapY * 0.75, -container.offsetHeight * 0.4, container.offsetHeight * 0.4);
          applyTransform(true);
        }
        lastTapTime = 0;
      } else {
        lastTapTime = now;
      }
    }
  });

  container.ondblclick = (e) => {
    e.preventDefault();
    if (scale > 1.2) {
      resetZoom(true);
    } else {
      scale = 2.2;
      applyTransform(true);
    }
  };
}

/**
 * Fullscreen Touch Inspection Lightbox:
 * Immersive modal with dark backdrop blur allowing parents to closely inspect
 * toy safety warnings, small parts, BIS marks, and box packaging labels.
 */
function openMobileImageLightbox(product) {
  let modal = document.getElementById('pdp-touch-lightbox');
  if (!modal) {
    const modalHtml = `
      <div id="pdp-touch-lightbox" class="touch-lightbox-modal" role="dialog" aria-modal="true" aria-label="Inspect toy details">
        <div class="touch-lightbox-header">
          <div class="touch-lightbox-title-wrap">
            <div class="touch-lightbox-title" id="lightbox-title"></div>
            <div class="touch-lightbox-subtitle">
              <span id="lightbox-category"></span>
              <span>•</span>
              <span id="lightbox-age"></span>
              <span>•</span>
              <span>🔍 Pinch / Tap to Inspect</span>
            </div>
          </div>
          <button type="button" class="touch-lightbox-close" id="lightbox-close-btn" aria-label="Close inspector">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="touch-lightbox-viewport" id="lightbox-viewport">
          <img src="" alt="" class="touch-lightbox-img" id="lightbox-img" />
        </div>
        <div class="touch-lightbox-controls">
          <div class="touch-lightbox-pills">
            <button type="button" class="touch-lightbox-btn" id="lightbox-zoom-out" aria-label="Zoom out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button type="button" class="touch-lightbox-btn touch-lightbox-zoom-val" id="lightbox-zoom-reset" aria-label="Reset zoom">
              <span id="lightbox-zoom-pct">100%</span>
            </button>
            <button type="button" class="touch-lightbox-btn" id="lightbox-zoom-in" aria-label="Zoom in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          <div class="touch-lightbox-tip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>Pinch, double-tap, or drag to inspect small parts, safety labels & packaging</span>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById('pdp-touch-lightbox');
  }

  const titleEl = document.getElementById('lightbox-title');
  const catEl = document.getElementById('lightbox-category');
  const ageEl = document.getElementById('lightbox-age');
  const imgEl = document.getElementById('lightbox-img');
  const viewport = document.getElementById('lightbox-viewport');
  const closeBtn = document.getElementById('lightbox-close-btn');
  const zoomInBtn = document.getElementById('lightbox-zoom-in');
  const zoomOutBtn = document.getElementById('lightbox-zoom-out');
  const zoomResetBtn = document.getElementById('lightbox-zoom-reset');
  const zoomPct = document.getElementById('lightbox-zoom-pct');

  titleEl.textContent = product.name || 'Toy Details';
  catEl.textContent = product.category || 'Toy';
  ageEl.textContent = product.ageGroup ? `Age: ${product.ageGroup} yrs` : 'All Ages';
  imgEl.src = product.imageUrl || 'images/logo.png';
  imgEl.alt = product.name || 'Toy';

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let startDistance = 0;
  let startScale = 1;
  let startTouchX = 0;
  let startTouchY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;
  let lastTapTime = 0;
  let isPinching = false;

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  const applyLightboxTransform = (animate = false) => {
    imgEl.style.transition = animate ? 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
    imgEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    if (zoomPct) zoomPct.textContent = `${Math.round(scale * 100)}%`;
  };

  const resetLightboxZoom = (animate = true) => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyLightboxTransform(animate);
  };

  const closeModal = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    resetLightboxZoom(false);
    window.removeEventListener('keydown', handleKeyDown);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closeModal();
  };

  closeBtn.onclick = closeModal;

  zoomInBtn.onclick = () => {
    scale = clamp(scale + 0.5, 1, 4.5);
    applyLightboxTransform(true);
  };

  zoomOutBtn.onclick = () => {
    scale = clamp(scale - 0.5, 1, 4.5);
    if (scale <= 1) {
      resetLightboxZoom(true);
    } else {
      applyLightboxTransform(true);
    }
  };

  zoomResetBtn.onclick = () => resetLightboxZoom(true);

  viewport.ontouchstart = (e) => {
    if (e.touches.length === 2) {
      isPinching = true;
      startDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      startScale = scale;
      imgEl.style.transition = 'none';
    } else if (e.touches.length === 1 && scale > 1.05) {
      startTouchX = e.touches[0].clientX;
      startTouchY = e.touches[0].clientY;
      startTranslateX = translateX;
      startTranslateY = translateY;
      imgEl.style.transition = 'none';
    }
  };

  viewport.ontouchmove = (e) => {
    if (e.touches.length === 2 && isPinching) {
      if (e.cancelable) e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (startDistance > 0) {
        const factor = currentDist / startDistance;
        scale = clamp(startScale * factor, 1, 4.5);
        applyLightboxTransform(false);
      }
    } else if (e.touches.length === 1 && scale > 1.05) {
      if (e.cancelable) e.preventDefault();
      const dx = e.touches[0].clientX - startTouchX;
      const dy = e.touches[0].clientY - startTouchY;
      const maxTx = ((scale - 1) * viewport.offsetWidth) / 1.8;
      const maxTy = ((scale - 1) * viewport.offsetHeight) / 1.8;
      translateX = clamp(startTranslateX + dx, -maxTx, maxTx);
      translateY = clamp(startTranslateY + dy, -maxTy, maxTy);
      applyLightboxTransform(false);
    }
  };

  viewport.ontouchend = (e) => {
    if (e.touches.length < 2) {
      isPinching = false;
      if (scale < 1.05) {
        resetLightboxZoom(true);
      }
    }

    if (e.changedTouches.length === 1 && !isPinching) {
      const now = Date.now();
      if (now - lastTapTime < 320) {
        if (scale > 1.2) {
          resetLightboxZoom(true);
        } else {
          scale = 2.5;
          applyLightboxTransform(true);
        }
        lastTapTime = 0;
      } else {
        lastTapTime = now;
      }
    }
  };

  viewport.onclick = (e) => {
    if (e.target === viewport && scale <= 1.05) {
      closeModal();
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  document.body.style.overflow = 'hidden';
  modal.classList.add('active');
  resetLightboxZoom(false);
}

window.handleVariantSelect = function (type, value) {
  currentVariantSelection[type] = value;
  renderProductDetailsUI();
};

window.checkPincodeDelivery = function () {
  const input = document.getElementById('pincode-input');
  const result = document.getElementById('pincode-result');
  if (!result) return;
  result.style.display = 'block';
  result.className = 'pincode-result success';
  result.innerHTML =
    '🏪 <strong>In-Store Pickup Only:</strong> We do not offer delivery service. All orders are collected in-person from our physical shop at 4/7 Luz Bazar Complex, Mylapore, Chennai (Free Store Pickup).';
};

window.handleDetailAddToCart = function () {
  const qty = Math.max(1, parseInt(document.getElementById('detail-qty')?.value) || 1);
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

/** Open WhatsApp with a pre-filled message for the currently displayed product. */
window.handleDetailWhatsApp = function () {
  const product = currentProduct;
  if (!product) return;

  const qty = Math.max(1, parseInt(document.getElementById('detail-qty')?.value) || 1);
  const settings = window.PunnagaiSettings ? window.PunnagaiSettings.get() : null;
  const WHATSAPP_NUMBER = ((settings && settings.whatsappNumber) || '917550132101').replace(
    /\D/g,
    ''
  );

  let variantLine = '';
  if (window.PunnagaiProductDetail && window.PunnagaiProductDetail.hasVariants(product)) {
    const variant = window.PunnagaiProductDetail.resolveVariant(product, currentVariantSelection);
    if (variant) {
      const parts = [variant.size, variant.color].filter(Boolean);
      if (parts.length) variantLine = `\n   Variant: ${parts.join(' / ')}`;
    }
  }

  let displayPrice = product.price;
  if (window.PunnagaiProductDetail) {
    const info = window.PunnagaiProductDetail.getDisplayPriceInfo(product, currentVariantSelection);
    displayPrice = info.discounted;
  }

  const lineTotal = displayPrice * qty;
  const formatINR = (n) => '₹' + n.toLocaleString('en-IN');

  const message = encodeURIComponent(
    `Hello! 👋 I'd like to *order* the following toy from *Punnagai Toy Store, Mylapore* 🎉\n\n` +
      `*Product:* ${product.name}${variantLine}\n` +
      `*Qty:* ${qty} × ${formatINR(displayPrice)} = ${formatINR(lineTotal)}\n\n` +
      `Please confirm availability and let me know the next steps. Thank you! 🙏`
  );

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
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
  const badgeHtml = product.badge
    ? `<span class="product-badge badge-${product.badge.toLowerCase().replace(' ', '-')}">${product.badge}</span>`
    : '';

  return `
    <div class="product-card wishlist-card" data-id="${product.id}">
      <button class="wishlist-remove-btn" type="button" aria-label="Remove from wishlist" onclick="event.stopPropagation(); handleRemoveFromWishlist('${product.id}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="product-card-image" onclick="window.location='product.html?id=${product.id}'">
        ${buildOptimizedPictureHtml(product.imageUrl, product.name, { width: 300, height: 300, loading: 'lazy', isCard: true, className: 'wishlist-picture' })}
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
  const ids = entries.map((e) => e.productId);

  // Resolve ids against the available catalog (Req 4.2 — current price/name/image).
  const available = filterAvailableProducts(await getAllProductsCached());
  const byId = {};
  available.forEach((p) => {
    byId[p.id] = p;
    productCache[p.id] = p;
  });
  const products = ids.map((id) => byId[id]).filter(Boolean);

  if (countDisplay) {
    const n = products.length;
    countDisplay.innerHTML =
      n === 0 ? 'No saved toys yet' : `${n} saved ${n === 1 ? 'toy' : 'toys'}`;
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

window.handleWishlistToggle = function (productId) {
  const Wishlist = getWishlistApi();
  if (!Wishlist) return;
  const inList = Wishlist.isInWishlist(productId);
  if (inList) {
    Wishlist.removeFromWishlist(productId);
    if (typeof showToast === 'function') showToast('Removed from wishlist', 'info');
  } else {
    Wishlist.addToWishlist(productId);
    if (typeof showToast === 'function') showToast('Added to wishlist! ❤️', 'success');
  }
  if (typeof updateWishlistBadge === 'function') updateWishlistBadge();

  // Update heart active class on any buttons for this product
  document.querySelectorAll(`.product-wishlist-btn[data-id="${productId}"]`).forEach((btn) => {
    btn.classList.toggle('active', !inList);
  });
};

async function initWishlistPage() {
  renderNavbar('wishlist');
  renderFooter();
  if (typeof updateWishlistBadge === 'function') updateWishlistBadge();
  await renderWishlistPage();
}

// Router dispatcher based on filename / clean URL path
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.toLowerCase();

  if (path.includes('index') || path === '/' || path.endsWith('/')) {
    if (typeof initHomePage === 'function') initHomePage();
  } else if (path.includes('shop')) {
    if (typeof initShopPage === 'function') initShopPage();
  } else if (path.includes('product')) {
    if (typeof initProductPage === 'function') initProductPage();
  } else if (path.includes('cart')) {
    if (typeof initCartPage === 'function') initCartPage();
  } else if (path.includes('wishlist')) {
    if (typeof initWishlistPage === 'function') initWishlistPage();
  } else if (
    path.includes('privacy') ||
    path.includes('terms') ||
    path.includes('returns') ||
    path.includes('delivery') ||
    path.includes('payments')
  ) {
    if (typeof renderNavbar === 'function') renderNavbar('');
    if (typeof renderFooter === 'function') renderFooter();
  }

  // Keep the navbar wishlist count in sync once the page is ready (Req 4.8).
  if (typeof updateWishlistBadge === 'function') {
    updateWishlistBadge();
  }

  // Update dynamic store WhatsApp and contact links across the page
  if (typeof updateStoreContactLinks === 'function') {
    updateStoreContactLinks();
  }

  // Show Offline Mode Warning
  if (window.USE_LOCAL_MODE && typeof showToast === 'function') {
    setTimeout(() => {
      showToast('Running in Local/Offline Mode (Data not synced to cloud)', 'warning');
    }, 1000);
  }

  // Live Cross-Tab / Real-time Sync: auto-refresh storefront when products are mutated in Admin
  function _refreshCurrentPage() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('index') || p === '/' || p.endsWith('/')) {
      if (typeof initHomePage === 'function') initHomePage();
    } else if (p.includes('shop')) {
      if (typeof initShopPage === 'function') initShopPage();
    } else if (p.includes('product')) {
      if (typeof initProductPage === 'function') initProductPage();
    } else if (p.includes('cart')) {
      if (typeof initCartPage === 'function') initCartPage();
    } else if (p.includes('wishlist')) {
      if (typeof initWishlistPage === 'function') initWishlistPage();
    }
  }
  window.addEventListener('punnagai:cache_invalidated', function (e) {
    if (
      !e.detail ||
      !e.detail.slot ||
      e.detail.slot === 'products' ||
      e.detail.slot === 'categories'
    ) {
      _refreshCurrentPage();
    }
  });
  window.addEventListener('storage', function (e) {
    if (e.key && (e.key.startsWith('punnagai_mock_') || e.key === 'Punnagai_HomeVideos')) {
      if (typeof invalidateCache === 'function') invalidateCache(null, true);
      _refreshCurrentPage();
    }
  });
});

// ============================================================
// DYNAMIC INTERACTIVE FEATURE 1: Enhanced Quick View Modal
// ============================================================
let _quickViewTriggerEl = null;
window._currentQuickViewQty = 1;

window.changeQuickViewQty = function (delta) {
  const input = document.getElementById('quick-view-qty-input');
  if (!input) return;
  let val = parseInt(input.value, 10) || 1;
  const max = parseInt(input.getAttribute('max'), 10) || 99;
  val = Math.max(1, Math.min(max, val + delta));
  input.value = val;
  window._currentQuickViewQty = val;

  // Update dynamic WhatsApp pre-order link with updated quantity and price
  const waBtn = document.getElementById('qv-whatsapp-btn');
  if (waBtn && waBtn.dataset.basePrice && waBtn.dataset.prodName) {
    const total = val * parseInt(waBtn.dataset.basePrice, 10);
    const settings = window.PunnagaiSettings ? window.PunnagaiSettings.get() : null;
    const waPhone = ((settings && settings.whatsappNumber) || '917550132101').replace(/\D/g, '');
    const waMsg = encodeURIComponent(
      `Hi Punnagai Toys! I would like to pre-order ${val} × "${waBtn.dataset.prodName}" (Total: ₹${total.toLocaleString('en-IN')}). Is it ready for pickup at your Mylapore store?`
    );
    waBtn.href = `https://wa.me/${waPhone}?text=${waMsg}`;
  }
};

window.handleQuickViewAddToCart = async function (productId) {
  const qty = window._currentQuickViewQty || 1;
  let product = productCache[productId];
  if (!product && typeof getProductById === 'function') {
    product = await getProductById(productId);
    if (product) productCache[productId] = product;
  }
  if (!product) return;

  if (typeof addToCart === 'function') {
    addToCart(product, qty);
  } else if (typeof handleAddToCart === 'function') {
    await handleAddToCart(productId);
  }

  if (typeof showToast === 'function') {
    showToast(`Added ${qty} × "${product.name}" to your cart! 🛍️`, 'success', {
      actionText: 'View Cart',
      actionUrl: 'cart.html'
    });
  }

  closeQuickView();
};

window.openQuickView = async function (productId) {
  let product = productCache[productId];
  if (!product && typeof getProductById === 'function') {
    product = await getProductById(productId);
    if (product) productCache[productId] = product;
  }
  if (!product && Array.isArray(window.HOMEPAGE_ALL_PRODUCTS)) {
    product = window.HOMEPAGE_ALL_PRODUCTS.find((p) => String(p.id) === String(productId));
    if (product) productCache[productId] = product;
  }
  if (!product) return;

  window._currentQuickViewQty = 1;
  _quickViewTriggerEl = document.activeElement;

  let modal = document.getElementById('quick-view-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quick-view-modal';
    modal.className = 'quick-view-overlay';
    document.body.appendChild(modal);
  }

  const safeId = window.escapeHtml ? window.escapeHtml(String(product.id)) : String(product.id);
  const safeName = window.escapeHtml ? window.escapeHtml(product.name) : product.name;
  const safeCategory = window.escapeHtml ? window.escapeHtml(product.category || '') : (product.category || '');
  const safeAge = window.escapeHtml ? window.escapeHtml(String(product.ageGroup || '')) : String(product.ageGroup || '');
  const encodedId = encodeURIComponent(String(product.id));

  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `${safeName} Quick View`);

  const isOnSale = product.originalPrice && product.originalPrice > product.price;
  const discount = isOnSale ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const settings = window.PunnagaiSettings ? window.PunnagaiSettings.get() : null;
  const waPhone = ((settings && settings.whatsappNumber) || '917550132101').replace(/\D/g, '');
  const waMsg = encodeURIComponent(
    `Hi Punnagai Toys! I would like to pre-order "${product.name}" (₹${product.price.toLocaleString('en-IN')}). Is it available at your Mylapore store?`
  );
  const waUrl = `https://wa.me/${waPhone}?text=${waMsg}`;

  // Mini Stars HTML
  let starsHtml = '';
  if (product.rating) {
    const starSvgs = typeof renderStars === 'function' ? renderStars(product.rating, '14') : '★★★★★';
    starsHtml = `
      <div class="quick-view-stars" aria-label="Rated ${product.rating} out of 5 stars">
        <span class="qv-stars-icons">${starSvgs}</span>
        <span class="qv-rating-val">${product.rating}</span>
        <span class="qv-rating-count">(${product.reviewCount || 16} reviews)</span>
      </div>
    `;
  }

  // Stock and availability
  const stockCount = typeof getProductStockLevel === 'function' ? getProductStockLevel(product) : (product.stock || 10);
  const maxStock = Math.max(1, stockCount || 10);

  // Description
  const descText = window.escapeHtml
    ? window.escapeHtml(product.description || 'Premium child-safe educational toy selected by experts. Non-toxic, durable, and spark-worthy!')
    : (product.description || 'Premium child-safe educational toy selected by experts. Non-toxic, durable, and spark-worthy!');

  modal.innerHTML = `
    <div class="quick-view-card" onclick="event.stopPropagation()">
      <button class="quick-view-close" onclick="closeQuickView()" aria-label="Close modal">&times;</button>
      <div class="quick-view-grid">
        <div class="quick-view-img-wrap">
          ${product.imageUrl ? buildOptimizedPictureHtml(product.imageUrl, product.name, { width: 420, height: 420, loading: 'eager', isCard: false, imgClass: 'quick-view-main-img' }) : `<div class="product-img-placeholder" style="height:320px"><span class="cat-emoji">🎁</span></div>`}
          <span class="quick-view-badge">${safeCategory}</span>
        </div>
        <div class="quick-view-content">
          <div>
            <div class="quick-view-meta">
              <span class="quick-view-age">👶 Ages ${safeAge} yrs</span>
              <span class="quick-view-stock"><span class="pulse-dot"></span> In Stock in Mylapore</span>
            </div>
            <h2 class="quick-view-title">${safeName}</h2>
            ${starsHtml}
            <div class="quick-view-price-row">
              <span class="quick-view-price">&#8377;${product.price.toLocaleString('en-IN')}</span>
              ${isOnSale ? `<span class="quick-view-orig-price">&#8377;${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
              ${isOnSale ? `<span class="discount-tag">&minus;${discount}%</span>` : ''}
            </div>
            <p class="quick-view-desc">${descText}</p>
            <div class="quick-view-highlights">
              <span class="qv-highlight-pill">🛡️ BIS Non-Toxic</span>
              <span class="qv-highlight-pill">🎁 Free Gift Wrapping</span>
              <span class="qv-highlight-pill">🏪 Mylapore Demo Ready</span>
            </div>
          </div>

          <div>
            <!-- Quantity Stepper -->
            <div class="quick-view-qty-row">
              <span class="qv-qty-label">Quantity:</span>
              <div class="qv-qty-stepper">
                <button type="button" class="qv-qty-btn" aria-label="Decrease quantity" onclick="changeQuickViewQty(-1)">−</button>
                <input type="number" id="quick-view-qty-input" class="qv-qty-input" value="1" min="1" max="${maxStock}" readonly>
                <button type="button" class="qv-qty-btn" aria-label="Increase quantity" onclick="changeQuickViewQty(1)">+</button>
              </div>
            </div>

            <!-- Actions -->
            <div class="quick-view-actions">
              <button class="qv-btn-cart" onclick="handleQuickViewAddToCart('${safeId}')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                Add to Cart
              </button>
              <a href="${waUrl}" id="qv-whatsapp-btn" data-base-price="${product.price}" data-prod-name="${safeName}" target="_blank" rel="noopener" class="qv-btn-whatsapp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Pre-Book
              </a>
            </div>
            <a href="product.html?id=${encodedId}" class="qv-btn-details">
              View Full Product Page &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  modal.onclick = (e) => {
    if (e.target === modal) closeQuickView();
  };

  const closeBtn = modal.querySelector('.quick-view-close');
  if (closeBtn) closeBtn.focus();

  document.addEventListener('keydown', handleQuickViewKeydown);
};

window.closeQuickView = function () {
  const modal = document.getElementById('quick-view-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  document.removeEventListener('keydown', handleQuickViewKeydown);
  if (_quickViewTriggerEl && typeof _quickViewTriggerEl.focus === 'function') {
    _quickViewTriggerEl.focus();
  }
};

function handleQuickViewKeydown(e) {
  if (e.key === 'Escape') {
    closeQuickView();
    return;
  }
  if (e.key === 'Tab') {
    const modal = document.getElementById('quick-view-modal');
    if (!modal) return;
    const focusables = Array.from(
      modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

// ============================================================
// DYNAMIC INTERACTIVE FEATURE 2: Homepage Featured Toys Category Filter
// ============================================================
window.filterFeaturedToys = function (category, btnEl) {
  if (btnEl) {
    document.querySelectorAll('.featured-tab').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    btnEl.classList.add('active');
    btnEl.setAttribute('aria-selected', 'true');
  }
  const allProducts = window.HOMEPAGE_ALL_PRODUCTS || [];
  const featuredContainer = document.getElementById('featured-products');
  if (!featuredContainer) return;

  let filtered = allProducts.filter((p) => p.featured === true);
  if (category && category !== 'all') {
    filtered = allProducts.filter((p) => p.category === category);
  }
  const toShow = filtered.slice(0, 4);

  function renderGrid(products) {
    return `<div class="product-grid fade-slide-in">${products
      .map((p) => {
        productCache[p.id] = p;
        return renderProductCard(p);
      })
      .join('')}</div>`;
  }

  featuredContainer.innerHTML = toShow.length
    ? renderGrid(toShow)
    : '<p class="text-muted" style="text-align:center; padding:24px;">No toys found in this category right now.</p>';
};

// ============================================================
// Live Store Activity / Simulated Orders: Permanently Disabled
// Authentic customer interactions only. No simulated toasts or orders.
// ============================================================
window.initLiveStoreActivity = function () {
  const container = document.getElementById('live-activity-container');
  if (container) {
    container.remove();
  }
};
