// Feature: punnagai-ecommerce, Property 5: Variant Count Matches Display
/**
 * Property 5: Variant Count Matches Display
 *
 * For any product with variants, the number of displayed variant options
 * (size × color combinations) SHALL equal the number of unique SKUs created
 * for that product.
 *
 * **Validates: Requirements 2.3**
 *
 * Strategy: generate size and color option lists (each 1..5 entries). For the
 * same inputs we assert four counts agree:
 *   deriveVariantCount(sizes, colors)
 *     === countUniqueSKUs(generateSKUs(sizes, colors))   // unique SKUs
 *     === buildVariants(sizes, colors).length             // built variants
 *     === getDisplayedVariantCount(buildProduct({sizes,colors})) // displayed
 *
 * The global setup (tests/setup/fast-check.setup.js) enforces numRuns >= 100.
 */
const fc = require('fast-check');
const model = require('../../js/lib/products-model');

// A size/color option label. Includes duplicate-prone short labels so the test
// also covers the "duplicate labels still yield distinct SKUs" guarantee.
const optionArb = fc.string({ minLength: 0, maxLength: 8 });

// An option list of 1..5 labels.
const optionListArb = fc.array(optionArb, { minLength: 1, maxLength: 5 });

describe('Property 5: Variant Count Matches Display (Req 2.3)', () => {
  test('displayed variant count equals unique SKU count for any size/color lists', () => {
    fc.assert(
      fc.property(optionListArb, optionListArb, (sizes, colors) => {
        const derived = model.deriveVariantCount(sizes, colors);
        const uniqueSkus = model.countUniqueSKUs(model.generateSKUs(sizes, colors));
        const builtVariants = model.buildVariants(sizes, colors).length;
        const displayed = model.getDisplayedVariantCount(
          model.buildProduct({ sizes, colors })
        );

        expect(derived).toBe(uniqueSkus);
        expect(derived).toBe(builtVariants);
        expect(derived).toBe(displayed);
      })
    );
  });
});
