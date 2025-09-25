# Bundle Analysis Workflow Guide
## Advanced Bundle Analysis and Optimization Workflow

### 🎯 Quick Start

```bash
# Daily performance check
npm run performance:monitor

# Visual bundle analysis
npm run bundle:visualize

# Check for unused dependencies
npm run analyze:unused
```

### 📊 Understanding Bundle Analysis Reports

#### 1. Interactive Treemap Analysis (`stats.html`)

**Purpose**: Visualize bundle composition and identify optimization opportunities

**Key Features**:
- **Drill-down capability**: Click rectangles to explore module hierarchies
- **Multiple size views**: Raw, parsed, and gzipped sizes
- **Color coding**: Blue (your code), Green (dependencies), Red (duplicates)
- **Search functionality**: Find specific modules quickly

**Interpretation Guide**:
```typescript
// Reading the treemap
const treeMapInsights = {
  'Large Rectangles': 'Heavy modules consuming bundle space',
  'Duplicate Colors': 'Same modules bundled multiple times',
  'Deep Nesting': 'Complex dependency chains',
  'Gzip Ratio': 'Good compression: <30%, Poor: >50%'
};
```

**Action Items by Size**:
- **> 500KB**: Mandatory code splitting required
- **200-500KB**: Consider lazy loading
- **50-200KB**: Evaluate necessity and alternatives
- **< 50KB**: Generally acceptable

#### 2. Network Diagram Analysis (`network.html`)

**Purpose**: Understand module relationships and dependency flow

**Navigation**:
- **Drag nodes**: Reorganize for better visibility
- **Click nodes**: Highlight dependencies and dependents
- **Hover**: View detailed module information
- **Filter**: Hide/show specific module types

**Key Patterns to Identify**:
```typescript
const networkPatterns = {
  'Hub Modules': {
    description: 'Modules with many connections',
    impact: 'High coupling, difficult to optimize',
    action: 'Consider breaking into smaller modules'
  },
  
  'Orphaned Modules': {
    description: 'Modules with few connections',
    impact: 'Potential dead code',
    action: 'Verify necessity, consider removal'
  },
  
  'Long Chains': {
    description: 'Deep dependency chains',
    impact: 'Bundle loading bottlenecks',
    action: 'Flatten or parallelize loading'
  },
  
  'Circular Dependencies': {
    description: 'Modules depending on each other',
    impact: 'Bundle bloat and runtime issues',
    action: 'Refactor to remove cycles'
  }
};
```

#### 3. Performance Summary Report

**Generated automatically** with each analysis, contains:

```markdown
## Bundle Performance Analysis Report

### 📊 Current Metrics
- **Bundle Size**: 1.8MB (gzipped: 542KB)
- **Chunk Count**: 12 chunks
- **Largest Chunk**: 384KB (route-dashboard)
- **Build Time**: 2.4s
- **Compression Ratio**: 30.1%

### 🎯 Performance Targets
- ✅ Bundle Size < 2MB: PASS
- ❌ Largest Chunk < 500KB: FAIL (384KB)
- ✅ Compression Ratio < 40%: PASS
- ⚠️  Unused Dependencies: 3 found

### 🔍 Recommendations
1. **HIGH**: Split dashboard route (saves ~150KB)
2. **MEDIUM**: Remove unused dependencies (saves ~80KB)
3. **LOW**: Optimize image assets (saves ~30KB)
```

### 🛠️ Optimization Workflow

#### Step 1: Identify Optimization Targets

```bash
# Run comprehensive analysis
npm run performance:monitor

# Generate detailed reports
npm run bundle:report
```

**Priority Matrix**:
```typescript
const optimizationPriority = {
  'High Impact + Easy': [
    'Remove unused dependencies',
    'Enable tree shaking',
    'Split large routes'
  ],
  
  'High Impact + Hard': [
    'Refactor heavy components',
    'Replace large libraries',
    'Optimize core dependencies'
  ],
  
  'Low Impact + Easy': [
    'Optimize images',
    'Clean up imports',
    'Remove dead code'
  ],
  
  'Low Impact + Hard': [
    'Micro-optimizations',
    'Advanced code splitting'
  ]
};
```

#### Step 2: Apply Optimizations

**Remove Unused Dependencies**:
```bash
# Find unused dependencies
npm run analyze:unused

# Remove safely
npm uninstall package-name

# Verify no breaking changes
npm run build && npm run test
```

**Optimize Large Dependencies**:
```typescript
// Before: Import entire library
import _ from 'lodash';

// After: Import only needed functions
import { debounce, throttle } from 'lodash-es';

// Better: Use native alternatives
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};
```

**Implement Code Splitting**:
```typescript
// Route-level splitting
const Dashboard = lazy(() => import('./routes/Dashboard'));
const Analytics = lazy(() => import('./routes/Analytics'));

// Feature-level splitting
const AudioProcessor = lazy(() => 
  import('./components/audio/AudioProcessor')
);

// Component-level splitting for heavy features
const ChartLibrary = lazy(() => 
  import('./components/charts/AdvancedCharts')
);
```

