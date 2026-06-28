/**
 * Unit tests — admin product CRUD with variants (js/admin.js)
 *
 * Covers Requirement 8 logic that lives in the admin controller:
 *   8.3  SKU generation per variant (size × color)
 *   8.6  archive-on-delete: order lines marked "product archived"
 *   8.7  adding a variant to an existing product → initial inventory zero
 *   8.8  at-least-one-variant validation before publishing
 *   8.9  price-range display helper
 *
 * These functions resolve the pure product model via require() under Node, so
 * the real SKU builder is exercised (no mocking of the model).
 */
const admin = require('../../js/admin');
const ProductsModel = require('../../js/lib/products-model');

describe('buildVariantsFromForm (8.3 SKU generation per variant)', () => {
  test('generates one unique SKU per size × color combination', () => {
    const form = { price: 500, variantStock: 5, sizes: ['Small', 'Large'], colors: ['Red', 'Blue'] };
    const variants = admin.buildVariantsFromForm(form, 'SEQ1');

    expect(variants).toHaveLength(4); // 2 sizes × 2 colors
    const skus = variants.map((v) => v.skuId);
    expect(new Set(skus).size).toBe(4); // all unique
    variants.forEach((v) => {
      expect(v.price).toBe(500);
      expect(v.stock).toBe(5);
    });
  });

  test('creates a single default variant when no sizes/colors supplied', () => {
    const form = { price: 250, variantStock: 0, sizes: [], colors: [] };
    const variants = admin.buildVariantsFromForm(form, 'SEQ2');
    expect(variants).toHaveLength(1);
    expect(variants[0].size).toBe('One Size');
    expect(variants[0].color).toBe('Standard');
    expect(variants[0].price).toBe(250);
  });

  test('unique SKUs even when duplicate size labels are entered', () => {
    const form = { price: 100, variantStock: 1, sizes: ['S', 'S'], colors: ['Red'] };
    const variants = admin.buildVariantsFromForm(form, 'SEQ3');
    const skus = variants.map((v) => v.skuId);
    expect(new Set(skus).size).toBe(skus.length);
  });
});

describe('validateProductForPublish (8.8 at-least-one-variant)', () => {
  test('rejects a product with zero variants', () => {
    const result = admin.validateProductForPublish({ variants: [] });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least one variant/i);
  });

  test('accepts a product with one or more variants', () => {
    const result = admin.validateProductForPublish({ variants: [{ skuId: 'SKU-1' }] });
    expect(result.valid).toBe(true);
  });

  test('rejects when variants field is missing entirely', () => {
    expect(admin.validateProductForPublish({}).valid).toBe(false);
  });
});

describe('mergeVariantsForEdit (8.5 edit / 8.7 new variant stock zero)', () => {
  const existing = {
    sequence: 'SEQ1',
    variants: [
      { variantId: 'var_1', skuId: 'SKU-EXIST-RED', size: 'Small', color: 'Red', price: 400, stock: 30 }
    ]
  };

  test('preserves stock and price of an existing size/color combination', () => {
    const form = { price: 999, sizes: ['Small'], colors: ['Red'] };
    const merged = admin.mergeVariantsForEdit(existing, form, 'SEQ1');
    expect(merged).toHaveLength(1);
    expect(merged[0].stock).toBe(30); // preserved, not reset
    expect(merged[0].price).toBe(400); // preserved
    expect(merged[0].skuId).toBe('SKU-EXIST-RED');
  });

  test('new size/color combinations start with zero inventory (8.7)', () => {
    const form = { price: 999, sizes: ['Small', 'Large'], colors: ['Red'] };
    const merged = admin.mergeVariantsForEdit(existing, form, 'SEQ1');
    expect(merged).toHaveLength(2);
    const large = merged.find((v) => v.size === 'Large');
    expect(large).toBeDefined();
    expect(large.stock).toBe(0); // new variant → zero
  });

  test('keeps existing variants untouched when no sizes/colors are entered', () => {
    const form = { price: 999, sizes: [], colors: [] };
    const merged = admin.mergeVariantsForEdit(existing, form, 'SEQ1');
    expect(merged).toHaveLength(1);
    expect(merged[0].stock).toBe(30);
  });
});

