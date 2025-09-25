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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/enhanced-card'
import { EnhancedButton } from '@/components/ui/enhanced-button'

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

// Enhanced P29 Loading component cho authenticated content
function AuthenticatedLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="p-8 max-w-sm mx-auto text-center">
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            {/* Enhanced loading animation */}
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-border border-t-primary"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-primary/30 animate-pulse"></div>
            </div>
            
            {/* Loading text with brand colors */}
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                Đang tải nội dung...
              </p>
              <p className="text-sm text-muted-foreground">
                VN Speech Guardian đang khởi động
              </p>
            </div>
            
            {/* Progress dots animation */}
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1s'
                  }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
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

      {/* Enhanced P29 Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link 
            to="/"
            className="text-lg font-bold text-foreground hover:text-primary transition-colors"
          >
            🛡️ VN Speech Guardian
          </Link>
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </EnhancedButton>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-6">
          {/* Quick Actions Card */}
          <Card variant="ghost" className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle size="sm" className="text-muted-foreground font-medium uppercase tracking-wider">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                    "text-muted-foreground hover:text-foreground hover:bg-primary/10",
                    "[&.active]:bg-primary [&.active]:text-primary-foreground [&.active]:shadow-md"
                  )}
                >
                  <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-md bg-primary/10 text-primary group-[.active]:bg-primary-foreground/20">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-70 mt-0.5">{item.description}</div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* General Actions Card */}
          <Card variant="ghost" className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle size="sm" className="text-muted-foreground font-medium uppercase tracking-wider">
                General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Link
                to="/"
                onClick={() => onClose()}
                className="group flex items-center px-3 py-3 text-sm font-medium text-muted-foreground rounded-lg hover:text-foreground hover:bg-primary/10 transition-all duration-200"
              >
                <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-md bg-primary/10 text-primary">
                  <Home className="h-4 w-4" />
                </div>
                <span>Về trang chủ</span>
              </Link>
              
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose()
                  // TODO: Implement settings modal
                }}
                className="w-full justify-start px-3 py-3 h-auto text-muted-foreground hover:text-foreground hover:bg-primary/10"
              >
                <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-md bg-primary/10 text-primary">
                  <Settings className="h-4 w-4" />
                </div>
                <span>Cài đặt</span>
              </EnhancedButton>
            </CardContent>
          </Card>
        </nav>

        {/* Enhanced User Section */}
        <Card className="m-4 mt-auto border-t-0 rounded-t-none">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10"
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  Authenticated User
                </p>
                <p className="text-xs text-muted-foreground">
                  VN Speech Guardian
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced P29 Top Bar */}
        <Card className="rounded-none border-x-0 border-t-0 shadow-sm">
          <CardContent className="px-4 py-3 lg:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                >
                  <Menu className="w-6 h-6" />
                </EnhancedButton>
                
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    VN Speech Guardian
                  </h1>
                  <p className="text-sm text-muted-foreground">
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
          </CardContent>
        </Card>

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