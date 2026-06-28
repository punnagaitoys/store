// Feature: punnagai-ecommerce, Property 13: Wishlist Cleared on Logout
/**
 * Property 13: Wishlist Cleared on Logout
 *
 * For any session with a non-empty wishlist, logging out then back in results
 * in an empty wishlist for the next session, regardless of the prior contents.
 *
 * **Validates: Requirements 4.5**
 *
 * Strategy: generate a non-empty array of productIds (1..20 non-empty strings).
 * With a fresh in-memory `sessionStorage`-like shim per run we:
 *   1. add every generated id to the wishlist,
 *   2. assert the wishlist count is > 0 (precondition: non-empty session),
 *   3. call `clearOnLogout(shim)`,
 *   4. assert `getWishlistCount(shim) === 0` and `getWishlist(shim)` is `[]`,
 *      regardless of the generated contents,
 *   5. simulate "log back in" by re-reading from the same (now-cleared) storage
 *      and confirm it is still empty (Req 4.6 — next session starts empty).
 *
 * The global setup (tests/setup/fast-check.setup.js) enforces numRuns >= 100.
 */
const fc = require('fast-check');
const wishlist = require('../../js/lib/wishlist');

/**
 * Minimal in-memory Storage shim with the Web Storage surface the wishlist
 * module uses (getItem / setItem / removeItem). A fresh instance per run keeps
 * each generated case fully isolated.
 */
function makeStorageShim() {
  const map = Object.create(null);
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
    },
    setItem(key, value) {
      map[key] = String(value);
    },
    removeItem(key) {
      delete map[key];
    },
  };
}

// Non-empty product ids: 1..20 non-empty (post-trim) strings.
const productIdArb = fc
  .string({ minLength: 1, maxLength: 12 })
  .filter((s) => s.trim().length > 0);
const productIdsArb = fc.array(productIdArb, { minLength: 1, maxLength: 20 });

describe('Property 13: Wishlist Cleared on Logout (Req 4.5)', () => {
  test('logging out empties the wishlist for the next session, regardless of prior contents', () => {
    fc.assert(
      fc.property(productIdsArb, (productIds) => {
        const store = makeStorageShim();

        // 1. Populate the wishlist for this session.
        productIds.forEach((id) => wishlist.addToWishlist(id, store));

        // 2. Precondition: the session wishlist is non-empty.
        expect(wishlist.getWishlistCount(store)).toBeGreaterThan(0);

        // 3. Log out.
        wishlist.clearOnLogout(store);

        // 4. The wishlist is empty regardless of what was added.
        expect(wishlist.getWishlistCount(store)).toBe(0);
        expect(wishlist.getWishlist(store)).toEqual([]);

        // 5. "Log back in": a fresh read from the same cleared storage is empty.
        expect(wishlist.getWishlist(store)).toEqual([]);
        expect(wishlist.getWishlistCount(store)).toBe(0);
      })
    );
  });
});
