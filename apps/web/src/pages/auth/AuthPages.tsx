/**
 * Authentication pages với VN Speech Guardian branding
 * Responsive design, custom styling, error handling
 * Tích hợp: Clerk components, TanStack Router, VN themes
 */

import { SignIn, SignUp } from '@clerk/clerk-react'
import { signInAppearance, signUpAppearance } from '../../lib/clerk-appearance'

/**
 * Sign In Page Component
 * Responsive centered design với VN branding
 */
export function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header với VN Speech Guardian branding */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-lg flex items-center justify-center mb-6">
            {/* TODO: Replace with actual logo */}
            <span className="text-white text-2xl font-bold">VN</span>
          </div>
          <h1 className="text-3xl font-bold text-textPrimary">
            Chào mừng trở lại
          </h1>
          <p className="mt-2 text-textSecondary">
            Đăng nhập để tiếp tục với VN Speech Guardian
          </p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="mt-8">
          <SignIn 
            appearance={signInAppearance}
            redirectUrl="/dashboard"
            signUpUrl="/sign-up"
            routing="path"
            path="/sign-in"
          />
        </div>

        {/* Footer information */}
        <div className="text-center">
          <p className="text-sm text-textSecondary">
            Hệ thống nhận diện nội dung có hại trong tiếng Việt
          </p>
          <div className="mt-4 flex justify-center space-x-4 text-xs text-textMuted">
            <a href="/privacy" className="hover:text-primary transition-colors">
              Chính sách bảo mật
            </a>
            <a href="/terms" className="hover:text-primary transition-colors">
              Điều khoản sử dụng
            </a>
            <a href="/help" className="hover:text-primary transition-colors">
              Trợ giúp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Sign Up Page Component  
 * Similar design với additional onboarding context
 */
export function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header với welcome messaging */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-lg flex items-center justify-center mb-6">
            {/* TODO: Replace with actual logo */}
            <span className="text-white text-2xl font-bold">VN</span>
          </div>
          <h1 className="text-3xl font-bold text-textPrimary">
            Tạo tài khoản mới
          </h1>
          <p className="mt-2 text-textSecondary">
            Tham gia VN Speech Guardian để bảo vệ nội dung tiếng Việt
          </p>
        </div>

        {/* Features overview */}
        <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-textPrimary">
            Tính năng chính:
          </h3>
          <ul className="space-y-2 text-sm text-textSecondary">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
              Nhận diện nội dung có hại real-time
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
              Chuyển đổi giọng nói thành văn bản
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
              Dashboard thống kê chi tiết
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
              Hỗ trợ tiếng Việt tối ưu
            </li>
          </ul>
        </div>

        {/* Clerk Sign Up Component */}
        <div className="mt-8">
          <SignUp 
            appearance={signUpAppearance}
            redirectUrl="/dashboard"
            signInUrl="/sign-in"
            routing="path"
            path="/sign-up"
          />
        </div>

        {/* Footer information */}
        <div className="text-center">
          <p className="text-sm text-textSecondary">
            Bằng việc tạo tài khoản, bạn đồng ý với các điều khoản của chúng tôi
          </p>
          <div className="mt-4 flex justify-center space-x-4 text-xs text-textMuted">
            <a href="/privacy" className="hover:text-primary transition-colors">
              Chính sách bảo mật
            </a>
            <a href="/terms" className="hover:text-primary transition-colors">
              Điều khoản sử dụng
            </a>
            <a href="/help" className="hover:text-primary transition-colors">
              Trợ giúp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}