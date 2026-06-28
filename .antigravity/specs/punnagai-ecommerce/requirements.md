# Punnagai Toys E-Commerce Platform — Requirements Document

## Introduction

Punnagai Toys is an established toy retailer with 10+ years of physical store operations in multiple Indian cities. This requirements document defines the e-commerce platform that will enable customers to browse and purchase 100+ toys across 20 categories with multiple variants, complete with UPI payment integration, multi-region shipping, and admin management capabilities. The platform targets parents and children, offering a modern, colorful, kid-friendly shopping experience accessible via web and WhatsApp.

## Glossary

- **System**: The Punnagai Toys e-commerce platform (web application)
- **Customer**: End user browsing or purchasing toys (parent or child)
- **Admin**: Authorized personnel managing products, inventory, orders, and discounts
- **Product**: A toy item with variants (size, color)
- **Variant**: Specific combination of size and color for a product
- **Cart**: Temporary collection of products a customer intends to purchase
- **Wishlist**: Temporary collection of favorite products (cleared on logout)
- **Inventory**: Stock levels of each product variant updated weekly from Excel
- **Order**: Completed purchase with items, shipping address, and payment confirmation
- **Coupon**: Discount code created by Admin for promotional campaigns
- **Discount**: Percentage or fixed-amount price reduction applied to products
- **SKU**: Stock Keeping Unit — unique identifier for each product variant
- **Category**: Classification grouping (e.g., Educational, Building Blocks, Outdoor)
- **UPI**: Unified Payments Interface for Indian digital payments
- **Courier**: Third-party shipping provider (local, Tamil Nadu, all-India options)
- **Admin Panel**: Secure dashboard for managing platform data and operations
- **Session**: Active user connection; cleared on logout

---

## Requirements

### Requirement 1: Browse Product Catalog with Filters and Search

**User Story:** As a customer, I want to browse 100+ toys organized in 20 categories with filters and search functionality, so that I can quickly find toys that match my needs.

#### Acceptance Criteria

1. WHEN the customer navigates to the Shop page, THE System SHALL display all available products with product name, image, price, and age rating
2. WHEN the customer clicks a category, THE System SHALL filter products to show only toys in that category
3. WHEN the customer uses the search field, THE System SHALL return products matching the search term in product name or description
4. THE System SHALL provide filters for age group (0-2, 3-5, 6-8, 9-12, 12+), price range, and category
5. WHEN a filter is applied, THE System SHALL update the displayed product list and show the count of matching products
6. WHEN the customer sorts products, THE System SHALL support sorting by popularity, price (low to high and high to low), newest arrivals, and rating
7. THE System SHALL display a minimum of 12 products per page with pagination or infinite scroll
8. WHEN products are displayed, THE System SHALL include the product name, image URL, price, and availability status (except "Out of Stock" label per business rules)
9. THE System SHALL cache product data for 1 hour to improve page load performance

**Correctness Properties:**
- *Invariant*: Product count after filtering SHALL be less than or equal to the original product count
- *Idempotence*: Applying the same filter twice SHALL produce identical results
- *Metamorphic*: If price range is narrowed, filtered product count SHALL decrease or remain the same

---

### Requirement 2: View Detailed Product Information with Variants

**User Story:** As a customer, I want to view detailed information about a toy including images, description, variants (size/color), price, and reviews, so that I can make an informed purchase decision.

#### Acceptance Criteria

1. WHEN the customer clicks on a product, THE System SHALL display the product detail page with main product image and additional variant images
2. WHEN the customer views a product detail page, THE System SHALL display product name, full description, price, age rating, and key features
3. THE System SHALL display all available variants (sizes and colors) with individual pricing and stock status per variant
4. WHEN the customer selects a variant, THE System SHALL update the price and display if that variant is in stock
5. THE System SHALL display Google Maps reviews for the store (not in-app product reviews)
6. THE System SHALL include an "Add to Cart" button and "Add to Wishlist" button on the product detail page
7. WHEN the customer navigates back to the shop from a product detail page, THE System SHALL preserve the previous filter/search state
8. THE System SHALL display related products based on category and age group at the bottom of the product detail page
9. THE System SHALL display product metadata including dimensions, materials, and safety certifications

**Correctness Properties:**
- *Round Trip*: Selecting variant A then variant B then variant A SHALL result in identical pricing and description each time
- *Invariant*: The product price SHALL remain consistent across navigation between shop and product detail pages

