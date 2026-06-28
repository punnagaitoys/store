# Punnagai Toys E-Commerce Platform — Design Document

## Overview

Punnagai Toys is transitioning from a 10+ year legacy physical retail presence to a modern web-based e-commerce platform while maintaining the warm, family-friendly brand identity. The platform will serve parents and children looking to browse and purchase 100+ toys across 20 categories with seamless checkout via UPI, multi-region shipping, and admin capabilities for inventory and content management.

### Key Design Goals

1. **Customer-First Experience**: Simple, intuitive, colorful interface optimized for both parents and children
2. **Mobile-First Approach**: Fully responsive design prioritizing mobile (70%+ of traffic expected)
3. **Inventory Efficiency**: Seamless admin operations including Excel bulk imports for weekly inventory syncs
4. **Payment Simplicity**: UPI-only payment gateway minimizing customer friction
5. **Scalability**: Designed to handle 20k+ monthly visitors and 500+ orders
6. **Regional Awareness**: Multi-region shipping with real-time courier integration

### Feature Scope

The design covers:
- Product catalog with advanced filtering, search, and recommendations
- Shopping cart and wishlist management
- Customer authentication and order history
- Checkout with UPI payment integration
- Multi-region shipping (local, Tamil Nadu, all-India)
- Admin dashboard for products, inventory, orders, discounts
- Static content management (pages, banners, categories)
- Third-party integrations (Firebase, UPI gateway, courier APIs, WhatsApp, Google Maps)

---

## Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER (Browser)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Product Catalog & Shop (index.html, shop.html)         │  │
│  │ • Product Detail (product.html)                          │  │
│  │ • Shopping Cart (cart.html)                              │  │
│  │ • Checkout (checkout.html)                               │  │
│  │ • Customer Accounts (account.html, orders.html)          │  │
│  │ • Admin Panel (admin.html)                               │  │
│  │ • Static Pages (about, contact, terms, privacy)          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Vanilla JavaScript (app.js, cart.js, admin.js)         │  │
│  │ • LocalStorage for session cart/wishlist                 │  │
│  │ • Firebase SDK for real-time data                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ⬇️
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LOGIC TIER                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Product Filtering & Search Engine                      │  │
│  │ • Cart Management (add, update, remove, apply coupons)   │  │
│  │ • User Authentication (Firebase Auth)                    │  │
│  │ • Payment Processing (UPI Gateway Integration)           │  │
│  │ • Order Creation & Management                            │  │
│  │ • Inventory Management (real-time updates)               │  │
│  │ • Admin Operations (products, discounts, categories)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ⬇️
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND & DATA TIER                          │
│  ┌──────────────────────────────────┐  ┌───────────────────┐  │
│  │     Firebase Realtime             │  │  Third-Party APIs │  │
│  │ • Firestore (primary database)   │  │ • UPI Gateway     │  │
│  │ • Firebase Auth (user mgmt)      │  │ • Courier APIs    │  │
│  │ • Firebase Storage (images)      │  │ • Google Maps     │  │
│  └──────────────────────────────────┘  │ • WhatsApp Business│  │
│                                         └───────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Collections: products | orders | users | coupons | etc   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Responsive UI, client-side logic |
| **Backend** | Firebase (Firestore, Auth, Storage) | Database, authentication, file hosting |
| **Real-time** | Firebase Realtime Updates | Live inventory, order status |
| **Payment** | Razorpay/PayU UPI Gateway | UPI payment processing |
| **Shipping** | Courier APIs (Shiprocket/Ecom Express) | Real-time rates, tracking |
| **Maps** | Google Maps API | Store location, reviews |
| **Messaging** | WhatsApp Business API | Customer inquiries, order updates |
| **Hosting** | Firebase Hosting | Static hosting, CDN |
| **Analytics** | Google Analytics 4 | Usage tracking, conversion |

---

## Components and Interfaces

### Frontend Components

#### 1. Navigation & Layout Components
- **Navbar**: Dynamic navigation with cart count, wishlist count, login status
- **Footer**: Links to policies, social media, contact info
- **Toast Notifications**: User feedback (success, error, info)
- **Modal Dialogs**: Confirmations, login prompts

#### 2. Product Catalog Components
- **Product Grid**: Display 12-24 items per page with lazy loading
- **Filter Panel**: Age group, price range, category, ratings
- **Search Bar**: Real-time search with autocomplete (top 5 products)
- **Sort Dropdown**: Popularity, price, newest, rating
- **Pagination/Infinite Scroll**: Load more products dynamically

#### 3. Product Detail Components
- **Image Gallery**: Main image + thumbnails, variant-specific images
- **Variant Selector**: Size and color options with stock status
- **Price Display**: Base price, variant pricing, discount badge
- **Add to Cart/Wishlist**: One-click actions with feedback
- **Related Products**: 4-6 recommendations by category
- **Google Maps Reviews**: 3-5 latest store reviews with rating

#### 4. Shopping Experience Components
- **Cart Page**: Item list with quantity controls, remove option, subtotal
- **Coupon Input**: Code entry with validation and discount display
- **Checkout Form**: Billing address, delivery options, order summary
- **Payment Gateway**: UPI redirect and status updates
- **Order Confirmation**: Order ID, confirmation email trigger

#### 5. Account Components
- **Login/Register Modal**: Email, phone, password with validation
- **User Account Page**: Profile info, edit account details
- **Order History**: List of past orders with status and tracking
- **Wishlist Page**: Saved products with quick-add-to-cart

