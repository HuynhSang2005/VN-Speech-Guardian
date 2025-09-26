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
  Filter,
  Eye,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Shield,
  User,
  
} from 'lucide-react'
import type { Session, SessionsResponse } from '@/types/components'
import type { SessionDto } from '@/services/generated-api-client'
import { apiClient } from '@/services/generated-api-client'
// import { SessionCard } from '@/components/ui/enhanced-card'
import { FilterControls, DataTable } from '@/components/ui/enhanced-dashboard'

// Transform backend SessionDto to frontend Session type
const transformSession = (session: SessionDto): Session => {
  const startTime = new Date(session.startedAt)
  // Handle the complex endedAt type - could be string, object, or null
  let endTimeString: string | null = null
  if (session.endedAt && typeof session.endedAt === 'string') {
    endTimeString = session.endedAt
  } else if (session.endedAt && typeof session.endedAt === 'object' && 'toString' in session.endedAt) {
    endTimeString = String(session.endedAt)
  }
  
  const endTime = endTimeString ? new Date(endTimeString) : null
  const duration = endTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : 0

  return {
    id: session.id,
    userId: session.userId,
    userName: 'Người dùng', // This will be populated later when user data is joined
    startTime: session.startedAt,
    endTime: endTimeString,
    duration,
    totalSegments: 0, // Will be populated from transcripts count
    detectionsCount: 0, // Will be populated from detections count  
    highestSeverity: 'CLEAN', // Will be calculated from detections
    status: endTime ? 'completed' : 'processing',
    processingTime: 125 // Default value for now
  }
}

// Real API call function
const fetchSessions = async (page: number = 1, limit: number = 10): Promise<SessionsResponse> => {
  try {
    const response = await apiClient.sessions.list({
      page: page.toString(),
      perPage: limit.toString()
    })
    
    const sessions = response.data.items.map(transformSession)
    
    return {
      sessions,
      pagination: {
        page,
        limit,
        total: response.data.total,
        totalPages: Math.ceil(response.data.total / limit)
      }
    }
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    
    // Fallback to mock data if API fails
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
        highestSeverity: 'HATE' as const,
        status: 'completed' as const,
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
        highestSeverity: 'OFFENSIVE' as const,
        status: 'completed' as const,
        processingTime: 125
      }
    ]

    return {
      sessions: mockSessions,
      pagination: {
        page,
        limit,
        total: 2,
        totalPages: 1
      }
    }
  }
}

// Helper function for session status formatting
const formatSessionStatus = (status: Session['status']) => {
  const config = {
    completed: { color: 'bg-green-100 text-green-800', text: 'Hoàn thành' },
    processing: { color: 'bg-blue-100 text-blue-800', text: 'Đang xử lý' },
    failed: { color: 'bg-red-100 text-red-800', text: 'Thất bại' }
  } as const;
  
  return config[status] || { color: 'bg-gray-100 text-gray-800', text: status };
}

