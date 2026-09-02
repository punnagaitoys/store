# Production Launch: Placeholders & Configuration Inventory

**Target Project:** Punnagai Toy Store (`MasterZ1311/Punnagai-Toy-Store`)  
**Purpose:** This document catalogs all placeholder values, dummy credentials, fallback media, and configuration tokens currently in the codebase that require real client values before shipping to production.

---

## 1. Firebase Project Configuration

* **File:** [`js/firebase-config.js`](file:///e:/Github/Kamaal%20Shop%20Website/js/firebase-config.js#L51-L58)
* **Status:** Placeholder values active.
* **Fields to Fill:**
  ```javascript
  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY_HERE",                  // <-- Client Web API Key
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // <-- e.g. punnagai-toy-store.firebaseapp.com
    projectId: "YOUR_PROJECT_ID",                  // <-- e.g. punnagai-toy-store
    storageBucket: "YOUR_PROJECT_ID.appspot.com",  // <-- e.g. punnagai-toy-store.appspot.com
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // <-- Client Cloud Messaging ID
    appId: "YOUR_APP_ID"                          // <-- Client Web App ID
  };
  ```
* **Action Required:**
  1. Open [Firebase Console](https://console.firebase.google.com/).
  2. Create or select the client's project (recommended region: `asia-south1` for India).
  3. Go to **Project Settings** > **General** > **Your apps** > Web app (`</>`).
  4. Copy the config object and paste into `js/firebase-config.js`.

---

## 2. WhatsApp Business Cloud API (Cloud Functions)

* **File:** [`functions/index.js`](file:///e:/Github/Kamaal%20Shop%20Website/functions/index.js#L38-L44)
* **Status:** Uses environment variables.
* **Variables to Configure:**
  - `WHATSAPP_API_TOKEN`: Permanent Meta System User access token with `whatsapp_business_messaging` permissions.
  - `WHATSAPP_PHONE_ID`: Meta WhatsApp Phone Number ID (from Meta Developer Portal).
  - `order_confirmation_receipt`: Meta approved Message Template name.
* **Action Required:**
  Run in terminal to set Firebase Functions secrets:
  ```bash
  firebase functions:config:set whatsapp.token="YOUR_META_SYSTEM_USER_TOKEN" whatsapp.phone_id="YOUR_PHONE_NUMBER_ID"
  ```
  Or using Firebase Secrets Manager (Functions v2):
  ```bash
  firebase functions:secrets:set WHATSAPP_API_TOKEN
  firebase functions:secrets:set WHATSAPP_PHONE_ID
  ```

---

## 3. YouTube Showcase & Demonstration Videos

* **File:** [`js/youtube.js`](file:///e:/Github/Kamaal%20Shop%20Website/js/youtube.js#L6-L26) & [`admin.html`](file:///e:/Github/Kamaal%20Shop%20Website/admin.html#L1883)
* **Status:** Dummy video IDs active.
* **Current Values:**
  - `hv_1`: Video ID `dQw4w9WgXcQ` (Rick Astley - "Never Gonna Give You Up" placeholder)
  - `hv_2`: Video ID `M7lc1UVf-VE` (YouTube developer video placeholder)
  - `hv_3`: Video ID `tgbNymZ7vqY` (Sample clip placeholder)
* **Action Required:**
  - In Admin Portal (**Admin Panel** > **Home Videos**), add real YouTube videos showing toy demonstrations, shop walk-throughs, and customer reviews.
  - Alternatively, edit `DEFAULT_HOME_VIDEOS` in `js/youtube.js` with client's official YouTube channel video IDs.

---

## 4. Store Contact & WhatsApp Phone Numbers

* **Current Verified Numbers:**
  - **Primary Number:** `+91 75501 32101` (Shop phone & WhatsApp orders)
  - **Secondary Number:** `+91 72994 61657` (Support & Inquiry WhatsApp)
  - **Store Email:** `contact@punnaagitoystore.com` / `punnagaitoystore@gmail.com`
  - **Store Physical Address:** Mylapore, Chennai, Tamil Nadu - 600004
* **Locations in Code:**
  - `terms.html`, `privacy.html`, `returns.html`, `delivery.html`, `sale-terms.html`, `payments.html`, `index.html`, `product.html`, `wishlist.html`, and `js/app.js`.
* **Dynamic Management:**
  - The Admin Panel now includes a **Store Settings** manager to update these numbers and email dynamically across the site without touching code.

---

## 5. Fallback & Dummy Image Placeholders

* **External Placeholders (`https://via.placeholder.com/...`):**
  - `js/app.js` (Lines 1088, 1327, 1478)
  - `js/cart.js` (Line 305)
* **Action Required:**
  All products created in the Admin Panel or populated in Firestore should have real image URLs uploaded to Firebase Cloud Storage or hosted on a CDN.
  When a product image is missing, the site cleanly falls back to category emoji badges (e.g. 🧸, 🎨, 🧩) or the local `logo.png`.

---

## 6. UPI Payment ID & QR Code

* **Files:** [`checkout.html`](file:///e:/Github/Kamaal%20Shop%20Website/checkout.html#L222), [`js/checkout.js`](file:///e:/Github/Kamaal%20Shop%20Website/js/checkout.js)
* **Placeholder Value:** `punnagai@upi` / `yourname@upi`
* **Action Required:**
  Set the client's official merchant UPI VPA (e.g., `punnagaitoys@okicici` or `punnagai@upi`) in Store Settings so customers scan/pay directly to the store account.

---

## 7. Initial Admin Account Setup

* **Default Admin Email:** `admin@punnaagitoystore.com`
* **Recommended Production Password:** Client should set a unique strong password during Firebase Auth user creation.
* **Firestore Document:**
  In Firestore `users` collection, create a document where **Document ID** matches the admin's `uid` from Firebase Auth:
  ```json
  {
    "email": "admin@punnaagitoystore.com",
    "name": "Punnagai Store Admin",
    "isAdmin": true,
    "status": "active",
    "createdAt": "SERVER_TIMESTAMP"
  }
  ```

---

## Summary Checklist for Go-Live

| # | Item | Where to Configure | Client Action Needed |
|:---|:---|:---|:---|
| 1 | Firebase Credentials | `js/firebase-config.js` | Paste web project config object |
| 2 | Admin User Account | Firebase Auth & Firestore `users` | Create user & set `isAdmin: true` |
| 3 | WhatsApp Cloud API | Firebase Functions Environment | Provide Meta System User Token & Phone ID |
| 4 | YouTube Videos | Admin Panel > Home Videos | Add 2-3 toy demonstration videos |
| 5 | Merchant UPI ID | Admin Panel > Store Settings | Enter store UPI VPA |
| 6 | Product Catalog Images | Admin Panel > Products | Upload high-res product photos |
