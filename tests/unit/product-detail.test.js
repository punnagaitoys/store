/**
 * Unit tests for the pure product-detail logic (js/lib/product-detail.js).
 *
 * Covers Requirement 2: variant resolution / price update (2.3, 2.4),
 * related products by category & age group (2.8), and display price info (2.9).
 * (The Property 6 round-trip property test lives in tests/property.)
 */
const detail = require('../../js/lib/product-detail');

// Rich variant-model product (design `products` schema).
function variantProduct() {
  return {
    productId: 'prod_001',
    name: 'Wooden Stacker',
    basePrice: 499,
    category: 'Educational & Learning',
    ageGroup: '0-2',
    variants: [
      {
        variantId: 'var_001',
        skuId: 'SKU-001-S-RED',
        size: 'Small',
        color: 'Red',
        price: 399,
        stock: 45
      },
      {
        variantId: 'var_002',
        skuId: 'SKU-001-L-BLUE',
        size: 'Large',
        color: 'Blue',
        price: 599,
        stock: 0
      }
    ],
    discount: { type: 'percentage', value: 10, active: true }
  };
}

// Simple storefront product (js/data.js seed shape).
function simpleProduct(overrides) {
  return Object.assign(
    {
      id: 'local_seed_0',
      name: 'Soft Teddy',
      price: 649,
      originalPrice: null,
      category: 'Soft Toys & Plush',
      ageGroup: '0-2',
      inStock: true
    },
    overrides || {}
  );
}

describe('resolveVariant', () => {
  test('resolves by { size, color }', () => {
    const p = variantProduct();
    expect(detail.resolveVariant(p, { size: 'Large', color: 'Blue' }).variantId).toBe('var_002');
  });

  test('resolves by variantId string and by skuId string', () => {
    const p = variantProduct();
    expect(detail.resolveVariant(p, 'var_001').variantId).toBe('var_001');
    expect(detail.resolveVariant(p, 'SKU-001-L-BLUE').variantId).toBe('var_002');
  });

  test('resolves by { variantId }', () => {
    const p = variantProduct();
    expect(detail.resolveVariant(p, { variantId: 'var_002' }).skuId).toBe('SKU-001-L-BLUE');
  });

  test('returns null when nothing matches', () => {
    const p = variantProduct();
    expect(detail.resolveVariant(p, { size: 'XL', color: 'Pink' })).toBeNull();
    expect(detail.resolveVariant(p, 'does-not-exist')).toBeNull();
  });

  test('defaults to first variant when selection is empty', () => {
    const p = variantProduct();
    expect(detail.resolveVariant(p, undefined).variantId).toBe('var_001');
    expect(detail.resolveVariant(p, {}).variantId).toBe('var_001');
  });

  test('round-trip A→B→A yields identical variant info (Req 2.4 / Property 6)', () => {
    const p = variantProduct();
    const a1 = detail.resolveVariant(p, { size: 'Small', color: 'Red' });
    detail.resolveVariant(p, { size: 'Large', color: 'Blue' });
    const a2 = detail.resolveVariant(p, { size: 'Small', color: 'Red' });
    expect(a2).toEqual(a1);
    expect(detail.getVariantPrice(p, a2)).toBe(detail.getVariantPrice(p, a1));
  });

  test('treats a simple product as a single implicit variant', () => {
    const p = simpleProduct();
    const v = detail.resolveVariant(p, undefined);
    expect(v.price).toBe(649);
    expect(v.stock).toBe(1);
    expect(detail.hasVariants(p)).toBe(false);
  });
});

describe('getVariantPrice', () => {
  test('uses the variant price when present', () => {
    const p = variantProduct();
    const v = detail.resolveVariant(p, 'var_002');
    expect(detail.getVariantPrice(p, v)).toBe(599);
  });

  test('falls back to basePrice / price when no variant price', () => {
    expect(detail.getVariantPrice({ basePrice: 250 }, null)).toBe(250);
    expect(detail.getVariantPrice({ price: 100 }, null)).toBe(100);
    expect(detail.getVariantPrice({}, null)).toBe(0);
  });
});