// Unused components removed for P28 build - SessionRow and SessionsLoading functions

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

      {/* Enhanced P29 Filter Controls */}
      <FilterControls
        filters={[
          {
            key: 'search',
            label: 'Tìm kiếm',
            type: 'text',
            placeholder: 'Tìm kiếm session ID, user...'
          },
          {
            key: 'dateRange',
            label: 'Khoảng thời gian',
            type: 'dateRange',
            placeholder: 'Chọn thời gian'
          },
          {
            key: 'status',
            label: 'Trạng thái',
            type: 'select',
            options: [
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'completed', label: 'Hoàn thành' },
              { value: 'processing', label: 'Đang xử lý' },
              { value: 'failed', label: 'Thất bại' }
            ],
            placeholder: 'Chọn trạng thái'
          },
          {
            key: 'severity',
            label: 'Độ nghiêm trọng',
            type: 'select',
            options: [
              { value: 'all', label: 'Tất cả mức độ' },
              { value: 'CLEAN', label: 'An toàn' },
              { value: 'OFFENSIVE', label: 'Cảnh báo' },
              { value: 'HATE', label: 'Nguy hiểm' }
            ],
            placeholder: 'Chọn mức độ'
          }
        ]}
        values={{
          search: searchTerm,
          dateRange: { from: '', to: '' },
          status: selectedStatus,
          severity: 'all'
        }}
        onValuesChange={(newValues) => {
          if (typeof newValues.search === 'string') {
            setSearchTerm(newValues.search);
          }
          if (typeof newValues.status === 'string') {
            setSelectedStatus(newValues.status);
          }
          // Handle other filter changes
          console.log('Session filters changed:', newValues);
        }}
        onReset={() => {
          setSearchTerm('');
          setSelectedStatus('all');
          console.log('Session filters reset');
        }}
        className="mb-6"
      />

      {/* Enhanced P29 Sessions DataTable */}
      <DataTable
        columns={[
          {
            key: 'id',
            label: 'Session ID',
            sortable: true,
            width: '140px',
            render: (value) => (
              <Link 
                to="/sessions/$sessionId" 
                params={{ sessionId: value }}
                className="text-sm font-medium text-primary hover:text-primary/80 font-mono"
              >
                {value.substring(0, 12)}...
              </Link>
            )
          },
          {
            key: 'userName',
            label: 'User',
            sortable: true,
            render: (value, row) => (
              <div className="flex items-center">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mr-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">{value}</div>
                  <div className="text-xs text-muted-foreground">{row.userId.substring(0, 8)}...</div>
                </div>
              </div>
            )
          },
          {
            key: 'startTime',
            label: 'Thời gian bắt đầu',
            sortable: true,
            width: '160px',
            render: (value) => (
              <div className="text-sm">
                <div>{new Date(value).toLocaleDateString('vi-VN')}</div>
                <div className="text-xs text-muted-foreground">{new Date(value).toLocaleTimeString('vi-VN')}</div>
              </div>
            )
          },
          {
            key: 'duration',
            label: 'Thời lượng',
            sortable: true,
            align: 'center' as const,
            width: '100px',
            render: (value) => (
              <span className="text-sm font-mono">
                {Math.floor(value / 60)}:{String(value % 60).padStart(2, '0')}
              </span>
            )
          },
          {
            key: 'detectionsCount',
            label: 'Phát hiện',
            sortable: true,
            align: 'center' as const,
            width: '100px',
            render: (value, row) => (
              <div className="flex items-center justify-center space-x-2">
                <span className="text-sm font-medium">{value}</span>
                {value > 0 && (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    row.highestSeverity === 'CLEAN' ? 'bg-green-100 text-green-800' :
                    row.highestSeverity === 'OFFENSIVE' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {row.highestSeverity === 'CLEAN' && <CheckCircle className="w-3 h-3" />}
                    {row.highestSeverity === 'OFFENSIVE' && <AlertTriangle className="w-3 h-3" />}
                    {row.highestSeverity === 'HATE' && <Shield className="w-3 h-3" />}
                    {row.highestSeverity}
                  </span>
                )}
              </div>
            )
          },
          {
            key: 'status',
            label: 'Trạng thái',
            sortable: true,
            align: 'center' as const,
            width: '120px',
            render: (value: Session['status']) => {
              const config = formatSessionStatus(value);
              return (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                  {config.text}
                </span>
              );
            }
          },
          {
            key: 'processingTime',
            label: 'Xử lý',
            sortable: true,
            align: 'center' as const,
            width: '80px',
            render: (value) => (
              <span className="text-sm text-muted-foreground">{value}ms</span>
            )
          }
        ]}
        data={data?.sessions || []}
        loading={isLoading}
        error={error ? 'Lỗi khi tải danh sách sessions. Vui lòng thử lại.' : ''}
        pagination={{
          page: currentPage,
          pageSize: 10,
          total: data?.pagination?.total || 0,
          onPageChange: setCurrentPage
        }}
        actions={[
          {
            label: 'Xem chi tiết',
            icon: <Eye className="w-4 h-4" />,
            onClick: (row) => {
              // Navigate to session detail
              console.log('View session:', row.id);
            },
            variant: 'default' as const
          },
          {
            label: 'Tải xuống',
            icon: <Download className="w-4 h-4" />,
            onClick: (row) => {
              console.log('Download session:', row.id);
            },
            variant: 'default' as const
          },
          {
            label: 'Xóa',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: (row) => {
              console.log('Delete session:', row.id);
            },
            variant: 'destructive' as const
          }
        ]}
        onRowClick={(row) => {
          console.log('Session row clicked:', row.id);
        }}
        className="bg-white"
      />
    </div>
  )
}

// Export route definition
export const Route = createFileRoute('/_authenticated/sessions/')({
  component: SessionsPage,
})