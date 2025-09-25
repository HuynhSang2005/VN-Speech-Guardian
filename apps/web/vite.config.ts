import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { resolve } from 'path'
import { bundleAnalysisPlugins, productionChunkingConfig } from './config/bundle-analysis.config'
import { getBuildConfig } from './config/build.config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // TanStack Router plugin - phải đặt trước React plugin
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      // Tự động tạo route tree từ file structure
      // Generated file sẽ là src/routeTree.gen.ts
    }),
    
    // React 19 plugin với enhanced features - updated for @vitejs/plugin-react 5.0.3
    react({
      babel: {
        plugins: [
          // React Compiler support cho React 19
          // ['babel-plugin-react-compiler', {}], // uncomment khi stable
        ],
      },
      // React 19 uses automatic JSX runtime by default
      // fastRefresh option deprecated in @vitejs/plugin-react 5.0.3
      jsxRuntime: 'automatic',
    }),
    
    // TypeScript path mapping integration - Vietnamese dev experience
    tsconfigPaths(),

    // Advanced bundle analysis plugins - comprehensive analysis suite
    ...(process.env.ANALYZE_BUNDLE ? bundleAnalysisPlugins : []),
  ],

  // Development server configuration  
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000,
    strictPort: false, // Try next port if 3000 is busy
    open: false, // Don't auto-open browser
    cors: true,
    
    // Hot reload optimization
    hmr: {
      overlay: true, // Show build errors in browser
    },
    
    // Proxy cho API calls tới NestJS Gateway trong development
    proxy: {
      '/api': {
        target: 'http://localhost:4000', // NestJS Gateway port
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'ws://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  // Advanced production build configuration với bundle analysis
  build: {
    // Use optimized build config based on environment
    ...getBuildConfig(),
    
    // Preserve specific overrides
    outDir: 'dist',
    assetsDir: 'assets',
    cssMinify: true,
    reportCompressedSize: true,
    
    // Advanced chunk splitting strategy với production optimization
    rollupOptions: {
      // Merge với production chunking config nếu analyze mode
      ...(process.env.ANALYZE_BUNDLE ? productionChunkingConfig.rollupOptions : {}),
      
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        
        // Enhanced manual chunking strategy (fallback cho non-analyze mode)
        manualChunks: process.env.ANALYZE_BUNDLE 
          ? productionChunkingConfig.rollupOptions.output.manualChunks 
          : (id) => {
          // Node modules chunking
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            
            // TanStack ecosystem
            if (id.includes('@tanstack')) {
              return 'tanstack-vendor';
            }
            
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'radix-vendor';
            }
            
            // Animation libraries
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            
            // Audio processing libraries
            if (id.includes('wavesurfer') || id.includes('audio-worklet')) {
              return 'audio-vendor';
            }
            
            // Chart libraries (only loaded on dashboard)
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'chart-vendor';
            }
            
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'form-vendor';
            }
            
            // Authentication
            if (id.includes('@clerk')) {
              return 'auth-vendor';
            }
            
            // Socket.IO
            if (id.includes('socket.io')) {
              return 'socket-vendor';
            }
            
            // Utility libraries
            if (id.includes('axios') || id.includes('clsx') || id.includes('class-variance-authority')) {
              return 'utils-vendor';
            }
            
            // Everything else from node_modules
            return 'vendor';
          }
          
          // Application code chunking
          if (id.includes('/routes/')) {
            // Route-based chunking
            if (id.includes('/routes/dashboard')) return 'route-dashboard';
            if (id.includes('/routes/live')) return 'route-live';
            if (id.includes('/routes/sessions')) return 'route-sessions';
            return 'routes';
          }
          
          if (id.includes('/components/audio/')) {
            return 'components-audio';
          }
          
          if (id.includes('/components/charts/')) {
            return 'components-charts';
          }
        },
      },
      
      // External dependencies (if building library mode)
      external: process.env.BUILD_MODE === 'library' ? [
        'react',
        'react-dom',
      ] : [],
    },
  },

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/services': resolve(__dirname, './src/services'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/types': resolve(__dirname, './src/types'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/worklets': resolve(__dirname, './src/worklets'),
      '@/constants': resolve(__dirname, './src/constants'),
      '@/stores': resolve(__dirname, './src/stores'),
    },
  },

  // CSS processing
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true,
  },

  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@clerk/clerk-react',
      '@tanstack/react-query',
      '@tanstack/react-router',
      'axios',
      'socket.io-client',
      'framer-motion',
      'zustand',
      'react-hook-form',
      'zod',
      'wavesurfer.js',
      '@wavesurfer/react',
    ],
    exclude: [
      // AudioWorklet files should not be pre-bundled
      './src/worklets/audio-processor.ts'
    ],
  },

  // AudioWorklet support cho speech processing
  worker: {
    format: 'es',
    plugins: () => [tsconfigPaths()],
  },

  // Environment variables prefix
  envPrefix: 'VITE_',
  
  // Preview server configuration
  preview: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: false,
    cors: true,
  },

  // Esbuild configuration
  esbuild: {
    // Drop console and debugger trong production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    
    // JSX runtime optimization
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
})
