// Feature: punnagai-ecommerce, Property 8: Quantity Modification Reflects Accurately
/**
 * Property 8: Quantity Modification Reflects Accurately
 *
 * For any item in the cart and any quantity modification within stock limits,
 * the cart SHALL update the displayed quantity and recalculate the line total
 * correctly.
 *
 * **Validates: Requirements 3.2**
 *
 * Strategy: generate a cart of items keyed by productId + variantId, each with
 * a non-negative integer unitPrice. Pick an existing line by index and a new
 * requested quantity (intentionally including values below 1 and above stock).
 * Optionally generate a stock ceiling. After updateQuantity(items, key, qty,
 * stock) we assert:
 *   - the matching line's quantity === the clamped expected value
 *       max(1, min(requested, stock))  when stock provided and >= 1
 *       max(1, floor(requested))       otherwise
 *   - the matching line's lineTotal === quantity × unitPrice
 *   - every other line is left unchanged
 *   - the input array and its items are not mutated
 *
 * The global setup (tests/setup/fast-check.setup.js) enforces numRuns >= 100.
 */
const fc = require('fast-check');
const cart = require('../../js/lib/cart-logic');

// A single cart line. variantId is kept small so distinct lines are likely but
// the itemKey (productId::variantId) still uniquely identifies each line.
const itemArb = fc.record({
  productId: fc.string({ minLength: 1, maxLength: 6 }),
  variantId: fc.string({ minLength: 0, maxLength: 4 }),
  quantity: fc.integer({ min: 1, max: 50 }),
  unitPrice: fc.integer({ min: 0, max: 100000 })
});

// A cart of 1..6 lines with UNIQUE keys (so the "other lines unchanged" and
// single-target assertions are unambiguous).
const cartArb = fc
  .array(itemArb, { minLength: 1, maxLength: 6 })
  .map((items) => {
    const seen = new Set();
    return items.filter((it) => {
      const key = cart.itemKey(it);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })
  .filter((items) => items.length >= 1);

// Requested quantity: span below 1, normal, and above typical stock.
const requestedQtyArb = fc.integer({ min: -5, max: 200 });

// Optional stock ceiling: undefined (no clamp) or an integer (incl. 0 / below 1).
const stockArb = fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined });

function expectedQuantity(requested, stock) {
  let q = Math.max(1, Math.floor(requested));
  if (stock !== undefined && stock !== null && Number.isFinite(Number(stock))) {
    const ceiling = Math.floor(Number(stock));
    if (ceiling >= 1 && q > ceiling) {
      q = ceiling;
    }
  }
  return q;
}

describe('Property 8: Quantity Modification Reflects Accurately (Req 3.2)', () => {
  test('updateQuantity clamps quantity and recomputes lineTotal accurately', () => {
    fc.assert(
      fc.property(
        cartArb,
        fc.nat(),
        requestedQtyArb,
        stockArb,
        (items, rawIndex, requested, stock) => {
          const index = rawIndex % items.length;
          const target = items[index];
          const key = cart.itemKey(target);

          // Snapshot for mutation detection.
          const before = JSON.parse(JSON.stringify(items));

          const result = cart.updateQuantity(items, key, requested, stock);

          // Input is not mutated.
          expect(items).toEqual(before);

          const expectedQty = expectedQuantity(requested, stock);

          const updatedLine = result.find((it) => cart.itemKey(it) === key);
          expect(updatedLine).toBeDefined();

          // Displayed quantity reflects the clamped value.
          expect(updatedLine.quantity).toBe(expectedQty);

          // Line total recalculated correctly.
          expect(updatedLine.lineTotal).toBe(expectedQty * target.unitPrice);

          // Every other line is unchanged.
          result.forEach((line, i) => {
            if (cart.itemKey(line) !== key) {
              expect(line).toEqual(items[i]);
            }
          });
        }
      )
    );
  });
});