---

### Requirement 3: Shopping Cart Management

**User Story:** As a customer, I want to add products to my cart, adjust quantities, remove items, and view the cart total, so that I can review and modify my purchase before checkout.

#### Acceptance Criteria

1. WHEN the customer clicks "Add to Cart", THE System SHALL add the selected variant to the cart and display a confirmation message
2. WHEN an item is in the cart, THE System SHALL allow the customer to increase or decrease the quantity (minimum 1, maximum based on available stock)
3. WHEN the customer removes an item from the cart, THE System SHALL remove all quantities of that variant
4. THE System SHALL display the cart total including product prices and applicable discounts or coupons
5. WHEN the customer views the cart page, THE System SHALL display all items with product name, variant (size/color), quantity, unit price, and line total
6. THE System SHALL update the cart total in real-time when quantities change or coupons are applied
7. WHEN the customer applies a coupon code, THE System SHALL validate the code and apply the discount if valid, or display an error message if invalid
8. THE System SHALL allow the customer to proceed to checkout from the cart page
9. WHEN the customer closes the browser session without completing checkout, THE System SHALL preserve the cart contents in local storage

**Correctness Properties:**
- *Invariant*: Cart total SHALL equal the sum of all line items minus applicable discounts
- *Idempotence*: Adding the same item to cart twice then removing it once SHALL result in one item in the cart
- *Round Trip*: Add item → Modify quantity → View cart → Close browser → Reopen browser SHALL preserve all cart contents

---

### Requirement 4: Wishlist Management with Session Clearance

**User Story:** As a customer, I want to save favorite toys to a wishlist and access it later, knowing it will be cleared when I log out for privacy and a fresh start.

#### Acceptance Criteria

1. WHEN the customer clicks "Add to Wishlist" on a product, THE System SHALL add the product to the wishlist and display a confirmation message
2. WHEN the customer views the Wishlist page, THE System SHALL display all saved products with name, image, and current price
3. WHEN the customer removes an item from the wishlist, THE System SHALL immediately remove it from the display
4. THE System SHALL allow the customer to add a wishlist item to the cart directly from the wishlist page
5. WHEN the customer logs out, THE System SHALL clear all wishlist items from that user's session
6. WHEN the customer logs back in, THE System SHALL display an empty wishlist and allow building a new one
7. THE System SHALL store wishlist data in the user's session (not persistent across logout)
8. THE System SHALL display the count of wishlist items in the navigation bar

**Correctness Properties:**
- *Idempotence*: Adding the same product to wishlist twice SHALL result in one entry in the wishlist
- *State Transition*: After logout, wishlist count SHALL be zero on next login
- *Invariant*: Wishlist items SHALL be a subset of all available products

---

### Requirement 5: Customer Account Management

**User Story:** As a customer, I want to create an account, log in, and view my order history, so that I can track my purchases and manage my account.

#### Acceptance Criteria

1. WHEN the customer clicks "Sign Up", THE System SHALL display a registration form requesting name, email, phone number, and password
2. WHEN the customer submits the registration form, THE System SHALL validate the email format and phone number format
3. IF the email is already registered, THE System SHALL return an error message "Email already exists"
4. WHEN the customer successfully registers, THE System SHALL create the account and log the customer in automatically
5. WHEN the customer accesses the Login page, THE System SHALL display email and password fields
6. WHEN the customer enters incorrect credentials, THE System SHALL display an error message "Invalid email or password"
7. WHEN the customer successfully logs in, THE System SHALL store the session token and redirect to the home page
8. WHEN the customer clicks "My Orders", THE System SHALL display a list of all completed orders with order ID, date, total, and status
9. WHEN the customer clicks an order, THE System SHALL display order details including items, quantities, prices, shipping address, and tracking information
10. THE System SHALL NOT save customer addresses in the database; address is provided at checkout only
11. WHEN the customer clicks "Logout", THE System SHALL clear the session, close the wishlist, and redirect to the home page

**Correctness Properties:**
- *Invariant*: Order history SHALL contain only completed orders (not cart items)
- *Round Trip*: Register → Login → View orders → Logout → Login → View same orders SHALL produce identical order data
- *Idempotence*: Logging out twice SHALL have the same effect as logging out once

---

### Requirement 6: Checkout and UPI Payment Processing

**User Story:** As a customer, I want to enter shipping details, select delivery options, and complete payment via UPI, so that I can finalize my purchase.

