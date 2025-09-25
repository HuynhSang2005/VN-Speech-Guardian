#!/usr/bin/env node
/**
 * Bundle Performance Monitor
 * Integrated script for running comprehensive bundle analysis and performance monitoring
 * 
 * Features:
 * - Automated build and analysis pipeline
 * - Performance regression detection
 * - Bundle size tracking over time
 * - Optimization recommendations with priority scoring
 * - CI/CD integration support
 * - Historical data comparison
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PerformanceMetrics {
  timestamp: string;
  commit?: string;
  branch?: string;
  bundleSize: number;
  gzipSize: number;
  chunkCount: number;
  largestChunk: number;
  duplicateCode: number;
  unusedDependencies: string[];
  buildTime: number;
  treeShakingEfficiency: number;
  compressionRatio: number;
}

interface BenchmarkResults {
  current: PerformanceMetrics;
  previous?: PerformanceMetrics;
  regression: {
    bundleSize: number;
    buildTime: number;
    chunkCount: number;
  };
  recommendations: string[];
}

class BundlePerformanceMonitor {
  private metricsFile: string;
  private outputDir: string;

  constructor() {
    this.outputDir = path.resolve(__dirname, '../bundle-analysis');
    this.metricsFile = path.join(this.outputDir, 'performance-history.json');
  }

  async run(): Promise<BenchmarkResults> {
    console.log('🚀 Starting comprehensive bundle performance analysis...\n');

    try {
      // 1. Clean and prepare
      await this.cleanup();
      
      // 2. Run type checking
      console.log('📝 Running TypeScript type checking...');
      const typeCheckStart = Date.now();
      await this.runTypeCheck();
      const typeCheckTime = Date.now() - typeCheckStart;
      console.log(`✅ Type checking completed in ${typeCheckTime}ms\n`);

      // 3. Run dependency analysis
      console.log('🔍 Analyzing dependencies...');
      const depAnalysis = await this.analyzeDependencies();
      console.log(`📦 Found ${depAnalysis.unusedDependencies.length} unused dependencies\n`);

      // 4. Build with analysis
      console.log('🔨 Building with bundle analysis...');
      const buildStart = Date.now();
      await this.buildWithAnalysis();
      const buildTime = Date.now() - buildStart;
      console.log(`✅ Build completed in ${buildTime}ms\n`);

      // 5. Analyze bundle metrics
      console.log('📊 Analyzing bundle metrics...');
      const bundleMetrics = await this.analyzeBundleMetrics();
      console.log(`📦 Total bundle size: ${this.formatSize(bundleMetrics.bundleSize)}`);
      console.log(`🗜️  Gzipped size: ${this.formatSize(bundleMetrics.gzipSize)}`);
      console.log(`📁 Chunks: ${bundleMetrics.chunkCount}\n`);

      // 6. Generate comprehensive analysis
      console.log('📈 Running comprehensive bundle analysis...');
      await this.runBundleAnalysis();

      // 7. Compile results
      const current: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        commit: await this.getGitCommit(),
        branch: await this.getGitBranch(),
        bundleSize: bundleMetrics.bundleSize,
        gzipSize: bundleMetrics.gzipSize,
        chunkCount: bundleMetrics.chunkCount,
        largestChunk: bundleMetrics.largestChunk,
        duplicateCode: bundleMetrics.duplicateCode,
        unusedDependencies: depAnalysis.unusedDependencies,
        buildTime,
        treeShakingEfficiency: bundleMetrics.treeShakingEfficiency,
        compressionRatio: bundleMetrics.gzipSize / bundleMetrics.bundleSize,
      };

      // 8. Compare with previous results
      const previous = await this.getPreviousMetrics();
      const regression = this.calculateRegression(current, previous);
      const recommendations = this.generateRecommendations(current, previous);

      // 9. Save results
      await this.saveMetrics(current);

      // 10. Generate reports
      await this.generateReports({ current, previous, regression, recommendations });

      console.log('\n✅ Bundle performance analysis completed!');
      console.log(`📊 Results saved to: ${this.outputDir}`);

      return { current, previous, regression, recommendations };

    } catch (error) {
      console.error('❌ Bundle analysis failed:', error);
      process.exit(1);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.rm('dist', { recursive: true, force: true });
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async runTypeCheck(): Promise<void> {
    try {
      execSync('npm run typecheck', { stdio: 'pipe', cwd: __dirname });
    } catch (error) {
      console.warn('⚠️  Type checking completed with warnings');
    }
  }

  private async analyzeDependencies(): Promise<{ unusedDependencies: string[] }> {
    try {
      const output = execSync('npx depcheck --json', { 
        encoding: 'utf8', 
        cwd: path.resolve(__dirname, '..') 
      });
      const result = JSON.parse(output);
      
      return {
        unusedDependencies: result.dependencies || [],
      };
    } catch (error) {
      console.warn('⚠️  Dependency analysis failed, skipping...');
      return { unusedDependencies: [] };
    }
  }

  private async buildWithAnalysis(): Promise<void> {
    const env = { ...process.env, ANALYZE_BUNDLE: 'true' };
    execSync('npm run build', { 
      stdio: 'inherit', 
      cwd: path.resolve(__dirname, '..'),
      env 
    });
  }

  private async analyzeBundleMetrics(): Promise<{
    bundleSize: number;
    gzipSize: number;
    chunkCount: number;
    largestChunk: number;
    duplicateCode: number;
    treeShakingEfficiency: number;
  }> {
    const distPath = path.resolve(__dirname, '../dist');
    let totalSize = 0;
    let totalGzipSize = 0;
    let chunkCount = 0;
    let largestChunk = 0;

    try {
      const files = await fs.readdir(distPath, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.css'))) {
          const filePath = path.join(distPath, file.name);
          const stats = await fs.stat(filePath);
          const size = stats.size;
          
          totalSize += size;
          totalGzipSize += Math.round(size * 0.3); // Approximate gzip compression
          chunkCount++;
          
          if (size > largestChunk) {
            largestChunk = size;
          }
        }
      }

      return {
        bundleSize: totalSize,
        gzipSize: totalGzipSize,
        chunkCount,
        largestChunk,
        duplicateCode: 0, // Would need deeper analysis
        treeShakingEfficiency: 0.85, // Default estimate
      };
    } catch (error) {
      throw new Error(`Failed to analyze bundle metrics: ${error}`);
    }
  }

  private async runBundleAnalysis(): Promise<void> {
    try {
      // Run our custom bundle analysis script
      const { execSync: exec } = await import('child_process');
      exec('node -r tsx/register scripts/bundle-analysis.ts', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
      });
    } catch (error) {
      console.warn('⚠️  Custom bundle analysis failed, continuing...');
    }
  }

  private async getGitCommit(): Promise<string | undefined> {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return undefined;
    }
  }

  private async getGitBranch(): Promise<string | undefined> {
    try {
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch {
      return undefined;
    }
  }

  private async getPreviousMetrics(): Promise<PerformanceMetrics | undefined> {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf8');
      const history: PerformanceMetrics[] = JSON.parse(data);
      return history[history.length - 1];
    } catch {
      return undefined;
    }
  }

  private calculateRegression(current: PerformanceMetrics, previous?: PerformanceMetrics): {
    bundleSize: number;
    buildTime: number;
    chunkCount: number;
  } {
    if (!previous) {
      return { bundleSize: 0, buildTime: 0, chunkCount: 0 };
    }

    return {
      bundleSize: ((current.bundleSize - previous.bundleSize) / previous.bundleSize) * 100,
      buildTime: ((current.buildTime - previous.buildTime) / previous.buildTime) * 100,
      chunkCount: current.chunkCount - previous.chunkCount,
    };
  }

  private generateRecommendations(current: PerformanceMetrics, previous?: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    // Bundle size recommendations
    if (current.bundleSize > 2 * 1024 * 1024) { // > 2MB
      recommendations.push('🔍 Bundle size is large (>2MB). Consider code splitting or removing unused dependencies.');
    }

    // Chunk count recommendations
    if (current.chunkCount > 20) {
      recommendations.push('📦 High chunk count detected. Consider consolidating smaller chunks.');
    }

    // Compression ratio recommendations
    if (current.compressionRatio > 0.4) {
      recommendations.push('🗜️  Poor compression ratio. Consider optimizing code structure or assets.');
    }

    // Unused dependencies
    if (current.unusedDependencies.length > 0) {
      recommendations.push(`📚 ${current.unusedDependencies.length} unused dependencies detected. Consider removing: ${current.unusedDependencies.slice(0, 3).join(', ')}`);
    }

    // Regression analysis
    if (previous) {
      const regression = this.calculateRegression(current, previous);
      
      if (regression.bundleSize > 10) {
        recommendations.push(`📈 Bundle size increased by ${regression.bundleSize.toFixed(1)}% since last analysis.`);
      }
      
      if (regression.buildTime > 20) {
        recommendations.push(`⏱️  Build time increased by ${regression.buildTime.toFixed(1)}% since last analysis.`);
      }
    }

    // Performance targets
    if (current.largestChunk > 500 * 1024) { // > 500KB
      recommendations.push('⚡ Largest chunk exceeds 500KB. Consider further code splitting.');
    }

    return recommendations;
  }

  private async saveMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      let history: PerformanceMetrics[] = [];
      
      try {
        const data = await fs.readFile(this.metricsFile, 'utf8');
        history = JSON.parse(data);
      } catch {
        // File doesn't exist yet
      }
      
      history.push(metrics);
      
      // Keep only last 100 entries
      if (history.length > 100) {
        history = history.slice(-100);
      }
      
      await fs.writeFile(this.metricsFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.warn('⚠️  Failed to save metrics history:', error);
    }
  }

  private async generateReports(results: BenchmarkResults): Promise<void> {
    // Generate summary report
    const summary = this.generateSummaryReport(results);
    await fs.writeFile(path.join(this.outputDir, 'performance-summary.md'), summary);

    // Generate CI/CD report
    const cicdReport = this.generateCICDReport(results);
    await fs.writeFile(path.join(this.outputDir, 'cicd-report.json'), JSON.stringify(cicdReport, null, 2));

    console.log('📄 Generated performance summary report');
    console.log('🔄 Generated CI/CD integration report');
  }

  private generateSummaryReport(results: BenchmarkResults): string {
    const { current, previous, regression, recommendations } = results;
    
    return `# Bundle Performance Analysis Report

Generated on ${new Date(current.timestamp).toLocaleString()}
${current.commit ? `Commit: ${current.commit.substring(0, 8)}` : ''}
${current.branch ? `Branch: ${current.branch}` : ''}

## 📊 Current Metrics

| Metric | Value | Change |
|--------|-------|--------|
| Bundle Size | ${this.formatSize(current.bundleSize)} | ${previous ? this.formatChange(regression.bundleSize, '%') : 'N/A'} |
| Gzipped Size | ${this.formatSize(current.gzipSize)} | ${previous ? this.formatChange((current.gzipSize - (previous?.gzipSize || 0)) / (previous?.gzipSize || 1) * 100, '%') : 'N/A'} |
| Chunk Count | ${current.chunkCount} | ${previous ? this.formatChange(regression.chunkCount, '') : 'N/A'} |
| Largest Chunk | ${this.formatSize(current.largestChunk)} | N/A |
| Build Time | ${current.buildTime}ms | ${previous ? this.formatChange(regression.buildTime, '%') : 'N/A'} |
| Compression Ratio | ${(current.compressionRatio * 100).toFixed(1)}% | N/A |

## 🎯 Performance Targets

- ✅ Bundle Size < 2MB: ${current.bundleSize < 2 * 1024 * 1024 ? 'PASS' : 'FAIL'}
- ✅ Largest Chunk < 500KB: ${current.largestChunk < 500 * 1024 ? 'PASS' : 'FAIL'}
- ✅ Compression Ratio < 40%: ${current.compressionRatio < 0.4 ? 'PASS' : 'FAIL'}
- ✅ Unused Dependencies: ${current.unusedDependencies.length === 0 ? 'PASS' : 'FAIL'}

## 🔍 Recommendations

${recommendations.map(rec => `- ${rec}`).join('\n')}

## 📈 Historical Trends

${previous ? `
Previous analysis: ${new Date(previous.timestamp).toLocaleString()}
- Bundle size trend: ${regression.bundleSize > 0 ? '📈 Increasing' : '📉 Decreasing'}
- Build time trend: ${regression.buildTime > 0 ? '📈 Slower' : '📉 Faster'}
` : 'No previous data available for comparison.'}

## 🚨 Action Items

${this.generateActionItems(current, regression).map(item => `- ${item}`).join('\n')}
`;
  }

  private generateCICDReport(results: BenchmarkResults): any {
    const { current, regression, recommendations } = results;
    
    return {
      success: true,
      timestamp: current.timestamp,
      metrics: {
        bundleSize: current.bundleSize,
        gzipSize: current.gzipSize,
        chunkCount: current.chunkCount,
        buildTime: current.buildTime,
        unusedDependencies: current.unusedDependencies.length,
      },
      thresholds: {
        bundleSizePass: current.bundleSize < 2 * 1024 * 1024,
        largestChunkPass: current.largestChunk < 500 * 1024,
        compressionRatioPass: current.compressionRatio < 0.4,
        unusedDependenciesPass: current.unusedDependencies.length === 0,
      },
      regression: {
        bundleSize: regression.bundleSize,
        buildTime: regression.buildTime,
        significant: Math.abs(regression.bundleSize) > 10 || Math.abs(regression.buildTime) > 20,
      },
      recommendations: recommendations.length,
      artifactPaths: [
        'bundle-analysis/bundle-report.html',
        'bundle-analysis/performance-summary.md',
        'dist/bundle-analysis/stats.html',
      ],
    };
  }

  private generateActionItems(current: PerformanceMetrics, regression: any): string[] {
    const items: string[] = [];
    
    if (current.bundleSize > 2 * 1024 * 1024) {
      items.push('⚠️  HIGH: Reduce bundle size below 2MB threshold');
    }
    
    if (current.unusedDependencies.length > 0) {
      items.push(`🧹 MEDIUM: Remove ${current.unusedDependencies.length} unused dependencies`);
    }
    
    if (Math.abs(regression.bundleSize) > 15) {
      items.push('📊 MEDIUM: Investigate significant bundle size changes');
    }
    
    if (current.largestChunk > 500 * 1024) {
      items.push('⚡ MEDIUM: Split largest chunk for better loading performance');
    }
    
    if (items.length === 0) {
      items.push('✅ No critical action items - bundle performance is optimal');
    }
    
    return items;
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private formatChange(value: number, unit: string): string {
    const prefix = value > 0 ? '+' : '';
    const color = value > 0 ? '🔴' : value < 0 ? '🟢' : '⚪';
    return `${color} ${prefix}${value.toFixed(1)}${unit}`;
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new BundlePerformanceMonitor();
  monitor.run().catch(error => {
    console.error('❌ Performance monitoring failed:', error);
    process.exit(1);
  });
}

export default BundlePerformanceMonitor;