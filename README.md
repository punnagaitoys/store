# Punnagai Toy Store (Kamaal Shop Website)

[![Unit Tests](https://img.shields.io/badge/Unit_Tests-134_Passed-brightgreen.svg)](<>)
[![Property Tests](https://img.shields.io/badge/Property_Tests-56_Passed-brightgreen.svg)](<>)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](<>)

A modern, responsive, full-featured e-commerce web application for **Punnagai Toy Store**. Built with vanilla JavaScript, modern CSS design systems, PWA service worker capabilities, and Firebase integration.

---

## 🚀 Features

- **Storefront & Catalog**:
  - Dynamic product catalog with real-time category, age range, price filtering, and instant search.
  - Variant selection (size, color, SKU management) with live pricing and stock updates.
  - Interactive customer reviews, Google reviews integration, and YouTube video showcases.
  - Persistent shopping cart and wishlist with localStorage fallback and Firebase synchronization.
  - Intelligent shipping calculator (Free local delivery for TN, region-based quotes for All-India).

- **Checkout & Payment**:
  - Seamless multi-step checkout workflow with PIN code region detection.
  - Coupon code validation (percentage, fixed discount, min order limit, usage limits).
  - UPI payment integration with duplicate transaction prevention and order status state machine.

- **Admin Management Portal**:
  - **Product Management**: Full CRUD, variant generation, batch stock updates, image upload, and soft archival.
  - **Inventory Control**: Log inventory adjustments with audit logging.
  - **Order Fulfillment**: State machine order status transitions (`pending` → `confirmed` → `shipped` → `delivered`).
  - **Coupon Engine**: Create, edit, and track discount coupon metrics.
  - **Media Library**: Manage store banner assets and product media.
  - **Audit Logging**: Immutable audit trail for all admin operations.

- **Security & Infrastructure**:
  - Firebase Authentication, Firestore database rules, and Cloud Storage security policies.
  - PWA Web App Manifest and Service Worker (`sw.js`) for offline capabilities.

---

## 📁 Directory Structure

```
├── admin.html              # Admin portal interface
├── index.html              # Home page storefront
├── shop.html               # Product catalog & filtering page
├── product.html            # Individual product detail view
├── cart.html               # Shopping cart page
├── checkout.html           # Multi-step checkout & payment page
├── order-confirmation.html # Order receipt & tracking status
├── orders.html             # Order history view
├── account.html            # User account profile
├── login.html              # Login form
├── register.html           # Customer registration
├── wishlist.html           # Saved items wishlist
├── delivery.html           # Shipping & delivery policy info
├── payments.html           # Payment terms & options
├── privacy.html            # Privacy policy
├── returns.html            # Returns & refund policy
├── sale-terms.html         # Terms of sale
├── terms.html              # Terms & conditions
├── css/
│   ├── admin.css           # Admin dashboard styling
│   └── style.css           # Primary storefront stylesheet & design tokens
├── js/
│   ├── app.js              # Storefront UI rendering & interaction engine
│   ├── admin.js            # Admin portal initialization & router
│   ├── admin-ui.js         # Admin UI components & modal handlers
│   ├── admin-categories.js # Category management controller
│   ├── admin-coupons.js    # Coupon engine controller
│   ├── admin-inventory.js  # Inventory adjustment & audit logger
│   ├── admin-media-library.js # Banner & media library controller
│   ├── admin-orders.js     # Admin order processing controller
│   ├── auth.js             # User auth & session state module
│   ├── cart.js             # Cart storage & line item calculation logic
│   ├── checkout.js         # Checkout calculation & validation logic
│   ├── checkout-page.js    # Checkout UI step handlers
│   ├── data.js             # Data layer API (LocalStorage + Firestore sync)
│   ├── firebase-config.js  # Firebase app initialization & config
│   ├── floating-reviews.js # Floating review widget
│   ├── google-reviews.js   # Google reviews fetcher & renderer
│   ├── reviews.js          # Customer product reviews module
│   ├── youtube.js          # YouTube showcase player integration
│   └── lib/
│       └── audit.js        # Audit logging pure functions & builder
├── functions/              # Firebase Cloud Functions
├── tests/
│   ├── unit/               # Jest unit tests (134 tests across 9 suites)
│   ├── property/           # Fast-Check property-based tests (56 tests across 21 suites)
│   └── setup/              # Test environment setup & mocks
├── firebase.json           # Firebase hosting & emulator configuration
├── firestore.rules         # Firestore security & authorization rules
├── storage.rules           # Cloud Storage upload security rules
├── manifest.webmanifest    # PWA web manifest definition
├── sw.js                   # Service Worker script
└── package.json            # Project manifest & npm scripts
```

---

## 🛠️ Tech Stack

- **Frontend Core**: Vanilla HTML5, CSS3 (Custom Properties & Design Tokens), ES6+ JavaScript.
- **Backend & Storage**: Firebase Authentication, Cloud Firestore, Cloud Storage.
- **Testing Suite**: Jest, Fast-Check (Property-Based Testing), JSDOM.
- **Dev Server & Tools**: Serve, Prettier, Firebase Tools.

---

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (v9 or higher recommended)

### Installation

```bash
# Install dependencies
npm install
```

### Local Development Server

```bash
# Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🧪 Testing & Code Quality

The repository includes comprehensive unit tests and fast-check property-based correctness tests.

```bash
# Run all unit tests
npm run test:unit

# Run property-based correctness tests
npm run test:property

# Run all test suites
npm test

# Format all code files with Prettier
npm run format

# Check code formatting compliance
npm run format:check
```

---

## 🔒 Firebase Deployment & Security

```bash
# Start Firebase local emulators for integration testing
npm run test:integration

# Deploy firestore rules & hosting to production
npx firebase deploy
```

---

## 📄 License

This project is licensed under the MIT License.
