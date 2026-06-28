// Feature: punnagai-ecommerce, Property 4: Sort Idempotence
/**
 * Property 4: Sort Idempotence
 *
 * For any product list and any supported sort order
 * (popularity, price-asc, price-desc, newest, rating), applying the sort twice
 * yields identical results to applying it once:
 *
 *     applySort(applySort(products, order), order)
 *       deep-equals
 *     applySort(products, order)
 *
 * In addition, applySort never mutates its input array (length and element
 * order of the original list are preserved).
 *
 * **Validates: Requirements 1.6**
 *
 * Strategy: generate product lists whose fields exercise every sort path
 * (price-asc/desc, newest via createdAt, rating with optional values, and the
 * featured-first popularity proxy). For each order in SORT_ORDERS (selected via
 * fc.constantFrom) we assert idempotence and non-mutation.
 *
 * The global setup (tests/setup/fast-check.setup.js) enforces numRuns >= 100.
 */
const fc = require('fast-check');
const catalog = require('../../js/lib/catalog');

const { applySort, SORT_ORDERS } = catalog;

// A single product carrying every field the sorts read.
const productArb = fc.record({
  productId: fc.string(),
  price: fc.integer(),
  createdAt: fc.integer(),
  rating: fc.option(fc.integer()),
  featured: fc.boolean()
});

// A list of products (0..20 entries).
const productsArb = fc.array(productArb, { minLength: 0, maxLength: 20 });

// Any supported sort order.
const orderArb = fc.constantFrom(...SORT_ORDERS);

describe('Property 4: Sort Idempotence (Req 1.6)', () => {
  test('sorting twice equals sorting once for every supported order', () => {
    fc.assert(
      fc.property(productsArb, orderArb, (products, order) => {
        const once = applySort(products, order);
        const twice = applySort(once, order);

        // Idempotence: a second sort reproduces the first sort's result.
        expect(twice).toEqual(once);
      })
    );
  });

  test('applySort does not mutate its input array', () => {
    fc.assert(
      fc.property(productsArb, orderArb, (products, order) => {
        const snapshot = products.slice();

        applySort(products, order);

        // The input array is left untouched (same length and element order).
        expect(products).toEqual(snapshot);
      })
    );
  });
});
