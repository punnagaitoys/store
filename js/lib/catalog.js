/**
 * catalog.js — Pure product catalog filtering / search / sort engine
 * (Punnagai / Punnagai Toy Store)
 *
 * Pure-logic module: NO DOM, NO Firebase, NO localStorage. Works in the browser
 * (as `window.PunnagaiCatalog`) and under Node/Jest (via `module.exports`).
 *
 * This is the reusable catalog engine used by the storefront UI. It mirrors the
 * field semantics of `js/data.js` (`applyProductFilters`) so the cached data
 * layer and the UI behave identically.
 *
 * Product shape (from js/data.js):
 *   { name, description, price, originalPrice, category, ageGroup, imageUrl,
 *     inStock, featured, badge, createdAt }
 *
 * Responsibilities & properties:
 *  - filterProductsByCategory: subset by `category` (Requirement 1.2, Property 1).
 *  - searchProducts: name/description case-insensitive match (Req 1.3, Property 2).
 *  - applyFilters: combined age group / price range / category (Req 1.4, 1.5,
 *    Property 3 — count accuracy + price-narrowing metamorphic behaviour).
 *  - applySort: popularity / price-asc / price-desc / newest / rating, using a
 *    STABLE sort that returns a NEW array and never mutates its input
 *    (Requirement 1.6, Property 4 — idempotence).
 *  - matchingCount: number of products matching a set of filters (Req 1.5).
 *
 * Sort field notes (documented fallbacks — the product schema has no explicit
 * `popularity` or `rating` field):
 *  - 'newest'     → `createdAt` descending (missing createdAt treated as 0).
 *  - 'price-asc'  → `price` ascending (low → high).
 *  - 'price-desc' → `price` descending (high → low).
 *  - 'popularity' → featured products first, then `createdAt` descending. This
 *                   is a sensible proxy until a real popularity metric exists.
 *  - 'rating'     → uses a numeric `rating` field when present; products without
 *                   a rating fall back to the same featured-first / newest order
 *                   as 'popularity', so the sort is still total and idempotent.
 *  Any unknown sort order returns a copy of the input in its original order.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiCatalog = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  // Valid age-group buckets (Requirement 1.4). Used for documentation/validation;
  // filtering simply matches a product's `ageGroup` against the requested value.
  const AGE_GROUPS = ['0-2', '3-5', '6-8', '9-12', '12+'];

  // Supported sort orders (Requirement 1.6).
  const SORT_ORDERS = ['popularity', 'price-asc', 'price-desc', 'newest', 'rating'];

  /**
   * Normalize an arbitrary value into a safe array (non-arrays become []).
   * @param {*} value
   * @returns {Array}
   */
  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  /**
   * Treat 'all'/empty/null as "no filter applied".
   * @param {*} value
   * @returns {boolean}
   */
  function isWildcard(value) {
    return value === undefined || value === null || value === '' || value === 'all';
  }

  /**
   * Coerce a value to a finite number, falling back to `fallback` when it is
   * not a usable number. Keeps sort/price comparisons robust against missing
   * or malformed fields.
   * @param {*} value
   * @param {number} fallback
   * @returns {number}
   */
  function toNumber(value, fallback) {
    const n = Number(value);
    return isFinite(n) ? n : fallback;
  }

  /**
   * Lowercase string helper that tolerates non-string / missing values.
   * @param {*} value
   * @returns {string}
   */
  function lower(value) {
    return value === undefined || value === null ? '' : String(value).toLowerCase();
  }

  /**
   * Filter products to those whose `category` exactly matches the requested
   * category. A wildcard category ('all'/empty/null) returns every product.
   *
   * The result is always a NEW array and a subset of the input, so the filtered
   * count is <= the original count (design Property 1 / Requirement 1.2).
   *
   * @param {Array<Object>} products
   * @param {string} category
   * @returns {Array<Object>}
   */
  function filterProductsByCategory(products, category) {
    const list = toArray(products);
    if (isWildcard(category)) {
      return list.slice();
    }
    return list.filter(function (p) {
      return p && p.category === category;
    });
  }

  /**
   * Search products by a term that must appear (case-insensitively) in either
   * the product `name` or `description`. An empty / whitespace-only term returns
   * every product (a copy).
   *
   * Every returned product contains the term in name or description, and the
   * result is a subset of the input (design Property 2 / Requirement 1.3).
   *
   * @param {Array<Object>} products
   * @param {string} term
   * @returns {Array<Object>}
   */
  function searchProducts(products, term) {
    const list = toArray(products);
    const needle = lower(term).trim();
    if (needle === '') {
      return list.slice();
    }
    return list.filter(function (p) {
      if (!p) {
        return false;
      }
      return lower(p.name).indexOf(needle) !== -1 ||
        lower(p.description).indexOf(needle) !== -1;
    });
  }

  /**
   * Apply a combined set of filters to a product list. Each filter is optional;
   * a wildcard / undefined value means "do not constrain on this field".
   *
   * Supported filter keys:
   *  - category   {string}  exact match on `category` (Requirement 1.2/1.4)
   *  - ageGroup   {string}  exact match on `ageGroup`, one of AGE_GROUPS (1.4)
   *  - priceMin   {number}  inclusive lower bound on `price` (1.4)
   *  - priceMax   {number}  inclusive upper bound on `price` (1.4)
   *  - search     {string}  optional name/description term (1.3) — included so a
   *                         single call can satisfy the UI's combined query.
   *
   * The returned list is a NEW array containing exactly the products matching
   * ALL provided criteria (design Property 3 / Requirement 1.5). Because each
   * additional or tighter constraint can only remove products, narrowing the
   * price range decreases or keeps the matching count (metamorphic behaviour).
   *
   * @param {Array<Object>} products
   * @param {Object} [filters]
   * @returns {Array<Object>}
   */
  function applyFilters(products, filters) {
    filters = filters || {};
    let result = toArray(products).slice();

    if (!isWildcard(filters.category)) {
      result = result.filter(function (p) {
        return p && p.category === filters.category;
      });
    }

    if (!isWildcard(filters.ageGroup)) {
      result = result.filter(function (p) {
        return p && p.ageGroup === filters.ageGroup;
      });
    }

    if (filters.priceMin !== undefined && filters.priceMin !== null && filters.priceMin !== '') {
      const min = toNumber(filters.priceMin, -Infinity);
      result = result.filter(function (p) {
        return p && toNumber(p.price, 0) >= min;
      });
    }

    if (filters.priceMax !== undefined && filters.priceMax !== null && filters.priceMax !== '') {
      const max = toNumber(filters.priceMax, Infinity);
      result = result.filter(function (p) {
        return p && toNumber(p.price, 0) <= max;
      });
    }

    if (!isWildcard(filters.search)) {
      result = searchProducts(result, filters.search);
    }

    return result;
  }

  /**
   * Count the products matching a set of filters (Requirement 1.5). Equivalent
   * to `applyFilters(products, filters).length` but expressed directly so the
   * displayed count always reflects the actual matching set.
   *
   * @param {Array<Object>} products
   * @param {Object} [filters]
   * @returns {number}
   */
  function matchingCount(products, filters) {
    return applyFilters(products, filters).length;
  }

  /**
   * Stable sort that never mutates its input. Decorates each element with its
   * original index and uses that index as a final tie-breaker, guaranteeing a
   * total order regardless of the host engine's sort stability. This is what
   * makes `applySort` idempotent: re-sorting an already-sorted list reproduces
   * the same order (design Property 4).
   *
   * @param {Array} list
   * @param {Function} comparator (a, b) => number
   * @returns {Array} a new, sorted array
   */
  function stableSort(list, comparator) {
    return list
      .map(function (item, index) {
        return { item: item, index: index };
      })
      .sort(function (a, b) {
        const cmp = comparator(a.item, b.item);
        if (cmp !== 0) {
          return cmp;
        }
        return a.index - b.index;
      })
      .map(function (entry) {
        return entry.item;
      });
  }

  // Featured-first then newest comparator, shared by 'popularity' and the
  // rating fallback. `featured === true` sorts ahead of everything else; within
  // each group, newer `createdAt` comes first.
  function featuredThenNewest(a, b) {
    const af = a && a.featured === true ? 0 : 1;
    const bf = b && b.featured === true ? 0 : 1;
    if (af !== bf) {
      return af - bf;
    }
    return toNumber(b && b.createdAt, 0) - toNumber(a && a.createdAt, 0);
  }

  /**
   * Sort a product list by one of the supported orders, returning a NEW array
   * and leaving the input untouched (Requirement 1.6).
   *
   * Supported orders: 'popularity', 'price-asc', 'price-desc', 'newest',
   * 'rating'. Unknown / missing orders return a copy in original order.
   *
   * The sort is stable and idempotent: applying it twice yields the same result
   * as applying it once (design Property 4).
   *
   * @param {Array<Object>} products
   * @param {string} order
   * @returns {Array<Object>}
   */
  function applySort(products, order) {
    const list = toArray(products);

    switch (order) {
      case 'price-asc':
        return stableSort(list, function (a, b) {
          return toNumber(a && a.price, 0) - toNumber(b && b.price, 0);
        });
      case 'price-desc':
        return stableSort(list, function (a, b) {
          return toNumber(b && b.price, 0) - toNumber(a && a.price, 0);
        });
      case 'newest':
        return stableSort(list, function (a, b) {
          return toNumber(b && b.createdAt, 0) - toNumber(a && a.createdAt, 0);
        });
      case 'rating':
        return stableSort(list, function (a, b) {
          const ar = a && a.rating !== undefined && a.rating !== null;
          const br = b && b.rating !== undefined && b.rating !== null;
          // Both rated: higher rating first.
          if (ar && br) {
            const diff = toNumber(b.rating, 0) - toNumber(a.rating, 0);
            if (diff !== 0) {
              return diff;
            }
            return featuredThenNewest(a, b);
          }
          // Rated products rank ahead of unrated ones.
          if (ar !== br) {
            return ar ? -1 : 1;
          }
          // Neither rated: fall back to featured-first / newest.
          return featuredThenNewest(a, b);
        });
      case 'popularity':
        return stableSort(list, featuredThenNewest);
      default:
        // Unknown order: preserve original order (still a fresh copy).
        return list.slice();
    }
  }

  return {
    filterProductsByCategory: filterProductsByCategory,
    searchProducts: searchProducts,
    applyFilters: applyFilters,
    applySort: applySort,
    matchingCount: matchingCount,
    // Constants / helpers exposed for reuse and tests.
    AGE_GROUPS: AGE_GROUPS,
    SORT_ORDERS: SORT_ORDERS
  };
});
