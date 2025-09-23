/**
 * Sessions list page - Danh sách lịch sử phiên làm việc
 * - Data table với filtering và sorting
 * - Pagination support
 * - Quick actions và bulk operations
 * - Search và date range filtering
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { 
  Search,
  Calendar,
  Filter,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Shield,
  Clock,
  User
} from 'lucide-react'
import type { Session, SessionsResponse } from '@/types/components'

// Mock data function
const fetchSessions = async (page: number = 1, limit: number = 10): Promise<SessionsResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const mockSessions: Session[] = [
    {
      id: 'session-001',
      userId: 'user-123',
      userName: 'Nguyễn Văn A',
      startTime: '2025-09-22T10:30:00Z',
      endTime: '2025-09-22T10:45:00Z',
      duration: 900,
      totalSegments: 15,
      detectionsCount: 3,
      highestSeverity: 'HATE',
      status: 'completed',
      processingTime: 150
    },
    {
      id: 'session-002',
      userId: 'user-456',
      userName: 'Trần Thị B',
      startTime: '2025-09-22T09:15:00Z', 
      endTime: '2025-09-22T09:30:00Z',
      duration: 900,
      totalSegments: 12,
      detectionsCount: 1,
      highestSeverity: 'OFFENSIVE',
      status: 'completed',
      processingTime: 125
    },
    {
      id: 'session-003',
      userId: 'user-789',
      userName: 'Lê Văn C',
      startTime: '2025-09-22T08:00:00Z',
      endTime: '2025-09-22T08:20:00Z',
      duration: 1200,
      totalSegments: 18,
      detectionsCount: 0,
      highestSeverity: 'CLEAN',
      status: 'completed',
      processingTime: 95
    }
  ]

  return {
    sessions: mockSessions,
    pagination: {
      page,
      limit,
      total: 147,
      totalPages: Math.ceil(147 / limit)
    }
  }
}

// Component cho session row
function SessionRow({ session }: { session: Session }) {
  const severityConfig = {
    CLEAN: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    OFFENSIVE: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
    HATE: { color: 'bg-red-100 text-red-800', icon: Shield }
  }

  const statusConfig = {
    completed: { color: 'bg-green-100 text-green-800', text: 'Hoàn thành' },
    processing: { color: 'bg-blue-100 text-blue-800', text: 'Đang xử lý' },
    failed: { color: 'bg-red-100 text-red-800', text: 'Thất bại' }
  }

  const severityInfo = severityConfig[session.highestSeverity]
  const statusInfo = statusConfig[session.status]
  const SeverityIcon = severityInfo.icon

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Session ID */}
      <td className="px-6 py-4 whitespace-nowrap">
        <Link 
          to="/sessions/$sessionId" 
          params={{ sessionId: session.id }}
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          {session.id}
        </Link>
      </td>

      {/* User */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
            <User className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{session.userName}</div>
            <div className="text-sm text-gray-500">{session.userId}</div>
          </div>
        </div>
      </td>

      {/* Start Time */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {new Date(session.startTime).toLocaleString('vi-VN')}
      </td>

      {/* Duration */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {Math.floor(session.duration / 60)}:{String(session.duration % 60).padStart(2, '0')}
      </td>

      {/* Segments */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {session.totalSegments}
      </td>

      {/* Detections */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-900">{session.detectionsCount}</span>
          {session.detectionsCount > 0 && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${severityInfo.color}`}>
              <SeverityIcon className="w-3 h-3 mr-1" />
              {session.highestSeverity}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </td>

      {/* Processing Time */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {session.processingTime}ms
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <Link
            to="/sessions/$sessionId"
            params={{ sessionId: session.id }}
            className="text-primary hover:text-primary/80 p-1"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button 
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Tải xuống"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            className="text-gray-400 hover:text-red-600 p-1"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-gray-600 p-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// Loading component
function SessionsLoading() {
  return (
    <div className="animate-pulse">
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex space-x-4 py-4">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-28"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main sessions page component
function SessionsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Fetch sessions data
  const { data, isLoading, error } = useQuery({
    queryKey: ['sessions', currentPage],
    queryFn: () => fetchSessions(currentPage, 10),
  })

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Lỗi khi tải danh sách sessions. Vui lòng thử lại.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="text-gray-600">Lịch sử phiên xử lý audio và kết quả phát hiện</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Filters và Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm session ID, user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary">
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày qua</option>
              <option value="month">30 ngày qua</option>
              <option value="custom">Tùy chọn</option>
            </select>
          </div>

          {/* Status Filter */}
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="completed">Hoàn thành</option>
            <option value="processing">Đang xử lý</option>
            <option value="failed">Thất bại</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Start Time</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Segments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detections
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processing
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4">
                    <SessionsLoading />
                  </td>
                </tr>
              ) : data?.sessions && data.sessions.length > 0 ? (
                data.sessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Chưa có sessions</p>
                      <p className="text-sm">Bắt đầu xử lý audio để xem lịch sử ở đây</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, data.pagination.totalPages))}
                disabled={currentPage === data.pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * 10, data.pagination.total)}</span> of{' '}
                  <span className="font-medium">{data.pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {[...Array(data.pagination.totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-primary border-primary text-white'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export route definition
export const Route = createFileRoute('/_authenticated/sessions/')({
  component: SessionsPage,
})