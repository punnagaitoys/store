// Feature: punnagai-ecommerce, Property 12: Add to Wishlist Increases Count
/**
 * Property 12: Add to Wishlist Increases Count
 *
 * For any product added to the wishlist, the count increases by one and the
 * product appears in the wishlist; adding the SAME product twice yields exactly
 * ONE entry (idempotence).
 *
 * **Validates: Requirements 4.1, 4.2**
 *
 * Strategy: every property run gets a FRESH in-memory storage shim (a
 * sessionStorage-like object backed by a Map) so runs never leak state into one
 * another. The shim is passed explicitly as the trailing `storage` argument to
 * each wishlist function. We assert, over generated non-empty string ids:
 *   1. Starting from an empty wishlist, after addToWishlist the count is 1 and
 *      isInWishlist(id) is true.
 *   2. Adding a NEW distinct id increases the count by exactly 1.
 *   3. Adding the SAME id again leaves the count unchanged (idempotence) and the
 *      product still appears exactly once.
 *   4. For a sequence of random ids, the final count equals the number of
 *      DISTINCT valid ids added.
 *
 * The global setup (tests/setup/fast-check.setup.js) enforces numRuns >= 100.
 */
const fc = require('fast-check');
const wishlist = require('../../js/lib/wishlist');

/**
 * Create a fresh sessionStorage-like shim backed by a Map. Isolated per call so
 * each property run starts from a clean, empty wishlist.
 */
function makeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

// Non-empty, non-whitespace-only product ids (these are the ids the module
// considers valid and will actually store).
const productIdArb = fc
  .string({ minLength: 1, maxLength: 12 })
  .filter((s) => s.trim().length > 0);

describe('Property 12: Add to Wishlist Increases Count (Req 4.1, 4.2)', () => {
  test('adding a product increases the count by one and the product appears; duplicates are idempotent', () => {
    fc.assert(
      fc.property(productIdArb, productIdArb, (idA, idB) => {
        const storage = makeStorage();

        // Start empty.
        expect(wishlist.getWishlistCount(storage)).toBe(0);

        // 1. Add idA -> count 1 and present.
        wishlist.addToWishlist(idA, storage);
        expect(wishlist.getWishlistCount(storage)).toBe(1);
        expect(wishlist.isInWishlist(idA, storage)).toBe(true);

        // The trimmed form of idA is what gets stored; compare against that.
        const idANorm = String(idA).trim();
        const occurrencesOf = (id) =>
          wishlist
            .getWishlist(storage)
            .filter((entry) => entry.productId === id).length;
        expect(occurrencesOf(idANorm)).toBe(1);

        // 3. Adding the SAME id again is idempotent: count unchanged, one entry.
        wishlist.addToWishlist(idA, storage);
        expect(wishlist.getWishlistCount(storage)).toBe(1);
        expect(occurrencesOf(idANorm)).toBe(1);

        // 2. Adding idB: if it normalizes to a NEW distinct id, count -> 2;
        //    otherwise (same normalized id as idA) it stays idempotent at 1.
        const idBNorm = String(idB).trim();
        const countBefore = wishlist.getWishlistCount(storage);
        wishlist.addToWishlist(idB, storage);
        if (idBNorm === idANorm) {
          expect(wishlist.getWishlistCount(storage)).toBe(countBefore);
        } else {
          expect(wishlist.getWishlistCount(storage)).toBe(countBefore + 1);
        }
        expect(wishlist.isInWishlist(idB, storage)).toBe(true);
        expect(occurrencesOf(idBNorm)).toBe(1);
      })
    );
  });

  test('after adding a sequence of ids, the final count equals the number of distinct valid ids', () => {
    fc.assert(
      fc.property(fc.array(productIdArb, { maxLength: 20 }), (ids) => {
        const storage = makeStorage();

        ids.forEach((id) => wishlist.addToWishlist(id, storage));

        // Distinct count is computed over the NORMALIZED (trimmed) ids, since
        // that is the form the module stores and de-duplicates on.
        const distinct = new Set(ids.map((id) => String(id).trim()));

        expect(wishlist.getWishlistCount(storage)).toBe(distinct.size);
        expect(wishlist.getWishlist(storage).length).toBe(distinct.size);

        // Every distinct id is present exactly once.
        distinct.forEach((id) => {
          expect(wishlist.isInWishlist(id, storage)).toBe(true);
        });
      })
    );
  });
});
