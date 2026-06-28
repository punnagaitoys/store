/**
 * UMD-style module template — Punnagai Toy Store
 *
 * Copy this file as the starting point for any new pure-logic module in
 * `js/lib/`. It works both in the browser (as a global) and under Jest/Node
 * (via `module.exports`) with no bundler or transform step.
 *
 * Replace `PunnagaiTemplate` with a descriptive global name and put the real
 * pure logic inside `factory()`.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiTemplate = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  /**
   * Example pure function. Pure-logic modules must avoid DOM, Firebase, and
   * storage access so they can be tested in isolation.
   * @param {...number} nums
   * @returns {number}
   */
  function sum() {
    const nums = Array.prototype.slice.call(arguments);
    return nums.reduce(function (acc, n) {
      return acc + n;
    }, 0);
  }

  return { sum };
});