#### Acceptance Criteria

1. WHEN the customer clicks "Proceed to Checkout" from the cart, THE System SHALL display a checkout page with order summary
2. WHEN the customer enters a billing address, THE System SHALL validate the address format and postal code
3. THE System SHALL NOT save the address to the customer's profile; it is used for this order only
4. WHEN the customer selects a delivery option, THE System SHALL display available shipping methods: local delivery, Tamil Nadu delivery, and all-India delivery with corresponding fees
5. WHEN the customer selects a shipping method, THE System SHALL fetch the estimated delivery date from the courier API and display it
6. WHEN the customer reviews the final order total (including items, taxes, and shipping), THE System SHALL display payment method options: UPI only
7. WHEN the customer initiates UPI payment, THE System SHALL redirect to the UPI payment gateway
8. WHEN the UPI payment is successful, THE System SHALL receive a confirmation from the payment gateway and mark the order as "Confirmed"
9. IF the UPI payment fails, THE System SHALL display an error message and allow the customer to retry or use a different UPI ID
10. WHEN the order is confirmed, THE System SHALL send a confirmation email with order ID and tracking information
11. THE System SHALL clear the cart after successful order completion

**Correctness Properties:**
- *Invariant*: Order total SHALL equal cart subtotal + shipping fee (no unexplained changes)
- *Round Trip*: Create order → Complete payment → Fetch order details SHALL return matching order data
- *State Machine*: Order state transitions SHALL follow: Cart → Checkout → Payment Processing → Confirmed

---

### Requirement 7: Multi-Region Shipping Integration

**User Story:** As a customer, I want to select from multiple shipping options (local, Tamil Nadu, all-India) with transparent pricing and delivery timelines, so that I can choose the most suitable option.

#### Acceptance Criteria

1. WHEN the customer enters a postal code during checkout, THE System SHALL determine the region (local, Tamil Nadu, or all-India)
2. THE System SHALL display shipping options available for that region with associated costs and estimated delivery times
3. WHEN the customer selects a shipping option, THE System SHALL call the courier API to fetch real-time shipping cost and delivery estimate
4. IF the courier API is unavailable, THE System SHALL display a cached default shipping cost and estimate
5. THE System SHALL display local delivery as free for orders within the local delivery zone
6. WHEN the customer completes the order, THE System SHALL create a shipment record in the courier system with the order details
7. WHEN the shipment is created, THE System SHALL generate a tracking number and display it to the customer
8. THE System SHALL allow the customer to track the shipment using the tracking number
9. THE System SHALL send the customer a tracking link via email when the order ships

**Correctness Properties:**
- *Invariant*: Shipping cost SHALL be non-negative for all regions
- *Idempotence*: Entering the same postal code twice SHALL result in the same available shipping options
- *Round Trip*: Create shipment → Fetch tracking → Query courier API SHALL return matching tracking information

---

### Requirement 8: Admin Panel — Product Management

**User Story:** As an admin, I want to add, edit, and delete products, manage variants (sizes and colors), and set pricing, so that I can keep the catalog up-to-date.

#### Acceptance Criteria

1. WHEN the admin accesses the Admin Panel, THE System SHALL display a dashboard with options for Products, Orders, Inventory, Discounts, and Coupons
2. WHEN the admin clicks "Add Product", THE System SHALL display a form to enter product name, description, category, age rating, and base price
3. WHEN the admin enters product details, THE System SHALL create SKUs for each variant combination (size × color) with individual pricing
4. WHEN the admin uploads product images, THE System SHALL store them securely and generate optimized thumbnails for display
5. WHEN the admin edits a product, THE System SHALL allow updating name, description, price, variants, and images
6. WHEN the admin deletes a product, THE System SHALL remove it from the catalog and mark all orders containing it as "product archived" in the order history
7. WHEN the admin adds a variant to an existing product, THE System SHALL create a new SKU and set initial inventory to zero
8. THE System SHALL validate that at least one variant exists for each product before publishing
9. WHEN the admin views the product list, THE System SHALL display all products with name, category, price range, variant count, and creation date

**Correctness Properties:**
- *Invariant*: Product count SHALL increase by 1 after adding a product
- *Round Trip*: Create product → Edit product → View product → Delete product → Search for product SHALL not find it
- *Idempotence*: Saving the same product changes twice SHALL result in identical product data

---

