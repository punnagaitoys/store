# Implementation Plan: Punnagai Toys E-Commerce Platform

## Overview

This plan converts the design into incremental, code-focused tasks for a Vanilla JavaScript + HTML/CSS + Firebase (Firestore, Auth, Storage) platform. Each task builds on prior work and ends by wiring components into the live pages so no code is left orphaned. The existing static files (`index.html`, `shop.html`, `product.html`, `cart.html`, `admin.html`, the `js/` modules, and the `css/` stylesheets) are extended rather than replaced.

Testing follows the design's dual approach: property-based tests with [fast-check](https://github.com/dubzzz/fast-check) (100+ runs each) for the 23 correctness properties, plus Jest unit and integration tests (Firebase Emulator Suite). Test sub-tasks are marked optional with `*`.

## Tasks

- [x] 1. Set up project tooling, testing harness, and data access layer
  - [x] 1.1 Configure build/test tooling and module structure
    - Add Jest, fast-check, and the Firebase Emulator Suite to `package.json` devDependencies and add `test:unit`, `test:property`, `test:integration` scripts
    - Create `js/lib/` for shared pure-logic modules (importable by both browser and Jest) and configure module loading (ES modules) so logic is testable in isolation
    - Add a `tests/` directory with Jest config and a fast-check setup helper (100 run minimum)
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 1.2 Implement Firebase configuration and Firestore data access layer
    - Extend `js/firebase-config.js` to initialize Firestore, Auth, and Storage with environment-based config and emulator toggle
    - Create `js/data.js` data access functions for `products`, `users`, `orders`, `coupons`, `categories`, `banners`, `inventory_logs`, `shipping_integrations` collections per the design schema
    - Add a 1-hour in-memory product cache and 1-day category cache wrappers
    - _Requirements: 1.9, 14.5_

  - [x] 1.3 Write integration tests for the data access layer
    - Use Firebase Emulator to verify CRUD on products, orders, users, and coupons
    - Test cache hit/expiry behavior for product and category reads
    - _Requirements: 1.9_

- [x] 2. Implement core data models and variant/SKU logic
  - [x] 2.1 Implement product and variant models with SKU generation
    - Create `js/lib/products-model.js` with product/variant builders and `generateSKUs(sizes, colors)` producing one unique SKU per size×color combination with independent price and stock fields
    - Implement variant-count derivation matching displayed options
    - _Requirements: 8.3, 2.3_

  - [x] 2.2 Write property test for SKU creation combinatorics
    - **Property 19: SKU Creation for Variants**
    - **Validates: Requirements 8.3**

  - [x] 2.3 Write property test for variant count matching display
    - **Property 5: Variant Count Matches Display**
    - **Validates: Requirements 2.3**

  - [x] 2.4 Implement inventory model and stock visibility rule
    - Create `js/lib/inventory-model.js` exposing per-SKU stock, `isVariantVisible(variant)` (visible only when stock > 0), and stock-adjustment helpers
    - Implement quantity clamping to available stock (min 1, max stock)
    - _Requirements: 9.5, 9.7, 9.8, 3.2_

  - [x] 2.5 Write property test for variant stock visibility rule
    - **Property 20: Variant Stock Visibility Rule**
    - **Validates: Requirements 9.5**

- [ ] 3. Implement product catalog browsing logic
  - [x] 3.1 Implement filtering, search, and sorting engine
    - Create `js/lib/catalog.js` with `filterProductsByCategory`, `searchProducts(term)` (name/description match), combined filters (age group, price range, category), `applySort(order)`, and a matching-count function
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.2 Write property test for category filter subset
    - **Property 1: Category Filter Produces Correct Subset**
    - **Validates: Requirements 1.2**

  - [x] 3.3 Write property test for search result matching
    - **Property 2: Search Results Match Query**
    - **Validates: Requirements 1.3**

  - [x] 3.4 Write property test for filter count accuracy
    - **Property 3: Filter Count Accuracy**
    - **Validates: Requirements 1.5**

  - [x] 3.5 Write property test for sort idempotence
    - **Property 4: Sort Idempotence**
    - **Validates: Requirements 1.6**

  - [x] 3.6 Wire catalog UI into shop and home pages
    - Update `shop.html`/`index.html` and `js/app.js` to render the product grid (12+ per page with pagination/infinite scroll), filter panel, search bar with autocomplete, sort dropdown, and matching-count display, sourcing data from `js/data.js`
    - Add availability handling that hides out-of-stock variants without an "Out of Stock" label
    - _Requirements: 1.1, 1.7, 1.8, 2.8_

  - [-] 3.7 Write unit tests for catalog UI rendering helpers
    - Test pagination math, autocomplete top-5 selection, and count display
    - _Requirements: 1.7, 1.5_

