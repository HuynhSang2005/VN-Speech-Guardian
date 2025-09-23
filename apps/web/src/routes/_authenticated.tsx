/**
 * Layout cho authenticated routes - bảo vệ bởi auth guards
 * - Kiểm tra authentication status
 * - Sidebar navigation cho dashboard/admin features  
 * - Loading states và error handling
 * - Auto-redirect to login nếu chưa authenticate
 */

import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuth, UserButton } from '@clerk/clerk-react'
import { Suspense, useEffect, useState } from 'react'
import { 
  BarChart3, 
  Mic, 
  FolderOpen, 
  Settings, 
  Menu, 
  X,
  Home
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '../lib/utils'

// Navigation menu items
const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Analytics và tổng quan'
  },
  {
    name: 'Live Processing',
    href: '/live', 
    icon: Mic,
    description: 'Xử lý audio real-time'
  },
  {
    name: 'Sessions',
    href: '/sessions',
    icon: FolderOpen, 
    description: 'Lịch sử phiên làm việc'
  },
]

// Loading component cho authenticated content
function AuthenticatedLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-gray-600">Đang tải nội dung...</p>
      </div>
    </div>
  )
}

// Sidebar component
function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link 
            to="/"
            className="text-lg font-bold text-gray-900 hover:text-primary transition-colors"
          >
            🛡️ VN Speech Guardian
          </Link>
          <button 
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {/* Quick Actions */}
          <div className="mb-8">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Actions
            </p>
            <div className="mt-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    "text-gray-700 hover:text-primary hover:bg-primary/5",
                    "[&.active]:bg-primary [&.active]:text-white [&.active]:shadow-md"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-70">{item.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Other Actions */}
          <div>
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              General
            </p>
            <div className="mt-3 space-y-1">
              <Link
                to="/"
                onClick={() => onClose()}
                className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <Home className="mr-3 h-5 w-5 flex-shrink-0" />
                Về trang chủ
              </Link>
              
              <button
                onClick={() => {
                  onClose()
                  // TODO: Implement settings modal
                }}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
                Cài đặt
              </button>
            </div>
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10"
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Authenticated User
              </p>
              <p className="text-xs text-gray-500">
                VN Speech Guardian
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Main authenticated layout component
function AuthenticatedLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Redirect to login nếu chưa đăng nhập
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: '/login' })
    }
  }, [isLoaded, isSignedIn, navigate])

  // Show loading khi chưa load xong auth state
  if (!isLoaded) {
    return <AuthenticatedLoadingSpinner />
  }

  // Redirect nếu chưa đăng nhập (fallback cho useEffect)
  if (!isSignedIn) {
    return <AuthenticatedLoadingSpinner />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                VN Speech Guardian
              </h1>
              <p className="text-sm text-gray-500">
                Bảo vệ nội dung tiếng Việt với AI
              </p>
            </div>
          </div>

          {/* User actions - desktop */}
          <div className="hidden lg:flex items-center space-x-4">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<AuthenticatedLoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

// Route definition với beforeLoad hook để check authentication
export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
  
  // Auth guard - chạy trước khi load component
  beforeLoad: async () => {
    // Note: Clerk's auth state sẽ được check trong component
    // Ở đây có thể add thêm logic như role-based access control
    
    // Có thể check additional permissions ở đây
    // if (!hasPermission()) {
    //   throw redirect({ to: '/unauthorized' })
    // }
  },
  
  // Loading component cho toàn bộ authenticated section
  pendingComponent: AuthenticatedLoadingSpinner,
  
  // Error component cho authenticated routes
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Lỗi xác thực
        </h1>
        <p className="text-gray-600 mb-6">
          Có lỗi xảy ra khi truy cập khu vực được bảo vệ.
        </p>
        <details className="text-sm bg-gray-100 p-3 rounded mt-2 text-left">
          <summary className="font-semibold cursor-pointer">Chi tiết lỗi</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">
            {error.message}
          </pre>
        </details>
        <div className="mt-6 space-x-4">
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Đăng nhập lại
          </Link>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  ),
})