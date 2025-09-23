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
  TrendingUp, 
  TrendingDown, 
  Users, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Clock,
  BarChart3
} from 'lucide-react'
import type { DashboardStats, RecentActivity, MetricCardProps, ActivityItemProps } from '@/types/components'

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

// Component cho metric card
function MetricCard({ 
  title, 
  value, 
  unit, 
  trend, 
  icon: Icon,
  color = 'blue'
}: {
  title: string
  value: string | number
  unit?: string
  trend?: number
  icon: React.ComponentType<{ className?: string }>
  color?: 'blue' | 'green' | 'red' | 'yellow'
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-50',
    green: 'bg-green-500 text-green-50', 
    red: 'bg-red-500 text-red-50',
    yellow: 'bg-yellow-500 text-yellow-50'
  }

  const trendColorClasses = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50'
  }

  const trendColor = trend && trend > 0 ? 'positive' : 'negative'
  const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {value}{unit && <span className="text-lg font-normal text-gray-500">{unit}</span>}
            </p>
          </div>
        </div>
        
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${trendColorClasses[trendColor]}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Component cho activity item
function ActivityItem({ activity }: { activity: RecentActivity }) {
  const severityConfig = {
    CLEAN: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    OFFENSIVE: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
    HATE: { color: 'bg-red-100 text-red-800', icon: Shield }
  }

  const config = severityConfig[activity.severity]
  const Icon = config.icon

  return (
    <div className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className={`p-2 rounded-full ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {activity.content}
        </p>
        <div className="flex items-center space-x-2 mt-1">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {activity.severity}
          </span>
          {activity.sessionId && (
            <span className="text-xs text-gray-500">
              Session: {activity.sessionId}
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        <p className="text-xs text-gray-500">
          {new Date(activity.timestamp).toLocaleTimeString('vi-VN')}
        </p>
      </div>
    </div>
  )
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

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Tổng phiên"
            value={stats.totalSessions.toLocaleString()}
            trend={stats.trends.sessions}
            icon={Users}
            color="blue"
          />
          <MetricCard
            title="Phát hiện"
            value={stats.totalDetections}
            trend={stats.trends.detections}
            icon={Shield}
            color="red"
          />
          <MetricCard
            title="Độ chính xác"
            value={stats.accuracyRate}
            unit="%"
            trend={stats.trends.accuracy}
            icon={CheckCircle}
            color="green"
          />
          <MetricCard
            title="Thời gian xử lý"
            value={stats.averageProcessingTime}
            unit="ms"
            trend={stats.trends.processingTime}
            icon={Activity}
            color="yellow"
          />
        </div>
      )}

      {/* Charts Section - Placeholder for future implementation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Hoạt động theo thời gian
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Biểu đồ sẽ được implement trong P27</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Phân bố độ nghiêm trọng
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Biểu đồ pie chart sẽ được implement trong P27</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Hoạt động gần đây
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {activitiesLoading ? (
            <div className="p-6 text-center text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Đang tải hoạt động...</p>
            </div>
          ) : activities && activities.length > 0 ? (
            activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>Chưa có hoạt động nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Export route definition
export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})