#### 6. Admin Components
- **Dashboard**: Summary widgets (orders, revenue, inventory)
- **Product Manager**: Add/edit/delete products, variants
- **Inventory Uploader**: Bulk CSV/Excel upload with error reporting
- **Order Manager**: Filter by status, mark shipped, process refunds
- **Coupon Manager**: Create, view, deactivate coupon codes
- **Category Manager**: Create/edit/delete categories
- **Banner Manager**: Upload promotional banners with rotation

### API Endpoints & Data Flow

#### Product APIs
```
GET /api/products                    → List all products with pagination
GET /api/products/{productId}        → Get single product detail
GET /api/products/search?q={term}    → Search products by name/desc
GET /api/categories                  → List all categories
GET /api/products/filter?...         → Apply filters (age, price, category)
GET /api/products/{id}/related       → Get related products
```

#### Cart APIs
```
POST /api/cart/add                   → Add item to cart (localStorage)
POST /api/cart/update/{variantId}    → Update quantity
POST /api/cart/remove/{variantId}    → Remove item
POST /api/cart/apply-coupon          → Apply coupon code
GET /api/cart                        → Get cart contents
POST /api/cart/clear                 → Clear cart (post-order)
```

#### Order APIs
```
POST /api/orders/create              → Create new order from cart
GET /api/orders                      → List user's orders
GET /api/orders/{orderId}            → Get order details
POST /api/orders/{orderId}/track     → Get tracking info from courier
```

#### User APIs
```
POST /api/auth/register              → Create user account
POST /api/auth/login                 → Authenticate user
POST /api/auth/logout                → Clear session
GET /api/user/profile                → Get user info
PUT /api/user/profile                → Update user info
```

#### Admin APIs
```
POST /api/admin/products             → Create product
PUT /api/admin/products/{id}         → Update product
DELETE /api/admin/products/{id}      → Delete product
POST /api/admin/inventory/upload     → Bulk upload inventory
GET /api/admin/orders                → List all orders
POST /api/admin/orders/{id}/ship     → Mark order shipped
POST /api/admin/orders/{id}/refund   → Process refund
POST /api/admin/coupons              → Create coupon
GET /api/admin/coupons               → List coupons
POST /api/admin/categories           → Create category
POST /api/admin/banners              → Upload banner
```


---

## Data Models

### Firestore Collections Structure

#### 1. `products` Collection
```javascript
{
  productId: "prod_001",
  name: "Wooden Building Blocks Set",
  description: "100-piece educational building set...",
  categoryId: "cat_001",
  basePrice: 499,
  ageRating: "3-8",
  features: ["Educational", "Eco-friendly", "Durable"],
  materials: "FSC Certified Wood",
  safetyInfo: "CE Certified, Non-toxic paint",
  imageUrl: "gs://bucket/products/prod_001/main.jpg",
  thumbnails: ["gs://bucket/products/prod_001/thumb1.jpg", ...],
  variants: [
    {
      variantId: "var_001",
      skuId: "SKU-001-S-RED",
      size: "Small",
      color: "Red",
      price: 399,
      stock: 45
    },
    {
      variantId: "var_002",
      skuId: "SKU-001-L-BLUE",
      size: "Large",
      color: "Blue",
      price: 599,
      stock: 32
    }
  ],
  discount: {
    type: "percentage",  // "percentage" | "fixed"
    value: 10,
    active: true
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "admin_user_id"
}
```

#### 2. `users` Collection
```javascript
{
  userId: "user_001",
  email: "john@example.com",
  phone: "+919876543210",
  name: "John Doe",
  passwordHash: "bcrypt_hashed_password",
  isAdmin: false,
  createdAt: Timestamp,
  lastLogin: Timestamp,
  status: "active"  // "active" | "suspended"
}
```

#### 3. `orders` Collection
```javascript
{
  orderId: "order_001",
  userId: "user_001",
  items: [
    {
      productId: "prod_001",
      variantId: "var_001",
      skuId: "SKU-001-S-RED",
      quantity: 2,
      unitPrice: 399,
      lineTotal: 798
    }
  ],
  subtotal: 798,
  shippingFee: 50,
  taxAmount: 96,
  discount: 80,  // From coupons/discounts
  total: 864,
  shippingAddress: {
    name: "John Doe",
    phone: "+919876543210",
    address: "123 Main St",
    city: "Chennai",
    state: "Tamil Nadu",
    postalCode: "600004",
    region: "local"  // "local" | "tamilnadu" | "allindia"
  },
  shippingMethod: "local",  // "local" | "tamilnadu" | "allindia"
  trackingNumber: "TR123456",
  couponCode: "SAVE10",
  paymentMethod: "upi",
  paymentStatus: "confirmed",  // "pending" | "confirmed" | "failed" | "refunded"
  upiTransactionId: "UPI123456",
  orderStatus: "confirmed",  // "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  createdAt: Timestamp,
  shippedAt: Timestamp,
  deliveredAt: Timestamp,
  notes: "Handle with care"
}
```

#### 4. `coupons` Collection
```javascript
{
  couponId: "coupon_001",
  code: "SAVE10",
  discountType: "percentage",  // "percentage" | "fixed"
  discountValue: 10,
  expiryDate: Timestamp,
  usageLimit: 100,
  usageCount: 45,
  minOrderValue: 500,
  applicableCategories: ["cat_001", "cat_002"],  // Empty = all
  active: true,
  createdAt: Timestamp,
  createdBy: "admin_user_id"
}
```

#### 5. `categories` Collection
```javascript
{
  categoryId: "cat_001",
  name: "Building Blocks",
  description: "Educational and creative building toys",
  icon: "🧩",
  imageUrl: "gs://bucket/categories/cat_001.jpg",
  productCount: 12,
  displayOrder: 1,
  createdAt: Timestamp
}
```

