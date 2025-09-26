/**
 * Production Bundle Optimization Configuration
 * Advanced Vite build configuration for optimal bundle performance
 * 
 * Key optimizations:
 * - Smart chunk splitting based on usage patterns
 * - Compression and minification strategies
 * - Tree-shaking optimization
 * - Asset optimization and CDN preparation
 * - Bundle size monitoring and alerts
 */

// import { defineConfig } from 'vite';
import type { BuildOptions } from 'vite';

// Bundle size thresholds (KB)
export const BUNDLE_SIZE_LIMITS = {
  CHUNK_WARNING: 500,  // Warn for chunks > 500KB
  CHUNK_ERROR: 1000,   // Error for chunks > 1MB
  TOTAL_WARNING: 2000, // Warn for total bundle > 2MB
  TOTAL_ERROR: 4000,   // Error for total bundle > 4MB
} as const;

// Performance-optimized build configuration
export const productionBuildConfig: BuildOptions = {
  target: ['es2022', 'chrome108', 'safari16'],
  outDir: 'dist',
  assetsDir: 'assets',
  
  // Bundle size optimization
  chunkSizeWarningLimit: BUNDLE_SIZE_LIMITS.CHUNK_WARNING,
  assetsInlineLimit: 4096, // Inline assets < 4KB
  
  // Advanced minification
  minify: 'terser',
  terserOptions: {
    compress: {
      arguments: true,
      booleans_as_integers: true,
      drop_console: true,
      drop_debugger: true,
      keep_fargs: false,
      passes: 3,
      pure_funcs: [
        'console.log',
        'console.info',
        'console.debug',
        'console.warn',
      ],
      pure_getters: true,
      unsafe: true,
      unsafe_arrows: true,
      unsafe_comps: true,
      unsafe_Function: true,
      unsafe_math: true,
      unsafe_symbols: true,
      unsafe_methods: true,
      unsafe_proto: true,
      unsafe_regexp: true,
      unsafe_undefined: true,
    },
    mangle: {
      safari10: true,
    },
    format: {
      comments: false,
    },
  },
  
  // Source maps for production debugging
  sourcemap: process.env.NODE_ENV === 'development' ? true : 'hidden',
  
  // Rollup optimization options
  rollupOptions: {
    treeshake: {
      moduleSideEffects: (id) => {
        // Preserve side effects for CSS and certain libraries
        if (id.includes('.css')) return true;
        if (id.includes('polyfill')) return true;
        if (id.includes('@clerk/clerk-react')) return true;
        return false;
      },
      
      // Advanced tree-shaking options
      unknownGlobalSideEffects: false,
      tryCatchDeoptimization: false,
      correctVarValueBeforeDeclaration: false,
      manualPureFunctions: [
        'Object.defineProperty',
        'Object.freeze',
        'Object.seal',
        'Math.random',
        'Date.now',
        'performance.now',
      ],
    },
    
    output: {
      // Optimized file naming for caching
      entryFileNames: 'js/[name]-[hash].js',
      chunkFileNames: (chunkInfo) => {
        // Special naming for critical chunks
        if (chunkInfo.isEntry) return 'js/[name]-[hash].js';
        if (chunkInfo.facadeModuleId?.includes('vendor')) return 'js/vendor/[name]-[hash].js';
        if (chunkInfo.facadeModuleId?.includes('route')) return 'js/routes/[name]-[hash].js';
        return 'js/chunks/[name]-[hash].js';
      },
      assetFileNames: (assetInfo) => {
        const extType = assetInfo.name?.split('.').pop()?.toLowerCase();
        
        // Organize assets by type for better CDN caching
        if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(extType ?? '')) {
          return 'assets/images/[name]-[hash].[ext]';
        }
        if (/woff2?|ttf|otf|eot/i.test(extType ?? '')) {
          return 'assets/fonts/[name]-[hash].[ext]';
        }
        if (/mp4|webm|ogv|mov|avi/i.test(extType ?? '')) {
          return 'assets/videos/[name]-[hash].[ext]';
        }
        if (/mp3|wav|ogg|m4a|aac/i.test(extType ?? '')) {
          return 'assets/audio/[name]-[hash].[ext]';
        }
        return 'assets/[name]-[hash].[ext]';
      },
      
      // Advanced manual chunking strategy
      manualChunks: (id) => {
        // Critical path optimization
        if (id.includes('src/main.tsx') || id.includes('src/App.tsx')) {
          return 'app-shell';
        }
        
        // Node modules chunking with size awareness
        if (id.includes('node_modules')) {
          // Large libraries get their own chunks
          if (id.includes('react') && !id.includes('react-dom')) return 'react';
          if (id.includes('react-dom')) return 'react-dom';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@tanstack/react-query')) return 'query';
          if (id.includes('@tanstack/react-router')) return 'router';
          
          // Group related UI libraries
          if (id.includes('@radix-ui')) return 'ui-primitives';
          if (id.includes('@clerk')) return 'auth';
          
          // Audio processing (lazy-loaded)
          if (id.includes('wavesurfer') || id.includes('audio-worklet')) {
            return 'audio-processing';
          }
          
          // Charts (dashboard only)
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts';
          }
          
          // WebSocket (real-time features)
          if (id.includes('socket.io')) return 'websocket';
          
          // Forms (specific pages)
          if (id.includes('react-hook-form') || id.includes('@hookform')) {
            return 'forms';
          }
          
          // Utilities
          if (id.includes('axios') || id.includes('clsx') || id.includes('zod')) {
            return 'utils';
          }
          
          // Everything else
          return 'vendor';
        }
        
        // Application code chunking
        if (id.includes('src/routes/')) {
          // Route-level code splitting
          if (id.includes('routes/dashboard')) return 'route-dashboard';
          if (id.includes('routes/live')) return 'route-live';
          if (id.includes('routes/sessions')) return 'route-sessions';
          if (id.includes('routes/auth')) return 'route-auth';
          return 'routes-misc';
        }
        
        // Component-level chunking for large features
        if (id.includes('src/components/')) {
          if (id.includes('components/audio/')) return 'components-audio';
          if (id.includes('components/charts/')) return 'components-charts';
          if (id.includes('components/forms/')) return 'components-forms';
          return 'components-shared';
        }
        
        // Service layer
        if (id.includes('src/services/')) {
          return 'services';
        }
        
        // Hooks and utilities
        if (id.includes('src/hooks/') || id.includes('src/lib/')) {
          return 'shared-utils';
        }
      },
      
      // Output format optimizations
      format: 'es',
      generatedCode: {
        arrowFunctions: true,
        constBindings: true,
        objectShorthand: true,
        reservedNamesAsProps: false,
        symbols: true,
      },
      
      // Compact output
      compact: true,
      
      // Advanced experimental features
      experimentalMinChunkSize: 20000, // 20KB minimum chunk size
      
      // Plugin-specific optimizations
      plugins: [],
    },
    
    // External dependencies for better caching
    external: [],
  },
};

