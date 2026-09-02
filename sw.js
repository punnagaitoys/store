/**
 * sw.js — Service Worker for Punnagai Toy Store
 *
 * Strategy:
 *  - Static assets (CSS, JS, fonts, images): Cache-first (serve from cache,
 *    update in background)
 *  - HTML pages: Network-first with cache fallback (always try to get fresh
 *    HTML, fall back to cached version when offline)
 *  - Firebase/API requests: Network-only (never cache auth or Firestore calls)
 */

'use strict';

const CACHE_NAME = 'punnagai-v1';
const OFFLINE_PAGE = '/index.html';

// Static assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/shop.html',
  '/cart.html',
  '/css/style.css',
  '/js/firebase-config.js',
  '/js/data.js',
  '/js/app.js',
  '/js/cart.js',
  '/js/auth.js',
  '/js/lib/cart-storage.js',
  '/js/lib/cart-logic.js',
  '/js/lib/inventory-model.js',
  '/js/lib/catalog.js',
  '/js/lib/wishlist.js',
  '/js/lib/order.js',
  '/js/lib/shipping.js',
  '/js/reviews.js',
  '/manifest.webmanifest'
];

// Hosts/paths that should NEVER be cached
const BYPASS_HOSTS = [
  'firebaseio.com',
  'googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'gstatic.com',
  'wa.me',
  'whatsapp.com'
];

function shouldBypass(request) {
  try {
    const url = new URL(request.url);
    if (request.method !== 'GET') return true;
    if (BYPASS_HOSTS.some((host) => url.hostname.includes(host))) return true;
    if (url.pathname.includes('/firestore/')) return true;
    return false;
  } catch (e) {
    return true;
  }
}

function isHtmlRequest(request) {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('text/html') || request.url.endsWith('.html') || request.url.endsWith('/');
}

// ── Install: precache static assets ────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Non-fatal: if some precache URLs 404, don't block install
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((e) => console.warn('[SW] Precache failed:', url, e))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ──────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bypass: non-GET and Firebase/external API calls
  if (shouldBypass(request)) return;

  if (isHtmlRequest(request)) {
    // Network-first for HTML pages
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy on success
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: serve cached version or the offline fallback
          return caches.match(request).then((cached) => cached || caches.match(OFFLINE_PAGE));
        })
    );
  } else {
    // Cache-first for static assets (CSS, JS, images, fonts)
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Serve from cache and refresh in background
          const networkFetch = fetch(request)
            .then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
              }
              return response;
            })
            .catch(() => {
              /* network unavailable — cache serves */
            });
          // Return cached immediately without waiting
          return cached;
        }
        // Not in cache: fetch from network and cache result
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
