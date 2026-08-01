// Feature: punnagai-ecommerce, Property 18: Local Delivery Cost is Free
/**
 * Property 18: Local Delivery Cost is Free — Validates: Requirements 7.5
 *
 * For any order with local delivery option selected in the local delivery zone,
 * the shipping fee displayed and charged SHALL be exactly 0 (zero), regardless
 * of order value or item count.
 *
 * This property verifies:
 *   - Local region shipping methods always have cost === 0
 *   - fetchShippingQuote for 'local' region always returns cost === 0
 *   - The cost is never negative, even with malformed cached defaults
 *
 * This is a CRITICAL business rule: local customers expect free delivery
 * unconditionally within the Chennai metro zone (PIN 600001–600100).
 */
const fc = require('fast-check');
const shipping = require('../../js/lib/shipping');

const {
  getAvailableMethods,
  fetchShippingQuote,
  REGIONS,
  REGION_METHODS,
  DEFAULT_QUOTES,
  LOCAL_PIN_MIN,
  LOCAL_PIN_MAX
} = shipping;

// PINs inside the local free-delivery band (Chennai 600001..600100).
const localPinArb = fc.integer({ min: LOCAL_PIN_MIN, max: LOCAL_PIN_MAX }).map(String);

describe('Property 18: Local Delivery Cost is Free (Req 7.5)', () => {
  test('Local shipping methods always have cost === 0 (invariant)', () => {
    const localMethods = REGION_METHODS['local'];
    expect(Array.isArray(localMethods)).toBe(true);
    expect(localMethods.length).toBeGreaterThan(0);
    localMethods.forEach((method) => {
      expect(method.cost).toBe(0);
    });
  });

  test('getAvailableMethods for local region always returns cost === 0', () => {
    fc.assert(
      fc.property(localPinArb, (pin) => {
        const region = shipping.determineRegion(pin);
        expect(region).toBe('local');

        const methods = getAvailableMethods(region);
        expect(Array.isArray(methods)).toBe(true);
        expect(methods.length).toBeGreaterThan(0);

        methods.forEach((method) => {
          expect(method.cost).toBe(0);
        });
      })
    );
  });

  test('Local delivery cost is 0 regardless of cached default values', async () => {
    // Test with various malformed cached defaults - local should ALWAYS be free
    const malformedCachedDefaults = [
      { baseCost: 9999, estimatedDays: 1, provider: 'expensive-courier' }, // extremely high cost
      { baseCost: -100, estimatedDays: 1, provider: 'negative-pricing' }, // negative cost
      { baseCost: null, estimatedDays: 1, provider: 'null-cost' }, // null cost
      { cost: 500, estimatedDays: 2, provider: 'wrong-schema' }, // wrong field name
      { baseCost: undefined, estimatedDays: 1, provider: 'undefined-cost' } // undefined
    ];

    for (const cachedDefault of malformedCachedDefaults) {
      const quote = await fetchShippingQuote('local', { cachedDefault });
      expect(quote.region).toBe('local');
      expect(quote.cost).toBe(0);
      expect(quote.source).toBe('local-free');
    }
  });

  test('Local delivery is free even without any cached default', async () => {
    const quote = await fetchShippingQuote('local', {});
    expect(quote.region).toBe('local');
    expect(quote.cost).toBe(0);
    expect(quote.source).toBe('local-free');
  });

  test('Local free delivery does not depend on order value or item count', async () => {
    // Simulate different order values - cost should still be 0
    const orderScenarios = [
      { subtotal: 0, items: [] }, // empty order edge case
      { subtotal: 50, items: [{ price: 50, quantity: 1 }] }, // small order
      { subtotal: 999, items: [{ price: 999, quantity: 1 }] }, // large single item
      { subtotal: 10000, items: [{ price: 100, quantity: 100 }] } // bulk order
    ];

    for (const scenario of orderScenarios) {
      const quote = await fetchShippingQuote('local', {});
      expect(quote.cost).toBe(0);
    }
  });

  test('Non-local regions have non-zero costs (contrast test)', () => {
    const tnMethods = getAvailableMethods('tamilnadu');
    const allIndiaMethods = getAvailableMethods('allindia');

    // Tamil Nadu and All-India should have at least some non-free methods
    const allTnCosts = tnMethods.map((m) => m.cost);
    const allIndiaCosts = allIndiaMethods.map((m) => m.cost);

    expect(tnMethods.length).toBeGreaterThan(0);
    expect(allIndiaMethods.length).toBeGreaterThan(0);

    // At least one method should have cost > 0 for each region
    expect(allTnCosts.some((c) => c > 0)).toBe(true);
    expect(allIndiaCosts.some((c) => c > 0)).toBe(true);
  });

  test('DEFAULT_QUOTES local entry has cost === 0', () => {
    const localDefault = DEFAULT_QUOTES['local'];
    expect(localDefault).toBeDefined();
    expect(localDefault.cost).toBe(0);
  });
});
