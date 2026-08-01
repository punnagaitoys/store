// Feature: punnagai-ecommerce, Property 3: Filter Count Accuracy
/**
 * Property 3: Filter Count Accuracy — Validates: Requirements 1.5
 *
 * For any combination of filters (age group, price range, category), the
 * displayed product count (`matchingCount`) equals the actual number of
 * products matching ALL criteria. We assert this two ways:
 *
 *  1. Consistency with the engine: `matchingCount(products, filters)` ===
 *     `applyFilters(products, filters).length`.
 *  2. Correctness against an independent reference: the count equals a
 *     hand-written plain `.filter` that checks ALL criteria directly.
 *
 * Plus a metamorphic property: narrowing the price range (raising priceMin or
 * lowering priceMax) yields a count <= the original count, because a tighter
 * constraint can only remove products, never add them.
 */
const fc = require('fast-check');
const catalog = require('../../js/lib/catalog');

const { applyFilters, matchingCount } = catalog;

// Field domains mirroring the catalog/data schema.
const CATEGORIES = [
  'Educational & Learning',
  'Building Blocks',
  'Outdoor & Sports',
  'Dolls & Action Figures',
  'Arts & Crafts'
];
const AGE_GROUPS = ['0-2', '3-5', '6-8', '9-12', '12+'];

const productArb = fc.record({
  productId: fc.string(),
  category: fc.constantFrom(...CATEGORIES),
  ageGroup: fc.constantFrom(...AGE_GROUPS),
  price: fc.integer({ min: 0, max: 5000 })
});

const productsArb = fc.array(productArb, { maxLength: 40 });

// A filter combination. Each field may be a wildcard (undefined) meaning
// "do not constrain on this field".
const filtersArb = fc.record(
  {
    category: fc.option(fc.constantFrom(...CATEGORIES), { nil: undefined }),
    ageGroup: fc.option(fc.constantFrom(...AGE_GROUPS), { nil: undefined }),
    priceMin: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }),
    priceMax: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined })
  },
  { requiredKeys: [] }
);

// Independent reference: count products matching ALL provided criteria via a
// plain .filter, with the same wildcard/inclusive-bound semantics as the engine.
function referenceCount(products, filters) {
  const f = filters || {};
  return products.filter((p) => {
    if (
      f.category !== undefined &&
      f.category !== null &&
      f.category !== '' &&
      f.category !== 'all'
    ) {
      if (p.category !== f.category) return false;
    }
    if (
      f.ageGroup !== undefined &&
      f.ageGroup !== null &&
      f.ageGroup !== '' &&
      f.ageGroup !== 'all'
    ) {
      if (p.ageGroup !== f.ageGroup) return false;
    }
    if (f.priceMin !== undefined && f.priceMin !== null && f.priceMin !== '') {
      if (p.price < f.priceMin) return false;
    }
    if (f.priceMax !== undefined && f.priceMax !== null && f.priceMax !== '') {
      if (p.price > f.priceMax) return false;
    }
    return true;
  }).length;
}

describe('Property 3: Filter Count Accuracy (Req 1.5)', () => {
  test('matchingCount equals applyFilters length AND an independent reference count', () => {
    fc.assert(
      fc.property(productsArb, filtersArb, (products, filters) => {
        const count = matchingCount(products, filters);

        // (1) Consistent with the engine's own filtered list.
        expect(count).toBe(applyFilters(products, filters).length);

        // (2) Correct against an independent hand-written filter.
        expect(count).toBe(referenceCount(products, filters));
      })
    );
  });

  test('metamorphic: narrowing the price range does not increase the count', () => {
    fc.assert(
      fc.property(
        productsArb,
        filtersArb,
        // Non-negative deltas used to tighten the range.
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 5000 }),
        (products, filters, raiseMin, lowerMax) => {
          const originalCount = matchingCount(products, filters);

          // Build a narrower filter: raise priceMin and lower priceMax relative
          // to the originals (treating absent bounds as the open extremes).
          const baseMin = filters.priceMin === undefined ? 0 : filters.priceMin;
          const baseMax = filters.priceMax === undefined ? 5000 : filters.priceMax;

          const narrowed = {
            ...filters,
            priceMin: baseMin + raiseMin,
            priceMax: baseMax - lowerMax
          };

          const narrowedCount = matchingCount(products, narrowed);

          // A tighter price range can only remove products, never add them.
          expect(narrowedCount).toBeLessThanOrEqual(originalCount);
        }
      )
    );
  });
});