#### 6. `banners` Collection
```javascript
{
  bannerId: "banner_001",
  title: "Summer Sale - 30% Off",
  imageUrl: "gs://bucket/banners/banner_001.jpg",
  linkType: "product",  // "product" | "category" | "external"
  linkId: "prod_001",
  displayOrder: 1,
  active: true,
  createdAt: Timestamp,
  createdBy: "admin_user_id"
}
```

#### 7. `inventory_logs` Collection
```javascript
{
  logId: "log_001",
  skuId: "SKU-001-S-RED",
  previousStock: 50,
  newStock: 45,
  changeReason: "order_placed",  // "order_placed" | "order_cancelled" | "bulk_upload" | "manual_adjustment"
  orderId: "order_001",  // Optional
  quantityChanged: 5,
  uploadFileId: "upload_123",  // For bulk uploads
  uploadedBy: "admin_user_id",
  uploadedAt: Timestamp
}
```

#### 8. `shipping_integrations` Collection
```javascript
{
  integrationId: "integration_001",
  provider: "shiprocket",  // "shiprocket" | "ecom_express" | etc
  region: "local",  // "local" | "tamilnadu" | "allindia"
  baseCost: 0,
  estimatedDays: 1,
  apiKey: "encrypted_api_key",
  active: true,
  lastSyncedAt: Timestamp
}
```

### LocalStorage Schema (Client-Side)

#### Cart (Persisted across sessions until checkout)
```javascript
// localStorage.setItem('punnagai_cart', JSON.stringify({
cart: [
  {
    productId: "prod_001",
    variantId: "var_001",
    quantity: 2,
    price: 399
  }
],
updatedAt: timestamp
// }))
```

#### Wishlist (Cleared on logout)
```javascript
// sessionStorage.setItem('punnagai_wishlist', JSON.stringify({
wishlist: [
  { productId: "prod_001" },
  { productId: "prod_005" }
],
updatedAt: timestamp
// }))
```

#### Session User
```javascript
// sessionStorage.setItem('punnagai_user', JSON.stringify({
user: {
  userId: "user_001",
  email: "john@example.com",
  name: "John Doe",
  isAdmin: false
},
sessionToken: "firebase_auth_token"
// }))
```

### Data Relationships

```
products (1) ──── (many) orders
  ├─ productId FK
  └─ variants[].variantId

users (1) ──── (many) orders
  ├─ userId FK

orders (many) ──── (1) coupons
  ├─ couponId FK

categories (1) ──── (many) products
  ├─ categoryId FK

inventory_logs (many) ──── (1) products.variants
  ├─ skuId FK

banners (many) → products OR categories
  ├─ linkId (flexible)
```

---

## UI/UX Components and User Flows

### Key User Flows

#### 1. Customer Shopping Flow
```
Home Page → Browse/Filter → Product Detail → Cart → Checkout → Payment → Order Confirmation
```

#### 2. Customer Account Flow
```
Sign Up/Login → Account Page → View Orders → Track Shipment → Contact Support
```

#### 3. Admin Inventory Management Flow
```
Admin Dashboard → Inventory Section → Download Template → Update Excel → Upload File → Validation → Confirmation
```

#### 4. Admin Order Management Flow
```
Admin Dashboard → Orders List → Filter by Status → Select Order → Mark Shipped/Refund → Notification Sent
```

### Design Principles

- **Color Palette**: Warm, playful colors (primary: vibrant orange, secondary: sky blue, accents: green, purple)
- **Typography**: Fredoka for headings (friendly, rounded), Nunito for body (readable, clean)
- **Imagery**: High-quality product photos, colorful category icons
- **Spacing**: Generous whitespace, mobile-first responsive grid
- **Accessibility**: WCAG 2.1 AA compliant (alt text, keyboard nav, sufficient contrast)

---

## Correctness Properties

This section contains property-based testing properties that will be used to verify the system's correctness across various scenarios.


*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Category Filter Produces Correct Subset
*For any* product catalog and any selected category, the filtered product list SHALL contain only products matching that category, and the filtered count SHALL be less than or equal to the original product count.

**Validates: Requirements 1.2**

### Property 2: Search Results Match Query
*For any* search query and product catalog, all returned search results SHALL contain the search term in either the product name or description, and the result set SHALL be a subset of all available products.

**Validates: Requirements 1.3**

### Property 3: Filter Count Accuracy
*For any* combination of filters (age group, price range, category) applied to the product catalog, the displayed product count SHALL equal the actual number of products matching all filter criteria.

**Validates: Requirements 1.5**

### Property 4: Sort Idempotence
*For any* product list and any sort order (popularity, price, newest, rating), applying the sort twice SHALL produce identical results as applying it once.

**Validates: Requirements 1.6**

### Property 5: Variant Count Matches Display
*For any* product with variants, the number of displayed variant options (size × color combinations) SHALL equal the number of unique SKUs created for that product.

**Validates: Requirements 2.3**

### Property 6: Variant Price Update Round-Trip
*For any* product with multiple variants, selecting variant A then variant B then variant A again SHALL result in identical pricing and product information each time variant A is displayed.

**Validates: Requirements 2.4**

### Property 7: Add to Cart Increases Count
*For any* item added to an empty cart, the cart item count SHALL increase by the quantity added, and the item SHALL appear in the cart contents.

**Validates: Requirements 3.1**

### Property 8: Quantity Modification Reflects Accurately
*For any* item in the cart and any quantity modification within stock limits, the cart SHALL update the displayed quantity and recalculate the line total correctly.

