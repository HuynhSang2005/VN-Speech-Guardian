/**
 * TanStack Router setup - Router instance configuration
 * Mục đích: Khởi tạo router với type-safe routing và error handling
 * Tích hợp: Clerk auth, React Query, error boundaries
 */

import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// Create router instance với configuration
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // Error handling configuration
  defaultErrorComponent: ({ error }: { error?: Error }) => (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        Có lỗi xảy ra
      </h3>
      <p className="text-red-700 mb-4">
        {error?.message || 'Lỗi không xác định. Vui lòng thử lại.'}
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Tải lại trang
      </button>
    </div>
  ),
  // Loading component configuration
  defaultPendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
  // Not found configuration
  defaultNotFoundComponent: () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-lg text-gray-600 mb-6">Trang không tìm thấy</p>
      <a 
        href="/"
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
      >
        Về trang chủ
      </a>
    </div>
  ),
})

// Declare router for TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}