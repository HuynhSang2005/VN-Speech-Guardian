/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths()
  ],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/services': resolve(__dirname, './src/services'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/types': resolve(__dirname, './src/types'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/stores': resolve(__dirname, './src/stores'),
    },
  },

  // @ts-ignore - Vitest config
  test: {
    // Environment configuration
    environment: 'jsdom',
    setupFiles: ['./src/test/setup-enhanced.ts'],
    
    // Global test utilities
    globals: true,
    
    // Test file patterns - enhanced for P28
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/tests/**/*.test.{ts,tsx}' // P28 comprehensive tests
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.storybook',
      'storybook-static',
      'e2e',
      'src/tests/e2e/**/*' // E2E tests handled by Playwright
    ],

    // Coverage configuration - theo testing.instructions.md targets >80%
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds cho VN Speech Guardian + P28
      thresholds: {
        global: {
          branches: 80,    // Branch coverage
          functions: 80,   // Function coverage  
          lines: 80,       // Line coverage
          statements: 80   // Statement coverage
        },
        
        // Stricter requirements cho critical modules
        'src/services/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        
        'src/hooks/**': {
          branches: 85,
          functions: 85,
          lines: 85,  
          statements: 85
        },

        // P28 enhanced components coverage
        'src/components/forms/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },

        'src/components/motion/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },

        'src/stores/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      
      // Exclude files from coverage
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test/**/*',
        'src/**/__mocks__/**/*',
        'src/worklets/**/*', // Audio worklets testing requires special setup
        '**/*.config.*',
        '**/node_modules/**'
      ]
    },

    // Test execution configuration
    testTimeout: 10000,  // 10s timeout
    hookTimeout: 10000,
    
    // Watch mode configuration
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**'
    ],
    
    // Reporter configuration
    reporter: [
      'default',
      'json', 
      'html'
    ],

    // Mock configuration for P28
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // Snapshot configuration
    resolveSnapshotPath: (testPath: string, snapExtension: string) => {
      return testPath.replace(/\.test\.([tj]sx?)/, `.test${snapExtension}`)
    }
  },

  // Development dependencies optimization
  optimizeDeps: {
    include: [
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      'msw',
      'framer-motion',
      'zustand'
    ]
  }
})