describe('getDiscountedPrice', () => {
  test('applies an active percentage discount (floored)', () => {
    expect(detail.getDiscountedPrice(399, { type: 'percentage', value: 10, active: true })).toBe(
      359
    );
  });

  test('applies an active fixed discount', () => {
    expect(detail.getDiscountedPrice(500, { type: 'fixed', value: 120, active: true })).toBe(380);
  });

  test('returns original when discount inactive or absent', () => {
    expect(detail.getDiscountedPrice(500, { type: 'fixed', value: 120, active: false })).toBe(500);
    expect(detail.getDiscountedPrice(500, null)).toBe(500);
    expect(detail.getDiscountedPrice(500, undefined)).toBe(500);
  });

  test('never goes below 0 and caps percentage at 100', () => {
    expect(detail.getDiscountedPrice(100, { type: 'fixed', value: 999, active: true })).toBe(0);
    expect(detail.getDiscountedPrice(100, { type: 'percentage', value: 250, active: true })).toBe(
      0
    );
  });

  test('ignores unknown discount type and negative values', () => {
    expect(detail.getDiscountedPrice(300, { type: 'mystery', value: 50, active: true })).toBe(300);
    expect(detail.getDiscountedPrice(300, { type: 'fixed', value: -50, active: true })).toBe(300);
  });
});

describe('getVariantStockStatus', () => {
  test('in stock when stock > 0', () => {
    expect(detail.getVariantStockStatus({ stock: 5 })).toEqual({
      inStock: true,
      stock: 5,
      status: 'in-stock'
    });
  });

  test('out of stock when stock is 0 / missing', () => {
    expect(detail.getVariantStockStatus({ stock: 0 })).toEqual({
      inStock: false,
      stock: 0,
      status: 'out-of-stock'
    });
    expect(detail.getVariantStockStatus(null)).toEqual({
      inStock: false,
      stock: 0,
      status: 'out-of-stock'
    });
  });
});

describe('getDisplayPriceInfo', () => {
  test('reports original, discounted and hasDiscount for selected variant', () => {
    const p = variantProduct();
    const info = detail.getDisplayPriceInfo(p, { size: 'Small', color: 'Red' });
    expect(info.original).toBe(399);
    expect(info.discounted).toBe(359);
    expect(info.hasDiscount).toBe(true);
    expect(info.stock.inStock).toBe(true);
  });

  test('out-of-stock variant reflected in stock status', () => {
    const p = variantProduct();
    const info = detail.getDisplayPriceInfo(p, { size: 'Large', color: 'Blue' });
    expect(info.stock.status).toBe('out-of-stock');
  });
});

describe('getRelatedProducts (Req 2.8)', () => {
  const current = { id: 'p0', category: 'Building Blocks', ageGroup: '6-8' };
  const all = [
    current,
    { id: 'p1', category: 'Building Blocks', ageGroup: '6-8' }, // both
    { id: 'p2', category: 'Building Blocks', ageGroup: '0-2' }, // category only
    { id: 'p3', category: 'Soft Toys & Plush', ageGroup: '6-8' }, // age only
    { id: 'p4', category: 'Outdoor & Sports', ageGroup: '12+' } // neither
  ];

  test('excludes the product itself and unrelated products', () => {
    const related = detail.getRelatedProducts(all, current, { limit: 6 });
    const ids = related.map(function (p) {
      return p.id;
    });
    expect(ids).not.toContain('p0');
    expect(ids).not.toContain('p4');
  });

  test('orders both-match first, then category-only, then age-only', () => {
    const related = detail.getRelatedProducts(all, current, { limit: 6 });
    expect(
      related.map(function (p) {
        return p.id;
      })
    ).toEqual(['p1', 'p2', 'p3']);
  });

  test('respects the limit (defaults to 4)', () => {
    const many = [];
    for (let i = 0; i < 10; i++) {
      many.push({ id: 'x' + i, category: 'Building Blocks', ageGroup: '6-8' });
    }
    expect(detail.getRelatedProducts(many, current).length).toBe(4);
    expect(detail.getRelatedProducts(many, current, { limit: 6 }).length).toBe(6);
  });

  test('returns [] when product has no category or age basis', () => {
    expect(detail.getRelatedProducts(all, {}, { limit: 6 })).toEqual([]);
  });

  test('matches on categoryId / ageRating fields too', () => {
    const richCurrent = { id: 'r0', categoryId: 'cat_1', ageRating: '3-8' };
    const richAll = [richCurrent, { id: 'r1', categoryId: 'cat_1', ageRating: '3-8' }];
    expect(
      detail.getRelatedProducts(richAll, richCurrent).map(function (p) {
        return p.id;
      })
    ).toEqual(['r1']);
  });
});
