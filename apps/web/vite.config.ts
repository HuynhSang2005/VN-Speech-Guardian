import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

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

  // Build configuration cho production
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2022',
    
    // Chunk splitting strategy cho optimal loading
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        
        // Manual chunking cho better caching
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          
          // TanStack ecosystem
          'tanstack-vendor': ['@tanstack/react-query', '@tanstack/react-router'],
          
          // UI libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-form',
            'framer-motion'
          ],
          
          // Audio processing libraries
          'audio-vendor': ['wavesurfer.js', '@wavesurfer/react'],
          
          // Chart libraries
          'chart-vendor': ['recharts'],
          
          // Utility libraries
          'utils-vendor': ['axios', 'clsx', 'class-variance-authority', 'tailwind-merge']
        },
      },
    },
    
    // Bundle analysis và performance
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000, // KB
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