#### Step 3: Measure Impact

```bash
# Before optimization
npm run performance:monitor > before-analysis.txt

# Apply optimizations
# ... make changes ...

# After optimization
npm run performance:monitor > after-analysis.txt

# Compare results
diff before-analysis.txt after-analysis.txt
```

### 📈 Advanced Analysis Techniques

#### Dependency Cost Analysis

```bash
# Check individual package sizes
npx bundlephobia react react-dom @tanstack/react-query

# Analyze specific imports
npx bundlephobia lodash
npx bundlephobia lodash-es  # Often smaller
```

**Common Heavy Dependencies & Alternatives**:
```typescript
const dependencyAlternatives = {
  'moment': {
    size: '288KB',
    alternatives: ['date-fns (78KB)', 'dayjs (9KB)'],
    migration: 'Replace date manipulation calls'
  },
  
  'lodash': {
    size: '528KB',
    alternatives: ['lodash-es (tree-shakeable)', 'native methods'],
    migration: 'Import specific functions only'
  },
  
  'material-ui': {
    size: '1.2MB',
    alternatives: ['@radix-ui (tree-shakeable)', 'headlessui'],
    migration: 'Gradual component replacement'
  }
};
```

#### Tree Shaking Analysis

```typescript
// Check if imports are tree-shakeable
// ❌ Not tree-shakeable (imports entire library)
import _ from 'lodash';
import * as React from 'react';

// ✅ Tree-shakeable (imports only used parts)
import { debounce, throttle } from 'lodash-es';
import { useState, useEffect } from 'react';

// ✅ Side-effect free imports
import { Button } from './components/ui/button';
```

**Tree Shaking Verification**:
```bash
# Build and check if unused code is eliminated
ANALYZE_BUNDLE=true npm run build

# Check bundle for specific imports
grep -r "unused-function" dist/
```

#### Chunk Analysis and Optimization

```typescript
// Current chunking strategy
const chunkingStrategy = {
  'app-shell': 'Core application code (~50KB)',
  'vendor-react': 'React + React DOM (~175KB)',
  'vendor-ui': 'UI component libraries (~120KB)',
  'route-*': 'Individual route bundles (50-150KB each)',
  'feature-*': 'Lazy-loaded features (20-100KB each)'
};

// Optimization opportunities
const chunkOptimizations = {
  'Combine Small Chunks': 'Merge chunks <20KB',
  'Split Large Chunks': 'Break chunks >500KB',
  'Vendor Chunking': 'Group stable dependencies',
  'Route-based Splitting': 'Split by user journey'
};
```

### 🔄 Continuous Monitoring

#### Automated Bundle Monitoring

```yaml
# GitHub Actions workflow for bundle monitoring
name: Bundle Size Check
on:
  pull_request:
    branches: [main]

jobs:
  bundle-analysis:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build and analyze
        run: npm run performance:ci
      
      - name: Check bundle size regression
        run: |
          if [ -f bundle-analysis/cicd-report.json ]; then
            node -e "
              const report = require('./bundle-analysis/cicd-report.json');
              if (report.regression.significant) {
                console.error('❌ Significant bundle size regression detected');
                console.error('Bundle size change: ' + report.regression.bundleSize + '%');
                process.exit(1);
              }
              console.log('✅ Bundle size within acceptable limits');
            "
          fi
      
      - name: Comment PR with results
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            if (fs.existsSync('bundle-analysis/performance-summary.md')) {
              const summary = fs.readFileSync('bundle-analysis/performance-summary.md', 'utf8');
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: '## Bundle Analysis Results\n\n' + summary
              });
            }
```

#### Performance Budget Configuration

```typescript
// Bundle size budgets for different routes
const performanceBudgets = {
  '/': {
    javascript: '400KB',
    css: '50KB',
    images: '200KB',
    total: '650KB'
  },
  
  '/dashboard': {
    javascript: '600KB', // Allows for charts library
    css: '75KB',
    images: '150KB',
    total: '825KB'
  },
  
  '/live': {
    javascript: '500KB', // Audio processing libraries
    css: '50KB',
    images: '100KB',
    total: '650KB'
  }
};
```

### 🚨 Troubleshooting Common Issues

#### Issue: Bundle Size Suddenly Increased

**Diagnosis**:
```bash
# Compare bundle composition
git checkout HEAD~1
npm run bundle:visualize  # Save report as before.html

git checkout main
npm run bundle:visualize  # Save report as after.html

# Compare the two reports
```

**Common Causes**:
1. **New dependency added**: Check `package.json` diff
2. **Import changed**: From tree-shakeable to non-tree-shakeable
3. **Dynamic import removed**: Code moved to main bundle
4. **Polyfill added**: Check browser targets

