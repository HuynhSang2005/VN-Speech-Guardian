/**
 * Lighthouse CI Configuration File
 * @description Comprehensive performance testing và regression detection setup
 * cho VN Speech Guardian Web App - React 19 + Vite + TanStack routing
 * 
 * @version 0.15.1 - Latest Lighthouse CI với Web Vitals v5 support
 * @author VN Speech Guardian Team
 * @updated 2025-09-25
 * 
 * Key Features:
 * - Web Vitals v5 thresholds (INP replaces FID)
 * - Performance budgets cho production builds
 * - Route-specific assertions cho different page types
 * - CI/CD integration với GitHub Actions
 * - Regression detection và alerting
 */

module.exports = {
  ci: {
    collect: {
      // Static site configuration - Vite build output
      staticDistDir: './dist',
      
      // URLs to test - include key user journeys
      url: [
        'http://localhost:8080/',                    // Landing page
        'http://localhost:8080/login',               // Auth page
        'http://localhost:8080/dashboard',           // Analytics dashboard
        'http://localhost:8080/live',                // Real-time processing
        'http://localhost:8080/sessions',            // Sessions list
        'http://localhost:8080/sessions/demo-session' // Session detail
      ],

      // Multiple runs để reduce variance
      numberOfRuns: 5,

      // Lighthouse settings với modern Web Vitals
      settings: {
        // Use latest Lighthouse configuration
        preset: 'desktop',
        
        // Chrome flags for CI environment
        chromeFlags: [
          '--headless',
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],

        // Extended timeout for complex SPAs
        maxWaitForLoad: 45000,
        
        // Skip storage reset for better session simulation
        disableStorageReset: false,
        
        // Throttling method for consistent results
        throttlingMethod: 'simulate',
        
        // Audit configuration
        skipAudits: [
          'canonical',           // Single-page app doesn't need canonical
          'robots-txt',          // Development URLs won't have robots.txt
        ],

        // Performance budget file integration
        budgetPath: './lighthouse-budget.json'
      }
    },

    assert: {
      // Use recommended preset as baseline
      preset: 'lighthouse:recommended',
      
      // Custom assertions với Web Vitals v5 thresholds
      assertions: {
        // === Core Web Vitals v5 ===
        // Largest Contentful Paint - Good: <2.5s, Poor: >4s
        'largest-contentful-paint': ['error', {
          maxNumericValue: 2500,
          aggregationMethod: 'median-run'
        }],

        // Cumulative Layout Shift - Good: <0.1, Poor: >0.25
        'cumulative-layout-shift': ['error', {
          maxNumericValue: 0.1,
          aggregationMethod: 'median-run'
        }],

        // Interaction to Next Paint (INP) - Good: <200ms, Poor: >500ms
        'interaction-to-next-paint': ['error', {
          maxNumericValue: 200,
          aggregationMethod: 'median-run'
        }],

        // First Contentful Paint - Good: <1.8s, Poor: >3s
        'first-contentful-paint': ['error', {
          maxNumericValue: 1800,
          aggregationMethod: 'median-run'
        }],

        // === Performance Metrics ===
        // Time to Interactive - Good: <3.8s, Poor: >7.3s
        'interactive': ['error', {
          maxNumericValue: 3800,
          aggregationMethod: 'median-run'
        }],

        // Speed Index - Good: <3.4s, Poor: >5.8s
        'speed-index': ['error', {
          maxNumericValue: 3400,
          aggregationMethod: 'median-run'
        }],

        // Total Blocking Time - Good: <200ms, Poor: >600ms
        'total-blocking-time': ['error', {
          maxNumericValue: 200,
          aggregationMethod: 'median-run'
        }],

        // === Resource Optimization ===
        // JavaScript bundle size
        'unused-javascript': ['warn', {
          maxLength: 5  // Max 5 unused JS opportunities
        }],

        // CSS optimization
        'unused-css-rules': ['warn', {
          maxLength: 3  // Max 3 unused CSS opportunities
        }],

        // Image optimization
        'modern-image-formats': ['error', {
          maxLength: 0  // All images should use modern formats
        }],

        'efficient-animated-content': ['error', {
          maxLength: 0  // Use efficient animations
        }],

        'offscreen-images': ['warn', {
          maxLength: 2  // Max 2 offscreen image opportunities
        }],

        // === Bundle Size Budgets ===
        // Main bundle size (critical path resources)
        'resource-summary:script:size': ['error', {
          maxNumericValue: 250000  // 250KB max JS bundle
        }],

        // CSS bundle size
        'resource-summary:stylesheet:size': ['error', {
          maxNumericValue: 100000  // 100KB max CSS bundle
        }],

        // Total page size
        'resource-summary:total:size': ['warn', {
          maxNumericValue: 1500000  // 1.5MB total page size warning
        }],

        // === Accessibility & Best Practices ===
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['warn', { minScore: 0.90 }],

        // === PWA Features (Optional) ===
        'installable-manifest': 'off',     // Not implementing PWA yet
        'service-worker': 'off',           // Not implementing SW yet
        'offline-start-url': 'off',        // Not implementing offline yet

        // === Security ===
        'is-on-https': 'off',             // Development URLs are HTTP
        'uses-http2': 'off',               // Development server limitation

        // === Audio Processing Specific ===
        // Ensure permissions API works correctly
        'notification-on-start': 'off',   // Audio app doesn't need notifications
        'geolocation-on-start': 'off',    // No geolocation needed
      },

      // Matrix assertions cho different page types
      assertMatrix: [
        {
          // Landing page - strictest requirements
          matchingUrlPattern: 'http://localhost:8080/$',
          assertions: {
            'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
            'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
            'speed-index': ['error', { maxNumericValue: 2500 }]
          }
        },
        {
          // Dashboard pages - allow slightly higher thresholds
          matchingUrlPattern: 'http://localhost:8080/dashboard',
          assertions: {
            'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
            'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
            'interactive': ['error', { maxNumericValue: 4500 }]
          }
        },
        {
          // Live processing page - real-time requirements
          matchingUrlPattern: 'http://localhost:8080/live',
          assertions: {
            'interaction-to-next-paint': ['error', { maxNumericValue: 150 }], // Stricter for real-time
            'total-blocking-time': ['error', { maxNumericValue: 100 }],       // Very strict TBT
            'resource-summary:script:size': ['error', { maxNumericValue: 300000 }] // Allow more JS for audio processing
          }
        },
        {
          // Auth pages - fastest loading for UX
          matchingUrlPattern: 'http://localhost:8080/login',
          assertions: {
            'first-contentful-paint': ['error', { maxNumericValue: 1200 }],
            'largest-contentful-paint': ['error', { maxNumericValue: 1800 }],
            'interactive': ['error', { maxNumericValue: 3000 }]
          }
        }
      ]
    },

    upload: {
      // Use temporary public storage for development
      // TODO: Setup private LHCI server for production
      target: 'temporary-public-storage',
      
      // GitHub integration
      githubStatusContextSuffix: '-web',
      
      // URL replacement patterns for consistent reporting
      urlReplacementPatterns: [
        's#:[0-9]{3,5}/#:PORT/#',  // Replace port numbers
        's/localhost:[0-9]+/localhost:PORT/g',  // Normalize localhost URLs
        's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/UUID/ig'  // Replace UUIDs
      ]
    }
  }
};