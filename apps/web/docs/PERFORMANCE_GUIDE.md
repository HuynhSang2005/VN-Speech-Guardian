# Performance Optimization Guide
## VN Speech Guardian Frontend Performance Documentation

### 📋 Table of Contents

1. [Overview](#overview)
2. [Performance Architecture](#performance-architecture)
3. [Bundle Analysis Workflow](#bundle-analysis-workflow)
4. [Web Vitals Reference](#web-vitals-reference)
5. [Optimization Strategies](#optimization-strategies)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [CI/CD Integration](#cicd-integration)
9. [Best Practices](#best-practices)
10. [Team Workflows](#team-workflows)

---

## Overview

The VN Speech Guardian frontend is built with React 19 + Vite 5, optimized for real-time speech processing and content moderation. This guide covers all performance optimization strategies, monitoring tools, and workflows implemented in the system.

### Performance Goals
- **Initial Load Time**: < 2.5s (3G networks)
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms
- **Bundle Size**: < 2MB (gzipped)
- **Lighthouse Score**: > 90 (Performance)

---

## Performance Architecture

### Core Technologies
- **Build System**: Vite 5 with Rollup bundling
- **Framework**: React 19 with concurrent features
- **Bundling Strategy**: Route-based code splitting + vendor chunking
- **Caching**: Service Worker + HTTP caching + Browser storage
- **Monitoring**: Web Vitals + Lighthouse CI + Custom metrics

### Bundle Structure
```
dist/
├── js/
│   ├── app-shell-[hash].js          # Core application shell (~50KB)
│   ├── react-[hash].js              # React runtime (~45KB)
│   ├── react-dom-[hash].js          # React DOM (~130KB)
│   ├── vendor/
│   │   ├── ui-primitives-[hash].js  # Radix UI components
│   │   ├── audio-processing-[hash].js # Audio worklet modules
│   │   └── charts-[hash].js         # Dashboard charts (lazy)
│   ├── routes/
│   │   ├── route-dashboard-[hash].js
│   │   ├── route-live-[hash].js
│   │   └── route-sessions-[hash].js
│   └── chunks/
│       └── [name]-[hash].js         # Dynamic imports
├── assets/
│   ├── images/                      # Optimized images
│   ├── fonts/                       # Web fonts
│   └── [name]-[hash].[ext]         # Other assets
└── bundle-analysis/
    ├── stats.html                   # Interactive bundle visualization
    ├── network.html                 # Dependency network diagram
    └── raw-data.json               # Programmatic analysis data
```

---

## Bundle Analysis Workflow

### Daily Analysis Commands

```bash
# Comprehensive bundle analysis with reports
npm run performance:monitor

# Visual bundle analysis
npm run bundle:visualize

# Dependency network analysis  
npm run bundle:network

# Check for unused dependencies
npm run analyze:unused

# Generate performance report
npm run bundle:report
```

### Understanding Bundle Analysis Reports

#### 1. Interactive Treemap (`stats.html`)
- **Purpose**: Visualize bundle composition and identify large modules
- **Usage**: Click on rectangles to drill down into modules
- **Key Metrics**: 
  - Size (parsed): Actual bundled size
  - Size (gzipped): Compressed size for network transfer
  - Size (stat): Original source code size

#### 2. Network Diagram (`network.html`)
- **Purpose**: Understand module dependencies and import chains
- **Usage**: Drag nodes to explore connections
- **Key Insights**:
  - Find modules with many dependencies
  - Identify circular dependencies
  - Locate tree-shaking bottlenecks

#### 3. Performance Summary Report
```markdown
## Bundle Performance Analysis Report

| Metric | Value | Change |
|--------|-------|--------|
| Bundle Size | 1.8MB | +2.1% |
| Gzipped Size | 542KB | +1.8% |
| Chunk Count | 12 | +1 |
| Build Time | 2.4s | -5.2% |

### Recommendations
- 🔍 Bundle size increased by 2.1% - investigate new dependencies
- ⚡ Consider splitting largest chunk (384KB)
- 🧹 Remove 3 unused dependencies: lodash, moment, old-ui-lib
```

---

## Web Vitals Reference

### Core Web Vitals

#### Largest Contentful Paint (LCP) - Target: < 2.5s
```typescript
// Optimization strategies implemented
const lcpOptimizations = {
  'Resource Loading': [
    'Preload critical images and fonts',
    'Use responsive images with srcset',
    'Implement progressive image loading',
    'CDN delivery for large assets'
  ],
  'Rendering': [
    'Above-the-fold CSS inlining',
    'Eliminate render-blocking resources',
    'Optimize critical rendering path',
    'Use React Suspense for data fetching'
  ],
  'Element Specific': [
    'Optimize hero section loading',
    'Lazy load below-the-fold content',
    'Use skeleton screens during loading'
  ]
};
```

#### First Input Delay (FID) - Target: < 100ms
```typescript
// Input responsiveness optimizations
const fidOptimizations = {
  'JavaScript Execution': [
    'Code splitting to reduce main thread blocking',
    'Use Web Workers for heavy computations',
    'Implement React concurrent features',
    'Optimize event handlers with debouncement'
  ],
  'Bundle Size': [
    'Tree-shake unused code',
    'Use dynamic imports for non-critical features',
    'Minimize third-party script impact'
  ]
};
```

#### Cumulative Layout Shift (CLS) - Target: < 0.1
```typescript
// Layout stability measures
const clsOptimizations = {
  'Image Stability': [
    'Always specify image dimensions',
    'Use aspect-ratio CSS property',
    'Reserve space for dynamic content'
  ],
  'Font Loading': [
    'Use font-display: swap',
    'Preload critical fonts',
    'Implement font fallback strategies'
  ],
  'Dynamic Content': [
    'Reserve space for ads/embeds',
    'Use transform instead of position changes',
    'Batch DOM updates'
  ]
};
```

### Additional Performance Metrics

#### Time to Interactive (TTI)
- **Target**: < 3.8s
- **Measurement**: Time until page is fully interactive
- **Optimization**: Reduce JavaScript execution time

#### Total Blocking Time (TBT)
- **Target**: < 200ms
- **Measurement**: Sum of blocking time during TTI
- **Optimization**: Break up long tasks

---

## Optimization Strategies

### 1. Code Splitting Strategy

```typescript
// Route-based splitting (implemented)
const routes = {
  '/dashboard': () => import('./routes/dashboard'),
  '/live': () => import('./routes/live'),
  '/sessions': () => import('./routes/sessions')
};

// Feature-based splitting
const audioFeatures = {
  'audio-worklet': () => import('./audio/worklet'),
  'audio-visualizer': () => import('./audio/visualizer'),
  'speech-recognition': () => import('./audio/recognition')
};

// Component-level splitting for heavy features
const LazyChart = lazy(() => import('./components/charts/AdvancedChart'));
```

### 2. Asset Optimization

```typescript
// Image optimization pipeline
const imageOptimization = {
  'Formats': ['WebP', 'AVIF', 'JPEG fallback'],
  'Responsive': 'srcset with multiple breakpoints',
  'Lazy Loading': 'Intersection Observer API',
  'Progressive': 'Base64 placeholder → Blur → Full image',
  'CDN': 'CloudFlare Images with automatic optimization'
};

// Font optimization
const fontStrategy = {
  'Loading': 'font-display: swap',
  'Subsetting': 'Only Vietnamese + Latin characters',
  'Formats': ['WOFF2', 'WOFF', 'TTF fallback'],
  'Preload': 'Critical fonts only'
};
```

### 3. Caching Strategy

```typescript
// Multi-layer caching implementation
const cachingLayers = {
  'Browser Cache': {
    'Static Assets': 'Cache-Control: max-age=31536000', // 1 year
    'API Responses': 'Cache-Control: max-age=300',      // 5 minutes
    'HTML': 'Cache-Control: no-cache'
  },
  'Service Worker': {
    'App Shell': 'Cache First strategy',
    'API Calls': 'Network First with fallback',
    'Assets': 'Stale While Revalidate'
  },
  'Memory Cache': {
    'Query Results': 'React Query with 5min stale time',
    'User Data': 'Zustand with persistence',
    'Audio Buffers': 'Web Audio API buffering'
  }
};
```

### 4. Runtime Performance

```typescript
// React 19 optimizations implemented
const reactOptimizations = {
  'Concurrent Features': [
    'useTransition for non-urgent updates',
    'useDeferredValue for expensive computations',
    'Suspense boundaries for data fetching',
    'Selective hydration for SSR'
  ],
  'Memoization': [
    'React.memo for expensive components',
    'useMemo for expensive calculations',
    'useCallback for stable references',
    'Custom hook memoization'
  ],
  'State Management': [
    'Zustand for global state',
    'Local state for component-specific data',
    'Optimistic updates for better UX'
  ]
};
```

---

## Monitoring & Alerting

### Performance Monitoring Stack

```typescript
// Web Vitals tracking implementation
interface PerformanceMonitoring {
  webVitals: {
    LCP: number;
    FID: number;
    CLS: number;
    TTFB: number;
    INP: number; // Interaction to Next Paint (new metric)
  };
  customMetrics: {
    bundleSize: number;
    buildTime: number;
    audioLatency: number;
    transcriptionDelay: number;
  };
  userExperience: {
    errorRate: number;
    sessionDuration: number;
    featureUsage: Record<string, number>;
  };
}
```

### Alert Thresholds

```yaml
# Performance alert configuration
alerts:
  bundle_size:
    warning: 2MB
    critical: 3MB
  
  lcp_regression:
    warning: 10%  # 10% slower than baseline
    critical: 25% # 25% slower than baseline
  
  error_rate:
    warning: 1%   # Error rate > 1%
    critical: 5%  # Error rate > 5%
  
  build_time:
    warning: 60s  # Build takes > 60s
    critical: 120s # Build takes > 2min
```

### Dashboard Metrics

```typescript
// Performance dashboard data structure
interface PerformanceDashboard {
  realtime: {
    activeUsers: number;
    currentLCP: number;
    errorRate: number;
    serverResponse: number;
  };
  trends: {
    dailyMetrics: PerformanceMetric[];
    weeklyComparison: ComparisonData;
    monthlyTrends: TrendData[];
  };
  budgets: {
    budgetStatus: 'passing' | 'warning' | 'failing';
    violations: BudgetViolation[];
    recommendations: string[];
  };
}
```

---

## Troubleshooting Guide

### Common Performance Issues

#### 1. Slow Initial Load
```bash
# Diagnosis commands
npm run bundle:visualize  # Check bundle composition
npm run analyze:unused    # Find unused dependencies
lighthouse https://your-app.com --view

# Common causes & solutions
Large Bundle Size:
  ❌ Problem: Bundle > 2MB
  ✅ Solution: Enable code splitting, remove unused deps

Blocking Resources:
  ❌ Problem: CSS/JS blocking rendering
  ✅ Solution: Inline critical CSS, defer non-critical JS

Heavy Third-party Scripts:
  ❌ Problem: Analytics/ads slowing page
  ✅ Solution: Load third-party scripts asynchronously
```

#### 2. Poor Runtime Performance
```typescript
// React DevTools Profiler analysis
const performanceProblems = {
  'Unnecessary Re-renders': {
    symptoms: 'Components rendering without prop changes',
    diagnosis: 'React DevTools Profiler',
    solution: 'Add React.memo, useMemo, useCallback'
  },
  
  'Memory Leaks': {
    symptoms: 'Increasing memory usage over time',
    diagnosis: 'Chrome DevTools Memory tab',
    solution: 'Clean up event listeners, intervals, subscriptions'
  },
  
  'Expensive Computations': {
    symptoms: 'UI freezing during interactions',
    diagnosis: 'Performance tab in DevTools',
    solution: 'Move to Web Workers, use useTransition'
  }
};
```

#### 3. Bundle Analysis Issues
```bash
# Debugging bundle problems
ANALYZE_BUNDLE=true npm run build  # Enable detailed analysis

# Check for duplicate dependencies
npm ls --depth=0

# Find why a module is included
npx why-is-node-running  # For Node.js dependencies

# Analyze module sizes
npm run bundle:report    # Generate detailed report
```

### Performance Regression Investigation

```bash
# Step-by-step regression analysis
git log --oneline -10                    # Recent commits
npm run performance:monitor              # Current metrics
git checkout HEAD~5                      # Go back 5 commits
npm run performance:monitor              # Compare metrics
git bisect start                         # Binary search for regression
```

---

## CI/CD Integration

### GitHub Actions Performance Pipeline

```yaml
# .github/workflows/performance.yml
name: Performance Monitoring

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lighthouse-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run Lighthouse CI
        run: npm run lighthouse:ci
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
      
      - name: Performance monitoring
        run: npm run performance:ci
      
      - name: Upload bundle analysis
        uses: actions/upload-artifact@v4
        with:
          name: bundle-analysis
          path: bundle-analysis/
```

### Performance Budgets

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["http://localhost:3000"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}]
      }
    },
    "budgets": [{
      "path": "/*",
      "timings": [
        {"metric": "first-contentful-paint", "budget": 1500},
        {"metric": "largest-contentful-paint", "budget": 2500},
        {"metric": "cumulative-layout-shift", "budget": 0.1}
      ],
      "resourceSizes": [
        {"resourceType": "script", "budget": 400},
        {"resourceType": "image", "budget": 300},
        {"resourceType": "stylesheet", "budget": 50}
      ],
      "resourceCounts": [
        {"resourceType": "third-party", "budget": 5}
      ]
    }]
  }
}
```

---

## Best Practices

### Development Workflow

```typescript
// Pre-commit performance checklist
const developmentChecklist = [
  'Run `npm run analyze:unused` to remove unused dependencies',
  'Check bundle size impact with `npm run bundle:visualize`',
  'Test performance on slow 3G network (Chrome DevTools)',
  'Verify no console errors in production build',
  'Check Lighthouse score is maintained',
  'Update performance budget if intentionally increasing bundle size'
];
```

### Code Review Guidelines

```typescript
// Performance code review criteria
const reviewCriteria = {
  'Bundle Impact': [
    'New dependencies justified and minimal',
    'Dynamic imports used for non-critical features',
    'Tree-shaking compatible imports (import { specific })'
  ],
  
  'React Performance': [
    'Expensive components wrapped in React.memo',
    'Stable references using useCallback/useMemo',
    'State updates optimized with useTransition'
  ],
  
  'Asset Optimization': [
    'Images have specified dimensions',
    'Fonts are subset and optimized',
    'SVGs are optimized and inlined when small'
  ]
};
```

### Architecture Decisions

```typescript
// Performance-driven architecture choices
const architectureGuidelines = {
  'State Management': {
    choice: 'Zustand over Redux',
    reason: 'Smaller bundle size, better tree-shaking',
    impact: '~30KB reduction'
  },
  
  'UI Framework': {
    choice: 'Radix UI over Material-UI',
    reason: 'Headless components, better tree-shaking',
    impact: '~150KB reduction'
  },
  
  'Build Tool': {
    choice: 'Vite over Create React App',
    reason: 'Faster builds, better optimization',
    impact: '~70% faster builds'
  }
};
```

---

## Team Workflows

### Performance Champions Program

```typescript
// Team responsibilities for performance
const teamRoles = {
  'Performance Champion': [
    'Weekly performance report review',
    'Bundle analysis and optimization recommendations',
    'Performance regression investigation',
    'New performance tools evaluation'
  ],
  
  'Frontend Developers': [
    'Run bundle analysis before major changes',
    'Follow performance coding guidelines',
    'Report performance regressions immediately',
    'Implement performance optimizations in feature work'
  ],
  
  'DevOps Team': [
    'Maintain performance monitoring infrastructure',
    'Configure CI/CD performance gates',
    'Monitor production performance metrics',
    'Alert on performance threshold violations'
  ]
};
```

### Weekly Performance Review

```markdown
# Weekly Performance Review Template

## Metrics Summary
- **Bundle Size**: 1.8MB (📈 +2.1% from last week)
- **Lighthouse Score**: 94 (📉 -2 points)
- **LCP**: 2.1s (📈 +0.3s regression)
- **Build Time**: 2.4s (📉 -0.8s improvement)

## Key Changes
- Added new audio visualization library (+180KB)
- Optimized image loading implementation (-50KB)
- Updated React Query to v5 (+30KB)

## Action Items
- [ ] Investigate LCP regression in dashboard route
- [ ] Consider lazy loading audio visualization
- [ ] Update performance budget for new features
- [ ] Schedule bundle cleanup session

## Recommendations
1. **HIGH**: Split audio visualization into separate chunk
2. **MEDIUM**: Optimize dashboard initial payload
3. **LOW**: Update font loading strategy
```

### Performance Incident Response

```typescript
// Performance incident response playbook
const incidentResponse = {
  'Detection': [
    'Automated alert triggered',
    'User reports slow performance',
    'Monitoring dashboard shows regression'
  ],
  
  'Investigation': [
    'Check recent deployments',
    'Compare bundle analysis reports',
    'Analyze Lighthouse CI results',
    'Review error logs for performance issues'
  ],
  
  'Resolution': [
    'Identify root cause (code, dependencies, infrastructure)',
    'Implement hotfix if critical',
    'Schedule proper fix in next sprint',
    'Update monitoring to prevent similar issues'
  ]
};
```

---

## Appendix

### Useful Commands Reference

```bash
# Bundle Analysis
npm run bundle:visualize        # Open interactive bundle analyzer
npm run bundle:network         # Show dependency network
npm run analyze:deps           # Check dependency costs
npm run analyze:unused         # Find unused dependencies

# Performance Testing
npm run lighthouse:ci          # Run Lighthouse CI
npm run performance:monitor    # Comprehensive performance analysis
npm run test:performance       # Run performance tests

# Development
npm run build:analyze          # Build with analysis enabled
npm run dev:performance        # Development server with monitoring
```

### Performance Monitoring URLs

```typescript
// Production monitoring endpoints
const monitoringUrls = {
  'Lighthouse CI': 'https://lhci.your-domain.com',
  'Bundle Analyzer': 'https://your-app.com/bundle-analysis/',
  'Performance Dashboard': 'https://monitoring.your-domain.com/performance',
  'Error Tracking': 'https://sentry.io/your-project',
  'Real User Monitoring': 'https://analytics.your-domain.com/performance'
};
```

### External Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)
- [React 19 Performance Features](https://react.dev/blog/2024/12/05/react-19)
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [Bundle Analysis Best Practices](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

---

*Last updated: {{ new Date().toLocaleDateString() }}*
*Performance guide version: 1.0.0*