#### Issue: Build Time Increased

**Diagnosis**:
```bash
# Enable build timing
VITE_BUILD_TIMING=true npm run build

# Check for slow plugins
npm run build -- --profile
```

**Solutions**:
- Update Vite and plugins to latest versions
- Optimize TypeScript compilation
- Review custom plugins performance
- Enable persistent caching

#### Issue: Runtime Performance Degraded

**Diagnosis**:
```bash
# Check bundle composition for heavy runtime libraries
npm run bundle:network

# Look for patterns
grep -r "useEffect\|useState" src/ | wc -l  # Count React hooks
```

**Solutions**:
- Audit React component re-renders
- Check for memory leaks in long-running features
- Optimize heavy computations with Web Workers
- Review state management efficiency

### 📚 Advanced Tools and Techniques

#### Custom Bundle Analysis Scripts

```typescript
// scripts/custom-bundle-analysis.ts
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface CustomAnalysis {
  duplicateModules: string[];
  heavyDependencies: Array<{name: string; size: number}>;
  unusedExports: string[];
  optimizationOpportunities: string[];
}

export function analyzeBundle(): CustomAnalysis {
  const distPath = join(__dirname, '../dist');
  const files = readdirSync(distPath, { recursive: true });
  
  // Custom analysis logic
  const duplicateModules = findDuplicateModules(files);
  const heavyDependencies = findHeavyDependencies(files);
  const unusedExports = findUnusedExports();
  const optimizationOpportunities = generateOptimizationSuggestions({
    duplicateModules,
    heavyDependencies,
    unusedExports
  });
  
  return {
    duplicateModules,
    heavyDependencies,
    unusedExports,
    optimizationOpportunities
  };
}
```

#### Performance Regression Testing

```typescript
// tests/performance/bundle-size.test.ts
import { describe, test, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

describe('Bundle Size Regression Tests', () => {
  test('total bundle size should not exceed threshold', () => {
    execSync('npm run build');
    
    const analysisReport = JSON.parse(
      readFileSync('bundle-analysis/latest.json', 'utf-8')
    );
    
    const totalSize = analysisReport.metrics.totalBundleSize;
    const maxAllowedSize = 2 * 1024 * 1024; // 2MB
    
    expect(totalSize).toBeLessThan(maxAllowedSize);
  });
  
  test('no unused dependencies should remain', () => {
    const report = JSON.parse(
      readFileSync('bundle-analysis/latest.json', 'utf-8')
    );
    
    expect(report.current.unusedDependencies).toHaveLength(0);
  });
  
  test('largest chunk should not exceed threshold', () => {
    const report = JSON.parse(
      readFileSync('bundle-analysis/latest.json', 'utf-8')
    );
    
    const largestChunk = report.current.largestChunk;
    const maxChunkSize = 500 * 1024; // 500KB
    
    expect(largestChunk).toBeLessThan(maxChunkSize);
  });
});
```

### 🎯 Team Best Practices

#### Code Review Checklist

```markdown
## Bundle Analysis Code Review Checklist

### New Dependencies
- [ ] Dependency size analyzed with bundlephobia
- [ ] Tree-shaking compatibility verified
- [ ] Alternative lighter libraries considered
- [ ] Bundle size impact measured and documented

### Import Changes
- [ ] Imports are tree-shakeable (specific imports, not default)
- [ ] No accidental full library imports
- [ ] Dynamic imports used for heavy features
- [ ] Side effects properly declared

### Component Changes
- [ ] Heavy components are lazy-loaded when appropriate
- [ ] No unnecessary re-renders (React DevTools checked)
- [ ] Memoization applied to expensive computations
- [ ] Bundle impact of new components measured
```

#### Monthly Bundle Cleanup

```bash
#!/bin/bash
# Monthly bundle cleanup routine

echo "🧹 Starting monthly bundle cleanup..."

# 1. Find unused dependencies
echo "📦 Checking for unused dependencies..."
npm run analyze:unused

# 2. Update dependencies
echo "⬆️ Updating dependencies..."
npm update

# 3. Analyze bundle changes
echo "📊 Analyzing bundle impact..."
npm run performance:monitor

# 4. Generate cleanup report
echo "📄 Generating cleanup report..."
npm run bundle:report

echo "✅ Bundle cleanup completed!"
```

### 📖 References and Further Reading

- **Bundle Analysis Tools**: [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer), [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)
- **Performance Monitoring**: [Web Vitals](https://web.dev/vitals/), [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- **Tree Shaking**: [Rollup Tree Shaking](https://rollupjs.org/guide/en/#tree-shaking), [Webpack Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- **Code Splitting**: [React Lazy Loading](https://react.dev/reference/react/lazy), [Dynamic Imports](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

---

*Bundle Analysis Workflow Guide v1.0 - Updated {{ new Date().toLocaleDateString() }}*