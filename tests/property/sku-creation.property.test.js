// Feature: punnagai-ecommerce, Property 19: SKU Creation for Variants
/**
 * Property 19: SKU Creation for Variants — Validates Requirements 8.3
 *
 * Statement: For any product with N sizes and M colors, generateSKUs SHALL
 * create exactly N × M unique SKUs (one per size-color combination), each with
 * independent pricing/stock tracking.
 *
 * Implementation under test: js/lib/products-model.js
 *   - generateSKUs(sizes, colors, options)
 *   - buildVariants(sizes, colors, options)
 *
 * Documented rule: input arrays are NOT deduped. Uniqueness is guaranteed by
 * embedding the size index + color index in every SKU, so even duplicate labels
 * (e.g. ["S", "S"]) yield distinct SKUs and skus.length === N × M.
 */
const fc = require('fast-check');
const model = require('../../js/lib/products-model');

describe('Property 19: SKU Creation for Variants (Requirement 8.3)', () => {
  // Arbitrary that produces arrays of 1..5 label strings. Strings may repeat,
  // which intentionally exercises the "duplicate labels still unique" rule.
  const labels = () => fc.array(fc.string(), { minLength: 1, maxLength: 5 });

  test('generateSKUs produces exactly N × M unique SKUs', () => {
    fc.assert(
      fc.property(labels(), labels(), (sizes, colors) => {
        const expected = sizes.length * colors.length;
        const skus = model.generateSKUs(sizes, colors);

        // Exactly N × M SKUs (no dedup of input arrays).
        expect(skus).toHaveLength(expected);
        // All SKUs are unique.
        expect(new Set(skus).size).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  test('buildVariants yields the same count with independent price/stock fields', () => {
    fc.assert(
      fc.property(labels(), labels(), (sizes, colors) => {
        const expected = sizes.length * colors.length;

        // Per-variant price/stock derived independently from the combination so
        // we can confirm each variant tracks pricing/stock on its own.
        const variants = model.buildVariants(sizes, colors, {
          price: (size, color, i, j) => (i + 1) * 100 + j,
          stock: (size, color, i, j) => i * 10 + j
        });

        // One variant per size × color combination.
        expect(variants).toHaveLength(expected);

        // Variant SKUs are all unique and match generateSKUs' uniqueness.
        expect(model.countUniqueSKUs(variants)).toBe(expected);

        // Each variant carries its own independent price and stock fields.
        let combo = 0;
        for (let i = 0; i < sizes.length; i++) {
          for (let j = 0; j < colors.length; j++) {
            const variant = variants[combo];
            expect(variant).toHaveProperty('price');
            expect(variant).toHaveProperty('stock');
            expect(variant.price).toBe((i + 1) * 100 + j);
            expect(variant.stock).toBe(i * 10 + j);
            combo++;
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
