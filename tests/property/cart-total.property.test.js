// Feature: punnagai-ecommerce, Property 9: Cart Total Equals Line Item Sum
/**
 * Property 9: Cart Total Equals Line Item Sum
 *
 * For any shopping cart, the cart total SHALL equal the sum of all line items
 * (quantity × unit price) minus any applicable coupon or discount amounts,
 * with no unexplained differences. The total is floored at 0 (never negative).
 *
 * **Validates: Requirements 3.4**
 *
 * Strategy: generate an items array (0..20 lines) of { quantity, unitPrice }
 * with quantity in 1..100 and unitPrice in 1..10000, plus an integer discount
 * percentage in 0..50. We compute the expected total independently:
 *   subtotal = Σ(quantity × unitPrice)
 *   discount = floor(subtotal × discountPercent / 100)
 *   expected = subtotal − discount
 * and assert calculateCartTotal(items, discountPercent) === expected.
 *
 * A separate case asserts the total is floored at 0: a fixed discount larger
 * than the subtotal yields exactly 0, never a negative value.
 *
 * The global setup (tests/setup/fast-check.setup.js) enforces numRuns >= 100.
 */
const fc = require('fast-check');
const cartLogic = require('../../js/lib/cart-logic');

// A single cart line: positive integer quantity and unit price.
const itemArb = fc.record({
  quantity: fc.integer({ min: 1, max: 100 }),
  unitPrice: fc.integer({ min: 1, max: 10000 }),
});

// A cart of 0..20 line items.
const itemsArb = fc.array(itemArb, { minLength: 0, maxLength: 20 });

// An integer discount percentage in 0..50.
const discountPercentArb = fc.integer({ min: 0, max: 50 });

describe('Property 9: Cart Total Equals Line Item Sum (Req 3.4)', () => {
  test('cart total equals line item sum minus percentage discount', () => {
    fc.assert(
      fc.property(itemsArb, discountPercentArb, (items, discountPercent) => {
        const subtotal = items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );
        const discount = Math.floor((subtotal * discountPercent) / 100);
        const expectedTotal = subtotal - discount;
        const calculatedTotal = cartLogic.calculateCartTotal(items, discountPercent);

        expect(calculatedTotal).toBe(expectedTotal);
      })
    );
  });

  test('cart total is floored at 0 when discount exceeds subtotal', () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const subtotal = items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );
        // A fixed discount strictly larger than the subtotal can never drive
        // the total below 0.
        const oversizedDiscount = { type: 'fixed', value: subtotal + 1 };
        const total = cartLogic.calculateCartTotal(items, oversizedDiscount);

        expect(total).toBe(0);
        expect(total).toBeGreaterThanOrEqual(0);
      })
    );
  });
});