- [ ] 4. Implement product detail page with variants
  - [x] 4.1 Implement variant selection and price-update logic
    - Create `js/lib/product-detail.js` to resolve selected variant pricing, stock status, and discounted price, and to compute related products by category/age group
    - _Requirements: 2.3, 2.4, 2.8, 2.9_

  - [x] 4.2 Write property test for variant price update round-trip
    - **Property 6: Variant Price Update Round-Trip**
    - **Validates: Requirements 2.4**

  - [-] 4.3 Wire product detail UI
    - Update `product.html` and add `js/product.js` to render image gallery, variant selector, price/discount display, metadata (dimensions, materials, safety), Add to Cart / Add to Wishlist buttons, related products, and embedded Google Maps store reviews
    - Preserve previous shop filter/search state when navigating back
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 2.9_

- [x] 5. Implement shopping cart
  - [x] 5.1 Implement cart calculation and coupon logic
    - Create `js/lib/cart-logic.js` with add/update/remove operations, `calculateCartTotal(items, discount)` (line-item sum minus discount, floored at 0), and `validateCoupon(code, cart)` against expiry, usage limit, and min order value
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

  - [x] 5.2 Write property test for add-to-cart count increase
    - **Property 7: Add to Cart Increases Count**
    - **Validates: Requirements 3.1**

  - [x] 5.3 Write property test for quantity modification accuracy
    - **Property 8: Quantity Modification Reflects Accurately**
    - **Validates: Requirements 3.2**

  - [x] 5.4 Write property test for cart total equals line item sum
    - **Property 9: Cart Total Equals Line Item Sum**
    - **Validates: Requirements 3.4**

  - [x] 5.5 Write property test for coupon validation consistency
    - **Property 10: Coupon Validation Consistency**
    - **Validates: Requirements 3.7**

  - [x] 5.6 Implement cart LocalStorage persistence
    - Create `js/lib/cart-storage.js` with `saveCartToLocalStorage`, `loadCartFromLocalStorage`, and `clearCart` using the `punnagai_cart` schema
    - _Requirements: 3.9, 6.11_

  - [x] 5.7 Write property test for cart persistence round-trip
    - **Property 11: Cart Persistence Round-Trip**
    - **Validates: Requirements 3.9**

  - [x] 5.8 Wire cart UI
    - Update `cart.html` and `js/cart.js` to render item list with quantity controls, remove, line totals, real-time subtotal/total, coupon input with validation feedback, and a "Proceed to Checkout" action
    - _Requirements: 3.5, 3.6, 3.8_

- [x] 6. Implement wishlist with session clearance
  - [x] 6.1 Implement wishlist logic and session storage
    - Create `js/lib/wishlist.js` with add (idempotent), remove, list, count, add-to-cart, and `clearOnLogout` using the `punnagai_wishlist` sessionStorage schema
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 6.2 Write property test for add-to-wishlist count increase
    - **Property 12: Add to Wishlist Increases Count**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 6.3 Write property test for wishlist cleared on logout
    - **Property 13: Wishlist Cleared on Logout**
    - **Validates: Requirements 4.5**

  - [x] 6.4 Wire wishlist UI and navbar count
    - Add `wishlist.html` and render saved products with quick add-to-cart; display wishlist count in the navbar across pages
    - _Requirements: 4.2, 4.8_

