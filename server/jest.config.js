// Jest configuration for ESM.
// Run tests with:  npm test
// (The "test" script in package.json sets the required Node flag.)

export default {
  testEnvironment: 'node',
  // Only treat files in tests/ as test files.
  testMatch: ['**/tests/**/*.test.js'],
  // Setup isolated in-memory MongoDB environment before running tests.
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  // Give the memory server time to start on first run (binary download).
  testTimeout: 30000,
  // No transforms needed — we're using native ESM.
  transform: {},
  // Clear mocks between test files.
  clearMocks: true,
};