// Feature: punnagai-ecommerce, Property 6: Variant Price Update Round-Trip
/**
 * Property 6: Variant Price Update Round-Trip
 *
 * For any product with multiple variants, selecting variant A then variant B
 * then variant A again SHALL result in identical pricing and product
 * information each time variant A is displayed.
 *
 * **Validates: Requirements 2.4**
 *
 * Strategy: generate a product with 2..8 variants, each given a unique
 * `variantId`/`skuId` (so selection is unambiguous) plus its own size, color,
 * integer price and stock. The product also carries an optional discount,
 * category and ageGroup. We then pick two variant indices A and B and drive the
 * pure detail logic through the round-trip:
 *
 *   displayA1 = getDisplayPriceInfo(product, { variantId: A })
 *   displayB  = getDisplayPriceInfo(product, { variantId: B })   // switch away
 *   displayA2 = getDisplayPriceInfo(product, { variantId: A })   // switch back
 *
 * Because the logic is a pure function of its inputs with no hidden state,
 * displayA1 and displayA2 must be deeply equal: identical original/discounted
 * price, discount flag, resolved variant and stock status. We assert that
 * round-trip equality, and additionally that the lower-level price/stock helpers
 * are stable across the two A selections.
 *
 * The global setup (tests/setup/fast-check.setup.js) enforces numRuns >= 100.
 */
const fc = require('fast-check');
const productDetail = require('../../js/lib/product-detail');

const SIZES = ['S', 'M', 'L', 'XL'];
const COLORS = ['red', 'blue', 'green', 'yellow'];

// A product with a unique-id variant matrix. Variant ids/skus are derived from
// the array index so every variant is addressable without ambiguity.
const productArb = fc
  .array(
    fc.record({
      size: fc.constantFrom(...SIZES),
      color: fc.constantFrom(...COLORS),
      price: fc.integer({ min: 1, max: 10000 }),
      stock: fc.integer({ min: 0, max: 100 })
    }),
    { minLength: 2, maxLength: 8 }
  )
  .chain((rawVariants) => {
    const variants = rawVariants.map((v, i) => ({
      variantId: 'v' + i,
      skuId: 's' + i,
      size: v.size,
      color: v.color,
      price: v.price,
      stock: v.stock
    }));

    const discountArb = fc.oneof(
      fc.constant(null),
      fc.record({
        type: fc.constantFrom('percentage', 'fixed'),
        value: fc.integer({ min: 0, max: 100 }),
        active: fc.boolean()
      })
    );

    return fc.record({
      product: fc.record({
        id: fc.constant('p1'),
        basePrice: fc.integer({ min: 1, max: 10000 }),
        category: fc.constantFrom('toys', 'games', 'books'),
        ageGroup: fc.constantFrom('baby', 'kids', 'teen'),
        variants: fc.constant(variants),
        discount: discountArb
      }),
      // Two indices into the variant array: A and B (may be equal).
      indexA: fc.integer({ min: 0, max: variants.length - 1 }),
      indexB: fc.integer({ min: 0, max: variants.length - 1 })
    });
  });

describe('Property 6: Variant Price Update Round-Trip (Req 2.4)', () => {
  test('selecting A, then B, then A again yields identical pricing and product info', () => {
    fc.assert(
      fc.property(productArb, ({ product, indexA, indexB }) => {
        const variants = product.variants;
        const selA = { variantId: variants[indexA].variantId };
        const selB = { variantId: variants[indexB].variantId };

        const displayA1 = productDetail.getDisplayPriceInfo(product, selA);
        // Switch to B (price/info update away from A) ...
        productDetail.getDisplayPriceInfo(product, selB);
        // ... then switch back to A.
        const displayA2 = productDetail.getDisplayPriceInfo(product, selA);

        // Round-trip: A displayed the same way both times.
        expect(displayA2).toEqual(displayA1);

        // Lower-level helpers are stable across the two A selections too.
        const resolvedA1 = productDetail.resolveVariant(product, selA);
        const resolvedA2 = productDetail.resolveVariant(product, selA);
        expect(resolvedA2).toEqual(resolvedA1);

        expect(productDetail.getVariantPrice(product, resolvedA2)).toBe(
          productDetail.getVariantPrice(product, resolvedA1)
        );
        expect(productDetail.getVariantStockStatus(resolvedA2)).toEqual(
          productDetail.getVariantStockStatus(resolvedA1)
        );
      })
    );
  });
});