- [ ] 7. Implement customer authentication and account management
  - [x] 7.1 Implement validation and auth logic
    - Create `js/lib/validation.js` with email (RFC 5322) and Indian phone validation, and `js/auth.js` wrapping Firebase Auth register/login/logout with session token handling and duplicate-email detection
    - Clear wishlist on logout via `js/lib/wishlist.js`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.11_

  - [x] 7.2 Write property test for email and phone validation
    - **Property 14: Email and Phone Validation**
    - **Validates: Requirements 5.2**

  - [-] 7.3 Wire account, login/register, and order history UI
    - Add `account.html` and `orders.html` with login/register modal, profile view, and order history list/detail (order ID, date, total, status, items, tracking); do not persist addresses
    - _Requirements: 5.8, 5.9, 5.10_

  - [-] 7.4 Write integration tests for auth flows
    - Use Firebase Emulator to test register, login, logout, and duplicate-email handling
    - _Requirements: 5.3, 5.4, 5.6_

- [~] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement multi-region shipping
  - [x] 9.1 Implement region determination and shipping logic
    - Create `js/lib/shipping.js` with postal-code → region mapping (local / Tamil Nadu / all-India), available-methods per region, free local delivery, courier API call with cached-default fallback, and tracking lookup
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 9.2 Write property test for shipping methods match region
    - **Property 15: Shipping Methods Match Region**
    - **Validates: Requirements 6.4, 7.1**

  - [-] 9.3 Write property test for free local delivery
    - **Property 18: Local Delivery Cost is Free**
    - **Validates: Requirements 7.5**

- [ ] 10. Implement checkout and UPI payment
  - [x] 10.1 Implement order creation and state machine
    - Create `js/lib/order.js` with order-total computation (subtotal + shipping + tax − discount), order state machine (Cart → Checkout → Payment Processing → Confirmed; then Confirmed → Shipped → Delivered), and duplicate-order detection
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.8_

  - [x] 10.2 Write property test for order status transitions
    - **Property 16: Order Status Transitions Follow Rules**
    - **Validates: Requirements 6.8**

  - [x] 10.3 Implement UPI payment integration and post-payment cart clear
    - Add `js/checkout.js` integrating the UPI gateway redirect/callback with server-side webhook verification, mark order Confirmed on success, retry on failure, trigger confirmation email, and clear the cart on success
    - _Requirements: 6.7, 6.8, 6.9, 6.10, 6.11_

  - [-] 10.4 Write property test for cart clears after checkout
    - **Property 17: Cart Clears After Checkout**
    - **Validates: Requirements 6.11**

  - [-] 10.5 Wire checkout UI and shipment/tracking creation
    - Add `checkout.html` with order summary, billing address with postal-code validation, shipping method selection with estimated delivery dates, UPI payment option, and tracking-number display/email on shipment creation
    - _Requirements: 6.1, 6.4, 6.5, 7.9_

  - [~] 10.6 Write property test for shipment tracking round-trip
    - **Property (Req 7 Round Trip): Create shipment → Fetch tracking → Query courier returns matching info**
    - **Validates: Requirements 7.6, 7.7, 7.8**

- [~] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement admin audit logging foundation
  - [x] 12.1 Implement audit log writer
    - Create `js/lib/audit.js` that records an `inventory_logs`/audit entry (timestamp, admin user ID, operation type, entity details) for create/update/delete product, inventory upload, mark shipped, and refund operations
    - _Requirements: 17.8, 9.5_

  - [x] 12.2 Write property test for admin operations create audit log
    - **Property 23: Admin Operations Create Audit Log**
    - **Validates: Requirements 17.8**

- [ ] 13. Implement admin product management
  - [x] 13.1 Implement admin product CRUD with variants
    - Extend `js/admin.js` with create/edit/delete product, SKU generation per variant, image upload to Firebase Storage with thumbnails, at-least-one-variant validation, and archive-on-delete for linked orders; log each via `js/lib/audit.js`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [-] 13.2 Write integration tests for product CRUD
    - Verify create → edit → view → delete (archived in orders) round-trip and idempotent saves on the emulator
    - _Requirements: 8.5, 8.6_

  - [~] 13.3 Wire admin product management UI
    - Update `admin.html` and `css/admin.css` to render the dashboard, product list, and add/edit forms with variant and image management
    - _Requirements: 8.1, 8.9, 17.1, 17.9_

