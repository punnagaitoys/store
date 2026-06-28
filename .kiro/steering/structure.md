# Project Structure

The project is a flat static site. HTML pages live at the root; CSS and JS are grouped in their own folders.

```
/
├── index.html          # Home: hero, shop-by-age, shop-by-category, featured, new arrivals, contact
├── shop.html           # Product listing with search, sort, and category/age/sale filters
├── product.html        # Single product detail page (reads ?id=)
├── cart.html           # Cart / WhatsApp pre-booking page
├── admin.html          # Admin panel (login-gated product CRUD)
├── privacy.html        # Policy pages (privacy, terms, sale-terms,
├── terms.html          #   delivery, returns, payments) — navbar/footer
├── sale-terms.html     #   injected, otherwise static content
├── delivery.html
├── returns.html
├── payments.html
│
├── css/
│   ├── style.css       # Main site styles (storefront)
│   └── admin.css       # Admin panel styles
│
├── js/
│   ├── firebase-config.js  # Firebase init + USE_LOCAL_MODE toggle (load first)
│   ├── data.js             # Product data layer: Firestore + LocalStorage, seed data, CRUD
│   ├── cart.js             # Cart state (localStorage) + WhatsApp checkout message builder
│   ├── app.js              # Shared UI (navbar/footer/toast), product cards, page init/router
│   └── admin.js            # Admin auth, dashboard, product add/edit/delete modals
│
├── package.json        # Defines the `dev` script (serve)
└── .kiro/              # Specs and steering (this folder)
```

## Where Things Go

- **New storefront page:** create `name.html` at the root, include the navbar/footer placeholder divs, load the script chain, and add an `init*Page()` handler + a route branch in `app.js`'s `DOMContentLoaded` dispatcher.
- **Storefront behavior/UI:** `js/app.js`. Shared helpers (`showToast`, `renderNavbar`, `renderFooter`, `renderProductCard`) live here and are reused everywhere.
- **Product data / queries / CRUD:** `js/data.js` only. Keep the LocalStorage and Firestore branches in sync.
- **Cart logic:** `js/cart.js`. Cart items are a denormalized snapshot (`productId, name, price, imageUrl, category, ageGroup, quantity`).
- **Admin features:** `js/admin.js` + `admin.html` + `css/admin.css`.
- **Styles:** `css/style.css` for the storefront, `css/admin.css` for admin. Use existing CSS variables (e.g. `--accent`, `--border`, `--text-secondary`, `--font-heading`).

## Notes

- `.agents/skills/` contains a UI/UX reference skill (data + scripts) and is not part of the shipped website.
- `node_modules/` holds only the `serve` dev dependency.
- There is no source/build separation — the files served are the files edited.