### Requirement 9: Admin Panel — Inventory Management with Excel Bulk Updates

**User Story:** As an admin, I want to bulk update inventory levels from Excel sheets weekly, so that I can keep stock levels synchronized with my warehouse.

#### Acceptance Criteria

1. WHEN the admin clicks "Upload Inventory", THE System SHALL display a file upload form accepting .xlsx or .csv files
2. WHEN the admin uploads an inventory file, THE System SHALL parse the file and validate the SKU format and quantity values
3. IF the file contains invalid SKUs or negative quantities, THE System SHALL display an error report listing the problematic rows
4. WHEN the file is valid, THE System SHALL update all SKU inventory levels in the database
5. WHEN inventory is updated, THE System SHALL track the timestamp and admin user who performed the update
6. THE System SHALL allow the admin to download a template CSV file with correct columns (SKU, Product_Name, Size, Color, Quantity)
7. WHEN inventory reaches zero for a variant, THE System SHALL hide that variant from the product detail page but NOT display an "Out of Stock" label
8. WHEN inventory is replenished for a variant, THE System SHALL make it available for purchase again
9. THE System SHALL maintain an inventory audit log showing all bulk updates with timestamps and quantities changed

**Correctness Properties:**
- *Invariant*: After successful upload, total inventory in database SHALL match the sum of quantities in the uploaded file
- *Round Trip*: Export current inventory → Modify quantities → Upload updated file → Export again SHALL show updated quantities
- *Idempotence*: Uploading the same inventory file twice (without inventory depletion from orders) SHALL result in identical inventory levels

---

### Requirement 10: Admin Panel — Order Management

**User Story:** As an admin, I want to view all orders, track their status, manage fulfillment, and handle refunds, so that I can process orders efficiently.

#### Acceptance Criteria

1. WHEN the admin accesses the Orders section, THE System SHALL display all orders with ID, date, customer name, total amount, and current status
2. WHEN the admin filters orders by status (pending, confirmed, shipped, delivered, cancelled), THE System SHALL display only orders with that status
3. WHEN the admin clicks on an order, THE System SHALL display full order details including items, quantities, prices, shipping address, and payment status
4. WHEN the admin clicks "Mark as Shipped", THE System SHALL update the order status to "shipped" and email the customer with tracking information
5. WHEN the admin initiates a refund, THE System SHALL process the refund through the original payment method (UPI) and mark the order as "refunded"
6. WHEN a refund is processed, THE System SHALL return inventory for all items in that order back to available stock
7. THE System SHALL prevent marking an order as shipped if any item's inventory has been depleted since the order was placed
8. WHEN the admin searches for an order by order ID or customer name, THE System SHALL return matching results

**Correctness Properties:**
- *State Machine*: Order status transitions SHALL follow: Pending → Confirmed → Shipped → Delivered
- *Invariant*: Total orders count SHALL match the count of all orders grouped by status
- *Round Trip*: Create order → Mark shipped → Query order status SHALL return "shipped"

---

### Requirement 11: Admin Panel — Discount and Coupon Management

**User Story:** As an admin, I want to create discounts on specific products and generate coupon codes for promotional campaigns, so that I can run targeted marketing and sales.

#### Acceptance Criteria

1. WHEN the admin clicks "Create Discount", THE System SHALL display a form to select products, set discount type (percentage or fixed amount), and enter discount value
2. WHEN the admin creates a discount, THE System SHALL apply it to the selected products immediately on the storefront
3. WHEN the admin sets a discount, THE System SHALL display the original price and discounted price on product cards and detail pages
4. WHEN the admin clicks "Create Coupon", THE System SHALL display a form to generate a unique coupon code with discount type, value, expiration date, and usage limit
5. WHEN the admin generates a coupon code, THE System SHALL create a unique, alphanumeric code and store it in the database
6. WHEN the customer enters a coupon code at checkout, THE System SHALL validate the code against expiration date and usage limit
7. IF the coupon is valid, THE System SHALL apply the discount to the cart total before payment
8. IF the coupon has expired or exceeded usage limit, THE System SHALL display an error message "Coupon code expired or invalid"
9. WHEN the admin views active coupons, THE System SHALL display code, discount amount, usage count, and expiration date
10. WHEN the admin deactivates a coupon, THE System SHALL prevent future use of that code

