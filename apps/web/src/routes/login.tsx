/**
 * Trang đăng nhập cho VN Speech Guardian
 * - Tích hợp với Clerk Authentication
 * - Custom styling phù hợp với design system
 * - Responsive layout với gradient background
 * - Redirect handling sau khi đăng nhập thành công
 */

import { createFileRoute, Navigate, useRouter } from '@tanstack/react-router'
import { SignIn, useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { Shield, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

// Login page component
function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  // Redirect nếu đã đăng nhập
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Redirect to dashboard sau khi đăng nhập
      router.navigate({ to: '/dashboard' })
    }
  }, [isLoaded, isSignedIn, router])

  // Hiển thị loading khi chưa load xong auth state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-600">Đang kiểm tra trạng thái đăng nhập...</p>
        </div>
      </div>
    )
  }

  // Redirect nếu đã đăng nhập (fallback cho useEffect)
  if (isSignedIn) {
    return <Navigate to="/dashboard" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home button */}
        <div className="mb-8">
          <Link 
            to="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Đăng nhập
          </h1>
          <p className="text-gray-600">
            Truy cập vào VN Speech Guardian
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <SignIn 
            routing="path"
            path="/login"
            redirectUrl="/dashboard"
            signUpUrl="/login" // Sử dụng cùng 1 trang cho sign in/up
            appearance={{
              elements: {
                // Remove default styling
                card: 'shadow-none border-0 bg-transparent',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                
                // Form styling
                formButtonPrimary: 'bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl',
                
                // Input styling
                formFieldInput: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white',
                formFieldLabel: 'text-sm font-medium text-gray-700 mb-2',
                
                // Link styling
                formFieldAction: 'text-primary hover:text-primary/80 font-medium',
                footerActionLink: 'text-primary hover:text-primary/80 font-medium',
                
                // Social buttons
                socialButtonsBlockButton: 'w-full border border-gray-300 hover:bg-gray-50 rounded-lg py-3 px-4 font-medium transition-colors',
                socialButtonsBlockButtonText: 'text-gray-700',
                
                // Divider
                dividerLine: 'bg-gray-300',
                dividerText: 'text-gray-500 text-sm',
                
                // Error messages
                formFieldErrorText: 'text-red-600 text-sm mt-1',
                
                // Loading state
                spinner: 'text-primary',
              },
              variables: {
                colorPrimary: '#3B82F6',
                colorBackground: '#FFFFFF',
                colorInputBackground: '#FFFFFF',
                colorText: '#1F2937',
                colorTextSecondary: '#6B7280',
                colorDanger: '#EF4444',
                fontFamily: 'Inter, system-ui, sans-serif',
                borderRadius: '0.5rem',
              },
            }}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p className="mb-2">
            Bằng cách đăng nhập, bạn đồng ý với{' '}
            <a href="#" className="text-primary hover:text-primary/80 font-medium">
              Điều khoản sử dụng
            </a>{' '}
            và{' '}
            <a href="#" className="text-primary hover:text-primary/80 font-medium">
              Chính sách bảo mật
            </a>
          </p>
          <p>
            Secured with{' '}
            <span className="font-semibold text-gray-700">Clerk Authentication</span>
          </p>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-64 h-64 rounded-full bg-gradient-to-br from-primary/10 to-indigo-200/50 blur-3xl"></div>
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-200/50 to-primary/10 blur-3xl"></div>
      </div>
    </div>
  )
}

// Export route definition
export const Route = createFileRoute('/login')({
  component: LoginPage,
})