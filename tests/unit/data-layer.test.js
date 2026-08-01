/**
 * Unit tests — data.js hybrid data access layer (local mode) + cache wrappers.
 *
 * Covers task 1.2:
 *   - generic hybrid CRUD across the design's collections
 *   - 1-hour product cache / 1-day category cache wrappers
 *   - applyProductFilters pure helper
 *
 * The Firestore branch is exercised separately by the integration tests (task 1.3)
 * against the Firebase Emulator Suite. Here we shim `window` + `localStorage` and
 * force USE_LOCAL_MODE so the data layer reads/writes an in-memory store.
 */

// --- Minimal browser shims (must exist before requiring data.js) ---
function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

global.window = { USE_LOCAL_MODE: true };
global.localStorage = makeLocalStorage();

const data = require('../../js/data.js');

beforeEach(() => {
  global.localStorage.clear();
  data.invalidateCache();
});

describe('data.js — collection constants', () => {
  test('exposes all eight design collections', () => {
    expect(data.COLLECTIONS).toMatchObject({
      PRODUCTS: 'products',
      USERS: 'users',
      ORDERS: 'orders',
      COUPONS: 'coupons',
      CATEGORIES: 'categories',
      BANNERS: 'banners',
      INVENTORY_LOGS: 'inventory_logs',
      SHIPPING_INTEGRATIONS: 'shipping_integrations'
    });
  });
});

describe('data.js — product CRUD (local mode)', () => {
  test('addProduct returns { success, id } and is retrievable', async () => {
    const res = await data.addProduct({
      name: 'Test Toy',
      description: 'fun',
      price: 100,
      category: 'Building Blocks',
      ageGroup: '3-5',
      imageUrl: 'x',
      inStock: true,
      featured: false
    });
    expect(res.success).toBe(true);
    expect(typeof res.id).toBe('string');

    const fetched = await data.getProductById(res.id);
    expect(fetched.name).toBe('Test Toy');
    expect(fetched.price).toBe(100);
  });

  test('updateProduct and deleteProduct succeed', async () => {
    const { id } = await data.addProduct({
      name: 'A',
      description: '',
      price: 10,
      category: 'c',
      ageGroup: '0-2',
      imageUrl: '',
      inStock: true,
      featured: false
    });
    const upd = await data.updateProduct(id, { price: 50 });
    expect(upd.success).toBe(true);
    expect((await data.getProductById(id)).price).toBe(50);

    const del = await data.deleteProduct(id);
    expect(del.success).toBe(true);
    expect(await data.getProductById(id)).toBeNull();
  });
});

describe('data.js — applyProductFilters (pure helper)', () => {
  const products = [
    {
      name: 'Red Car',
      description: 'fast',
      category: 'Remote Control',
      ageGroup: '9-12',
      price: 300,
      inStock: true,
      featured: true
    },
    {
      name: 'Blue Blocks',
      description: 'build',
      category: 'Building Blocks',
      ageGroup: '3-5',
      price: 100,
      inStock: false,
      featured: false
    },
    {
      name: 'Green Doll',
      description: 'cute',
      category: 'Dolls & Fashion',
      ageGroup: '6-8',
      price: 200,
      inStock: true,
      featured: false
    }
  ];

  test('category filter returns only matching subset', () => {
    const out = data.applyProductFilters(products, { category: 'Building Blocks' });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Blue Blocks');
  });

  test('inStock filter excludes out-of-stock items', () => {
    const out = data.applyProductFilters(products, { inStock: true });
    expect(out.every((p) => p.inStock)).toBe(true);
    expect(out).toHaveLength(2);
  });

  test('search matches name/description/category', () => {
    expect(data.applyProductFilters(products, { search: 'build' })).toHaveLength(1);
    expect(data.applyProductFilters(products, { search: 'CAR' })[0].name).toBe('Red Car');
  });

  test('sortBy price-asc / price-desc / name-asc', () => {
    expect(data.applyProductFilters(products, { sortBy: 'price-asc' }).map((p) => p.price)).toEqual(
      [100, 200, 300]
    );
    expect(
      data.applyProductFilters(products, { sortBy: 'price-desc' }).map((p) => p.price)
    ).toEqual([300, 200, 100]);
    expect(data.applyProductFilters(products, { sortBy: 'name-asc' }).map((p) => p.name)).toEqual([
      'Blue Blocks',
      'Green Doll',
      'Red Car'
    ]);
  });

  test('does not mutate the input array', () => {
    const snapshot = JSON.stringify(products);
    data.applyProductFilters(products, { sortBy: 'price-desc' });
    expect(JSON.stringify(products)).toBe(snapshot);
  });
});

