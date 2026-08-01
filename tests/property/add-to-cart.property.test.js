// Feature: punnagai-ecommerce, Property 7: Add to Cart Increases Count
/**
 * Property 7: Add to Cart Increases Count
 *
 * For any item added to a cart, the cart item count SHALL increase by the
 * quantity added, and the item SHALL appear in the cart contents (found by its
 * stable productId + variantId/skuId key) with the correct combined quantity.
 *
 * **Validates: Requirements 3.1**
 *
 * Strategy: generate an existing cart (array of items
 *   { productId, variantId, quantity: int>=1, price }) over a deliberately
 * SMALL id/variant space so that the new item frequently collides with an
 * existing line — exercising BOTH the new-line case and the merge-into-existing
 * case. The cart is de-duplicated by item key so each variant maps to a single
 * line (the shape `addItem` maintains). We then assert:
 *   1. total quantity count after addItem === count before + addedQuantity
 *   2. the added variant appears in the result, found by `itemKey`
 *   3. that line's quantity === (existing line quantity, or 0) + addedQuantity
 *   4. addItem does not mutate the input array or its items (purity)
 *
 * The global setup (tests/setup/fast-check.setup.js) enforces numRuns >= 100.
 */
const fc = require('fast-check');
const cart = require('../../js/lib/cart-logic');

// Small id/variant spaces guarantee frequent collisions -> merge case coverage.
const productIdArb = fc.integer({ min: 0, max: 3 }).map(String);
const variantIdArb = fc.oneof(
  fc.constant(undefined), // variant-less (simple) product
  fc.integer({ min: 0, max: 2 }).map(String)
);
const quantityArb = fc.integer({ min: 1, max: 10 });
const priceArb = fc.integer({ min: 0, max: 5000 });

const itemArb = fc.record({
  productId: productIdArb,
  variantId: variantIdArb,
  quantity: quantityArb,
  price: priceArb
});

// A cart whose lines have unique item keys (the invariant addItem preserves).
const cartArb = fc.array(itemArb, { minLength: 0, maxLength: 8 }).map((items) => {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = cart.itemKey(it);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
});

// Total cart item count = sum of line quantities.
function totalCount(items) {
  return items.reduce((sum, it) => sum + it.quantity, 0);
}

describe('Property 7: Add to Cart Increases Count (Req 3.1)', () => {
  test('adding an item increases the total count by its quantity and the variant appears with the combined quantity', () => {
    fc.assert(
      fc.property(cartArb, itemArb, (existing, newItem) => {
        const before = totalCount(existing);
        const addQty = newItem.quantity;

        // Snapshots to detect any mutation of the inputs (purity check).
        const existingSnapshot = JSON.stringify(existing);
        const newItemSnapshot = JSON.stringify(newItem);

        const result = cart.addItem(existing, newItem);

        // 1. Total count increases by exactly the added quantity.
        expect(totalCount(result)).toBe(before + addQty);

        // 2. The added variant appears in the result.
        const key = cart.itemKey(newItem);
        const resultLine = result.find((it) => cart.itemKey(it) === key);
        expect(resultLine).toBeDefined();

        // 3. Combined quantity is correct for BOTH new-line and merge cases.
        const existingLine = existing.find((it) => cart.itemKey(it) === key);
        const expectedQty = (existingLine ? existingLine.quantity : 0) + addQty;
        expect(resultLine.quantity).toBe(expectedQty);

        // 4. Purity: a new array is returned and inputs are not mutated.
        expect(result).not.toBe(existing);
        expect(JSON.stringify(existing)).toBe(existingSnapshot);
        expect(JSON.stringify(newItem)).toBe(newItemSnapshot);
      })
    );
  });
});
