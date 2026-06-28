// Feature: punnagai-ecommerce, Property 11: Cart Persistence Round-Trip
/**
 * Property 11: Cart Persistence Round-Trip
 *
 * For any shopping cart with items, closing the browser session and reopening
 * it without clearing LocalStorage SHALL restore the cart with identical items,
 * quantities, and prices.
 *
 * **Validates: Requirements 3.9**
 *
 * Strategy: generate an items array (0..20 lines) of
 *   { productId, variantId, quantity (1..10), price (1..5000) }
 * persist it via saveCartToLocalStorage, then (simulating a browser close /
 * reopen) read it back with loadCartFromLocalStorage and assert round-trip
 * equality of the items array via JSON.stringify.
 *
 * The Jest environment is `node`, so there is no global `localStorage`. A
 * minimal in-memory shim is injected onto globalThis.localStorage before each
 * test and removed afterwards — saves persist within the round trip because the
 * shim survives for the duration of the property's runs.
 *
 * The global setup (tests/setup/fast-check.setup.js) enforces numRuns >= 100.
 */
const fc = require('fast-check');
const cartStorage = require('../../js/lib/cart-storage');

/** Minimal Storage-like in-memory shim for tests. */
function createLocalStorageShim() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
    get length() {
      return data.size;
    },
  };
}

// A single persisted cart line: snapshot of product, variant, quantity, price.
const cartItemArb = fc.record({
  productId: fc.string(),
  variantId: fc.string(),
  quantity: fc.integer({ min: 1, max: 10 }),
  price: fc.integer({ min: 1, max: 5000 }),
});

// A cart of 0..20 line items.
const cartItemsArb = fc.array(cartItemArb, { minLength: 0, maxLength: 20 });

describe('Property 11: Cart Persistence Round-Trip (Req 3.9)', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageShim();
  });

  afterEach(() => {
    delete globalThis.localStorage;
  });

  test('save then load restores identical items, quantities, and prices', () => {
    fc.assert(
      fc.property(cartItemsArb, (cartItems) => {
        // Save cart to LocalStorage.
        cartStorage.saveCartToLocalStorage(cartItems);

        // Simulate browser close/reopen: the persisted store survives, so we
        // simply read the cart back from LocalStorage.
        const restoredCart = cartStorage.loadCartFromLocalStorage();

        // Round-trip equality of the items array.
        return JSON.stringify(restoredCart) === JSON.stringify(cartItems);
      })
    );
  });
});