**Validates: Requirements 3.2**

### Property 9: Cart Total Equals Line Item Sum
*For any* shopping cart, the cart total SHALL equal the sum of all line items (quantity × unit price) minus any applicable coupon or discount amounts, with no unexplained differences.

**Validates: Requirements 3.4**

### Property 10: Coupon Validation Consistency
*For any* coupon code entered at checkout, the system behavior SHALL be consistent: valid coupons within expiration and usage limits SHALL apply a discount, while expired or invalid coupons SHALL be rejected with an appropriate error message.

**Validates: Requirements 3.7**

### Property 11: Cart Persistence Round-Trip
*For any* shopping cart with items, closing the browser session and reopening it without clearing LocalStorage SHALL restore the cart with identical items, quantities, and prices.

**Validates: Requirements 3.9**

### Property 12: Add to Wishlist Increases Count
*For any* product added to the wishlist, the wishlist item count SHALL increase by one, and the product SHALL appear when viewing the wishlist page.

**Validates: Requirements 4.1, 4.2**

### Property 13: Wishlist Cleared on Logout
*For any* user session with a non-empty wishlist, logging out and logging back in SHALL result in an empty wishlist for the next session, regardless of the previous wishlist contents.

**Validates: Requirements 4.5**

### Property 14: Email and Phone Validation
*For any* email address and phone number, the registration validation SHALL accept valid formats (standard email RFC 5322, Indian phone numbers starting with +91 or 0, 10 digits) and reject invalid formats consistently.

**Validates: Requirements 5.2**

### Property 15: Shipping Methods Match Region
*For any* valid postal code entered during checkout, the system SHALL determine the region (local, Tamil Nadu, or all-India) consistently, and display only shipping methods available for that region.

**Validates: Requirements 6.4, 7.1**

### Property 16: Order Status Transitions Follow Rules
*For any* order, the status transition from "pending" to "confirmed" (after successful UPI payment) SHALL always occur, and subsequent transitions SHALL follow the allowed sequence: confirmed → shipped → delivered.

**Validates: Requirements 6.8**

### Property 17: Cart Clears After Checkout
*For any* successful order completion (payment confirmed), the shopping cart in LocalStorage SHALL be cleared, and the next page load SHALL show an empty cart.

**Validates: Requirements 6.11**

### Property 18: Local Delivery Cost is Free
*For any* order with local delivery option selected in the local delivery zone, the shipping fee displayed and charged SHALL be exactly 0 (zero), regardless of order value or item count.

**Validates: Requirements 7.5**

### Property 19: SKU Creation for Variants
*For any* product with N sizes and M colors, the system SHALL create exactly N × M unique SKUs (one for each size-color combination), with each SKU having independent pricing and stock tracking.

**Validates: Requirements 8.3**

### Property 20: Variant Stock Visibility Rule
*For any* product variant with zero inventory, that variant SHALL not be displayed as a selectable option on the product detail page or during checkout, while variants with stock > 0 SHALL remain visible.

**Validates: Requirements 9.5**

### Property 21: Refund Inventory Restoration
*For any* refunded order, the inventory for each item in that order SHALL be increased by the refunded quantity, such that total inventory matches warehouse expectations.

**Validates: Requirements 10.6**

### Property 22: Coupon Expiration Validation
*For any* coupon code applied at checkout, if the current date is after the coupon's expiration date or the usage count exceeds the limit, the system SHALL reject the coupon and display an error, and if the coupon is valid, it SHALL apply the discount.

**Validates: Requirements 11.6, 11.8**

### Property 23: Admin Operations Create Audit Log
*For any* admin operation (create, update, delete product; upload inventory; mark order shipped; process refund), the system SHALL create an audit log entry with timestamp, admin user ID, operation type, and relevant entity details.

**Validates: Requirements 17.8**

---

## Error Handling

### Error Categories and Recovery

#### 1. Input Validation Errors
| Error | Trigger | Recovery |
|-------|---------|----------|
| Invalid Email Format | Signup with malformed email | Show inline error, prevent submission |
| Invalid Phone Number | Signup with wrong format | Show inline error (expects 10 digits) |
| Empty Search Query | Submit empty search field | Show "Enter a search term" message |
| Out of Stock Quantity | Request quantity > available stock | Reduce quantity to max available, show message |
| Invalid Coupon Code | Apply non-existent or expired coupon | Display "Coupon code not found or expired" |

#### 2. Payment Errors
| Error | Trigger | Recovery |
|-------|---------|----------|
| Payment Gateway Timeout | UPI gateway doesn't respond within 30s | Retry payment, fall back to cached data |
| Payment Failed | Customer cancels or insufficient funds | Display error, allow retry with different UPI ID |
| Payment Already Processed | Duplicate submission within 2 seconds | Detect and prevent duplicate orders |
| Refund Failed | UPI gateway refund API returns error | Log error, allow admin to retry |

#### 3. Database/API Errors
| Error | Trigger | Recovery |
|-------|---------|----------|
| Firestore Connection Failed | Network unavailable or Firebase down | Show offline message, enable cached content |
| Product Not Found | Requested product ID doesn't exist | Redirect to shop with message "Product no longer available" |
| Order Not Found | Invalid order ID in URL | Redirect to account page with "Order not found" |
| Courier API Unavailable | Shipping provider API is down | Display cached default shipping costs and estimate |
| Google Maps API Failed | Maps API not responsive | Display store address text + WhatsApp link |

