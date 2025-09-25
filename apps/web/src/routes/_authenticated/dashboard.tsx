/**
 * Dashboard page - Analytics và tổng quan hệ thống
 * - Metric cards với trend indicators
 * - Charts và visualizations  
 * - Recent activity table
 * - Real-time statistics
 */

import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Clock
} from 'lucide-react'
import type { DashboardStats, RecentActivity } from '@/types/components'
import { AnalyticsChart, FilterControls, DataTable } from '@/components/ui/enhanced-dashboard'
import { MetricCard } from '@/components/ui/enhanced-card'

// Mock data function - sẽ thay bằng API call thực tế
const fetchDashboardData = async (): Promise<DashboardStats> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    totalSessions: 1247,
    totalDetections: 89,
    accuracyRate: 99.2,
    averageProcessingTime: 125,
    trends: {
      sessions: 12.5,
      detections: -8.3,
      accuracy: 0.8,
      processingTime: -15.2
    }
  }
}

const fetchRecentActivity = async (): Promise<RecentActivity[]> => {
  await new Promise(resolve => setTimeout(resolve, 800))
  
  return [
    {
      id: '1',
      type: 'detection',
      severity: 'HATE',
      content: 'Phát hiện nội dung độc hại trong phiên audio',
      timestamp: '2025-09-22T10:30:00Z',
      sessionId: 'session-123'
    },
    {
      id: '2', 
      type: 'session',
      severity: 'CLEAN',
      content: 'Phiên xử lý audio mới được tạo',
      timestamp: '2025-09-22T10:25:00Z',
      sessionId: 'session-124'
    },
    {
      id: '3',
      type: 'detection', 
      severity: 'OFFENSIVE',
      content: 'Nội dung có thể gây tranh cãi được phát hiện',
      timestamp: '2025-09-22T10:20:00Z',
      sessionId: 'session-122'
    }
  ]
}

// Enhanced P29 MetricCard wrapper for dashboard compatibility
function DashboardMetricCard({ 
  title, 
  value, 
  unit, 
  trend, 
  icon,
  color = 'blue'
}: {
  title: string
  value: string | number
  unit?: string
  trend?: number
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'red' | 'yellow'
}) {
  // Map old color system to new status system
  const statusMap = {
    'blue': 'default' as const,
    'green': 'success' as const,
    'red': 'danger' as const,
    'yellow': 'warning' as const
  }

  // Format trend data for P29 MetricCard
  const trendData = trend !== undefined ? {
    value: Math.abs(trend),
    period: '30d',
    direction: trend > 0 ? 'up' as const : (trend < 0 ? 'down' as const : 'neutral' as const)
  } : undefined

  // Format value with unit
  const displayValue = typeof value === 'string' ? value : (unit ? `${value}${unit}` : value)

  return (
    <MetricCard
      title={title}
      value={displayValue}
      {...(trendData && { trend: trendData })}
      icon={icon}
      status={statusMap[color]}
      className="transition-all duration-200 hover:shadow-lg"
    />
  )
}

// Dashboard activity severity formatter
const formatActivitySeverity = (severity: RecentActivity['severity']) => {
  const config = {
    CLEAN: { color: 'bg-green-100 text-green-800', label: 'An toàn', icon: <CheckCircle className="w-3 h-3" /> },
    OFFENSIVE: { color: 'bg-yellow-100 text-yellow-800', label: 'Cảnh báo', icon: <AlertTriangle className="w-3 h-3" /> },
    HATE: { color: 'bg-red-100 text-red-800', label: 'Nguy hiểm', icon: <Shield className="w-3 h-3" /> }
  } as const;
  
  return config[severity] || { color: 'bg-gray-100 text-gray-800', label: severity, icon: null };
}