**Correctness Properties:**
- *Invariant*: Coupon usage count SHALL never exceed the specified usage limit
- *Round Trip*: Create coupon → Apply coupon → Check coupon usage → Verify updated count SHALL match expected value
- *Idempotence*: Applying the same coupon twice at checkout SHALL apply the discount only once

---

### Requirement 12: Admin Panel — Category and Banner Management

**User Story:** As an admin, I want to manage product categories and create promotional banners, so that I can organize the catalog and promote featured products.

#### Acceptance Criteria

1. WHEN the admin clicks "Manage Categories", THE System SHALL display all categories with product count and edit/delete options
2. WHEN the admin creates a category, THE System SHALL require a category name and allow an optional description and icon/image
3. WHEN the admin assigns a product to a category, THE System SHALL update the product's category and display it in the shop filter
4. WHEN the admin clicks "Manage Banners", THE System SHALL display all active banners with image, title, and linked product or page
5. WHEN the admin creates a banner, THE System SHALL accept an image upload, title text, and link destination (product or category)
6. WHEN the admin uploads a banner image, THE System SHALL optimize and store it for responsive display on mobile and desktop
7. WHEN banners are displayed on the home page, THE System SHALL rotate them or display them in a carousel based on creation date
8. WHEN the admin sets a banner as inactive, THE System SHALL remove it from the home page immediately
9. THE System SHALL display a maximum of 5 active banners at any given time

**Correctness Properties:**
- *Invariant*: Product count in a category SHALL equal the number of products assigned to that category
- *Idempotence*: Assigning the same product to the same category twice SHALL result in one assignment

---

### Requirement 13: WhatsApp Integration for Customer Inquiries and Ordering

**User Story:** As a customer, I want to inquire about products, reserve toys, or place orders via WhatsApp, so that I can shop in a channel I prefer.

#### Acceptance Criteria

1. WHEN the customer views the contact page, THE System SHALL display the WhatsApp contact number with a clickable link to start a WhatsApp conversation
2. WHEN the customer clicks "Chat on WhatsApp", THE System SHALL open WhatsApp with a pre-populated message template offering order or inquiry options
3. WHEN a customer sends a message through WhatsApp, THE System MAY use a WhatsApp Business API to automate responses (optional feature)
4. THE System SHALL provide admin staff with WhatsApp messages containing customer inquiries and order requests
5. WHEN an admin responds to a WhatsApp inquiry, THE System MAY log the conversation in the customer's order history for reference
6. THE System SHALL NOT require customers to use WhatsApp; it is an optional supplementary channel

**Correctness Properties:**
- *Invariant*: WhatsApp messaging SHALL not interfere with online ordering through the website
- *Idempotence*: Sending the same WhatsApp message multiple times SHALL not create duplicate orders

---

### Requirement 14: Reviews and Ratings Integration

**User Story:** As a customer, I want to see reviews of the toy store and product recommendations, so that I can trust the quality and make better purchasing decisions.

#### Acceptance Criteria

1. WHEN the customer visits the Product Detail page or the home page, THE System SHALL display Google Maps reviews for the physical store
2. WHEN the customer accesses the About Us page, THE System SHALL display star rating and recent Google Maps reviews
3. THE System SHALL NOT implement in-app product reviews; all reviews come from Google Maps only
4. WHEN the customer clicks "View All Reviews", THE System SHALL redirect to the Google Maps page for the store
5. THE System SHALL cache Google Maps reviews for 24 hours to reduce API calls
6. IF Google Maps API is unavailable, THE System SHALL display cached reviews or a message "Reviews temporarily unavailable"

**Correctness Properties:**
- *Idempotence*: Viewing reviews multiple times SHALL display the same set of reviews (from cache) until cache expires
- *Invariant*: Review count displayed SHALL match the count fetched from Google Maps

---

### Requirement 15: Static Pages and Website Navigation

**User Story:** As a customer, I want to access important information pages like About Us, Contact Us, Terms, and Privacy Policy, so that I can understand the business and policies.

#### Acceptance Criteria

1. WHEN the customer accesses the About Us page, THE System SHALL display information about Punnagai Toys, store history, and mission
2. WHEN the customer accesses the Contact Us page, THE System SHALL display store address, phone number, email, WhatsApp link, and store hours
3. WHEN the customer accesses the Terms & Conditions page, THE System SHALL display purchase terms, returns policy, and warranty information
4. WHEN the customer accesses the Privacy Policy page, THE System SHALL display data collection, usage, and protection practices
5. THE System SHALL provide a consistent navigation bar across all pages with links to Home, Shop, Categories, About Us, Contact Us
6. WHEN the customer uses the site on mobile, THE System SHALL display a hamburger menu for navigation
7. THE System SHALL include a footer with links to all policy pages and social media links