describe('data.js — product cache (1 hour)', () => {
  test('getProductsCached serves filtered results from one cached fetch', async () => {
    await data.addProduct({
      name: 'Cached Car',
      description: '',
      price: 300,
      category: 'Remote Control',
      ageGroup: '9-12',
      imageUrl: '',
      inStock: true,
      featured: false
    });
    await data.addProduct({
      name: 'Cached Blocks',
      description: '',
      price: 100,
      category: 'Building Blocks',
      ageGroup: '3-5',
      imageUrl: '',
      inStock: true,
      featured: false
    });

    const all = await data.getAllProductsCached();
    expect(all).toHaveLength(2);

    // A new write that bypasses cache invalidation should NOT appear until refresh,
    // proving the cached snapshot is being reused.
    global.localStorage.setItem(
      'punnagai_mock_products',
      JSON.stringify([
        ...JSON.parse(global.localStorage.getItem('punnagai_mock_products')),
        {
          id: 'sneaky',
          name: 'Sneaky',
          description: '',
          price: 1,
          category: 'x',
          ageGroup: '0-2',
          imageUrl: '',
          inStock: true,
          featured: false,
          createdAt: Date.now()
        }
      ])
    );

    const cached = await data.getProductsCached({});
    expect(cached).toHaveLength(2); // still the cached snapshot

    const refreshed = await data.getProductsCached({}, true); // force refresh
    expect(refreshed).toHaveLength(3);
  });

  test('mutating products invalidates the cache automatically', async () => {
    await data.addProduct({
      name: 'One',
      description: '',
      price: 10,
      category: 'c',
      ageGroup: '0-2',
      imageUrl: '',
      inStock: true,
      featured: false
    });
    expect(await data.getAllProductsCached()).toHaveLength(1);

    await data.addProduct({
      name: 'Two',
      description: '',
      price: 20,
      category: 'c',
      ageGroup: '0-2',
      imageUrl: '',
      inStock: true,
      featured: false
    });
    // addProduct calls invalidateCache('products'), so the next read reflects the write.
    expect(await data.getAllProductsCached()).toHaveLength(2);
  });

  test('product cache TTL is 1 hour', () => {
    expect(data.PRODUCT_CACHE_TTL_MS).toBe(60 * 60 * 1000);
  });
});

describe('data.js — categories cache (1 day) + CRUD', () => {
  test('addCategory then getCategories returns it (cached)', async () => {
    const res = await data.addCategory({ name: 'Puzzles', icon: '🧩', displayOrder: 1 });
    expect(res.success).toBe(true);

    const cats = await data.getCategories();
    expect(cats.map((c) => c.name)).toContain('Puzzles');
  });

  test('category cache TTL is 1 day', () => {
    expect(data.CATEGORY_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  test('updateCategory / deleteCategory succeed and refresh cache', async () => {
    const { id } = await data.addCategory({ name: 'Temp', displayOrder: 2 });
    expect((await data.getCategories()).some((c) => c.id === id)).toBe(true);

    await data.updateCategory(id, { name: 'Renamed' });
    expect((await data.getCategories()).find((c) => c.id === id).name).toBe('Renamed');

    await data.deleteCategory(id);
    expect((await data.getCategories()).some((c) => c.id === id)).toBe(false);
  });
});

describe('data.js — users / orders / coupons / banners / inventory / shipping', () => {
  test('createUser + getUserByEmail round-trip', async () => {
    const res = await data.createUser({ email: 'a@b.com', name: 'A', phone: '+919876543210' });
    expect(res.success).toBe(true);
    const u = await data.getUserByEmail('a@b.com');
    expect(u.name).toBe('A');
  });

  test('createOrder defaults status to pending and computes nothing unexpected', async () => {
    const res = await data.createOrder({
      userId: 'u1',
      items: [{ skuId: 's1', quantity: 2, unitPrice: 100, lineTotal: 200 }],
      subtotal: 200,
      total: 200
    });
    expect(res.success).toBe(true);
    const o = await data.getOrderById(res.id);
    expect(o.orderStatus).toBe('pending');
    expect(o.paymentStatus).toBe('pending');
    expect(o.total).toBe(200);
  });

  test('createCoupon uppercases code and getCouponByCode finds it', async () => {
    await data.createCoupon({ code: 'save10', discountType: 'percentage', discountValue: 10 });
    const c = await data.getCouponByCode('SAVE10');
    expect(c).not.toBeNull();
    expect(c.discountValue).toBe(10);
  });

  test('createBanner + getBanners filter by active', async () => {
    await data.createBanner({ title: 'Sale', active: true });
    await data.createBanner({ title: 'Hidden', active: false });
    const active = await data.getBanners({ active: true });
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Sale');
  });

  test('createInventoryLog records audit entry', async () => {
    const res = await data.createInventoryLog({
      skuId: 'SKU-1',
      previousStock: 10,
      newStock: 8,
      changeReason: 'order_placed',
      quantityChanged: 2
    });
    expect(res.success).toBe(true);
    const logs = await data.getInventoryLogs({ skuId: 'SKU-1' });
    expect(logs).toHaveLength(1);
    expect(logs[0].changeReason).toBe('order_placed');
  });

  test('shipping integration lookup by region', async () => {
    await data.createShippingIntegration({
      provider: 'shiprocket',
      region: 'local',
      baseCost: 0,
      estimatedDays: 1
    });
    const local = await data.getShippingIntegrationByRegion('local');
    expect(local.provider).toBe('shiprocket');
    expect(local.baseCost).toBe(0);
  });
});
