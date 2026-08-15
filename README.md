# Punnagai Toy Store (Kamaal Shop Website)

A modern, responsive e-commerce web application built for Punnagai Toy Store. Designed with vanilla HTML5, custom CSS design tokens, modular ES6+ JavaScript, Progressive Web App capabilities, and Firebase integration.

---

## Executive Overview & Tech Stack

This codebase provides a complete e-commerce solution with a customer storefront and an admin management portal. It supports both a local offline demo mode (powered by LocalStorage) and a cloud mode (powered by Firebase).

### Technology Stack

- **Frontend Core**: HTML5, Vanilla CSS3 (CSS Variables, Flexbox, Grid, Design Tokens), Modular ES6+ JavaScript.
- **Backend & Cloud Architecture**:
  - **Firebase Authentication**: User accounts, email/password auth, session management.
  - **Cloud Firestore**: Real-time database for products, categories, orders, coupons, reviews, and audit logs.
  - **Cloud Storage**: Product image uploads and admin media banner management.
  - **Firebase Cloud Functions**: Node.js backend (`functions/index.js`) for server-side order calculation (`createSecureOrder`) and security validation.
- **PWA Capabilities**: Service Worker (`sw.js`) and Web App Manifest (`manifest.webmanifest`) for offline support and installability.
- **Testing Architecture**:
  - **Jest**: Unit testing for business logic, data models, and helper functions.
  - **Fast-Check**: Property-based testing for validation rules, pricing invariants, and state transitions.
  - **Firebase Emulator Suite**: Integration testing for Firestore security rules and backend data operations.
- **Development & Code Quality**: Prettier code formatting, Serve dev server, and ESLint.

---

## Codebase Navigation & File Structure

Here is a map of all primary files and directories to help developers navigate the project:

### Root Directory

- `index.html`: Storefront homepage featuring promotional banners, category cards, featured products, customer reviews, and video showcases.
- `shop.html`: Catalog page with instant search, category filtering, age range filters, price sliders, sorting, and pagination.
- `product.html`: Detailed view for a single toy product including image selection, variant picker (size/color), stock status, and customer reviews.
- `cart.html`: Shopping cart page displaying line items, quantity controls, coupon application, subtotal, and shipping estimation.
- `checkout.html`: Multi-step checkout form covering shipping address input, PIN code region detection, shipping method selection, and UPI payment guidance.
- `order-confirmation.html`: Order status receipt page showing placed order details and tracking status.
- `orders.html`: Customer order history listing past purchases.
- `account.html`: Unified authentication page for login, registration, and user profile details.
- `wishlist.html`: Saved favorite items list with quick add-to-cart options.
- `admin.html`: Comprehensive admin portal interface for managing products, inventory, orders, categories, coupons, media banners, and viewing audit logs.
- `delivery.html`, `payments.html`, `privacy.html`, `returns.html`, `sale-terms.html`, `terms.html`: Policy and information pages.
- `manifest.webmanifest`: PWA manifest defining application icons, theme colors, and display settings.
- `sw.js`: Service worker handling resource caching and offline fallback.
- `logo.png`, `robots.txt`, `sitemap.xml`: Static site assets and SEO descriptors.

### Cascading Style Sheets (`css/`)

- `css/style.css`: Primary storefront stylesheet containing CSS custom properties (color palettes, typography, spacing tokens), responsive layouts, and UI component styling.
- `css/admin.css`: Admin dashboard stylesheet with tables, modal forms, status badges, and management panel layouts.

### JavaScript Modules (`js/`)

#### Core & Shared Logic

- `js/firebase-config.js`: Initializes Firebase App, Auth, Firestore, Storage, and Cloud Functions handles. Configures emulator ports when running locally.
- `js/data.js`: Central data access layer providing dual-mode data persistence (Firestore in cloud mode, LocalStorage in local fallback mode).
- `js/auth.js`: User authentication helper managing login, registration, session persistence, and auth state listeners.
- `js/lib/cart-logic.js`: Pure UMD functions for cart totals, line item calculations, and coupon discount computations.
- `js/lib/audit.js`: Pure functions for creating and validating structured audit log entries.

#### Storefront Controllers

- `js/app.js`: Main application entry point for rendering product lists, catalog filters, home page sections, and header navigation.
- `js/cart.js`: Shopping cart state manager handling add/remove actions, local persistence, and checkout preparation.
- `js/checkout.js`: Checkout validation logic, address normalization, and delivery quote calculation.
- `js/checkout-page.js`: Multi-step checkout UI controller handling step switching, PIN code lookup, and order placement.
- `js/reviews.js`: Customer product review module enforcing verified purchase rules and star rating forms.
- `js/floating-reviews.js`: Floating review popup widget on storefront pages.
- `js/google-reviews.js`: Google Reviews widget loader and display renderer.
- `js/youtube.js`: Video showcase player modal handler.

