/**
 * Jest configuration — Punnagai Toy Store
 *
 * The site ships as vanilla JS with no bundler. Pure-logic modules live in
 * `js/lib/` and use the UMD-style dual-export pattern (see js/lib/README.md),
 * so they load as CommonJS modules under Node/Jest without any transform step.
 *
 * Test layout:
 *   tests/unit/         Jest unit tests (specific examples / edge cases)
 *   tests/property/     fast-check property-based tests (100+ runs each)
 *   tests/integration/  Firebase Emulator Suite + Jest integration tests
 *   tests/setup/        Shared setup helpers (fast-check global config, etc.)
 *
 * Run subsets via the package.json scripts:
 *   npm run test:unit | test:property | test:integration
 */
module.exports = {
  testEnvironment: 'node',
  // Match test files in any of the test subdirectories.
  testMatch: ['**/tests/**/*.test.js'],
  // Ignore non-test setup helpers so they aren't run as test suites.
  testPathIgnorePatterns: ['/node_modules/', '/tests/setup/'],
  // Global fast-check configuration (enforces the 100-run minimum).
  setupFilesAfterEnv: ['<rootDir>/tests/setup/fast-check.setup.js'],
  clearMocks: true,
  verbose: true
};
