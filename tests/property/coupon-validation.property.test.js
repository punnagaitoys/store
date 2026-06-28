// Feature: punnagai-ecommerce, Property 10: Coupon Validation Consistency
/**
 * Property 10: Coupon Validation Consistency — Validates: Requirements 3.7
 *
 * For any coupon code entered at checkout, the system behavior SHALL be
 * consistent: valid coupons (active, within expiry and usage limits, and with
 * the cart meeting the minimum order value) SHALL apply a discount, while
 * expired or otherwise invalid coupons SHALL be rejected with an appropriate
 * reason message.
 *
 * `validateCoupon(code, cart, coupon, now)` is a PURE function: the coupon
 * record is passed in and `now` is injected, so outcomes are deterministic for
 * a fixed set of inputs. We exercise it across five disjoint case families and
 * assert the consistent outcome for each, plus determinism (same inputs → same
 * result).
 */
const fc = require('fast-check');
const cartLogic = require('../../js/lib/cart-logic');

const { validateCoupon, calculateSubtotal } = cartLogic;

// A fixed reference "now" used as the clock for every case.
const NOW = Date.UTC(2024, 5, 15); // 2024-06-15
const ONE_DAY = 24 * 60 * 60 * 1000;

// A cart line item: quantity × unitPrice contributes to the subtotal.
const itemArb = fc.record({
  productId: fc.string({ minLength: 1, maxLength: 6 }),
  quantity: fc.integer({ min: 1, max: 10 }),
  unitPrice: fc.integer({ min: 1, max: 2000 }),
});

// A non-empty cart so the subtotal is strictly positive (discount can be > 0).
const nonEmptyCartArb = fc.array(itemArb, { minLength: 1, maxLength: 8 });

// Coupon codes: non-empty alnum-ish strings.
const codeArb = fc
  .string({ minLength: 1, maxLength: 10 })
  .filter((s) => s.trim().length > 0);

// A coupon code paired with a randomly re-cased version of itself, so we can
// exercise case-insensitive matching deterministically.
const codeWithRecasedArb = codeArb.chain((code) =>
  fc
    .array(fc.boolean(), { minLength: code.length, maxLength: code.length })
    .map((flags) => ({
      code,
      entered: code
        .split('')
        .map((ch, i) => (flags[i] ? ch.toUpperCase() : ch.toLowerCase()))
        .join(''),
    }))
);