// Loading component
function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main dashboard component
function DashboardPage() {
  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardData,
  })

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: fetchRecentActivity,
  })

  if (statsLoading) {
    return <DashboardLoading />
  }

  if (statsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Lỗi khi tải dữ liệu dashboard. Vui lòng thử lại.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Tổng quan hệ thống VN Speech Guardian</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}</span>
        </div>
      </div>

      {/* Enhanced P29 Filter Controls */}
      <FilterControls
        filters={[
          {
            key: 'dateRange',
            label: 'Khoảng thời gian',
            type: 'dateRange',
            placeholder: 'Chọn thời gian'
          },
          {
            key: 'severity',
            label: 'Độ nghiêm trọng',
            type: 'select',
            options: [
              { value: 'all', label: 'Tất cả' },
              { value: 'CLEAN', label: 'An toàn' },
              { value: 'OFFENSIVE', label: 'Cảnh báo' },
              { value: 'HATE', label: 'Nguy hiểm' }
            ],
            placeholder: 'Chọn độ nghiêm trọng'
          },
          {
            key: 'search',
            label: 'Tìm kiếm',
            type: 'text',
            placeholder: 'Tìm kiếm nội dung...'
          }
        ]}
        values={{
          dateRange: { from: '', to: '' },
          severity: 'all',
          search: ''
        }}
        onValuesChange={(newValues) => {
          // Handle filter changes - would update dashboard data
          console.log('Dashboard filters changed:', newValues);
        }}
        onReset={() => {
          // Reset filters to default
          console.log('Dashboard filters reset');
        }}
        className="mb-6"
      />

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardMetricCard
            title="Tổng phiên"
            value={stats.totalSessions.toLocaleString()}
            trend={stats.trends.sessions}
            icon={<Users className="h-6 w-6" />}
            color="blue"
          />
          <DashboardMetricCard
            title="Phát hiện"
            value={stats.totalDetections}
            trend={stats.trends.detections}
            icon={<Shield className="h-6 w-6" />}
            color="red"
          />
          <DashboardMetricCard
            title="Độ chính xác"
            value={stats.accuracyRate}
            unit="%"
            trend={stats.trends.accuracy}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <DashboardMetricCard
            title="Thời gian xử lý"
            value={stats.averageProcessingTime}
            unit="ms"
            trend={stats.trends.processingTime}
            icon={<Activity className="h-6 w-6" />}
            color="yellow"
          />
        </div>
      )}

      {/* Enhanced P29 Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AnalyticsChart
          title="Hoạt động theo thời gian"
          subtitle="Số lượng phiên và phát hiện theo ngày"
          type="line"
          data={[
            { label: 'T2', value: 12, color: '#3B82F6' },
            { label: 'T3', value: 19, color: '#3B82F6' },
            { label: 'T4', value: 15, color: '#3B82F6' },
            { label: 'T5', value: 25, color: '#3B82F6' },
            { label: 'T6', value: 22, color: '#3B82F6' },
            { label: 'T7', value: 18, color: '#3B82F6' },
            { label: 'CN', value: 8, color: '#3B82F6' }
          ]}
          height={280}
          className="bg-white rounded-lg border border-gray-200 p-6"
          animate={true}
          showGrid={true}
          showLegend={false}
        />

        <AnalyticsChart
          title="Phân bố độ nghiêm trọng"
          subtitle="Tỷ lệ các loại nội dung được phát hiện"
          type="doughnut"
          data={[
            { label: 'An toàn', value: 75, color: '#10B981' },
            { label: 'Cảnh báo', value: 20, color: '#F59E0B' },
            { label: 'Nguy hiểm', value: 5, color: '#EF4444' }
          ]}
          height={280}
          className="bg-white rounded-lg border border-gray-200 p-6"
          animate={true}
          showGrid={false}
          showLegend={true}
        />
      </div>

      {/* Enhanced P29 Recent Activity DataTable */}
      <DataTable
        columns={[
          {
            key: 'timestamp',
            label: 'Thời gian',
            sortable: true,
            render: (value) => new Date(value).toLocaleString('vi-VN'),
            width: '140px'
          },
          {
            key: 'content',
            label: 'Nội dung',
            render: (value) => (
              <div className="max-w-xs truncate" title={value}>
                {value}
              </div>
            )
          },
          {
            key: 'severity',
            label: 'Độ nghiêm trọng',
            sortable: true,
            align: 'center' as const,
            width: '120px',
            render: (value: RecentActivity['severity']) => {
              const config = formatActivitySeverity(value);
              return (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                  {config.icon}
                  {config.label}
                </span>
              );
            }
          },
          {
            key: 'sessionId',
            label: 'Session ID',
            width: '100px',
            render: (value) => value ? (
              <span className="text-xs text-muted-foreground font-mono">
                {value.substring(0, 8)}...
              </span>
            ) : '-'
          }
        ]}
        data={activities || []}
        loading={activitiesLoading}
        pagination={{
          page: 1,
          pageSize: 10,
          total: activities?.length || 0,
          onPageChange: (page) => console.log('Page changed:', page)
        }}
        actions={[
          {
            label: 'Xem chi tiết',
            onClick: (row) => console.log('View details:', row),
            variant: 'default' as const
          }
        ]}
        onRowClick={(row) => console.log('Row clicked:', row)}
        className="bg-white"
      />
    </div>
  )
}

// Export route definition
export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})