/**
 * Root layout cho toàn bộ ứng dụng VN Speech Guardian
 * - Error boundaries cho global error handling
 * - Navigation menu và header layout
 * - Global providers và context setup
 * - DevTools integration trong development mode
 */

import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { Suspense } from 'react'
import { cn } from '../lib/utils'

// Error fallback component cho react-error-boundary
function ReactErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Đã có lỗi xảy ra
        </h1>
        <div className="text-gray-600 mb-6">
          <p className="mb-2">Ứng dụng gặp phải vấn đề không mong muốn.</p>
          <details className="text-sm bg-gray-100 p-3 rounded mt-2 text-left">
            <summary className="font-semibold cursor-pointer">Chi tiết lỗi</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  )
}

// Router error fallback cho TanStack Router
function RouterErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Lỗi định tuyến
        </h1>
        <div className="text-gray-600 mb-6">
          <p className="mb-2">Không thể tải trang này.</p>
          <details className="text-sm bg-gray-100 p-3 rounded mt-2 text-left">
            <summary className="font-semibold cursor-pointer">Chi tiết lỗi</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  )
}

// Global loading component
function GlobalLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-gray-600">Đang tải...</p>
      </div>
    </div>
  )
}

// Root layout component với navigation và styling
function RootLayout() {
  return (
        <ErrorBoundary FallbackComponent={ReactErrorFallback}>
          <div className="min-h-screen bg-background">
            {/* Global Navigation Header */}
            <header className="border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo và Brand */}
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/" 
                    className="text-xl font-bold text-gray-900 hover:text-primary transition-colors"
                  >
                    🛡️ VN Speech Guardian
                  </Link>
                </div>

                {/* Navigation Menu */}
                <nav className="hidden md:flex items-center space-x-6">
                  <Link 
                    to="/" 
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      "[&.active]:text-primary [&.active]:font-semibold"
                    )}
                  >
                    Trang chủ
                  </Link>
                  <Link 
                    to="/dashboard" 
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      "[&.active]:text-primary [&.active]:font-semibold"
                    )}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/live" 
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      "[&.active]:text-primary [&.active]:font-semibold"
                    )}
                  >
                    Live Processing
                  </Link>
                  <Link 
                    to="/sessions" 
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      "[&.active]:text-primary [&.active]:font-semibold"
                    )}
                  >
                    Sessions
                  </Link>
                </nav>

                {/* User actions */}
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/login"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Đăng nhập
                  </Link>
                </div>
              </div>
            </header>

            {/* Main content với suspense cho lazy loading */}
            <main className="flex-1">
              <Suspense fallback={<GlobalLoadingSpinner />}>
                <Outlet />
              </Suspense>
            </main>

            {/* Footer */}
            <footer className="border-t border-border bg-gray-50 py-6">
              <div className="container mx-auto px-4 text-center text-sm text-gray-600">
                <p>© 2025 VN Speech Guardian. Bảo vệ nội dung tiếng Việt với AI.</p>
              </div>
            </footer>
          </div>

          {/* DevTools chỉ hiện trong development */}
          {import.meta.env.DEV && <TanStackRouterDevtools />}
        </ErrorBoundary>
  )
}

// Export route definition với type safety
export const Route = createRootRoute({
  component: RootLayout,
  // Global error handling cho toàn bộ app
  errorComponent: RouterErrorFallback,
  // Global loading state
  pendingComponent: GlobalLoadingSpinner,
})