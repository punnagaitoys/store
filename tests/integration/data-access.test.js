/**
 * Integration tests — data access layer Firestore branch (task 1.3).
 *
 * Validates: Requirement 1.9 (and the design's hybrid data-access layer).
 *
 * These run the REAL js/data.js + js/firebase-config.js Firestore branch
 * against the Firebase Emulator Suite (launched by `npm run test:integration`
 * via `firebase emulators:exec --only firestore,auth,storage`).
 *
 * Coverage:
 *   - Products: create / read / update / delete + filtered queries
 *   - Orders:   create / read / status update
 *   - Users:    create / lookup by email / update
 *   - Coupons:  create (code uppercasing) / lookup by code / delete
 */

const { loadDataLayerAgainstEmulator, clearFirestore } = require('./helpers/emulator-harness');

const { data } = loadDataLayerAgainstEmulator();

// Give emulator round-trips comfortable headroom.
jest.setTimeout(30000);

beforeEach(async () => {
  await clearFirestore();
  data.invalidateCache();
});

describe('Products — CRUD against the Firestore emulator', () => {
  test('addProduct persists and is retrievable by id', async () => {
    const res = await data.addProduct({
      name: 'Wooden Train', description: 'classic', price: 799,
      category: 'Educational & Learning', ageGroup: '3-5',
      imageUrl: 'https://example.com/train.jpg', inStock: true, featured: true
    });
    expect(res.success).toBe(true);
    expect(typeof res.id).toBe('string');

    const fetched = await data.getProductById(res.id);
    expect(fetched).not.toBeNull();
    expect(fetched.name).toBe('Wooden Train');
    expect(fetched.price).toBe(799);
    expect(fetched.inStock).toBe(true);
  });

  test('updateProduct mutates fields and coerces numbers', async () => {
    const { id } = await data.addProduct({
      name: 'Kite', description: '', price: 199, category: 'Outdoor & Sports',
      ageGroup: '6-8', imageUrl: '', inStock: true, featured: false
    });

    const upd = await data.updateProduct(id, { price: '249', inStock: false });
    expect(upd.success).toBe(true);

    const after = await data.getProductById(id);
    expect(after.price).toBe(249);
    expect(after.inStock).toBe(false);
  });

  test('deleteProduct removes the document', async () => {
    const { id } = await data.addProduct({
      name: 'Yo-Yo', description: '', price: 99, category: 'Outdoor & Sports',
      ageGroup: '9-12', imageUrl: '', inStock: true, featured: false
    });
    expect(await data.getProductById(id)).not.toBeNull();

    const del = await data.deleteProduct(id);
    expect(del.success).toBe(true);
    expect(await data.getProductById(id)).toBeNull();
  });

  test('getProducts applies category + inStock filters server-side', async () => {
    await data.addProduct({ name: 'Blocks A', description: '', price: 100, category: 'Building Blocks', ageGroup: '3-5', imageUrl: '', inStock: true, featured: false });
    await data.addProduct({ name: 'Blocks B', description: '', price: 150, category: 'Building Blocks', ageGroup: '6-8', imageUrl: '', inStock: false, featured: false });
    await data.addProduct({ name: 'Doll', description: '', price: 200, category: 'Dolls & Fashion', ageGroup: '6-8', imageUrl: '', inStock: true, featured: false });

    const blocks = await data.getProducts({ category: 'Building Blocks' });
    expect(blocks).toHaveLength(2);
    expect(blocks.every(p => p.category === 'Building Blocks')).toBe(true);

    const inStockBlocks = await data.getProducts({ category: 'Building Blocks', inStock: true });
    expect(inStockBlocks).toHaveLength(1);
    expect(inStockBlocks[0].name).toBe('Blocks A');
  });

  test('getProductCount reflects the number of stored products', async () => {
    expect(await data.getProductCount()).toBe(0);
    await data.addProduct({ name: 'P1', description: '', price: 1, category: 'c', ageGroup: '0-2', imageUrl: '', inStock: true, featured: false });
    await data.addProduct({ name: 'P2', description: '', price: 2, category: 'c', ageGroup: '0-2', imageUrl: '', inStock: true, featured: false });
    expect(await data.getProductCount()).toBe(2);
  });
});

describe('Orders — CRUD against the Firestore emulator', () => {
  test('createOrder stores defaults and is retrievable', async () => {
    const res = await data.createOrder({
      userId: 'user-1',
      items: [{ skuId: 'SKU-1', quantity: 2, unitPrice: 100, lineTotal: 200 }],
      subtotal: 200, total: 200
    });
    expect(res.success).toBe(true);

    const order = await data.getOrderById(res.id);
    expect(order.userId).toBe('user-1');
    expect(order.orderStatus).toBe('pending');
    expect(order.paymentStatus).toBe('pending');
    expect(order.total).toBe(200);
    expect(order.items).toHaveLength(1);
  });

  test('updateOrder transitions order status', async () => {
    const { id } = await data.createOrder({ userId: 'u', items: [], subtotal: 0, total: 0 });
    const upd = await data.updateOrder(id, { orderStatus: 'confirmed', paymentStatus: 'paid' });
    expect(upd.success).toBe(true);

    const order = await data.getOrderById(id);
    expect(order.orderStatus).toBe('confirmed');
    expect(order.paymentStatus).toBe('paid');
  });

  test('getOrdersByUser returns only that user\'s orders', async () => {
    await data.createOrder({ userId: 'alice', items: [], subtotal: 10, total: 10 });
    await data.createOrder({ userId: 'alice', items: [], subtotal: 20, total: 20 });
    await data.createOrder({ userId: 'bob', items: [], subtotal: 30, total: 30 });

    const aliceOrders = await data.getOrdersByUser('alice');
    expect(aliceOrders).toHaveLength(2);
    expect(aliceOrders.every(o => o.userId === 'alice')).toBe(true);
  });
});

describe('Users — CRUD against the Firestore emulator', () => {
  test('createUser then getUserByEmail round-trips', async () => {
    const res = await data.createUser({ email: 'parent@example.com', name: 'Parent', phone: '+919876543210' });
    expect(res.success).toBe(true);

    const user = await data.getUserByEmail('parent@example.com');
    expect(user).not.toBeNull();
    expect(user.name).toBe('Parent');
    expect(user.status).toBe('active');
    expect(user.isAdmin).toBe(false);
  });

  test('getUserById and updateUser', async () => {
    const { id } = await data.createUser({ email: 'x@example.com', name: 'X' });
    const upd = await data.updateUser(id, { name: 'Updated', isAdmin: true });
    expect(upd.success).toBe(true);

    const user = await data.getUserById(id);
    expect(user.name).toBe('Updated');
    expect(user.isAdmin).toBe(true);
  });
});

describe('Coupons — CRUD against the Firestore emulator', () => {
  test('createCoupon uppercases code; getCouponByCode is case-insensitive', async () => {
    const res = await data.createCoupon({ code: 'diwali25', discountType: 'percentage', discountValue: 25 });
    expect(res.success).toBe(true);

    const found = await data.getCouponByCode('diwali25');
    expect(found).not.toBeNull();
    expect(found.code).toBe('DIWALI25');
    expect(found.discountValue).toBe(25);
    expect(found.active).toBe(true);
  });

  test('deleteCoupon removes it', async () => {
    const { id } = await data.createCoupon({ code: 'TEMP', discountType: 'fixed', discountValue: 50 });
    const del = await data.deleteCoupon(id);
    expect(del.success).toBe(true);

    const after = await data.getCouponByCode('TEMP');
    expect(after).toBeNull();
  });
});
