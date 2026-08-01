// Feature: punnagai-ecommerce, Property 16: Order Status Transitions Follow Rules
/**
 * Property 16: Order Status Transitions Follow Rules — Validates: Requirements 6.8
 *
 * For any order, the status transition from "pending" to "confirmed" (after a
 * successful UPI payment) SHALL always occur, and subsequent transitions SHALL
 * follow the allowed sequence: confirmed → shipped → delivered.
 *
 * The persisted order-status state machine in `js/lib/order.js` is PURE and
 * deterministic: `canTransition(from, to)` reports whether a move is legal and
 * `applyTransition(order, to, opts)` returns a NEW order with the updated
 * status (or throws on an illegal move). Timestamps are injected via
 * `opts.now`, so outcomes are reproducible for fixed inputs.
 *
 * We exercise the rule across several families:
 *   1. pending → confirmed is ALWAYS allowed (the core guarantee).
 *   2. The happy path pending → confirmed → shipped → delivered always succeeds.
 *   3. Illegal jumps/back-moves on the fulfilment path are ALWAYS rejected.
 *   4. applyTransition never mutates its input and stamps fulfilment timestamps.
 *   5. canTransition / applyTransition agree (legal ⇒ applies, illegal ⇒ throws).
 */
const fc = require('fast-check');
const order = require('../../js/lib/order');

const { canTransition, applyTransition, ORDER_STATES } = order;

// The strict fulfilment happy-path order (Property 16's allowed sequence).
const FULFILMENT_PATH = ['pending', 'confirmed', 'shipped', 'delivered'];

// Generators -----------------------------------------------------------------

// Any known order status (pending|confirmed|shipped|delivered|cancelled|refunded).
const orderStateArb = fc.constantFrom(...ORDER_STATES);

// An order document carrying an arbitrary current status plus some extra fields
// we use to confirm applyTransition leaves the rest of the order untouched.
const orderArb = fc.record({
  orderStatus: orderStateArb,
  id: fc.string({ minLength: 1, maxLength: 8 }),
  total: fc.integer({ min: 0, max: 100000 })
});

// Injected clock so timestamp stamping is deterministic.
const nowArb = fc.integer({ min: 1, max: 4102444800000 });

describe('Property 16: Order Status Transitions Follow Rules (Req 6.8)', () => {
  test('pending → confirmed is ALWAYS allowed (after successful UPI payment)', () => {
    fc.assert(
      fc.property(orderArb, nowArb, (base, now) => {
        const pendingOrder = { ...base, orderStatus: 'pending' };

        expect(canTransition('pending', 'confirmed')).toBe(true);

        const confirmed = applyTransition(pendingOrder, 'confirmed', { now });
        expect(confirmed.orderStatus).toBe('confirmed');
      })
    );
  });

  test('the full happy path pending → confirmed → shipped → delivered always succeeds', () => {
    fc.assert(
      fc.property(orderArb, nowArb, (base, now) => {
        let current = { ...base, orderStatus: 'pending' };

        for (let i = 0; i < FULFILMENT_PATH.length - 1; i++) {
          const to = FULFILMENT_PATH[i + 1];
          expect(canTransition(current.orderStatus, to)).toBe(true);
          current = applyTransition(current, to, { now });
          expect(current.orderStatus).toBe(to);
        }

        expect(current.orderStatus).toBe('delivered');
        // Fulfilment timestamps were stamped along the way.
        expect(current.shippedAt).toBe(now);
        expect(current.deliveredAt).toBe(now);
      })
    );
  });

  test('illegal jumps and back-moves on the fulfilment path are ALWAYS rejected', () => {
    // Every from/to pair drawn from the fulfilment states; a move is legal ONLY
    // when `to` is exactly the next step after `from` in FULFILMENT_PATH.
    const fulfilmentStateArb = fc.constantFrom(...FULFILMENT_PATH);

    fc.assert(
      fc.property(
        orderArb,
        fulfilmentStateArb,
        fulfilmentStateArb,
        nowArb,
        (base, from, to, now) => {
          const fromIdx = FULFILMENT_PATH.indexOf(from);
          const toIdx = FULFILMENT_PATH.indexOf(to);
          const isLegalForwardStep = toIdx === fromIdx + 1;

          const current = { ...base, orderStatus: from };

          if (isLegalForwardStep) {
            expect(canTransition(from, to)).toBe(true);
            expect(applyTransition(current, to, { now }).orderStatus).toBe(to);
          } else {
            // Skips (e.g. pending → shipped, confirmed → delivered), no-ops
            // (from === to), and backwards moves (e.g. shipped → confirmed) are
            // all illegal on the strict fulfilment path.
            expect(canTransition(from, to)).toBe(false);
            expect(() => applyTransition(current, to, { now })).toThrow();
          }
        }
      )
    );
  });

  test('applyTransition never mutates its input order', () => {
    fc.assert(
      fc.property(orderArb, orderStateArb, nowArb, (base, to, now) => {
        const snapshot = { ...base };

        if (canTransition(base.orderStatus, to)) {
          const next = applyTransition(base, to, { now });
          // A new object is returned; the original is unchanged.
          expect(next).not.toBe(base);
          expect(next.orderStatus).toBe(to);
        } else {
          expect(() => applyTransition(base, to, { now })).toThrow();
        }

        // Either way, the input order is identical to its pre-call snapshot.
        expect(base).toEqual(snapshot);
      })
    );
  });

  test('canTransition and applyTransition agree for every state pair', () => {
    fc.assert(
      fc.property(orderArb, orderStateArb, nowArb, (base, to, now) => {
        const allowed = canTransition(base.orderStatus, to);

        if (allowed) {
          expect(() => applyTransition(base, to, { now })).not.toThrow();
        } else {
          expect(() => applyTransition(base, to, { now })).toThrow();
        }
      })
    );
  });
});
