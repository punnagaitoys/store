// Feature: punnagai-ecommerce, Property 20: Variant Stock Visibility Rule
/**
 * Property 20: Variant Stock Visibility Rule — Validates: Requirements 9.5
 *
 * For any product variant with zero inventory, that variant SHALL NOT be
 * displayed as a selectable option; variants with stock > 0 SHALL remain
 * visible.
 *
 * The visibility decision is a pure function of the variant's current stock:
 *   isVariantVisible(variant) === (getStock(variant) > 0)
 *
 * and the list-level helper `visibleVariants(variants)` must return exactly the
 * variants whose stock is strictly positive — never any with stock <= 0.
 */
const fc = require('fast-check');
const inventory = require('../../js/lib/inventory-model');

const { isVariantVisible, visibleVariants, getStock } = inventory;

// A variant whose stock spans zero, negatives, and positives. Negative and
// fractional stock values are intentionally included to confirm the rule holds
// across the full (normalized) input space.
const variantArb = fc.record({
  sku: fc.string(),
  stock: fc.integer({ min: -50, max: 50 }),
});

describe('Property 20: Variant Stock Visibility Rule (Req 9.5)', () => {
  test('a variant is visible iff its normalized stock is strictly positive', () => {
    fc.assert(
      fc.property(variantArb, (variant) => {
        expect(isVariantVisible(variant)).toBe(getStock(variant) > 0);
      })
    );
  });

  test('visibleVariants returns exactly the in-stock variants and no out-of-stock ones', () => {
    fc.assert(
      fc.property(fc.array(variantArb), (variants) => {
        const visible = visibleVariants(variants);

        // Every returned variant has positive stock (none with stock <= 0).
        for (const v of visible) {
          expect(getStock(v)).toBeGreaterThan(0);
        }

        // The result contains exactly those source variants with stock > 0,
        // preserving order and count (no in-stock variant dropped, no
        // out-of-stock variant included).
        const expected = variants.filter((v) => getStock(v) > 0);
        expect(visible).toEqual(expected);
      })
    );
  });

  test('a variant with exactly zero stock is never visible', () => {
    fc.assert(
      fc.property(fc.constant(0), (stock) => {
        expect(isVariantVisible({ sku: 'x', stock })).toBe(false);
      })
    );
  });
});