- [ ] 14. Implement admin inventory bulk upload
  - [x] 14.1 Implement Excel/CSV parsing and inventory update logic
    - Create `js/admin-inventory.js` to parse `.xlsx`/`.csv`, validate SKU format and non-negative quantities, produce a per-row error report on failure, apply valid updates, write audit log entries, and provide a template download
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.9, 17.2, 17.4_

  - [-] 14.2 Write unit/property tests for inventory upload
    - Verify post-upload DB totals equal file totals, invalid-row reporting, and idempotent re-upload
    - _Requirements: 9.2, 9.3, 9.4_

  - [~] 14.3 Wire inventory uploader UI with progress
    - Add the inventory upload interface to `admin.html` with drag-and-drop, real-time progress, completion status, and error display
    - _Requirements: 9.1, 17.3, 17.4_

- [ ] 15. Implement admin order management
  - [x] 15.1 Implement order management and refund logic
    - Create `js/admin-orders.js` with status filtering, mark-as-shipped (with shipped-blocking when inventory depleted) plus tracking email, refund processing through UPI, and inventory restoration on refund; log via `js/lib/audit.js`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [-] 15.2 Write property test for refund inventory restoration
    - **Property 21: Refund Inventory Restoration**
    - **Validates: Requirements 10.6**

  - [~] 15.3 Wire admin order management UI
    - Add the orders section to `admin.html` with list, status filter, detail view, search by ID/customer, and ship/refund actions
    - _Requirements: 10.1, 10.2, 10.3, 10.8_

- [ ] 16. Implement admin discount and coupon management
  - [x] 16.1 Implement discount and coupon logic
    - Create `js/admin-coupons.js` for creating product discounts (percentage/fixed), generating unique coupon codes with expiry/usage-limit, validating at checkout, enforcing usage-count limits, and deactivation
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10_

  - [-] 16.2 Write property test for coupon usage limit invariant and single application
    - **Property 11 (Req 11): Coupon usage count never exceeds limit; applying same coupon twice applies discount once**
    - **Validates: Requirements 11.6, 11.8**

  - [-] 16.3 Write property test for coupon expiration validation
    - **Property 22: Coupon Expiration Validation**
    - **Validates: Requirements 11.6, 11.8**

  - [~] 16.4 Wire discount/coupon UI and storefront discount display
    - Add coupon/discount management to `admin.html` and display original vs discounted price on product cards and detail pages
    - _Requirements: 11.2, 11.3, 11.9_

- [ ] 17. Implement admin category and banner management
  - [x] 17.1 Implement category and banner logic
    - Create `js/admin-categories.js` for category CRUD with product-count maintenance and product assignment (idempotent), and banner CRUD with image optimization, max-5-active enforcement, and active/inactive toggling
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.8, 12.9_

  - [-] 17.2 Write property tests for category counts and assignment idempotence
    - **Property (Req 12): category product count equals assigned products; duplicate assignment yields one assignment**
    - **Validates: Requirements 12.1, 12.3**

  - [~] 17.3 Wire category/banner UI and home page carousel
    - Add category and banner managers to `admin.html`, and render the rotating banner carousel on `index.html`
    - _Requirements: 12.1, 12.4, 12.7_

- [ ] 18. Implement admin portal shell, preview, and dashboard stats
  - [-] 18.1 Implement dashboard statistics and content/preview tooling
    - Extend `js/admin.js` with dashboard widgets (total products, orders, revenue, inventory status), a WYSIWYG static-page editor, preview-before-publish mode, and a 5-minute live-reflection sync of portal changes
    - _Requirements: 17.1, 17.5, 17.6, 17.7, 17.9, 17.10_

  - [~] 18.2 Write unit tests for dashboard stats aggregation
    - Test totals/revenue/inventory-status computation from order and product data
    - _Requirements: 17.9_