**Correctness Properties:**
- *Invariant*: Navigation links SHALL be present on all pages and functional
- *Idempotence*: Navigating to a page and returning to it SHALL display the same content

---

### Requirement 16: Search Engine Optimization and Performance

**User Story:** As a website owner, I want the site to be mobile-responsive, fast-loading, SEO-optimized, and properly indexed, so that customers can discover the site through search engines.

#### Acceptance Criteria

1. THE System SHALL implement responsive design that works on mobile (320px+), tablet (768px+), and desktop (1024px+) screen sizes
2. WHEN a page loads, THE System SHALL complete initial page render within 2 seconds on 4G connection
3. WHEN a page loads, THE System SHALL lazy-load images and defer non-critical JavaScript to improve performance
4. THE System SHALL generate SEO-friendly meta tags for all pages including title, description, and keywords
5. THE System SHALL implement Schema.org structured data for products with name, price, rating, availability, and description
6. THE System SHALL generate a sitemap.xml file containing all product pages, category pages, and static pages
7. WHEN search engines crawl the site, THE System SHALL serve a robots.txt file allowing crawling of all public pages
8. WHEN customers share a product on social media, THE System SHALL provide Open Graph meta tags with product image, title, and description
9. THE System SHALL compress all images to reduce file size while maintaining visual quality
10. WHEN the customer searches for products, THE System SHALL log search queries anonymously for analytics purposes

**Correctness Properties:**
- *Invariant*: Page load time SHALL remain under 3 seconds for 95% of users on 4G connection
- *Metamorphic*: Compressing images SHALL not visually degrade product display
- *Idempotence*: Crawling the sitemap multiple times SHALL yield the same page list

---

### Requirement 17: Admin Portal for Product and Site Management

**User Story:** As an admin, I want a dedicated admin portal with intuitive UI for uploading products, managing inventory, and controlling site content, so that I can efficiently manage all backend operations from a single, user-friendly dashboard.

#### Acceptance Criteria

1. WHEN the admin logs into the Admin Portal, THE System SHALL display a clean, organized dashboard with quick access widgets and navigation menu
2. THE System SHALL provide a dedicated interface for uploading products in bulk (CSV/Excel) with validation and error reporting
3. WHEN the admin uploads product images, THE System SHALL support batch image upload with drag-and-drop functionality
4. THE System SHALL display real-time upload progress and completion status for bulk operations
5. WHEN the admin manages site content, THE System SHALL allow editing of home page banners, categories, and featured products from the portal
6. THE System SHALL provide a preview mode to see changes before publishing to the live site
7. THE System SHALL include a content editor with WYSIWYG interface for managing static pages (About Us, Terms, Privacy Policy)
8. WHEN the admin performs operations, THE System SHALL maintain an audit log showing who made what changes and when
9. THE System SHALL provide quick statistics on the dashboard showing total products, orders, revenue, and inventory status
10. THE System SHALL allow the admin to manage user roles and permissions (if multiple admins are needed in the future)

**Correctness Properties:**
- *Invariant*: All changes made in the admin portal SHALL be reflected on the live website within 5 minutes
- *Round Trip*: Upload product data → Save → View portal → Verify data SHALL match uploaded information
- *Idempotence*: Saving the same portal changes multiple times SHALL result in identical site state

---

### Requirement 18: Store Location Map Integration

**User Story:** As a customer, I want to see the physical store location on an interactive map and get directions, so that I can easily visit the shop to browse in person or pick up orders.

#### Acceptance Criteria

1. WHEN the customer accesses the Contact Us page, THE System SHALL display an embedded interactive map showing the store's location
2. THE System SHALL use Google Maps or similar service to display the exact store address with pinpoint marker
3. WHEN the customer clicks on the store marker, THE System SHALL display the store name, address, phone number, and business hours
4. THE System SHALL provide a "Get Directions" button that opens navigation in the customer's default maps application
5. WHEN the customer views the map on mobile, THE System SHALL display the map in responsive, touch-friendly format
6. THE System SHALL allow the admin to update the store location coordinates from the admin portal
7. WHEN the customer clicks on the store info window, THE System SHALL display an option to call or message the store directly
8. THE System SHALL display the store's hours and whether it is currently open or closed based on the current time