#### 4. Business Logic Errors
| Error | Trigger | Recovery |
|-------|---------|----------|
| Cannot Delete Product | Trying to delete while linked to orders | Show message "Cannot delete. Archive instead?" |
| Inventory Mismatch | Bulk upload SKU not found | Show row number and SKU in error report, halt upload |
| Insufficient Inventory for Shipped Order | Inventory depleted after order placed | Alert admin, allow admin decision to split/cancel |
| Duplicate Email Registration | Email already exists in system | Show "Email already registered. Use login instead." |

#### 5. Admin Panel Errors
| Error | Trigger | Recovery |
|-------|---------|----------|
| Invalid CSV Format | Missing required columns in upload file | Download template, show required columns |
| File Too Large | Upload > 10 MB | Show "File too large. Max 10 MB allowed." |
| Unauthorized Operation | Non-admin user tries admin action | Log attempt, show "Access Denied" |
| Category Has Products | Trying to delete category with products | Show count of products, offer to reassign |

### Error Messaging Guidelines
- Use user-friendly language, avoid technical jargon
- Include action item (what user can do next)
- Show errors inline near input fields where possible
- Log all errors server-side for debugging
- Never expose Firebase error details to users
- Provide support contact info for persistent errors

---

## Testing Strategy

### Overview

The Punnagai Toys e-commerce platform uses a dual testing approach:

1. **Property-Based Tests**: Verify universal correctness properties across generated inputs
2. **Unit Tests**: Verify specific examples and edge cases with concrete data
3. **Integration Tests**: Verify Firebase connectivity, payment gateway interactions, courier APIs
4. **End-to-End Tests**: Verify complete user flows (shopping, checkout, admin operations)

### Property-Based Testing

