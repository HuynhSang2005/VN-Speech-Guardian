/**
 * Application entrypoint - React 19 với TanStack Router & Query
 * Tích hợp: Clerk auth, React Query, Router Provider
 * Theo copilot-instructions.md: Vietnamese dev experience + modern React patterns
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ClerkProvider } from '@clerk/clerk-react'

import { router } from './router'
import './index.css'

// Query Client configuration với Vietnamese-friendly defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - 5 phút cho data thường
      staleTime: 1000 * 60 * 5,
      // Refetch on window focus - useful cho real-time data
      refetchOnWindowFocus: false,
      // Retry configuration cho network issues
      retry: (failureCount, error: unknown) => {
        // Không retry cho 4xx errors
        const httpError = error as any
        if (httpError?.response?.status >= 400 && httpError?.response?.status < 500) {
          return false
        }
        // Retry tối đa 2 lần cho network/5xx errors
        return failureCount < 2
      },
    },
    mutations: {
      // Default retry cho mutations
      retry: 1,
    },
  },
})

// Clerk configuration
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPublishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY không được tìm thấy trong environment variables')
}

// App initialization
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element không tìm thấy trong DOM')
}

createRoot(rootElement).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {/* DevTools chỉ hiển thị trong development */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
)
