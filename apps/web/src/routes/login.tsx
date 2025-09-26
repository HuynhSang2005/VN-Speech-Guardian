/**
 * Login page cho VN Speech Guardian
 * - Route: /login (public route, không cần authentication)
 * - Sử dụng @clerk/tanstack-react-start chuẩn  
 * - Clean UI với beautiful design
 * - Auto redirect khi đã authenticated
 */

import { createFileRoute, Navigate, Link } from '@tanstack/react-router'
import { SignIn, useAuth } from '@clerk/tanstack-react-start'
import { Shield, ArrowLeft, CheckCircle2 } from 'lucide-react'

// Login page component
function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth()

  // Loading state khi auth chưa sẵn sàng
  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  // Redirect về dashboard nếu đã đăng nhập
  if (isSignedIn) {
    return <Navigate to="/dashboard" />
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl sm:left-[15%] sm:translate-x-0 sm:h-80 sm:w-80 lg:h-[26rem] lg:w-[26rem]"></div>
        <div className="absolute -bottom-40 right-[-15%] h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl sm:h-96 sm:w-96 lg:h-[28rem] lg:w-[28rem]"></div>
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-blue-300/20 blur-2xl sm:blur-3xl"></div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        {/* Top navigation */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-white/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600 shadow-sm">
            AI Realtime Trust & Safety
          </span>
        </div>

  <div className="mt-10 grid flex-1 grid-cols-1 items-center gap-12 pb-12 lg:mt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,1fr)] lg:gap-16 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,1fr)]">
          {/* Left hero content */}
          <div className="w-full max-w-xl space-y-8 text-center lg:max-w-3xl lg:text-left">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                <Shield className="h-4 w-4" />
              </span>
              VN Speech Guardian Platform
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                Kiểm soát hội thoại tiếng Việt
                <span className="block text-blue-600">ngay khi chúng diễn ra</span>
              </h1>
              <p className="text-base text-gray-600 sm:text-lg lg:text-xl">
                Tích hợp Whisper streaming và PhoBERT kiểm duyệt, giúp đội ngũ của bạn phát hiện từ xấu, theo dõi transcript, và phản ứng trong tích tắc.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/80 p-4 text-left shadow-sm backdrop-blur">
                <div className="text-2xl font-semibold text-gray-900">&lt; 1.5s</div>
                <p className="mt-1 text-sm text-gray-500">Độ trễ trung bình cho bản dịch và cảnh báo cuối.</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-4 text-left shadow-sm backdrop-blur">
                <div className="text-2xl font-semibold text-gray-900">99.2%</div>
                <p className="mt-1 text-sm text-gray-500">Độ chính xác kiểm duyệt với mô hình PhoBERT fine-tune.</p>
              </div>
            </div>

            <ul className="space-y-3 text-left text-sm text-gray-600 sm:text-base">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-blue-500" />
                <span>Streaming PCM 16kHz với giao thức tối ưu, hỗ trợ 3 phiên song song.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-blue-500" />
                <span>Hệ thống cảnh báo trạng thái với hysteresis chống nhấp nháy.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-blue-500" />
                <span>Dashboard realtime và báo cáo vi phạm cho đội Trust & Safety.</span>
              </li>
            </ul>
          </div>

          {/* Right sign-in card */}
          <div className="relative w-full lg:h-full lg:max-w-none">
            <div className="relative isolate grid w-full gap-6 overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_20px_45px_-20px_rgba(37,99,235,0.45)] backdrop-blur-xl lg:h-full lg:p-10">
              <div className="absolute -inset-px -z-10 rounded-[26px] bg-gradient-to-br from-blue-100/80 via-white/60 to-indigo-100/70 opacity-90 blur-xl"></div>
              <div className="mb-2 space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Đăng nhập hệ thống</h2>
              <p className="text-sm text-gray-500 sm:text-base">
                Sử dụng email doanh nghiệp hoặc tài khoản do quản trị cấp.
              </p>
            </div>

            <SignIn
              routing="path"
              path="/login"
              fallbackRedirectUrl="/dashboard"
              signUpUrl="/login"
              appearance={{
                variables: {
                  colorBackground: 'transparent',
                  colorPrimary: '#2563eb',
                  colorText: '#1f2937',
                  colorTextSecondary: '#4b5563',
                  fontSize: '15px',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  borderRadius: '16px',
                  spacingUnit: '12px',
                },
                layout: {
                  logoPlacement: 'none',
                  socialButtonsPlacement: 'bottom',
                  showOptionalFields: true,
                    helpPageUrl: '',
                    privacyPageUrl: '',
                    termsPageUrl: '',
                },
                elements: {
                    rootBox: 'w-full flex flex-col gap-6',
                    card: 'w-full bg-transparent shadow-none border-0 p-0',
                  header: 'hidden',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl h-11 transition-colors font-medium',
                  socialButtonsProviderIcon__apple: 'text-gray-900',
                    form: 'mt-2 grid gap-4',
                    formField: 'space-y-2 text-left',
                    formFieldLabel: 'text-sm font-medium text-gray-700',
                    formFieldInput: 'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-offset-0',
                  formFieldError: 'text-sm text-red-500',
                  formFieldWarningText: 'text-xs text-yellow-500',
                    footer: 'mt-6 space-y-3 text-center',
                    formButtonPrimary: 'w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-200/60 focus:ring-2 focus:ring-offset-0 focus:ring-blue-300',
                  footerAction: 'text-sm text-gray-500',
                  footerActionLink: 'text-blue-600 hover:text-blue-700 font-semibold',
                  dividerLine: 'bg-gray-200',
                  dividerText: 'text-xs uppercase tracking-wide text-gray-400',
                  identityPreviewText: 'text-sm text-gray-600',
                },
              }}
            />

              <div className="rounded-2xl bg-blue-50/80 p-4 text-left text-sm text-blue-900">
                <p className="font-semibold">Được bảo vệ bởi VN Speech Guardian</p>
                <p className="mt-1 text-blue-800/80">
                  Toàn bộ phiên đăng nhập được mã hóa và kiểm soát bởi gateway NestJS + Clerk. Liên hệ quản trị để cấp quyền truy cập bổ sung.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/60 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} VN Speech Guardian · Bảo vệ hội thoại tiếng Việt bằng AI.
        </div>
      </div>
    </div>
  )
}

// Export route definition cho TanStack Router
export const Route = createFileRoute('/login')({
  component: LoginPage,
})