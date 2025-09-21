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

  test: {
    // Environment configuration
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    
    // Global test utilities
    globals: true,
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.storybook',
      'storybook-static',
      'e2e'
    ],

    // Coverage configuration - theo testing.instructions.md targets >80%
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds cho VN Speech Guardian
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
    
    // Parallel execution
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    
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
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/test-report.html'
    },

    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // Snapshot configuration
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace(/\.test\.([tj]sx?)/, `.test${snapExtension}`)
    }
  },

  // Development dependencies optimization
  optimizeDeps: {
    include: [
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      'msw'
    ]
  }
})