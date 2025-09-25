/**
 * Vite Bundle Analysis Configuration
 * Integrates rollup-plugin-visualizer and custom analysis tools for comprehensive bundle optimization
 */

import { defineConfig, type PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

// Production bundle analysis plugins configuration
export const bundleAnalysisPlugins: PluginOption[] = [
  // Rollup Plugin Visualizer - Interactive bundle analysis
  visualizer({
    filename: 'dist/bundle-analysis/stats.html',
    title: 'VN Speech Guardian - Bundle Analysis',
    template: 'treemap', // Options: sunburst, treemap, network, raw-data, list, flamegraph
    gzipSize: true,
    brotliSize: true,
    open: false, // Don't auto-open in CI
    emitFile: true, // Use Rollup's emitFile for better integration
    sourcemap: true, // Include sourcemap analysis
    projectRoot: process.cwd(),
  }),

  // Network diagram for dependency analysis
  visualizer({
    filename: 'dist/bundle-analysis/network.html',
    title: 'VN Speech Guardian - Dependency Network',
    template: 'network',
    gzipSize: true,
    open: false,
    emitFile: true,
  }),

  // Raw data for programmatic analysis
  visualizer({
    filename: 'dist/bundle-analysis/raw-data.json',
    title: 'VN Speech Guardian - Raw Bundle Data',
    template: 'raw-data',
    emitFile: true,
  }),

  // List format for version control tracking
  visualizer({
    filename: 'dist/bundle-analysis/bundle-list.yml',
    title: 'VN Speech Guardian - Bundle List',
    template: 'list',
    emitFile: true,
  }),
];

// Advanced chunking strategy for optimal bundle splitting
export const productionChunkingConfig = {
  rollupOptions: {
    output: {
      manualChunks: {
        // Vendor chunks - stable code that changes infrequently
        'vendor-react': ['react', 'react-dom'],
        'vendor-router': ['@tanstack/react-router'],
        'vendor-query': ['@tanstack/react-query'],
        'vendor-ui': [
          '@radix-ui/react-dialog',
          '@radix-ui/react-select', 
          '@radix-ui/react-toast',
          '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-alert-dialog',
        ],
        'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
        'vendor-motion': ['framer-motion'],
        'vendor-auth': ['@clerk/clerk-react'],
        
        // Feature-based chunks
        'audio-processing': [
          'wavesurfer.js', 
          '@wavesurfer/react',
          'react-audio-visualizer-pro'
        ],
        'charts': ['recharts', 'd3-scale', 'd3-shape'],
        'websockets': ['socket.io-client'],
        
        // Utility chunks
        'date-utils': ['date-fns', 'date-fns/locale'],
        'validation': ['zod'],
        'state-management': ['zustand'],
        'utils': ['clsx', 'class-variance-authority', 'tailwind-merge'],
        
        // Development utilities (should be excluded in production)
        'dev-tools': ['@tanstack/react-query-devtools'],
      },
      
      // Chunk naming for better caching
      chunkFileNames: (chunkInfo: any) => {
        const facadeModuleId = chunkInfo.facadeModuleId 
          ? chunkInfo.facadeModuleId.split('/').pop() 
          : 'chunk';
        return `js/[name]-[hash].js`;
      },
      
      // Asset naming
      assetFileNames: (assetInfo: any) => {
        const extType = assetInfo.name?.split('.').at(1);
        if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType ?? '')) {
          return 'assets/images/[name]-[hash][extname]';
        }
        if (/woff2?|ttf|otf/i.test(extType ?? '')) {
          return 'assets/fonts/[name]-[hash][extname]';
        }
        return 'assets/[name]-[hash][extname]';
      },
      
      // Entry point naming
      entryFileNames: 'js/[name]-[hash].js',
    },
    
    // External dependencies (for library mode)
    external: (id: string) => {
      // Externalize Node.js built-ins
      if (id.startsWith('node:')) return true;
      
      // Keep all npm packages bundled for web app
      return false;
    },
    
    // Tree-shaking configuration
    treeshake: {
      moduleSideEffects: (id: string, external: boolean) => {
        // Preserve side effects for certain modules
        if (id.includes('polyfill')) return true;
        if (id.includes('.css')) return true;
        return false;
      },
      
      // Advanced dead code elimination
      unknownGlobalSideEffects: false,
      tryCatchDeoptimization: false,
      
      // Preserve specific exports that might be used dynamically
      manualPureFunctions: [
        'console.log',
        'console.warn', 
        'console.error',
        'console.info',
        'console.debug',
      ],
    },
  },
};

// Bundle size monitoring configuration
export const bundleSizeConfig = {
  // Build size warnings
  chunkSizeWarningLimit: 500, // KB
  
  // Rollup output options for size optimization
  rollupOptions: {
    ...productionChunkingConfig.rollupOptions,
    
    output: {
      ...productionChunkingConfig.rollupOptions.output,
      
      // Compact output for smaller bundles
      compact: true,
      
      // Source map configuration
      sourcemap: process.env.NODE_ENV === 'development',
      sourcemapExcludeSources: true,
      
      // Advanced minification
      minifyInternalExports: true,
      
      // Experimental features for smaller bundles
      experimentalMinChunkSize: 20000, // 20KB minimum chunk size
    },
  },
};

// Bundle analysis npm scripts configuration
export const bundleAnalysisScripts = {
  "analyze": "npm run build && node -r tsx/register scripts/bundle-analysis.ts",
  "analyze:size": "npm run build && npx vite-bundle-analyzer dist",
  "analyze:deps": "npx bundlephobia-cli --package-json",
  "analyze:unused": "npx depcheck",
  "analyze:duplicates": "npx duplicate-package-checker node_modules",
  "bundle:visualize": "npm run build && open dist/bundle-analysis/stats.html",
  "bundle:network": "npm run build && open dist/bundle-analysis/network.html",
  "bundle:report": "npm run analyze && open bundle-analysis/bundle-report.html",
  "bundle:track": "npm run analyze && git add bundle-analysis/bundle-metrics.csv",
};

// Development bundle analysis configuration
export const devBundleConfig = defineConfig({
  build: {
    // Enable analysis in development builds
    rollupOptions: {
      plugins: [
        ...bundleAnalysisPlugins,
      ],
    },
    
    // Source maps for better analysis
    sourcemap: true,
    
    // Disable minification for analysis
    minify: false,
    
    // Generate stats file
    write: true,
  },
  
  // Enable bundle analyzer in dev
  plugins: bundleAnalysisPlugins,
});

// Production bundle configuration with analysis
export const prodBundleConfig = defineConfig({
  build: {
    ...bundleSizeConfig,
    
    // Enable analysis plugins only when analyzing
    rollupOptions: {
      ...bundleSizeConfig.rollupOptions,
      plugins: process.env.ANALYZE_BUNDLE 
        ? [...bundleAnalysisPlugins]
        : [],
    },
  },
  
  // Conditional plugins based on environment
  plugins: process.env.ANALYZE_BUNDLE ? bundleAnalysisPlugins : [],
});

export default bundleAnalysisPlugins;