// Development build configuration
export const developmentBuildConfig: BuildOptions = {
  target: 'esnext',
  outDir: 'dist',
  
  // Fast development builds
  minify: false,
  sourcemap: true,
  
  rollupOptions: {
    output: {
      // Simple naming for development
      entryFileNames: '[name].js',
      chunkFileNames: '[name]-[hash].js',
      assetFileNames: '[name].[ext]',
    },
  },
};

// Bundle analysis configuration
export const analysisBuildConfig: BuildOptions = {
  ...productionBuildConfig,
  
  // Generate analysis-friendly output
  sourcemap: true,
  minify: false, // Easier to analyze unminified
  
  rollupOptions: {
    ...productionBuildConfig.rollupOptions,
    
    // Generate metadata for analysis
    plugins: [],
    
    output: {
      ...productionBuildConfig.rollupOptions?.output,
      
      // Metadata generation
      dir: 'dist',
      
      // Analysis-friendly naming
      entryFileNames: 'js/[name]-[hash].js',
      chunkFileNames: 'js/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash].[ext]',
    },
  },
};

// Bundle size validation function
export function validateBundleSize(stats: { [key: string]: number }) {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  let totalSize = 0;
  
  for (const [chunk, size] of Object.entries(stats)) {
    totalSize += size;
    
    if (size > BUNDLE_SIZE_LIMITS.CHUNK_ERROR * 1024) {
      errors.push(`Chunk ${chunk} exceeds maximum size: ${Math.round(size / 1024)}KB > ${BUNDLE_SIZE_LIMITS.CHUNK_ERROR}KB`);
    } else if (size > BUNDLE_SIZE_LIMITS.CHUNK_WARNING * 1024) {
      warnings.push(`Chunk ${chunk} is large: ${Math.round(size / 1024)}KB > ${BUNDLE_SIZE_LIMITS.CHUNK_WARNING}KB`);
    }
  }
  
  if (totalSize > BUNDLE_SIZE_LIMITS.TOTAL_ERROR * 1024) {
    errors.push(`Total bundle size exceeds maximum: ${Math.round(totalSize / 1024)}KB > ${BUNDLE_SIZE_LIMITS.TOTAL_ERROR}KB`);
  } else if (totalSize > BUNDLE_SIZE_LIMITS.TOTAL_WARNING * 1024) {
    warnings.push(`Total bundle size is large: ${Math.round(totalSize / 1024)}KB > ${BUNDLE_SIZE_LIMITS.TOTAL_WARNING}KB`);
  }
  
  return { warnings, errors, totalSize };
}

// Export configurations based on environment
export function getBuildConfig(): BuildOptions {
  if (process.env.ANALYZE_BUNDLE) {
    return analysisBuildConfig;
  }
  
  if (process.env.NODE_ENV === 'development') {
    return developmentBuildConfig;
  }
  
  return productionBuildConfig;
}

export default getBuildConfig();