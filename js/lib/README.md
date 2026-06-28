# `js/lib/` — Shared pure-logic modules

This folder holds **pure, framework-free logic** (catalog filtering, cart math,
SKU generation, validation, etc.) that must be usable in **two environments**:

1. **The browser**, where the site loads scripts via plain `<script>` tags with
   **no bundler and no ES module imports**. Globals are shared across files and
   load order matters (Firebase SDK → `firebase-config.js` → `data.js` →
   `cart.js` → `app.js`).
2. **Jest (Node)**, where the same logic is imported in isolation and exercised
   by unit tests and fast-check property tests.

## The UMD-style dual-export pattern

To satisfy both, every module in this folder attaches its exports to the global
object **and** to `module.exports` when running under Node/Jest. This keeps the
logic importable by tests without breaking the no-bundler browser usage.

```js
(function (root, factory) {
  // factory returns the module's public API
  const api = factory();

  // Browser / web worker: expose on the global object.
  if (typeof window !== 'undefined') {
    window.PunnagaiExample = api;
  }
  // Node / Jest: expose via CommonJS.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  function add(a, b) {
    return a + b;
  }

  return { add };
});
```

### Rules for modules in this folder

- Keep them **pure**: no DOM access, no Firebase calls, no `localStorage`.
  Side-effectful glue (DOM, Firestore, storage) lives in `js/*.js`, not here.
- Export everything the browser and tests need on the returned API object.
- In the browser, attach to a clearly named global (e.g. `window.PunnagaiCart`).
- In HTML, load `js/lib/*.js` files **before** the `js/*.js` files that use them.

See `_umd-template.js` for a copy-paste starting point.
