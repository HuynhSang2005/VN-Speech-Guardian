import { defineConfig, devices } from '@playwright/test'

/**
 * Cấu hình Playwright E2E testing cho VN Speech Guardian
 * Theo testing.instructions.md - comprehensive browser testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  // Test execution configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration cho CI/CD pipeline
  reporter: process.env.CI 
    ? [['github'], ['html']]
    : [
        ['list'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }]
      ],

  // Global test configuration
  use: {
    // Base URL cho development server
    baseURL: 'http://localhost:3000',
    
    // Tracing configuration - Vietnamese dev experience
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Browser context configuration
    ignoreHTTPSErrors: true,
    
    // Audio permissions cho speech processing tests
    contextOptions: {
      permissions: ['microphone', 'camera'],
    },
  },

  // Test projects cho different browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Audio testing requires real browser features
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--use-file-for-fake-audio-capture=tests/fixtures/audio/sample.wav',
          ],
        },
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile testing cho responsive design
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Specific test projects cho speech processing
    {
      name: 'audio-tests',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--allow-file-access',
          ],
        },
      },
      testMatch: '**/audio/**/*.spec.ts',
    },

    {
      name: 'auth-tests', 
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/auth/**/*.spec.ts',
    },
  ],

  // Local dev server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Output directories
  outputDir: 'test-results/',
  
  // Global setup and teardown
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  
  // Test timeout configuration
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  // Test patterns
  testMatch: [
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.test.ts'  
  ],
  
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],
})