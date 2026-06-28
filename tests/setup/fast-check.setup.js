/**
 * fast-check global setup — Punnagai Toy Store
 *
 * Loaded via Jest's `setupFilesAfterEnv` for every test suite. It enforces the
 * project-wide property-testing convention from the design document:
 *
 *   "Configuration: Minimum 100 iterations per property test"
 *
 * Individual property tests may pass a higher `numRuns` locally, but this floor
 * guarantees no property test silently runs fewer than 100 examples.
 */
const fc = require('fast-check');

// Minimum number of generated examples per property assertion.
const MIN_RUNS = 100;

fc.configureGlobal({
  numRuns: MIN_RUNS,
  // Surface the seed/path on failure so counterexamples are reproducible.
  verbose: true
});

// Exported for tests/helpers that want to reference the agreed-upon minimum.
module.exports = { MIN_RUNS };
