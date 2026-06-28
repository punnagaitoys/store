// Feature: punnagai-ecommerce, Property 15: Shipping Methods Match Region
/**
 * Property 15: Shipping Methods Match Region — Validates: Requirements 6.4, 7.1
 *
 * For any valid postal code entered during checkout, the system SHALL determine
 * the region (local, Tamil Nadu, or all-India) CONSISTENTLY, and display ONLY
 * the shipping methods available for that region. Invalid PINs map to no region
 * (null) and therefore offer no shipping methods.
 *
 * `determineRegion(postalCode)`, `getAvailableMethods(region)` and
 * `getMethodsForPostalCode(postalCode)` are PURE functions, so outcomes are
 * deterministic for a fixed input. We exercise:
 *   - Determinism (Property 15 core): same PIN → same region; region is one of
 *     REGIONS for valid PINs, null for invalid ones.
 *   - Methods match region: getMethodsForPostalCode(pin) deep-equals
 *     getAvailableMethods(determineRegion(pin)), and every returned method is
 *     one of REGION_METHODS[region] — only that region's methods are displayed.
 *   - Boundary correctness: local band → 'local', wider TN band → 'tamilnadu',
 *     outside TN → 'allindia'.
 *   - Idempotence: the same PIN twice yields the same available options.
 */
const fc = require('fast-check');
const shipping = require('../../js/lib/shipping');

const {
  determineRegion,
  getAvailableMethods,
  getMethodsForPostalCode,
  REGIONS,
  REGION_METHODS,
  LOCAL_PIN_MIN,
  LOCAL_PIN_MAX,
  TN_PIN_MIN,
  TN_PIN_MAX,
} = shipping;

// A valid Indian PIN: 6 digits, leading digit 1-9 → integer 100000..999999.
const validPinArb = fc.integer({ min: 100000, max: 999999 }).map((n) => String(n));

// PINs inside the local free-delivery band (Chennai 600001..600100).
const localPinArb = fc.integer({ min: LOCAL_PIN_MIN, max: LOCAL_PIN_MAX }).map(String);

// PINs in the Tamil Nadu band but NOT in the local band → 'tamilnadu'.
// TN band is 600000..643999; local is 600001..600100. The disjoint TN-only set
// is {600000} ∪ {600101..643999}.
const tnOnlyPinArb = fc
  .integer({ min: TN_PIN_MIN, max: TN_PIN_MAX })
  .filter((n) => n < LOCAL_PIN_MIN || n > LOCAL_PIN_MAX)
  .map(String);

// Valid PINs outside the TN band entirely → 'allindia'. Leading digit 1-9,
// excluding the TN band 600000..643999.
const allIndiaPinArb = fc
  .integer({ min: 100000, max: 999999 })
  .filter((n) => n < TN_PIN_MIN || n > TN_PIN_MAX)
  .map(String);

// Invalid PINs: wrong length, leading zero, or containing letters / symbols.
const invalidPinArb = fc.oneof(
  // Wrong length (too short / too long), digits only.
  fc.integer({ min: 0, max: 99999 }).map(String), // <= 5 digits
  fc.integer({ min: 1000000, max: 99999999 }).map(String), // >= 7 digits
  // Leading zero, 6 chars.
  fc.integer({ min: 0, max: 99999 }).map((n) => '0' + String(n).padStart(5, '0')),
  // Contains letters / non-digits.
  fc.stringMatching(/^[A-Za-z]{1,6}$/),
  fc.constantFrom('', '   ', 'ABCDEF', '6000A1', '60 001', '600-01')
);

describe('Property 15: Shipping Methods Match Region (Req 6.4, 7.1)', () => {
  test('DETERMINISM: a valid PIN always maps to the same region, one of REGIONS', () => {
    fc.assert(
      fc.property(validPinArb, (pin) => {
        const region = determineRegion(pin);
        // Region is stable across repeated calls.
        expect(determineRegion(pin)).toBe(region);
        // For a valid PIN the region is one of the known regions.
        expect(REGIONS).toContain(region);
      })
    );
  });

  test('INVALID PINs determine no region (null) and offer no shipping methods', () => {
    fc.assert(
      fc.property(invalidPinArb, (pin) => {
        const region = determineRegion(pin);
        // Invalid PINs map to null deterministically.
        expect(region).toBeNull();
        expect(determineRegion(pin)).toBeNull();
        // No region → no methods displayed.
        expect(getMethodsForPostalCode(pin)).toEqual([]);
      })
    );
  });

  test('METHODS MATCH REGION: getMethodsForPostalCode equals getAvailableMethods(region)', () => {
    fc.assert(
      fc.property(validPinArb, (pin) => {
        const region = determineRegion(pin);
        const methods = getMethodsForPostalCode(pin);

        // The PIN-driven lookup matches the region-driven lookup exactly.
        expect(methods).toEqual(getAvailableMethods(region));

        // Only that region's methods are displayed — every returned method is
        // one of the templates defined for the determined region.
        const allowed = REGION_METHODS[region];
        expect(Array.isArray(allowed)).toBe(true);
        expect(methods.length).toBe(allowed.length);
        methods.forEach((m) => {
          const match = allowed.find((a) => a.id === m.id);
          expect(match).toBeDefined();
          expect(m).toEqual({
            id: match.id,
            label: match.label,
            cost: match.cost,
            estimatedDays: match.estimatedDays,
          });
        });
      })
    );
  });

  test('BOUNDARIES: local band → local, TN-only band → tamilnadu, outside → allindia', () => {
    fc.assert(
      fc.property(localPinArb, (pin) => {
        expect(determineRegion(pin)).toBe('local');
      })
    );
    fc.assert(
      fc.property(tnOnlyPinArb, (pin) => {
        expect(determineRegion(pin)).toBe('tamilnadu');
      })
    );
    fc.assert(
      fc.property(allIndiaPinArb, (pin) => {
        expect(determineRegion(pin)).toBe('allindia');
      })
    );
  });

  test('IDEMPOTENCE: the same PIN twice yields the same available options', () => {
    fc.assert(
      fc.property(validPinArb, (pin) => {
        const first = getMethodsForPostalCode(pin);
        const second = getMethodsForPostalCode(pin);
        expect(first).toEqual(second);
      })
    );
  });
});
