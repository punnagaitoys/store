// Feature: punnagai-ecommerce, Property 1: Category Filter Produces Correct Subset
/**
 * Property 1: Category Filter Produces Correct Subset
 *
 * For any product catalog and any selected category, the filtered product list
 * SHALL contain only products matching that category, and the filtered count
 * SHALL be less than or equal to the original product count.
 *
 * **Validates: Requirements 1.2**
 *
 * Strategy: generate an array of product records whose `category` is drawn from
 * a small fixed set, then select a category that is usually one of that set but
 * occasionally a category that is not present in the catalog (so the empty-match
 * case is exercised too). For every generated input we assert:
 *   - every item in the filtered list has `category === selectedCategory`
 *   - filtered.length <= products.length
 *
 * Note: `filterProductsByCategory` matches on the product's `category` field
 * (see js/lib/catalog.js), so the generators use `category` accordingly.
 *
 * The global setup (tests/setup/fast-check.setup.js) enforces numRuns >= 100.
 */
const fc = require('fast-check');
const { filterProductsByCategory } = require('../../js/lib/catalog');

// The small fixed set of categories the catalog is built from.
const CATEGORIES = ['a', 'b', 'c', 'd', 'e'];

// A single product record. `category` is always one of the known set.
const productArb = fc.record({
  productId: fc.string(),
  category: fc.constantFrom(...CATEGORIES),
  name: fc.string()
});

// A product catalog: 1..50 records.
const catalogArb = fc.array(productArb, { minLength: 1, maxLength: 50 });

// The selected category: usually a present category, occasionally one that is
// not in the catalog set (so the no-match path is covered).
const selectedCategoryArb = fc.constantFrom(...CATEGORIES, 'z-not-present');

describe('Property 1: Category Filter Produces Correct Subset (Req 1.2)', () => {
  test('filtered list contains only matching products and is a subset', () => {
    fc.assert(
      fc.property(catalogArb, selectedCategoryArb, (products, selectedCategory) => {
        const filtered = filterProductsByCategory(products, selectedCategory);

        const allMatch = filtered.every(p => p.category === selectedCategory);
        const countCorrect = filtered.length <= products.length;

        expect(allMatch).toBe(true);
        expect(countCorrect).toBe(true);
      })
    );
  });
});
