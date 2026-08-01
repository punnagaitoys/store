/**
 * Unit tests for cart LocalStorage persistence (js/lib/cart-storage.js).
 *
 * Covers Requirement 3.9 (cart preserved across browser sessions) and
 * Requirement 6.11 (cart cleared after successful checkout). The Property 11
 * round-trip property test lives in tests/property.
 *
 * The Jest environment is `node`, so there is no global `localStorage`. These
 * tests inject a minimal in-memory shim onto the global object before each test
 * to exercise the storage glue, and remove it afterwards.
 */
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
    }
  };
}

describe('cart-storage — persistence glue', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageShim();
  });

  afterEach(() => {
    delete globalThis.localStorage;
  });

  test('exposes the punnagai_cart storage key', () => {
    expect(cartStorage.CART_STORAGE_KEY).toBe('punnagai_cart');
  });

  test('save then load returns the identical items array (round-trip)', () => {
    const items = [
      { productId: 'prod_001', variantId: 'var_001', quantity: 2, price: 399 },
      { productId: 'prod_002', variantId: 'var_003', quantity: 1, price: 1299 }
    ];

    expect(cartStorage.saveCartToLocalStorage(items)).toBe(true);
    const restored = cartStorage.loadCartFromLocalStorage();

    expect(JSON.stringify(restored)).toBe(JSON.stringify(items));
  });

  test('persists under the punnagai_cart key with cart + updatedAt shape', () => {
    cartStorage.saveCartToLocalStorage([
      { productId: 'p', variantId: 'v', quantity: 1, price: 10 }
    ]);

    const raw = globalThis.localStorage.getItem('punnagai_cart');
    const payload = JSON.parse(raw);

    expect(Array.isArray(payload.cart)).toBe(true);
    expect(payload.cart).toHaveLength(1);
    expect(typeof payload.updatedAt).toBe('number');
  });

  test('load returns [] when the key is absent', () => {
    expect(cartStorage.loadCartFromLocalStorage()).toEqual([]);
  });

  test('load returns [] when the stored value is corrupt', () => {
    globalThis.localStorage.setItem('punnagai_cart', '{not valid json');
    expect(cartStorage.loadCartFromLocalStorage()).toEqual([]);
  });

  test('load returns [] when the stored cart field is not an array', () => {
    globalThis.localStorage.setItem(
      'punnagai_cart',
      JSON.stringify({ cart: 'oops', updatedAt: 1 })
    );
    expect(cartStorage.loadCartFromLocalStorage()).toEqual([]);
  });

  test('non-array input is normalized to an empty cart', () => {
    cartStorage.saveCartToLocalStorage(null);
    expect(cartStorage.loadCartFromLocalStorage()).toEqual([]);
  });

  test('clearCart removes the persisted cart (Req 6.11)', () => {
    cartStorage.saveCartToLocalStorage([
      { productId: 'p', variantId: 'v', quantity: 1, price: 10 }
    ]);
    expect(cartStorage.clearCart()).toBe(true);

    expect(globalThis.localStorage.getItem('punnagai_cart')).toBeNull();
    expect(cartStorage.loadCartFromLocalStorage()).toEqual([]);
  });
});

describe('cart-storage — no crash when storage is unavailable', () => {
  beforeEach(() => {
    delete globalThis.localStorage;
  });

  test('getStorage returns null without a global localStorage', () => {
    expect(cartStorage.getStorage()).toBeNull();
  });

  test('save returns false and does not throw', () => {
    expect(() => cartStorage.saveCartToLocalStorage([])).not.toThrow();
    expect(cartStorage.saveCartToLocalStorage([])).toBe(false);
  });

  test('load returns [] and does not throw', () => {
    expect(() => cartStorage.loadCartFromLocalStorage()).not.toThrow();
    expect(cartStorage.loadCartFromLocalStorage()).toEqual([]);
  });

  test('clearCart returns false and does not throw', () => {
    expect(() => cartStorage.clearCart()).not.toThrow();
    expect(cartStorage.clearCart()).toBe(false);
  });
});