describe('addVariantToProduct (8.7 initial inventory zero)', () => {
  afterEach(() => {
    delete global.getProductById;
    delete global.updateProduct;
  });

  test('appends a new variant with stock zero and persists it', async () => {
    const product = {
      id: 'p1', basePrice: 600, sequence: 'SEQ9',
      variants: [{ variantId: 'var_1', skuId: 'SKU-A', size: 'S', color: 'Red', price: 600, stock: 12 }]
    };
    global.getProductById = jest.fn().mockResolvedValue(product);
    global.updateProduct = jest.fn().mockResolvedValue({ success: true });

    const res = await admin.addVariantToProduct('p1', 'L', 'Blue');
    expect(res.success).toBe(true);
    expect(res.variant.stock).toBe(0);
    expect(res.variant.size).toBe('L');

    const persisted = global.updateProduct.mock.calls[0][1];
    expect(persisted.variants).toHaveLength(2);
    expect(persisted.variants[1].stock).toBe(0);
  });

  test('rejects a duplicate size/color variant', async () => {
    const product = {
      id: 'p1', basePrice: 600, sequence: 'SEQ9',
      variants: [{ variantId: 'var_1', skuId: 'SKU-A', size: 'S', color: 'Red', price: 600, stock: 12 }]
    };
    global.getProductById = jest.fn().mockResolvedValue(product);
    global.updateProduct = jest.fn().mockResolvedValue({ success: true });

    const res = await admin.addVariantToProduct('p1', 'S', 'Red');
    expect(res.success).toBe(false);
    expect(global.updateProduct).not.toHaveBeenCalled();
  });
});

describe('archiveOrdersContainingProduct (8.6 archive-on-delete)', () => {
  afterEach(() => {
    delete global.getOrders;
    delete global.updateOrder;
  });

  test('marks matching order lines as "product archived" and preserves others', async () => {
    const orders = [
      { id: 'o1', items: [
        { productId: 'target', name: 'Toy A', quantity: 1 },
        { productId: 'other', name: 'Toy B', quantity: 2 }
      ] },
      { id: 'o2', items: [{ productId: 'other', name: 'Toy B', quantity: 1 }] }
    ];
    global.getOrders = jest.fn().mockResolvedValue(orders);
    global.updateOrder = jest.fn().mockResolvedValue({ success: true });

    const count = await admin.archiveOrdersContainingProduct('target');

    expect(count).toBe(1); // only o1 contained the product
    expect(global.updateOrder).toHaveBeenCalledTimes(1);
    const [orderId, updates] = global.updateOrder.mock.calls[0];
    expect(orderId).toBe('o1');
    expect(updates.hasArchivedProduct).toBe(true);
    const archived = updates.items.find((it) => it.productId === 'target');
    expect(archived.archived).toBe(true);
    expect(archived.status).toBe('product archived');
    // The unrelated line in the same order is preserved untouched.
    const preserved = updates.items.find((it) => it.productId === 'other');
    expect(preserved.archived).toBeUndefined();
  });

  test('returns zero when no orders reference the product', async () => {
    global.getOrders = jest.fn().mockResolvedValue([
      { id: 'o1', items: [{ productId: 'other', quantity: 1 }] }
    ]);
    global.updateOrder = jest.fn().mockResolvedValue({ success: true });

    const count = await admin.archiveOrdersContainingProduct('target');
    expect(count).toBe(0);
    expect(global.updateOrder).not.toHaveBeenCalled();
  });
});

describe('helper utilities', () => {
  test('parseList splits and trims comma-separated input', () => {
    expect(admin.parseList(' Red, Blue ,, Green ')).toEqual(['Red', 'Blue', 'Green']);
    expect(admin.parseList('')).toEqual([]);
  });

  test('normalizeStockInput coerces to a non-negative integer', () => {
    expect(admin.normalizeStockInput('5')).toBe(5);
    expect(admin.normalizeStockInput(-3)).toBe(0);
    expect(admin.normalizeStockInput('abc')).toBe(0);
    expect(admin.normalizeStockInput(4.8)).toBe(4);
  });

  test('formatPriceRange shows a single price or a range', () => {
    expect(admin.formatPriceRange({ price: 500, variants: [{ price: 500 }] })).toBe('₹500');
    expect(admin.formatPriceRange({ price: 500, variants: [{ price: 400 }, { price: 600 }] }))
      .toBe('₹400 – ₹600');
    expect(admin.formatPriceRange({ price: 700, variants: [] })).toBe('₹700');
  });

  test('makeSequence produces non-empty tokens', () => {
    expect(typeof admin.makeSequence()).toBe('string');
    expect(admin.makeSequence().length).toBeGreaterThan(0);
  });
});

describe('assembleProductData keeps legacy shape + variant model', () => {
  test('includes legacy storefront fields and variant/thumbnail data', () => {
    const form = {
      name: 'Block Set', description: 'desc', price: '499', originalPrice: '699',
      category: 'Building Blocks', ageGroup: '3-5', imageUrl: 'http://img', badge: 'Sale',
      inStock: true, featured: false, newArrival: true, sizes: ['S'], colors: ['Red'], variantStock: '0'
    };
    const variants = admin.buildVariantsFromForm(form, 'SEQ');
    const data = admin.assembleProductData(form, variants, 'SEQ', ['thumb1']);

    expect(data.name).toBe('Block Set');
    expect(data.price).toBe(499);
    expect(data.originalPrice).toBe(699);
    expect(data.inStock).toBe(true);
    expect(data.basePrice).toBe(499);
    expect(Array.isArray(data.variants)).toBe(true);
    expect(data.thumbnails).toEqual(['thumb1']);
    // internal flags must not leak into persisted variants
    data.variants.forEach((v) => expect(v.__isNew).toBeUndefined());
  });
});
