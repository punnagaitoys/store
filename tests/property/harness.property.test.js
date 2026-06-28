/**
 * Harness smoke test (property) — verifies fast-check runs with the global
 * 100-run minimum configured in tests/setup/fast-check.setup.js.
 *
 * This is not one of the 23 numbered correctness properties; it only proves the
 * property-testing toolchain is wired up. Real properties land in later tasks.
 */
const fc = require('fast-check');
const { MIN_RUNS } = require('../setup/fast-check.setup');
const template = require('../../js/lib/_umd-template');

describe('test harness — fast-check', () => {
  test('global numRuns minimum is at least 100', () => {
    expect(MIN_RUNS).toBeGreaterThanOrEqual(100);
  });

  test('sum is commutative over generated integer pairs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (a, b) => template.sum(a, b) === template.sum(b, a)
      )
      // numRuns intentionally omitted: the global config enforces the 100 minimum.
    );
  });
});