**Framework**: [fast-check](https://github.com/dubzzz/fast-check) (JavaScript)

**Configuration**: Minimum 100 iterations per property test

**Property Test Examples**:

#### Property 1 Test: Category Filter Correctness
```javascript
// Feature: punnagai-ecommerce, Property 1: Category Filter Produces Correct Subset
fc.assert(
  fc.property(
    fc.array(fc.record({
      productId: fc.string(),
      categoryId: fc.string(),
      name: fc.string()
    }), { minLength: 1, maxLength: 50 }),
    fc.string(),
    (products, selectedCategory) => {
      const filtered = filterProductsByCategory(products, selectedCategory);
      const allMatch = filtered.every(p => p.categoryId === selectedCategory);
      const countCorrect = filtered.length <= products.length;
      return allMatch && countCorrect;
    }
  ),
  { numRuns: 100 }
);
```

#### Property 9 Test: Cart Total Accuracy
```javascript
// Feature: punnagai-ecommerce, Property 9: Cart Total Equals Line Item Sum
fc.assert(
  fc.property(
    fc.array(fc.record({
      quantity: fc.integer({ min: 1, max: 100 }),
      unitPrice: fc.integer({ min: 1, max: 10000 })
    }), { minLength: 0, maxLength: 20 }),
    fc.integer({ min: 0, max: 50 }),  // discount percentage
    (items, discountPercent) => {
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const discount = Math.floor(subtotal * discountPercent / 100);
      const expectedTotal = subtotal - discount;
      const calculatedTotal = calculateCartTotal(items, discountPercent);
      return calculatedTotal === expectedTotal;
    }
  ),
  { numRuns: 100 }
);
```

#### Property 11 Test: Cart Persistence Round-Trip
```javascript
// Feature: punnagai-ecommerce, Property 11: Cart Persistence Round-Trip
fc.assert(
  fc.property(
    fc.array(fc.record({
      productId: fc.string(),
      variantId: fc.string(),
      quantity: fc.integer({ min: 1, max: 10 }),
      price: fc.integer({ min: 1, max: 5000 })
    }), { minLength: 0, maxLength: 20 }),
    (cartItems) => {
      // Save cart
      saveCartToLocalStorage(cartItems);
      // Simulate browser close by clearing in-memory cart
      clearMemoryCart();
      // Restore cart
      const restoredCart = loadCartFromLocalStorage();
      // Compare
      return JSON.stringify(restoredCart) === JSON.stringify(cartItems);
    }
  ),
  { numRuns: 100 }
);
```

#### Property 19 Test: SKU Creation Combinatorics
```javascript
// Feature: punnagai-ecommerce, Property 19: SKU Creation for Variants
fc.assert(
  fc.property(
    fc.array(fc.string(), { minLength: 1, maxLength: 5 }),  // sizes
    fc.array(fc.string(), { minLength: 1, maxLength: 5 }),  // colors
    (sizes, colors) => {
      const skus = generateSKUs(sizes, colors);
      const expectedCount = sizes.length * colors.length;
      const uniqueSkus = new Set(skus).size;
      return skus.length === expectedCount && uniqueSkus === expectedCount;
    }
  ),
  { numRuns: 100 }
);
```

### Unit Tests

**Framework**: Jest (JavaScript)

**Key Unit Test Areas**:
- Product filtering by age group, price range, category
- Search term matching in product names and descriptions
- Cart calculations (line totals, discounts, taxes)
- Coupon validation (format, expiration, usage limit)
- Address validation (postal code format, region determination)
- Email and phone validation
- SKU generation logic
- Order status state machine

**Example Unit Test**:
```javascript
describe('Cart Total Calculation', () => {
  test('should calculate total with discount correctly', () => {
    const items = [
      { quantity: 2, price: 500 },
      { quantity: 1, price: 300 }
    ];
    const discount = 100;
    const total = calculateCartTotal(items, discount);
    expect(total).toBe(1100);  // (2*500 + 1*300) - 100
  });

  test('should not allow negative total', () => {
    const items = [{ quantity: 1, price: 100 }];
    const discount = 200;
    const total = calculateCartTotal(items, discount);
    expect(total).toBe(0);  // Floor at 0
  });
});
```

### Integration Tests

**Framework**: Firebase Emulator Suite + Jest

**Key Integration Test Areas**:
- Firestore CRUD operations (products, orders, users, coupons)
- Firebase Authentication (signup, login, logout)
- Payment gateway UPI redirect and callback
- Courier API shipping rate fetching
- Google Maps API reviews fetching
- Cart persistence to localStorage

**Example Integration Test**:
```javascript
describe('Firestore Product Operations', () => {
  beforeAll(async () => {
    // Initialize Firebase Emulator
    await initializeFirebaseEmulator();
  });

  test('should create and retrieve product', async () => {
    const productData = {
      name: 'Test Product',
      categoryId: 'cat_001',
      price: 500
    };
    const docRef = await addProduct(productData);
    const product = await getProduct(docRef.id);
    expect(product.name).toBe('Test Product');
  });

  test('should update product price', async () => {
    const productId = 'prod_001';
    await updateProductPrice(productId, 600);
    const product = await getProduct(productId);
    expect(product.basePrice).toBe(600);
  });
});
```

### End-to-End Tests

**Framework**: Cypress or Playwright

**Key E2E Test Flows**:
1. Browse and filter products → Add to cart → Checkout → Pay via UPI → Order confirmation
2. Sign up → Add to wishlist → Add to cart → Checkout → View order history
3. Admin: Create product → Upload inventory → Create coupon → Mark order shipped
4. Search functionality → Filter results → Navigate between pages
5. Mobile responsiveness → Navigation → Touch interactions

**Example E2E Test**:
```javascript
describe('Complete Shopping Flow', () => {
  it('should complete checkout and show order confirmation', () => {
    cy.visit('/shop');
    cy.contains('Building Blocks').click();
    cy.get('.add-to-cart-btn').click();
    cy.visit('/cart');
    cy.get('.proceed-checkout-btn').click();
    cy.get('[data-testid="address-input"]').type('123 Main St');
    cy.get('[data-testid="shipping-method"]').select('local');
    cy.get('.proceed-payment-btn').click();
    // Mock UPI payment success
    cy.get('[data-testid="order-confirmation"]').should('be.visible');
    cy.contains('Order Confirmed').should('exist');
  });
});
```

### Performance Testing

**Metrics to Monitor**:
- First Contentful Paint (FCP): < 1.5s on 4G
- Largest Contentful Paint (LCP): < 2.5s on 4G
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 3.5s on 4G
- Product search latency: < 200ms
- Checkout completion: < 5s

**Tools**: Lighthouse, WebPageTest, Firebase Analytics

### Coverage Goals

- **Unit Tests**: 80% code coverage for business logic
- **Property Tests**: All 23 properties implemented with minimum 100 runs each
- **Integration Tests**: All external APIs (Firebase, UPI, courier, Maps)
- **E2E Tests**: All critical user journeys

---

## Error Handling & Security

### Error Recovery

#### Network and Availability
- Offline detection using navigator.onLine
- Graceful degradation when APIs unavailable
- Cached product data for 1-hour to serve offline requests
- Retry mechanisms for failed requests (exponential backoff)

#### Payment Processing
- PCI compliance via UPI gateway (Razorpay/PayU)
- No card/payment data stored client-side
- Payment status polling until confirmation
- Webhook verification for payment confirmation

#### Data Consistency
- Transactional order creation (all-or-nothing)
- Inventory reservation during checkout
- Audit logging for all inventory changes
- Duplicate order detection within 5-minute window

### Security

### Payment Security

**PCI DSS Compliance**:
- No payment card data handled by our application
- UPI gateway (Razorpay/PayU) handles all sensitive data
- Client-side JavaScript never touches payment credentials
- HTTPS enforced for all payment flows
- Payment status verified via server-side webhook validation

**UPI Payment Flow**:
1. Customer clicks "Pay Now"
2. Server generates secure payment order with unique ID
3. Client redirects to UPI gateway
4. UPI gateway handles payment authentication
5. Payment gateway redirects back to callback URL
6. Server validates webhook signature before processing
7. Order marked as "Confirmed" only after server-side verification

### Authentication & Authorization

**User Authentication**:
- Firebase Authentication for email/password signup and login
- Session tokens stored in sessionStorage (not localStorage for security)
- Automatic logout after 24 hours of inactivity
- Password requirements: minimum 8 characters, uppercase, number, special character
- Rate limiting on login attempts (5 attempts/15 minutes)

**Admin Authorization**:
- Separate admin role flag in Firestore `users` collection
- Admin routes protected by role-based access checks
- All admin operations logged with user ID and timestamp
- Multi-factor authentication recommended (future enhancement)

### Data Protection

**Customer Data**:
- No addresses stored persistently (provided at checkout only)
- Orders encrypted in transit (TLS 1.2+)
- Firestore security rules enforce user-only access to their data
- PII (phone, email) not exposed in API responses unless needed
- Data retention: Orders kept for 2 years for legal compliance

**Firebase Security Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products readable by all
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Orders readable only by owner or admin
    match /orders/{orderId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if isAuthenticated();
      allow update: if isAdmin();
    }
    
    // Users readable only by self
    match /users/{userId} {
      allow read: if request.auth.uid == userId || isAdmin();
      allow create: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId || isAdmin();
    }
    
    // Admin collections
    match /coupons/{couponId} {
      allow read: if true;  // For validation
      allow write: if isAdmin();
    }
    
    match /inventory_logs/{logId} {
      allow write: if isAdmin();
      allow read: if isAdmin();
    }
  }
  
  function isAuthenticated() {
    return request.auth != null;
  }
  
  function isOwner(userId) {
    return request.auth.uid == userId;
  }
  
  function isAdmin() {
    return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
  }
}
```

### Input Validation & Sanitization

**Client-Side**:
- Email format validation (RFC 5322)
- Phone number format validation (10 digits, starts with 0 or +91)
- Postal code format validation (6 digits for Indian ZIP codes)
- Product search term sanitized to prevent XSS
- Remove HTML/script tags from user input

**Server-Side** (Firestore Functions):
- All input re-validated server-side regardless of client validation
- Quantity checked against available inventory
- Coupon code checked for validity and expiration
- Address format validated before order creation
- Webhook signatures verified for payment confirmations

### API Security

**Rate Limiting**:
- Search API: 100 requests/minute per IP
- Checkout API: 10 requests/minute per user
- Coupon validation: 5 requests/minute per user
- Admin upload: 1 request/minute per user

**CORS Policy**:
- Restrict to single domain (www.punnaagitoystore.com)
- No credentials allowed from cross-origin requests
- Preflight caching: 3600 seconds

**Request Validation**:
- All POST/PUT requests require Content-Type: application/json
- Maximum request body size: 10 MB (for bulk inventory uploads)
- Request timeout: 30 seconds

### Third-Party Integration Security

**UPI Payment Gateway**:
- API key stored as environment variable (never in code)
- Webhook signature validation with HMAC-SHA256
- Test mode for development, production mode for live

**Courier APIs**:
- API credentials encrypted and stored in Firestore (restricted access)
- Tracking numbers returned only to order owner or admin
- Shipment data synced only for confirmed orders

**Google Maps**:
- API key restricted to JavaScript origin only
- API key rotated quarterly
- Reviews cached for 24 hours to reduce API quota usage

**WhatsApp Business**:
- Business phone number verified with Meta
- Messages encrypted in transit
- No sensitive payment data sent via WhatsApp

### Logging & Monitoring

**What Gets Logged**:
- All admin operations (user, timestamp, action, entity)
- Failed payment attempts (UPI transaction ID, error code)
- Failed authentication (email, IP, time)
- Suspicious activities (multiple failed checkouts, unusual order patterns)
- All Firestore write operations

**What Never Gets Logged**:
- Passwords or password attempts
- Full payment credentials
- Full addresses (only first line and postal code)
- Sensitive customer data

**Monitoring**:
- Set up alerts for: failed payments > 5 in 1 hour, admin changes > 10 in 1 minute, authentication failures > 20 in 1 minute
- Weekly security audit logs review
- Monthly vulnerability assessment

### SSL/TLS & HTTPS

- HTTPS enforced on all pages (redirect HTTP → HTTPS)
- SSL certificate from Let's Encrypt (free, auto-renewal)
- Minimum TLS 1.2, prefer TLS 1.3
- HSTS header: max-age=31536000; includeSubDomains
- No mixed content (all resources over HTTPS)

---

## Performance & Scalability

### Performance Optimization

**Frontend Optimization**:
- Lazy load product images (Intersection Observer API)
- Code splitting for admin panel (separate bundle)
- Minify and compress JavaScript (webpack)
- CSS critical path inline in <head>
- Defer non-critical JavaScript with async/defer attributes
- Image optimization: WebP format with JPEG fallback

**Caching Strategy**:
- Product data: 1 hour in-memory cache
- Category data: 1 day in-memory cache
- Google Maps reviews: 24-hour cache
- Shipping rates: 1-hour cache (refresh on postal code change)
- Browser cache: 30 days for images, 1 day for HTML

**Search Optimization**:
- Full-text search index on product names and descriptions
- Autocomplete with top 5 results (cached)
- Faceted search with category/price filters
- Results sorted by relevance (Firestore FTS scoring)

### Scalability

**Expected Traffic**:
- 20,000 monthly visitors
- 500 orders/month initially, scaling to 2,000+/month
- Peak traffic: 50 concurrent users (holidays/sales)

**Firestore Scaling**:
- Collections partitioned by region for parallel reads
- Composite indexes for complex filters (age + price + category)
- Read quota: 50k reads/day (scales automatically)
- Write quota: 20k writes/day (scales automatically)

**Image Hosting**:
- Firebase Storage with automatic CDN
- Images served from nearest edge location
- Automatic image optimization (WebP, resizing)
- Backup to AWS S3 for disaster recovery

**Database Scaling**:
- Move to Cloud SQL (MySQL) if Firestore becomes bottleneck
- Read replicas for reporting queries
- Connection pooling for batch operations

### Load Testing Scenarios

1. **Browse Scenario** (60% of traffic):
   - Load product list (12 items)
   - Click product detail
   - Apply filters
   - Search products

2. **Purchase Scenario** (25% of traffic):
   - Add to cart
   - Proceed to checkout
   - Apply coupon
   - Complete payment

3. **Admin Scenario** (10% of traffic):
   - View orders dashboard
   - Upload inventory file
   - Create coupon
   - Mark orders shipped

4. **Spike Scenario** (5% of traffic):
   - Sale announcement: 100 concurrent users
   - Product launch: 50 concurrent users browsing

---

## Deployment & DevOps

### Development Environment

**Stack**:
- Local dev server: `npm run dev` (serves on http://localhost:3000)
- Firebase Emulator Suite for local testing
- Hot reload enabled for rapid development
- Mock data for testing without Firebase

**Setup**:
```bash
git clone <repo>
cd punnagai-shop
npm install
npm run dev
# Follow firebase-config.js setup steps
```

### Staging Environment

**Setup**:
- Firebase project: `punnagai-toys-staging`
- Separate Firestore database for staging data
- UPI payment gateway in sandbox mode
- Test courier accounts (no real shipments)

**Deployment**:
```bash
npm run build:staging
firebase deploy --project punnagai-toys-staging
```

### Production Environment

**Setup**:
- Firebase project: `punnagai-toys-production`
- Production Firestore database
- UPI payment gateway in live mode
- Real courier API credentials

**Deployment Process**:
1. Code review & approval
2. Run full test suite (unit, integration, E2E)
3. Build production bundle
4. Deploy to staging for final verification
5. Deploy to production
6. Monitor alerts and metrics for 1 hour

```bash
npm run build:prod
firebase deploy --project punnagai-toys-production --only hosting
```

### CI/CD Pipeline

**GitHub Actions Workflow**:
```yaml
name: Test & Deploy
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:property
      - run: npm run test:integration
      - run: npm run build
      
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: punnagai-toys-production
```

### Monitoring & Alerts

**Metrics to Monitor**:
- Page load time (target: < 2 seconds)
- Checkout completion rate (target: > 2%)
- Payment success rate (target: > 95%)
- Error rate (target: < 1%)
- API latency (target: < 500ms)
- Database reads/writes usage
- Storage usage
- Admin activity

**Alert Thresholds**:
- Page load time > 5 seconds
- Payment success rate < 90%
- Error rate > 5%
- API latency > 2 seconds
- Database quota > 80%
- Uncaught exceptions > 10/hour

**Tools**: Google Cloud Monitoring, Firebase Console, Sentry (error tracking)

### Backup & Disaster Recovery

**Backup Strategy**:
- Automated daily Firestore exports to Cloud Storage
- Weekly export backup to AWS S3
- Database snapshots retained for 30 days
- Images backed up to AWS S3 (replicated to multiple regions)

**Recovery Plan**:
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 day
- Restore procedure documented and tested monthly
- Rollback to previous Firebase version if deployment fails
- DNS failover to backup domain if primary unavailable

---

## Migration & Launch Plan

### Pre-Launch Checklist

- [ ] Firebase project created and configured
- [ ] SSL certificate installed
- [ ] Payment gateway live account activated
- [ ] Courier integrations tested with real APIs
- [ ] All acceptance criteria verified
- [ ] Security audit completed
- [ ] Load testing completed (50 concurrent users)
- [ ] Performance targets met (< 2s page load)
- [ ] All 23 property-based tests passing with 100+ runs each
- [ ] E2E tests all passing
- [ ] Admin user account created
- [ ] Sample product data (50 products, 5 categories) loaded
- [ ] Email templates configured
- [ ] Analytics and error tracking configured
- [ ] Documentation complete

### Soft Launch (Beta)

- Limited to invited users (10-20 customers)
- Monitor for errors and UX issues
- Collect feedback on checkout flow
- Test refund process
- Verify payment reconciliation
- Duration: 1 week

### Full Launch

- Public announcement via WhatsApp, email
- Monitor all metrics closely
- Have support team on standby
- Plan promotional sale after 1 week (confidence check)
- Document lessons learned

---

## Assumptions & Constraints

### Assumptions

1. Customers have internet connectivity (broadband or mobile data)
2. Customers comfortable with UPI payments (ubiquitous in India)
3. Admin staff can operate simple CSV/Excel uploads
4. Courier APIs remain stable and responsive
5. Payment gateway has > 99% uptime
6. Firebase scales adequately for expected traffic

### Constraints

1. **Tech Stack Locked**: Vanilla JS, HTML, CSS + Firebase (no backend server)
2. **Single Admin User Initially**: Can scale to multi-admin in future
3. **No In-App Reviews**: Only Google Maps reviews shown
4. **UPI Only**: No credit card or other payment methods initially
5. **India Only**: Shipping limited to India regions
6. **No Real-Time Inventory**: Inventory synced weekly via bulk uploads
7. **No Mobile App**: Web-only initially (responsive design covers mobile)

### Future Enhancements

1. Mobile app (React Native)
2. In-app product reviews and ratings
3. Wishlist persistence (currently session-only)
4. Multiple payment methods (credit card, wallet)
5. International shipping
6. Real-time inventory integration
7. Customer support chatbot
8. Recommendation engine (ML-based)
9. Subscription/loyalty program
10. Inventory forecasting and demand planning

---

## Design Review Checklist

- [ ] Architecture aligns with requirements (17 requirements covered)
- [ ] All 23 correctness properties are testable and property-based friendly
- [ ] Data models support all required queries and operations
- [ ] Security measures address PCI compliance, authentication, authorization
- [ ] Error handling covers all identified failure scenarios
- [ ] Performance targets are realistic and measurable
- [ ] Scalability plan addresses 20k monthly visitors
- [ ] Deployment process is automated and repeatable
- [ ] Monitoring and alerting are comprehensive
- [ ] Recovery procedures are documented and tested
- [ ] All stakeholders have reviewed and approved

---

## Next Steps

1. **Requirements Validation**: Confirm all requirements with product owner
2. **Property Test Implementation**: Begin implementing property-based tests
3. **Firebase Setup**: Create Firebase project and configure collections
4. **UI/UX Design**: Create wireframes and design system
5. **Frontend Development**: Start building HTML/CSS/JS components
6. **Payment Gateway Integration**: Set up UPI gateway (Razorpay/PayU)
7. **Admin Panel**: Develop admin dashboard and bulk upload feature
8. **Testing**: Execute comprehensive test suite
9. **Launch**: Deploy to staging, then production