describe('Property 10: Coupon Validation Consistency (Req 3.7)', () => {
  test('VALID coupons (active, unexpired, within usage, min order met) apply a discount', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArb,
        codeArb,
        fc.constantFrom('percentage', 'fixed'),
        fc.integer({ min: 1, max: 100 }),
        // expiry: null (no expiry) or strictly in the future.
        fc.option(fc.integer({ min: 1, max: 365 }), { nil: null }),
        // usageLimit 0 (unlimited) or a positive limit; usageCount kept below it.
        fc.integer({ min: 0, max: 100 }),
        // fraction (0..1) used to derive a usageCount strictly below the limit.
        fc.double({ min: 0, max: 0.999, noNaN: true }),
        (cart, code, discountType, rawValue, expiryDays, usageLimit, usageFrac) => {
          const subtotal = calculateSubtotal(cart);

          // A fixed discount larger than the subtotal still clamps to subtotal,
          // so any positive discountValue yields a positive discount on a
          // positive subtotal. Constrain percentage to a sane 1..100.
          const discountValue =
            discountType === 'percentage' ? Math.min(rawValue, 100) : rawValue;

          const coupon = {
            code,
            discountType,
            discountValue,
            expiryDate: expiryDays === null ? null : NOW + expiryDays * ONE_DAY,
            usageLimit,
            usageCount: usageLimit > 0 ? Math.floor(usageFrac * usageLimit) : 0,
            // min order is met: never above the cart subtotal.
            minOrderValue: 0,
            active: true,
          };

          const result = validateCoupon(code, cart, coupon, NOW);

          expect(result.valid).toBe(true);
          expect(result.reason).toBeUndefined();
          // Positive subtotal + positive discountValue ⇒ positive discount.
          expect(result.discountAmount).toBeGreaterThan(0);
          expect(result.discountAmount).toBeLessThanOrEqual(subtotal);
        }
      )
    );
  });

  test('VALID coupons accept the code case-insensitively', () => {
    fc.assert(
      fc.property(nonEmptyCartArb, codeWithRecasedArb, (cart, { code, entered }) => {
        const coupon = {
          code,
          discountType: 'percentage',
          discountValue: 10,
          expiryDate: null,
          usageLimit: 0,
          usageCount: 0,
          minOrderValue: 0,
          active: true,
        };
        const result = validateCoupon(entered, cart, coupon, NOW);
        expect(result.valid).toBe(true);
      })
    );
  });

  test('INVALID: expired coupons (now > expiryDate) are rejected with a reason', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArb,
        codeArb,
        fc.integer({ min: 1, max: 365 }),
        (cart, code, daysAgo) => {
          const coupon = {
            code,
            discountType: 'percentage',
            discountValue: 10,
            expiryDate: NOW - daysAgo * ONE_DAY, // strictly in the past
            usageLimit: 0,
            usageCount: 0,
            minOrderValue: 0,
            active: true,
          };

          const result = validateCoupon(code, cart, coupon, NOW);

          expect(result.valid).toBe(false);
          expect(typeof result.reason).toBe('string');
          expect(result.reason.length).toBeGreaterThan(0);
          expect(result.discountAmount).toBe(0);
        }
      )
    );
  });

  test('INVALID: usage limit reached (usageCount >= usageLimit > 0) is rejected', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArb,
        codeArb,
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (cart, code, usageLimit, extra) => {
          const coupon = {
            code,
            discountType: 'percentage',
            discountValue: 10,
            expiryDate: null,
            usageLimit,
            usageCount: usageLimit + extra, // at or above the limit
            minOrderValue: 0,
            active: true,
          };

          const result = validateCoupon(code, cart, coupon, NOW);

          expect(result.valid).toBe(false);
          expect(typeof result.reason).toBe('string');
          expect(result.discountAmount).toBe(0);
        }
      )
    );
  });

  test('INVALID: subtotal below minOrderValue is rejected', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArb,
        codeArb,
        fc.integer({ min: 1, max: 5000 }),
        (cart, code, gap) => {
          const subtotal = calculateSubtotal(cart);
          const coupon = {
            code,
            discountType: 'percentage',
            discountValue: 10,
            expiryDate: null,
            usageLimit: 0,
            usageCount: 0,
            // strictly greater than the subtotal so the min-order check fails.
            minOrderValue: subtotal + gap,
            active: true,
          };

          const result = validateCoupon(code, cart, coupon, NOW);

          expect(result.valid).toBe(false);
          expect(typeof result.reason).toBe('string');
          expect(result.discountAmount).toBe(0);
        }
      )
    );
  });

  test('INVALID: code mismatch or inactive coupon is rejected', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArb,
        codeArb,
        codeArb,
        fc.boolean(),
        (cart, couponCode, enteredCode, makeInactive) => {
          // Ensure the entered code genuinely differs from the coupon code.
          fc.pre(enteredCode.trim().toUpperCase() !== couponCode.trim().toUpperCase() || makeInactive);

          const coupon = {
            code: couponCode,
            discountType: 'percentage',
            discountValue: 10,
            expiryDate: null,
            usageLimit: 0,
            usageCount: 0,
            minOrderValue: 0,
            active: !makeInactive,
          };

          // When inactive, use the matching code so inactivity is the cause;
          // otherwise use a mismatched code.
          const codeToEnter = makeInactive ? couponCode : enteredCode;
          const result = validateCoupon(codeToEnter, cart, coupon, NOW);

          expect(result.valid).toBe(false);
          expect(typeof result.reason).toBe('string');
          expect(result.discountAmount).toBe(0);
        }
      )
    );
  });

  test('DETERMINISM: identical inputs always produce an identical result', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArb,
        codeArb,
        fc.constantFrom('percentage', 'fixed'),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: -365, max: 365 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.boolean(),
        (cart, code, discountType, discountValue, expiryOffsetDays, usageLimit, usageCount, active) => {
          const coupon = {
            code,
            discountType,
            discountValue,
            expiryDate: NOW + expiryOffsetDays * ONE_DAY,
            usageLimit,
            usageCount,
            minOrderValue: 0,
            active,
          };

          const a = validateCoupon(code, cart, coupon, NOW);
          const b = validateCoupon(code, cart, coupon, NOW);

          expect(a).toEqual(b);
        }
      )
    );
  });
});