#### Admin Portal Controllers

- `js/admin.js`: Main admin portal router, authentication guard, and sidebar navigation controller.
- `js/admin-ui.js`: Admin UI rendering functions for dashboards, statistical cards, data tables, and modal dialogs.
- `js/admin-categories.js`: Category creation, updating, and sequence sorting controller.
- `js/admin-coupons.js`: Discount coupon CRUD operations and usage metric tracking.
- `js/admin-inventory.js`: Inventory adjustments, stock updates, and audit logging controller.
- `js/admin-media-library.js`: Media library asset manager for uploading homepage promotional banners.
- `js/admin-orders.js`: Order fulfillment state machine controller (`pending` -> `confirmed` -> `shipped` -> `delivered`).

### Firebase & Backend Configuration

- `functions/index.js`: Firebase Cloud Functions backend. Contains `createSecureOrder`, which securely re-verifies product prices and calculates order totals server-side to prevent price tampering.
- `firestore.rules`: Security rules for Cloud Firestore ensuring read/write restrictions (e.g. order creation via Cloud Functions only, admin-only inventory edits).
- `storage.rules`: Security rules for Firebase Cloud Storage restricting image uploads to authenticated admin users.
- `firebase.json`: Configuration for Firebase Hosting, Cloud Functions, and Local Emulator Suite ports.
- `.firebaserc`: Firebase project target alias mappings.

### Automated Testing Suite (`tests/`)

- `tests/unit/`: Jest unit tests covering core modules (`data-layer.test.js`, `product-detail.test.js`, `cart-storage.test.js`, `order.test.js`, `auth.test.js`, `validation.test.js`, `admin-product-crud.test.js`, `audit.test.js`, `harness.test.js`).
- `tests/property/`: Fast-Check property-based tests verifying invariant correctness (`add-to-cart`, `cart-total`, `coupon-validation`, `category-filter`, `variant-price-update`, `free-local-delivery`, `order-status-transitions`, `shipping-region`, `sku-creation`, `email-phone-validation`, etc.).
- `tests/integration/`: Integration tests executed against the live Firebase Emulator Suite (`data-access.test.js`, `cache.test.js`).
- `tests/setup/`: Fast-Check configuration settings.

---

## Architecture & Data Flow

### 1. Dual-Mode Operation

- **Firebase Production Mode**: Enabled when `window.USE_LOCAL_MODE` is `false`. All catalog queries, user authentication, and order workflows communicate directly with Cloud Firestore, Auth, and Cloud Functions.
- **Local Fallback Mode**: Activated when Firebase is unavailable or configured for local testing. Data is stored in browser `localStorage`, allowing front-end features to run without an active internet connection or backend credentials.

### 2. Secure Order Processing

1. The customer adds items to the cart and proceeds through `checkout.html`.
2. Upon submitting the order, `js/data.js` invokes the `createSecureOrder` Firebase Cloud Function.
3. The Cloud Function fetches authoritative product prices and variant pricing directly from Firestore, validates coupon validity, computes tax and shipping costs, and writes the validated order document.
4. Direct client creation of documents in `/orders` is disabled via `firestore.rules` for security.

### 3. Shipping Engine Logic

- **Free Local Delivery**: Orders within Tamil Nadu (TN) qualify for free local shipping (cost is 0).
- **All-India Shipping**: Standard region quotes apply based on shipping address PIN code detection.

---

## Getting Started for Developers

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Java Development Kit (JDK 11 or higher, required only for running Firebase Emulators)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/MasterZ1311/Punnagai-Toy-Store.git
cd Punnagai-Toy-Store
npm install
```

### Running Local Development Server

To launch the application locally:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## Testing & Quality Assurance Commands

Run the automated test suite before committing changes:

```bash
# Run all unit tests
npm run test:unit

# Run property-based correctness tests
npm run test:property

# Run the complete test suite (Unit + Property)
npm test

# Run Firebase integration tests (requires JDK for emulators)
npm run test:integration

# Check code formatting with Prettier
npm run format:check

# Format code automatically
npm run format
```

---

## Deployment & Security Rules

To deploy rules and hosting to Firebase Production:

```bash
# Deploy Firestore security rules
npx firebase deploy --only firestore:rules

# Deploy Cloud Storage security rules
npx firebase deploy --only storage

# Deploy Cloud Functions
npx firebase deploy --only functions

# Deploy full application
npx firebase deploy
```

---

## License

This project is licensed under the MIT License.
