/**
 * Main App Component - VN Speech Guardian
 * Mục đích: Setup Clerk Authentication, React Query, và TanStack Router
 * Architecture: ClerkProvider → QueryClient → Router → Routes
 * Features: Authentication, real-time communication, error boundaries
 */

import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'sonner';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Clerk configuration
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to your .env file');
}

// Create router instance với type safety
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // Setup context cho authentication
  context: {
    queryClient: undefined!, // Will be set below
    auth: undefined!, // Will be provided by Clerk
  },
});

// Register router types for TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Global error fallback cho toàn bộ app
function AppErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-500 text-6xl mb-4">🚨</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Lỗi hệ thống
        </h1>
        <p className="text-gray-600 mb-6">
          VN Speech Guardian gặp lỗi nghiêm trọng và cần khởi động lại
        </p>
        <details className="text-left bg-gray-50 p-4 rounded mb-4">
          <summary className="font-medium cursor-pointer">Chi tiết kỹ thuật</summary>
          <pre className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
            {error?.message || 'Unknown system error'}
            {error?.stack && (
              <>
                {'\n\nStack trace:'}
                {error.stack}
              </>
            )}
          </pre>
        </details>
        <div className="flex justify-center space-x-3">
          <button
            onClick={resetErrorBoundary}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  // Create Query Client với optimal settings
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          gcTime: 10 * 60 * 1000, // 10 minutes (cacheTime renamed to gcTime)
          retry: (failureCount, error: any) => {
            // Don't retry on 4xx errors
            if (error?.status >= 400 && error?.status < 500) {
              return false;
            }
            // Retry network errors up to 3 times
            return failureCount < 3;
          },
          refetchOnWindowFocus: false,
          refetchOnReconnect: 'always',
        },
        mutations: {
          retry: 1,
        },
      },
    })
  );

  return (
    <StrictMode>
      <ErrorBoundary FallbackComponent={AppErrorFallback}>
        <ClerkProvider
          publishableKey={CLERK_PUBLISHABLE_KEY}
        >
          <QueryClientProvider client={queryClient}>
            <RouterProvider 
              router={router} 
              context={{
                queryClient,
                auth: undefined!, // Clerk sẽ provide context này
              }}
            />
            
            {/* Global Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'white',
                  color: '#1F2937',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'Inter, system-ui, sans-serif',
                },
                className: 'sonner-toast',
              }}
              theme="light"
            />
            
            {/* Development Tools */}
            {import.meta.env.DEV && (
              <ReactQueryDevtools
                initialIsOpen={false}
              />
            )}
          </QueryClientProvider>
        </ClerkProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

export default App;