- [~] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Implement integrations: WhatsApp, reviews, map, and YouTube
  - [-] 20.1 Implement WhatsApp contact and Google Maps reviews modules
    - Create `js/reviews.js` to fetch and 24-hour cache Google Maps reviews with fallback messaging, and add WhatsApp click-to-chat links with a pre-populated message template
    - _Requirements: 13.1, 13.2, 13.6, 14.1, 14.2, 14.4, 14.5, 14.6_

  - [~] 20.2 Write property test for reviews caching idempotence
    - **Property (Req 14): Viewing reviews repeatedly shows the same cached set until expiry; displayed count matches fetched count**
    - **Validates: Requirements 14.5**

  - [ ] 20.3 Implement store map and YouTube player modules
    - Create `js/map.js` for the embedded interactive store map (marker, info window, get-directions, open/closed by current time, admin-updatable coordinates) and `js/youtube.js` for the lazy-loaded responsive YouTube player with fallback and admin-configurable video/playlist
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 19.1, 19.2, 19.3, 19.5, 19.6, 19.8, 19.9, 19.10_

  - [~] 20.4 Implement floating auto-scroll review section
    - Create `js/floating-reviews.js` rendering a non-intrusive auto-scrolling carousel (5s per review, manual arrows/swipe, pause on hover, placeholder when empty, "See All Reviews" link) sourced from the cached reviews
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 20.10_

- [ ] 21. Implement static pages, navigation, SEO, and performance
  - [~] 21.1 Wire consistent navigation and static pages
    - Update the navbar/footer across all pages (Home, Shop, Categories, About, Contact) with mobile hamburger menu, and populate About, Contact (address, hours, WhatsApp, map), Terms, and Privacy pages
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 18.7_

  - [~] 21.2 Implement SEO and performance optimizations
    - Add SEO meta tags, Schema.org product structured data, Open Graph tags, `sitemap.xml`, `robots.txt`, responsive breakpoints (320/768/1024px), lazy-loaded/compressed images, and deferred non-critical JS; log search queries anonymously
    - _Requirements: 16.1, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

  - [~] 21.3 Write unit tests for SEO helpers and sitemap generation
    - Test meta-tag/structured-data builders and sitemap page enumeration idempotence
    - _Requirements: 16.4, 16.5, 16.6_

- [ ] 22. Final integration and end-to-end wiring
  - [~] 22.1 Wire all modules into application entry points
    - Connect catalog, cart, wishlist, auth, checkout, shipping, and integration modules through shared init in `js/app.js`, ensuring navbar counts, session state, and cached data are consistent across all pages
    - _Requirements: 3.6, 4.8, 5.7, 13.1_

  - [~] 22.2 Write end-to-end tests for critical journeys
    - Cover browse→cart→checkout→UPI→confirmation, signup→wishlist→cart→order history, and admin product→inventory→coupon→ship flows
    - _Requirements: 1.1, 3.8, 6.8, 8.1, 9.4, 10.4_

- [~] 23. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP, but they validate the 23 correctness properties and key edge cases.
- Each task references specific requirements (and properties where applicable) for traceability.
- Property tests use fast-check with a minimum of 100 runs each; unit/integration tests use Jest with the Firebase Emulator Suite.
- The existing static files and `js/` modules are extended in place; new modules live under `js/` and `js/lib/` (pure logic) to keep business rules independently testable.
- Checkpoints provide incremental validation points between major feature areas.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "2.4", "12.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "3.1", "5.1", "5.6", "6.1", "7.1", "9.1", "12.2"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "4.1", "5.2", "5.3", "5.4", "5.5", "5.7", "6.2", "6.3", "7.2", "9.2", "9.3", "10.1"] },
    { "id": 4, "tasks": ["3.6", "4.2", "5.8", "6.4", "7.3", "10.2", "10.3", "13.1", "14.1", "15.1", "16.1", "17.1"] },
    { "id": 5, "tasks": ["3.7", "4.3", "7.4", "10.4", "10.5", "13.2", "14.2", "15.2", "16.2", "16.3", "17.2", "18.1", "20.1", "20.3"] },
    { "id": 6, "tasks": ["10.6", "13.3", "14.3", "15.3", "16.4", "17.3", "18.2", "20.2", "20.4", "21.1"] },
    { "id": 7, "tasks": ["21.2", "22.1"] },
    { "id": 8, "tasks": ["21.3", "22.2"] }
  ]
}
```
