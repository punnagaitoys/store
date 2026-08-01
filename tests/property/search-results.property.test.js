// Feature: punnagai-ecommerce, Property 2: Search Results Match Query
/**
 * Property 2: Search Results Match Query — Validates: Requirements 1.3
 *
 * For any search query and catalog, `searchProducts(products, term)`:
 *  - returns a result set that is a SUBSET of the input products (no product is
 *    invented), and
 *  - for a NON-empty (non-whitespace) term, every returned product contains the
 *    term — case-insensitively — in its `name` OR its `description`.
 *
 * The empty / whitespace-only term case (which returns the full catalog) is
 * covered separately so the "contains term" assertion stays meaningful.
 */
const fc = require('fast-check');
const catalog = require('../../js/lib/catalog');

const { searchProducts } = catalog;

// A product with arbitrary (possibly empty, possibly unicode) name/description.
const productArb = fc.record({
  productId: fc.string(),
  name: fc.string(),
  description: fc.string()
});

const productsArb = fc.array(productArb, { maxLength: 30 });

describe('Property 2: Search Results Match Query (Req 1.3)', () => {
  test('non-empty term: every result contains the term (case-insensitive) in name or description, and is a subset', () => {
    fc.assert(
      fc.property(productsArb, fc.string(), (products, term) => {
        // Keep the "contains term" assertion meaningful: skip terms that are
        // empty or whitespace-only (those return the whole catalog by design).
        fc.pre(term.trim() !== '');

        const results = searchProducts(products, term);
        const needle = term.toLowerCase().trim();

        for (const p of results) {
          // Subset: every returned product is one of the inputs.
          expect(products).toContain(p);

          // Match: term appears in name OR description, case-insensitively.
          const name = (p.name || '').toLowerCase();
          const description = (p.description || '').toLowerCase();
          expect(name.indexOf(needle) !== -1 || description.indexOf(needle) !== -1).toBe(true);
        }
      })
    );
  });

  test('empty / whitespace-only term returns the entire catalog (as a copy)', () => {
    fc.assert(
      fc.property(
        productsArb,
        fc.constantFrom('', '   ', '\t', '\n', ' \t \n '),
        (products, term) => {
          const results = searchProducts(products, term);
          // Same contents, same order — the whole catalog is returned.
          expect(results).toEqual(products);
        }
      )
    );
  });
});
