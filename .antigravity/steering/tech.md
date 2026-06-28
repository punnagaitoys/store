# Technology Stack

## Core Stack

- **Vanilla HTML, CSS, and JavaScript** — no framework, no build step, no bundler. Pages are plain `.html` files that load scripts via `<script>` tags.
- **Firebase (v9 compat SDK)** loaded from CDN — Firestore for product data, Auth (Email/Password) for admin login.
- **LocalStorage** — used for the shopping cart and as a full offline/mock data fallback when Firebase is not configured.
- **Google Fonts** — `Fredoka` (headings) and `Nunito` (body), loaded from CDN.

## Architecture Notes

- **Hybrid data layer (`js/data.js`):** Every product operation checks `window.USE_LOCAL_MODE`. When `true`, it reads/writes LocalStorage with seed data; when `false`, it uses Firestore. Always implement both branches when adding or changing data operations.
- **Local mode toggle (`js/firebase-config.js`):** `USE_LOCAL_MODE` is `true` whenever `firebaseConfig.apiKey === "YOUR_API_KEY_HERE"`. The site works out-of-the-box in local mode until real Firebase credentials are pasted in.
- Scripts are global (no modules/imports). Functions defined in one file (e.g. `showToast`, `getCart`, `addToCart`) are called directly from others. Load order in HTML matters: Firebase SDK → `firebase-config.js` → `data.js` → `cart.js` → `app.js`.
- Page routing is filename-based: `app.js` inspects `window.location.pathname` on `DOMContentLoaded` and calls the matching `init*Page()` function.
- Navbar and footer are injected at runtime by `renderNavbar()` / `renderFooter()` into `<div id="navbar">` and `<div id="footer">` placeholders.

## Common Commands

```bash
# Install dev dependency (one time)
npm install

# Run the local dev server (serves the static site)
npm run dev
```

The dev server is `serve` (from the `serve` package). There is no build, compile, lint, or test setup. Open pages through the served URL (not `file://`) so relative script paths and routing work correctly.

## Conventions

- Use `₹` and `Number.toLocaleString('en-IN')` for all price formatting.
- Use the existing `showToast(message, type)` helper for user feedback (`type`: `success` | `error` | `info`).
- Keep new product fields consistent with the existing shape: `name, description, price, originalPrice, category, ageGroup, imageUrl, inStock, featured, badge, createdAt`.
- Data functions return `{ success, id }` / `{ success, error }` objects and log errors via `console.error`; follow this pattern for new operations.
- Firebase credentials and the admin email/password are placeholders in `firebase-config.js` — never commit real secrets; treat that file as configuration the store owner fills in.
