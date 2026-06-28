# Product Overview

Punnagai Toy Store (also branded "Punnagai Toy Store") is a static marketing and catalog website for a physical toy shop located in Mylapore, Chennai, India.

## Purpose

- Showcase the store's toy catalog online, organized by age group and category.
- Let customers browse products, view details, and build a cart.
- Drive customers to **pre-book toys via WhatsApp** rather than completing online payment. Checkout generates a pre-filled WhatsApp message to the store's number; the store confirms availability and holds items.
- Provide store information (address, hours, phone, Google Maps location) to drive in-store visits.

## Key Characteristics

- **No online payment or fulfillment.** All orders are completed through WhatsApp and in-store. The cart is a "request list", not a transactional checkout.
- **Catalog managed via an admin panel** (`admin.html`) protected by login, supporting product create/read/update/delete.
- **Audience:** parents and gift buyers shopping for children aged 0–12+, grouped as Baby (0–2), Toddler (3–5), Kids (6–8), Tween (9–12), Teen (12+).
- Currency is Indian Rupees (₹), formatted with `en-IN` locale.

## Conventions

- The brand appears as both "Punnagai" and "Punnagai" across files — preserve existing naming in each file unless asked to unify it.
- Contact details, store address, and the Google Maps pin contain placeholders (e.g. `[STORE-ADDRESS-PLACEHOLDER]`, `[PHONE-PLACEHOLDER]`) that are intentionally left for the store owner to fill in.
