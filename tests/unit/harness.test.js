/**
 * Harness smoke test (unit) — verifies Jest runs and that js/lib/ UMD modules
 * are importable under Node/Jest via CommonJS.
 */
const template = require('../../js/lib/_umd-template');

describe('test harness — Jest + js/lib UMD import', () => {
  test('imports a js/lib UMD module via require()', () => {
    expect(typeof template.sum).toBe('function');
  });

  test('pure logic produces expected result', () => {
    expect(template.sum(2, 3, 5)).toBe(10);
    expect(template.sum()).toBe(0);
  });
});
