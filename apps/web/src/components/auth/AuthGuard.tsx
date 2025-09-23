/**
 * Authentication Guards cho protected routes
 * Tích hợp: TanStack Router, Clerk auth, loading states, error handling
 * Features: Automatic redirects, loading spinners, error boundaries
 */

import { useAuth, useUser } from '@clerk/clerk-react'
import { Navigate, useLocation } from '@tanstack/react-router'
import { type ReactNode, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

/**
 * Main Authentication Guard Component
 * Protects routes that require authentication
 */
export function AuthGuard({ 
  children, 
  fallback,
  requireAuth = true,
  redirectTo = '/login'
}: AuthGuardProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()
  
  // Store current path for redirect after login
  useEffect(() => {
    if (!isSignedIn && requireAuth) {
      sessionStorage.setItem('redirectAfterAuth', location.pathname + location.search)
    }
  }, [isSignedIn, requireAuth, location])
  
  // Loading state
  if (!isLoaded) {
    return fallback || <AuthLoadingScreen />
  }
  
  // Redirect to login if authentication required but user not signed in
  if (requireAuth && !isSignedIn) {
    const redirectPath = `${redirectTo}?redirect=${encodeURIComponent(location.pathname + location.search)}`
    return <Navigate to={redirectPath} replace />
  }
  
  // Redirect to dashboard if user signed in but on auth pages
  if (!requireAuth && isSignedIn) {
    const redirectPath = sessionStorage.getItem('redirectAfterAuth') || '/dashboard'
    sessionStorage.removeItem('redirectAfterAuth')
    return <Navigate to={redirectPath} replace />
  }
  
  return (
    <ErrorBoundary
      FallbackComponent={AuthErrorFallback}
      onError={(error) => {
        console.error('[AuthGuard] Error:', error)
        // TODO: Send to monitoring service in production
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Protected Route Guard
 * Wrapper cho components that require authentication
 */
export function ProtectedRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

/**
 * Public Route Guard
 * Wrapper cho components that should redirect if user is signed in (login/signup pages)
 */
export function PublicRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AuthGuard requireAuth={false} fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

/**
 * Role-based Route Guard
 * Protects routes based on user roles
 */
interface RoleGuardProps {
  children: ReactNode
  roles: string[]
  fallback?: ReactNode
}

export function RoleGuard({ children, roles, fallback }: RoleGuardProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  
  if (!isLoaded) {
    return fallback || <AuthLoadingScreen />
  }
  
  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }
  
  // Check if user has required roles
  const userRoles = (user?.publicMetadata?.roles as string[]) || []
  const hasRequiredRole = roles.some(role => userRoles.includes(role))
  
  if (!hasRequiredRole) {
    return fallback || <UnauthorizedScreen requiredRoles={roles} />
  }
  
  return <>{children}</>
}

/**
 * Loading Screen Component
 * Hiển thị khi đang check authentication status
 */
function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto h-16 w-16 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white text-2xl font-bold">VN</span>
        </div>
        <LoadingSpinner size="lg" />
        <p className="text-textSecondary">Đang kiểm tra thông tin đăng nhập...</p>
      </div>
    </div>
  )
}

/**
 * Unauthorized Screen Component  
 * Hiển thị khi user không có quyền truy cập
 */
function UnauthorizedScreen({ requiredRoles }: { requiredRoles: string[] }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto h-16 w-16 bg-danger rounded-lg flex items-center justify-center">
          <span className="text-white text-2xl">🚫</span>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-textPrimary mb-2">
            Không có quyền truy cập
          </h1>
          <p className="text-textSecondary mb-4">
            Bạn cần quyền {requiredRoles.join(', ')} để truy cập trang này.
          </p>
          <p className="text-sm text-textMuted">
            Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
        
        <div className="space-x-4">
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-textSecondary hover:bg-background transition-colors"
          >
            Quay lại
          </button>
          <a 
            href="/dashboard"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors inline-block"
          >
            Về trang chủ
          </a>
        </div>
      </div>
    </div>
  )
}

/**
 * Auth Error Fallback Component
 * Hiển thị khi có lỗi trong authentication flow
 */
function AuthErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void 
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto h-16 w-16 bg-warning rounded-lg flex items-center justify-center">
          <span className="text-white text-2xl">⚠️</span>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-textPrimary mb-2">
            Lỗi xác thực
          </h1>
          <p className="text-textSecondary mb-4">
            Đã xảy ra lỗi khi kiểm tra thông tin đăng nhập.
          </p>
          <details className="text-sm text-textMuted bg-surface border border-border rounded-lg p-4">
            <summary className="cursor-pointer hover:text-textSecondary">
              Chi tiết lỗi
            </summary>
            <pre className="mt-2 text-left overflow-auto">
              {error.message}
            </pre>
          </details>
        </div>
        
        <div className="space-x-4">
          <button 
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Thử lại
          </button>
          <a 
            href="/sign-in"
            className="px-4 py-2 bg-surface border border-border rounded-lg text-textSecondary hover:bg-background transition-colors inline-block"
          >
            Đăng nhập lại
          </a>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook để check authentication trong components
 * Simplified version cho logic conditional rendering
 */
export function useRequireAuth() {
  const { isLoaded, isSignedIn } = useAuth()
  
  return {
    isAuthenticated: isSignedIn,
    isLoading: !isLoaded,
    requiresRedirect: isLoaded && !isSignedIn,
  }
}