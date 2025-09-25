/**
 * @fileoverview Unit tests cho Lighthouse CI configuration và setup
 * @description Test suite bao gồm config validation, budget verification, và CI workflow testing
 * @version 1.0.0
 * @author VN Speech Guardian Team
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

// Type definitions for Lighthouse CI configuration
interface LighthouseAssertion {
  [key: string]: ['off' | 'warn' | 'error'] | ['warn' | 'error', { [key: string]: any }];
}

interface AssertMatrix {
  matchingUrlPattern: string;
  assertions: LighthouseAssertion;
}

interface PerformanceBudgetTiming {
  metric: string;
  budget: number;
}

interface PerformanceBudgetResource {
  resourceType: string;
  budget: number;
}

interface PerformanceBudget {
  path: string;
  timings: PerformanceBudgetTiming[];
  resourceSizes: PerformanceBudgetResource[];
  resourceCounts: PerformanceBudgetResource[];
}

// Import Lighthouse CI configuration
const lighthouseConfig = require('../../.lighthouserc.cjs') as any;

// Import performance budget
const performanceBudget = JSON.parse(
  readFileSync(join(__dirname, '../../lighthouse-budget.json'), 'utf8')
) as PerformanceBudget[];

// Import GitHub Actions workflow
const workflowPath = join(__dirname, '../../../../.github/workflows/lighthouse-ci.yml');
const workflowContent = readFileSync(workflowPath, 'utf8');
const githubWorkflow = parseYaml(workflowContent) as any;

describe('Lighthouse CI Configuration Tests', () => {
  describe('✅ Configuration Structure', () => {
    it('should have proper CI configuration structure', () => {
      expect(lighthouseConfig).toHaveProperty('ci');
      expect(lighthouseConfig.ci).toHaveProperty('collect');
      expect(lighthouseConfig.ci).toHaveProperty('assert');
      expect(lighthouseConfig.ci).toHaveProperty('upload');
    });

    it('should configure static directory correctly', () => {
      expect(lighthouseConfig.ci.collect.staticDistDir).toBe('./dist');
    });

    it('should have comprehensive URL test coverage', () => {
      const urls = lighthouseConfig.ci.collect.url;
      expect(urls).toHaveLength(6);
      expect(urls).toContain('http://localhost:8080/');
      expect(urls).toContain('http://localhost:8080/login');
      expect(urls).toContain('http://localhost:8080/dashboard');
      expect(urls).toContain('http://localhost:8080/live');
      expect(urls).toContain('http://localhost:8080/sessions');
    });

    it('should configure multiple runs for variance reduction', () => {
      expect(lighthouseConfig.ci.collect.numberOfRuns).toBe(5);
    });
  });

  describe('🎯 Web Vitals v5 Assertions', () => {
    const assertions = lighthouseConfig.ci.assert.assertions;

    it('should use updated Web Vitals v5 thresholds', () => {
      // Largest Contentful Paint - Good: <2.5s
      expect(assertions['largest-contentful-paint']).toEqual([
        'error',
        { maxNumericValue: 2500, aggregationMethod: 'median-run' }
      ]);

      // Cumulative Layout Shift - Good: <0.1
      expect(assertions['cumulative-layout-shift']).toEqual([
        'error',
        { maxNumericValue: 0.1, aggregationMethod: 'median-run' }
      ]);

      // Interaction to Next Paint (replaces FID) - Good: <200ms
      expect(assertions['interaction-to-next-paint']).toEqual([
        'error',
        { maxNumericValue: 200, aggregationMethod: 'median-run' }
      ]);

      // First Contentful Paint - Good: <1.8s
      expect(assertions['first-contentful-paint']).toEqual([
        'error',
        { maxNumericValue: 1800, aggregationMethod: 'median-run' }
      ]);
    });

    it('should have realistic performance thresholds', () => {
      // Time to Interactive - Good: <3.8s
      expect(assertions['interactive'][1].maxNumericValue).toBe(3800);

      // Speed Index - Good: <3.4s
      expect(assertions['speed-index'][1].maxNumericValue).toBe(3400);

      // Total Blocking Time - Good: <200ms
      expect(assertions['total-blocking-time'][1].maxNumericValue).toBe(200);
    });

    it('should use median-run aggregation for stable results', () => {
      const coreMetrics = [
        'largest-contentful-paint',
        'first-contentful-paint',
        'interaction-to-next-paint',
        'cumulative-layout-shift',
        'interactive',
        'speed-index',
        'total-blocking-time'
      ];

      coreMetrics.forEach(metric => {
        expect(assertions[metric][1].aggregationMethod).toBe('median-run');
      });
    });
  });

  describe('📦 Bundle Size Budgets', () => {
    const assertions = lighthouseConfig.ci.assert.assertions;

    it('should enforce JavaScript bundle limits', () => {
      expect(assertions['resource-summary:script:size']).toEqual([
        'error',
        { maxNumericValue: 250000 } // 250KB
      ]);
    });

    it('should enforce CSS bundle limits', () => {
      expect(assertions['resource-summary:stylesheet:size']).toEqual([
        'error',
        { maxNumericValue: 100000 } // 100KB
      ]);
    });

    it('should warn on total page size limits', () => {
      expect(assertions['resource-summary:total:size']).toEqual([
        'warn',
        { maxNumericValue: 1500000 } // 1.5MB
      ]);
    });

    it('should optimize resource loading', () => {
      // Modern image formats should be enforced
      expect(assertions['modern-image-formats']).toEqual([
        'error',
        { maxLength: 0 }
      ]);

      // Unused JavaScript should be minimal
      expect(assertions['unused-javascript'][1].maxLength).toBeLessThanOrEqual(5);

      // Unused CSS should be minimal
      expect(assertions['unused-css-rules'][1].maxLength).toBeLessThanOrEqual(3);
    });
  });

  describe('🎭 Route-Specific Assertions', () => {
    const assertMatrix = lighthouseConfig.ci.assert.assertMatrix;

    it('should have route-specific performance requirements', () => {
      expect(assertMatrix).toHaveLength(4);
    });

    it('should have strictest requirements for landing page', () => {
      const landingPage = assertMatrix.find(
        (item: any) => item.matchingUrlPattern === 'http://localhost:8080/$'
      );
      
      expect(landingPage).toBeDefined();
      expect(landingPage.assertions['first-contentful-paint'][1].maxNumericValue).toBe(1500);
      expect(landingPage.assertions['largest-contentful-paint'][1].maxNumericValue).toBe(2000);
    });

    it('should have optimized requirements for auth page', () => {
      const authPage = assertMatrix.find(
        (item: any) => item.matchingUrlPattern === 'http://localhost:8080/login'
      );
      
      expect(authPage).toBeDefined();
      expect(authPage.assertions['first-contentful-paint'][1].maxNumericValue).toBe(1200);
      expect(authPage.assertions['interactive'][1].maxNumericValue).toBe(3000);
    });

    it('should have real-time optimized requirements for live page', () => {
      const livePage = assertMatrix.find(
        (item: any) => item.matchingUrlPattern === 'http://localhost:8080/live'
      );
      
      expect(livePage).toBeDefined();
      expect(livePage.assertions['interaction-to-next-paint'][1].maxNumericValue).toBe(150);
      expect(livePage.assertions['total-blocking-time'][1].maxNumericValue).toBe(100);
    });

    it('should allow more resources for dashboard functionality', () => {
      const dashboardPage = assertMatrix.find(
        (item: any) => item.matchingUrlPattern === 'http://localhost:8080/dashboard'
      );
      
      expect(dashboardPage).toBeDefined();
      expect(dashboardPage.assertions['interactive'][1].maxNumericValue).toBe(4500);
    });
  });

  describe('⚙️ Lighthouse Settings', () => {
    const settings = lighthouseConfig.ci.collect.settings;

    it('should use desktop preset for consistency', () => {
      expect(settings.preset).toBe('desktop');
    });

    it('should have appropriate timeout settings', () => {
      expect(settings.maxWaitForLoad).toBe(45000); // 45 seconds
    });

    it('should use simulation throttling for consistency', () => {
      expect(settings.throttlingMethod).toBe('simulate');
    });

    it('should have CI-optimized Chrome flags', () => {
      const flags = settings.chromeFlags;
      expect(flags).toContain('--headless');
      expect(flags).toContain('--no-sandbox');
      expect(flags).toContain('--disable-gpu');
      expect(flags).toContain('--disable-dev-shm-usage');
    });

    it('should reference performance budget file', () => {
      expect(settings.budgetPath).toBe('./lighthouse-budget.json');
    });

    it('should skip irrelevant audits for SPA', () => {
      expect(settings.skipAudits).toContain('canonical');
      expect(settings.skipAudits).toContain('robots-txt');
    });
  });

  describe('☁️ Upload Configuration', () => {
    const upload = lighthouseConfig.ci.upload;

    it('should use temporary public storage for development', () => {
      expect(upload.target).toBe('temporary-public-storage');
    });

    it('should have GitHub integration suffix', () => {
      expect(upload.githubStatusContextSuffix).toBe('-web');
    });

    it('should normalize URLs for consistent reporting', () => {
      const patterns = upload.urlReplacementPatterns;
      expect(patterns).toContain('s#:[0-9]{3,5}/#:PORT/#');
      expect(patterns).toContain('s/localhost:[0-9]+/localhost:PORT/g');
    });
  });
});

describe('📊 Performance Budget Tests', () => {
  describe('✅ Budget Structure', () => {
    it('should be valid JSON array', () => {
      expect(Array.isArray(performanceBudget)).toBe(true);
      expect(performanceBudget.length).toBeGreaterThan(0);
    });

    it('should have universal budget for all paths', () => {
      const universalBudget = performanceBudget.find(budget => budget.path === '/*');
      expect(universalBudget).toBeDefined();
    });

    it('should have route-specific budgets', () => {
      const paths = performanceBudget.map(budget => budget.path);
      expect(paths).toContain('/live');
      expect(paths).toContain('/login');
    });
  });

  describe('⏱️ Timing Budgets', () => {
    const universalBudget = performanceBudget.find((budget: PerformanceBudget) => budget.path === '/*');

    it('should have Web Vitals v5 timing budgets', () => {
      expect(universalBudget).toBeDefined();
      const timings = universalBudget!.timings;
      const metrics = timings.map((t: PerformanceBudgetTiming) => t.metric);
      
      expect(metrics).toContain('first-contentful-paint');
      expect(metrics).toContain('largest-contentful-paint');
      expect(metrics).toContain('interactive');
      expect(metrics).toContain('speed-index');
      expect(metrics).toContain('total-blocking-time');
      expect(metrics).toContain('cumulative-layout-shift');
    });

    it('should have realistic timing thresholds', () => {
      expect(universalBudget).toBeDefined();
      const timings = universalBudget!.timings;
      
      const fcp = timings.find((t: PerformanceBudgetTiming) => t.metric === 'first-contentful-paint');
      expect(fcp).toBeDefined();
      expect(fcp!.budget).toBe(1800); // 1.8s

      const lcp = timings.find((t: PerformanceBudgetTiming) => t.metric === 'largest-contentful-paint');
      expect(lcp).toBeDefined();
      expect(lcp!.budget).toBe(2500); // 2.5s

      const tti = timings.find((t: PerformanceBudgetTiming) => t.metric === 'interactive');
      expect(tti).toBeDefined();
      expect(tti!.budget).toBe(3800); // 3.8s

      const cls = timings.find((t: PerformanceBudgetTiming) => t.metric === 'cumulative-layout-shift');
      expect(cls).toBeDefined();
      expect(cls!.budget).toBe(0.1); // 0.1
    });
  });

  describe('📦 Resource Size Budgets', () => {
    const universalBudget = performanceBudget.find((budget: PerformanceBudget) => budget.path === '/*');

    it('should have comprehensive resource size limits', () => {
      expect(universalBudget).toBeDefined();
      const sizes = universalBudget!.resourceSizes;
      const types = sizes.map((s: PerformanceBudgetResource) => s.resourceType);
      
      expect(types).toContain('script');
      expect(types).toContain('stylesheet');
      expect(types).toContain('image');
      expect(types).toContain('font');
      expect(types).toContain('total');
    });

    it('should enforce realistic bundle size limits', () => {
      expect(universalBudget).toBeDefined();
      const sizes = universalBudget!.resourceSizes;
      
      const script = sizes.find((s: PerformanceBudgetResource) => s.resourceType === 'script');
      expect(script).toBeDefined();
      expect(script!.budget).toBe(250); // 250KB

      const stylesheet = sizes.find((s: PerformanceBudgetResource) => s.resourceType === 'stylesheet');
      expect(stylesheet).toBeDefined();
      expect(stylesheet!.budget).toBe(100); // 100KB

      const total = sizes.find((s: PerformanceBudgetResource) => s.resourceType === 'total');
      expect(total).toBeDefined();
      expect(total!.budget).toBe(1500); // 1.5MB
    });
  });

  describe('🔢 Resource Count Budgets', () => {
    const universalBudget = performanceBudget.find((budget: PerformanceBudget) => budget.path === '/*');

    it('should limit resource counts', () => {
      expect(universalBudget).toBeDefined();
      const counts = universalBudget!.resourceCounts;
      expect(counts).toBeDefined();
      expect(counts.length).toBeGreaterThan(0);
    });

    it('should have reasonable resource count limits', () => {
      expect(universalBudget).toBeDefined();
      const counts = universalBudget!.resourceCounts;
      
      const scripts = counts.find((c: PerformanceBudgetResource) => c.resourceType === 'script');
      expect(scripts).toBeDefined();
      expect(scripts!.budget).toBeLessThanOrEqual(15);

      const thirdParty = counts.find((c: PerformanceBudgetResource) => c.resourceType === 'third-party');
      expect(thirdParty).toBeDefined();
      expect(thirdParty!.budget).toBeLessThanOrEqual(10);
    });
  });

  describe('🎯 Route-Specific Budgets', () => {
    it('should have stricter budgets for login page', () => {
      const loginBudget = performanceBudget.find((budget: PerformanceBudget) => budget.path === '/login');
      expect(loginBudget).toBeDefined();
      
      const fcp = loginBudget!.timings.find((t: PerformanceBudgetTiming) => t.metric === 'first-contentful-paint');
      expect(fcp).toBeDefined();
      expect(fcp!.budget).toBe(1200); // Stricter than universal
    });

    it('should allow more resources for live processing page', () => {
      const liveBudget = performanceBudget.find((budget: PerformanceBudget) => budget.path === '/live');
      expect(liveBudget).toBeDefined();
      
      const script = liveBudget!.resourceSizes.find((s: PerformanceBudgetResource) => s.resourceType === 'script');
      expect(script).toBeDefined();
      expect(script!.budget).toBe(350); // More than universal 250KB
    });
  });
});

describe('🚀 GitHub Actions Workflow Tests', () => {
  describe('✅ Workflow Structure', () => {
    it('should have proper workflow metadata', () => {
      expect(githubWorkflow.name).toContain('Performance Testing');
      expect(githubWorkflow.name).toContain('Lighthouse CI');
    });

    it('should trigger on appropriate events', () => {
      expect(githubWorkflow.on).toHaveProperty('pull_request');
      expect(githubWorkflow.on).toHaveProperty('push');
      expect(githubWorkflow.on).toHaveProperty('workflow_dispatch');
    });

    it('should target main branch', () => {
      expect(githubWorkflow.on.pull_request.branches).toContain('main');
      expect(githubWorkflow.on.push.branches).toContain('main');
    });

    it('should filter relevant file changes', () => {
      const paths = githubWorkflow.on.pull_request.paths;
      expect(paths).toContain('apps/web/**');
      expect(paths).toContain('.github/workflows/lighthouse-ci.yml');
    });
  });

  describe('⚙️ Job Configuration', () => {
    const lighthouseJob = githubWorkflow.jobs['lighthouse-ci'];

    it('should use latest Ubuntu runner', () => {
      expect(lighthouseJob['runs-on']).toBe('ubuntu-latest');
    });

    it('should have reasonable timeout', () => {
      expect(lighthouseJob['timeout-minutes']).toBe(15);
    });

    it('should skip on [skip-lighthouse] commit message', () => {
      expect(lighthouseJob.if).toContain('[skip-lighthouse]');
    });

    it('should set proper working directory', () => {
      expect(lighthouseJob.defaults.run['working-directory']).toBe('apps/web');
    });
  });

  describe('📋 Build Steps', () => {
    const steps = githubWorkflow.jobs['lighthouse-ci'].steps;

    it('should checkout repository with full history', () => {
      const checkoutStep = steps.find((step: any) => step.name?.includes('Checkout'));
      expect(checkoutStep).toBeDefined();
      expect(checkoutStep.with['fetch-depth']).toBe(0);
    });

    it('should setup Node.js with caching', () => {
      const nodeStep = steps.find((step: any) => step.name?.includes('Setup Node'));
      expect(nodeStep).toBeDefined();
      expect(nodeStep.with.cache).toBe('npm');
      expect(nodeStep.with['cache-dependency-path']).toBeDefined();
    });

    it('should install dependencies', () => {
      const rootInstall = steps.find((step: any) => step.name?.includes('root dependencies'));
      const webInstall = steps.find((step: any) => step.name?.includes('web app dependencies'));
      
      expect(rootInstall).toBeDefined();
      expect(webInstall).toBeDefined();
    });

    it('should build production bundle', () => {
      const buildStep = steps.find((step: any) => step.name?.includes('Build'));
      expect(buildStep).toBeDefined();
      expect(buildStep.run).toContain('npm run build');
      expect(buildStep.env.NODE_ENV).toBe('production');
    });

    it('should install and run Lighthouse CI', () => {
      const installStep = steps.find((step: any) => step.name?.includes('Install Lighthouse'));
      const runStep = steps.find((step: any) => step.name?.includes('Run Lighthouse'));
      
      expect(installStep).toBeDefined();
      expect(installStep.run).toContain('@lhci/cli@0.15.x');
      
      expect(runStep).toBeDefined();
      expect(runStep.run).toContain('lhci autorun');
      expect(runStep.env).toHaveProperty('LHCI_GITHUB_APP_TOKEN');
    });
  });

  describe('📈 Artifacts and Reporting', () => {
    const steps = githubWorkflow.jobs['lighthouse-ci'].steps;

    it('should upload artifacts on failure', () => {
      const artifactStep = steps.find((step: any) => step.name?.includes('Upload artifacts'));
      expect(artifactStep).toBeDefined();
      expect(artifactStep.if).toBe('failure()');
      expect(artifactStep.with.path).toContain('.lighthouseci/');
    });

    it('should comment on PR with results', () => {
      const commentStep = steps.find((step: any) => step.name?.includes('Comment PR'));
      expect(commentStep).toBeDefined();
      expect(commentStep.if).toContain('pull_request');
      expect(commentStep.uses).toBe('actions/github-script@v7');
    });
  });

  describe('🚨 Regression Detection Job', () => {
    const regressionJob = githubWorkflow.jobs['performance-regression'];

    it('should depend on lighthouse-ci job', () => {
      expect(regressionJob.needs).toBe('lighthouse-ci');
    });

    it('should only run on pull requests', () => {
      expect(regressionJob.if).toContain('pull_request');
    });

    it('should have regression analysis step', () => {
      const steps = regressionJob.steps;
      const analysisStep = steps.find((step: any) => step.name?.includes('Regression Analysis'));
      expect(analysisStep).toBeDefined();
    });
  });
});

describe('🔧 Configuration Integration Tests', () => {
  describe('✅ File Dependencies', () => {
    it('should reference existing budget file', () => {
      const budgetPath = lighthouseConfig.ci.collect.settings.budgetPath;
      const fullPath = join(__dirname, '../../', budgetPath);
      expect(existsSync(fullPath)).toBe(true);
    });

    it('should have consistent URL patterns', () => {
      const configUrls = lighthouseConfig.ci.collect.url;
      const assertMatrixUrls = lighthouseConfig.ci.assert.assertMatrix.map(
        (item: any) => item.matchingUrlPattern
      );
      
      // Check that assert matrix covers main URLs
      expect(assertMatrixUrls.some((pattern: any) => pattern.includes('$'))).toBe(true); // Home
      expect(assertMatrixUrls.some((pattern: any) => pattern.includes('login'))).toBe(true);
      expect(assertMatrixUrls.some((pattern: any) => pattern.includes('dashboard'))).toBe(true);
      expect(assertMatrixUrls.some((pattern: any) => pattern.includes('live'))).toBe(true);
    });

    it('should have matching budget paths', () => {
      const budgetPaths = performanceBudget.map(budget => budget.path);
      const configUrls = lighthouseConfig.ci.collect.url;
      
      // Universal budget should exist
      expect(budgetPaths).toContain('/*');
      
      // Specific route budgets should match config URLs
      const hasLiveBudget = budgetPaths.includes('/live');
      const hasLiveUrl = configUrls.some((url: any) => url.includes('/live'));
      if (hasLiveUrl) {
        expect(hasLiveBudget).toBe(true);
      }
    });
  });

  describe('🎯 Threshold Consistency', () => {
    it('should have consistent FCP thresholds', () => {
      const configFcp = lighthouseConfig.ci.assert.assertions['first-contentful-paint'][1].maxNumericValue;
      const budgetBudget = performanceBudget.find((b: PerformanceBudget) => b.path === '/*');
      expect(budgetBudget).toBeDefined();
      const timingFcp = budgetBudget!.timings.find((t: PerformanceBudgetTiming) => t.metric === 'first-contentful-paint');
      expect(timingFcp).toBeDefined();
      const budgetFcp = timingFcp!.budget;
      
      expect(configFcp).toBe(budgetFcp);
    });

    it('should have consistent LCP thresholds', () => {
      const configLcp = lighthouseConfig.ci.assert.assertions['largest-contentful-paint'][1].maxNumericValue;
      const budgetBudget = performanceBudget.find((b: PerformanceBudget) => b.path === '/*');
      expect(budgetBudget).toBeDefined();
      const timingLcp = budgetBudget!.timings.find((t: PerformanceBudgetTiming) => t.metric === 'largest-contentful-paint');
      expect(timingLcp).toBeDefined();
      const budgetLcp = timingLcp!.budget;
      
      expect(configLcp).toBe(budgetLcp);
    });

    it('should have consistent bundle size limits', () => {
      const configJs = lighthouseConfig.ci.assert.assertions['resource-summary:script:size'][1].maxNumericValue;
      const budgetBudget = performanceBudget.find((b: PerformanceBudget) => b.path === '/*');
      expect(budgetBudget).toBeDefined();
      const resourceJs = budgetBudget!.resourceSizes.find((r: PerformanceBudgetResource) => r.resourceType === 'script');
      expect(resourceJs).toBeDefined();
      const budgetJs = resourceJs!.budget * 1000; // Budget in KB, config in bytes
      
      expect(configJs).toBe(budgetJs);
    });
  });

  describe('🚀 Performance Standards Compliance', () => {
    it('should meet 2025 Web Vitals standards', () => {
      const assertions = lighthouseConfig.ci.assert.assertions;
      
      // FCP Good: < 1.8s
      expect(assertions['first-contentful-paint'][1].maxNumericValue).toBeLessThanOrEqual(1800);
      
      // LCP Good: < 2.5s  
      expect(assertions['largest-contentful-paint'][1].maxNumericValue).toBeLessThanOrEqual(2500);
      
      // INP Good: < 200ms (replaces FID)
      expect(assertions['interaction-to-next-paint'][1].maxNumericValue).toBeLessThanOrEqual(200);
      
      // CLS Good: < 0.1
      expect(assertions['cumulative-layout-shift'][1].maxNumericValue).toBeLessThanOrEqual(0.1);
    });

    it('should have modern bundle size limits', () => {
      const assertions = lighthouseConfig.ci.assert.assertions;
      
      // JavaScript: Modern SPA should be < 250KB
      expect(assertions['resource-summary:script:size'][1].maxNumericValue).toBeLessThanOrEqual(250000);
      
      // CSS: Modern CSS should be < 100KB
      expect(assertions['resource-summary:stylesheet:size'][1].maxNumericValue).toBeLessThanOrEqual(100000);
      
      // Total: Modern page should warn at 1.5MB
      expect(assertions['resource-summary:total:size'][1].maxNumericValue).toBeLessThanOrEqual(1500000);
    });

    it('should enforce accessibility and best practices', () => {
      const assertions = lighthouseConfig.ci.assert.assertions;
      
      // Accessibility should be excellent
      expect(assertions['categories:accessibility'][1].minScore).toBeGreaterThanOrEqual(0.95);
      
      // Best practices should be high
      expect(assertions['categories:best-practices'][1].minScore).toBeGreaterThanOrEqual(0.90);
    });
  });
});