**Correctness Properties:**
- *Invariant*: Store location coordinates SHALL remain consistent across all pages displaying the map
- *Idempotence*: Opening and closing the map multiple times SHALL display the same location
- *Round Trip*: Admin updates coordinates → Map displays → Verify location SHALL match updated coordinates

---

### Requirement 19: YouTube Video Player for Brand Content

**User Story:** As a customer, I want to watch the Punnagai Toys YouTube channel videos embedded on the website, so that I can see product demonstrations, behind-the-scenes content, and brand stories.

#### Acceptance Criteria

1. WHEN the customer accesses the home page, THE System SHALL display an embedded YouTube video player in a prominent section
2. THE System SHALL load the latest video from the Punnagai Toys YouTube channel or a specific playlist
3. WHEN the customer clicks play, THE System SHALL stream the video from YouTube without leaving the website
4. THE System SHALL display video title, description, and view count below the player
5. WHEN the customer views the video on mobile, THE System SHALL automatically adjust the player to responsive dimensions
6. THE System SHALL allow the customer to watch the video in fullscreen mode
7. WHEN the video finishes, THE System SHALL display suggested related videos or auto-play the next video in the playlist (configurable)
8. THE System SHALL allow the admin to specify which YouTube video or playlist to display from the admin portal
9. IF the YouTube video is unavailable or deleted, THE System SHALL display a graceful fallback message with a link to the YouTube channel
10. THE System SHALL lazy-load the YouTube player to improve initial page load performance

**Correctness Properties:**
- *Idempotence*: Refreshing the page multiple times SHALL display the same video
- *Invariant*: The video player SHALL be responsive and playable on all device sizes (mobile, tablet, desktop)
- *Round Trip*: Admin updates YouTube link → Page loads → Video plays → Verify correct video SHALL display

---

### Requirement 20: Floating Review Section with Auto-Scroll

**User Story:** As a customer, I want to see customer reviews and testimonials in a floating, auto-scrolling section on the website, so that I can quickly see what others think while browsing without navigating away.

#### Acceptance Criteria

1. WHEN the customer browses the website, THE System SHALL display a floating review carousel/section that automatically scrolls through Google Maps reviews
2. THE System SHALL position the floating reviews section in a non-intrusive location (e.g., bottom-right corner on desktop, above footer on mobile)
3. WHEN the reviews auto-scroll, THE System SHALL display each review for 5 seconds before moving to the next review
4. THE System SHALL include review author name, rating (stars), review text, and date in the floating section
5. WHEN the customer clicks on a review, THE System SHALL display the full review or link to the Google Maps review page
6. THE System SHALL allow the customer to manually scroll through reviews using arrow buttons or swipe gestures on mobile
7. THE System SHALL allow the customer to pause the auto-scrolling by hovering over or clicking on the reviews section
8. WHEN there are no reviews available, THE System SHALL display a placeholder message "No reviews yet" instead of showing the section
9. THE System SHALL refresh the reviews data every 24 hours from the Google Maps API cache
10. THE System SHALL display a "See All Reviews" link to direct customers to the full Google Maps reviews page

**Correctness Properties:**
- *Idempotence*: Viewing the floating reviews section multiple times SHALL display the same set of reviews (until cache expires)
- *Invariant*: The floating section SHALL not interfere with website functionality or overlap critical UI elements
- *Round Trip*: Load page → Wait for auto-scroll → Verify reviews display → Refresh page → Verify same reviews display

---

## Acceptance Criteria Summary and Testing Strategy

This requirements document defines 20 major requirements covering the complete e-commerce platform. The implementation should emphasize:

1. **Correctness**: Property-based testing for cart calculations, inventory updates, discount application, and order state transitions
2. **Performance**: Integration tests for page load times and API response times; use caching for product data and reviews
3. **Security**: Validate all user input, prevent SQL injection via parameterized queries, secure authentication tokens
4. **Accessibility**: Ensure WCAG 2.1 AA compliance for keyboard navigation, screen reader support, and color contrast
5. **Resilience**: Graceful degradation when external APIs (courier, Google Maps, payment gateway, YouTube) are unavailable
6. **User Experience**: Intuitive admin portal, smooth floating reviews, responsive video player, and interactive map
7. **Brand Integration**: YouTube channel integration for content marketing and floating reviews for social proof

