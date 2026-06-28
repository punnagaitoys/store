/**
 * Unit tests for the pure order logic (js/lib/order.js).
 *
 * Covers Requirement 6: order-total computation (6.6), the persisted
 * order-status state machine (6.8 / Property 16), the checkout-phase
 * progression (6.1/6.2), and duplicate-order detection (design error
 * handling: "Payment Already Processed within 2 seconds").
 * (The Property 16 property test lives in tests/property.)
 */
const order = require('../../js/lib/order');

describe('computeOrderTotal (Req 6.6)', () => {
  test('total = subtotal + shipping + tax − discount', () => {
    // Matches the design orders-schema example.
    expect(
      order.computeOrderTotal({ subtotal: 798, shippingFee: 50, taxAmount: 96, discount: 80 })
    ).toBe(864);
  });

  test('defaults missing components to 0', () => {
    expect(order.computeOrderTotal({ subtotal: 500 })).toBe(500);
  });

  test('floors at 0 when discount exceeds the rest', () => {
    expect(
      order.computeOrderTotal({ subtotal: 100, shippingFee: 0, taxAmount: 0, discount: 250 })
    ).toBe(0);
  });

  test('negative / invalid components are clamped to 0', () => {
    expect(
      order.computeOrderTotal({ subtotal: 100, shippingFee: -50, taxAmount: 'x', discount: -10 })
    ).toBe(100);
  });

  test('handles missing argument gracefully', () => {
    expect(order.computeOrderTotal()).toBe(0);
  });
});

describe('order-status state machine (Req 6.8 / Property 16)', () => {
  test('pending → confirmed is allowed', () => {
    expect(order.canTransition('pending', 'confirmed')).toBe(true);
  });

  test('happy path confirmed → shipped → delivered is allowed', () => {
    expect(order.canTransition('confirmed', 'shipped')).toBe(true);
    expect(order.canTransition('shipped', 'delivered')).toBe(true);
  });

  test('illegal jumps are rejected', () => {
    expect(order.canTransition('confirmed', 'delivered')).toBe(false);
    expect(order.canTransition('pending', 'shipped')).toBe(false);
    expect(order.canTransition('pending', 'delivered')).toBe(false);
  });

  test('backwards transitions are rejected', () => {
    expect(order.canTransition('shipped', 'confirmed')).toBe(false);
    expect(order.canTransition('delivered', 'shipped')).toBe(false);
  });

  test('terminal states allow no further transitions', () => {
    expect(order.canTransition('cancelled', 'confirmed')).toBe(false);
    expect(order.canTransition('refunded', 'shipped')).toBe(false);
  });

  test('cancellation and refund paths are allowed', () => {
    expect(order.canTransition('pending', 'cancelled')).toBe(true);
    expect(order.canTransition('confirmed', 'cancelled')).toBe(true);
    expect(order.canTransition('confirmed', 'refunded')).toBe(true);
    expect(order.canTransition('delivered', 'refunded')).toBe(true);
  });

  test('unknown states are never transitionable', () => {
    expect(order.canTransition('bogus', 'confirmed')).toBe(false);
    expect(order.canTransition('confirmed', 'bogus')).toBe(false);
  });

  test('applyTransition returns a new order without mutating the input', () => {
    const o = { orderId: 'x', orderStatus: 'pending' };
    const next = order.applyTransition(o, 'confirmed');
    expect(next.orderStatus).toBe('confirmed');
    expect(o.orderStatus).toBe('pending');
    expect(next).not.toBe(o);
  });

  test('applyTransition stamps shippedAt and deliveredAt', () => {
    const shipped = order.applyTransition({ orderStatus: 'confirmed' }, 'shipped', { now: 1000 });
    expect(shipped.shippedAt).toBe(1000);
    const delivered = order.applyTransition(shipped, 'delivered', { now: 2000 });
    expect(delivered.deliveredAt).toBe(2000);
  });

  test('applyTransition throws on an illegal transition', () => {
    expect(() => order.applyTransition({ orderStatus: 'confirmed' }, 'delivered')).toThrow();
  });
});

describe('checkout-phase progression (Req 6.1/6.2)', () => {
  test('cart → checkout → payment_processing → confirmed', () => {
    expect(order.canCheckoutTransition('cart', 'checkout')).toBe(true);
    expect(order.canCheckoutTransition('checkout', 'payment_processing')).toBe(true);
    expect(order.canCheckoutTransition('payment_processing', 'confirmed')).toBe(true);
  });

  test('payment failure can return to checkout for retry (Req 6.9)', () => {
    expect(order.canCheckoutTransition('payment_processing', 'checkout')).toBe(true);
  });

  test('illegal checkout jumps are rejected', () => {
    expect(order.canCheckoutTransition('cart', 'payment_processing')).toBe(false);
    expect(order.canCheckoutTransition('cart', 'confirmed')).toBe(false);
    expect(order.canCheckoutTransition('confirmed', 'cart')).toBe(false);
  });

  test('applyCheckoutTransition returns a new state and throws on illegal moves', () => {
    const next = order.applyCheckoutTransition({ phase: 'cart' }, 'checkout');
    expect(next.phase).toBe('checkout');
    expect(() => order.applyCheckoutTransition({ phase: 'cart' }, 'confirmed')).toThrow();
  });
});

describe('isDuplicateOrder (Req 6 — Payment Already Processed)', () => {
  function makeOrder(overrides) {
    return Object.assign(
      {
        userId: 'user_001',
        items: [{ skuId: 'SKU-001-S-RED', quantity: 2 }],
        total: 864,
        createdAt: 10000
      },
      overrides || {}
    );
  }

  test('detects an equivalent order within the default 2s window', () => {
    const existing = [makeOrder({ createdAt: 9000 })];
    const incoming = makeOrder({ createdAt: 10000 });
    expect(order.isDuplicateOrder(incoming, existing)).toBe(true);
  });

  test('does not flag an order outside the window', () => {
    const existing = [makeOrder({ createdAt: 1000 })];
    const incoming = makeOrder({ createdAt: 10000 });
    expect(order.isDuplicateOrder(incoming, existing)).toBe(false);
  });

  test('item order does not affect equivalence', () => {
    const a = makeOrder({
      items: [{ skuId: 'A', quantity: 1 }, { skuId: 'B', quantity: 2 }]
    });
    const b = makeOrder({
      items: [{ skuId: 'B', quantity: 2 }, { skuId: 'A', quantity: 1 }]
    });
    expect(order.isDuplicateOrder(a, [b])).toBe(true);
  });

  test('different user is not a duplicate', () => {
    const existing = [makeOrder({ userId: 'user_002' })];
    expect(order.isDuplicateOrder(makeOrder(), existing)).toBe(false);
  });

  test('different total is not a duplicate', () => {
    const existing = [makeOrder({ total: 999 })];
    expect(order.isDuplicateOrder(makeOrder(), existing)).toBe(false);
  });

  test('different items are not a duplicate', () => {
    const existing = [makeOrder({ items: [{ skuId: 'OTHER', quantity: 1 }] })];
    expect(order.isDuplicateOrder(makeOrder(), existing)).toBe(false);
  });

  test('empty existing list yields no duplicate', () => {
    expect(order.isDuplicateOrder(makeOrder(), [])).toBe(false);
  });

  test('respects a custom window', () => {
    const existing = [makeOrder({ createdAt: 5000 })];
    const incoming = makeOrder({ createdAt: 9000 });
    expect(order.isDuplicateOrder(incoming, existing, { windowMs: 5000 })).toBe(true);
    expect(order.isDuplicateOrder(incoming, existing, { windowMs: 1000 })).toBe(false);
  });
});
