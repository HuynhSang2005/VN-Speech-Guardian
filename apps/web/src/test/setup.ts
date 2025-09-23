/**
 * Vitest test setup - Test environment configuration
 * Mục đích: Global test setup, mocks, polyfills cho VN Speech Guardian
 * Theo testing.instructions.md: jsdom environment + testing utilities
 */

import '@testing-library/jest-dom'

// Environment variables cho testing
process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key_for_testing'
process.env.VITE_API_URL = 'http://localhost:4000/api'
process.env.VITE_WS_URL = 'ws://localhost:4000'

// Console warnings filter - ignore common test warnings
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  // Ignore specific React warnings in tests
  if (
    args[0]?.includes('Warning: React does not recognize') ||
    args[0]?.includes('Warning: Failed prop type') ||
    args[0]?.includes('validateDOMNesting')
  ) {
    return
  }
  originalConsoleWarn(...args)
}