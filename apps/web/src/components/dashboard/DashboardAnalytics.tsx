/**
 * Dashboard Analytics Main Component (P27.1)
 * Enhanced dashboard layout với sidebar, metric cards, charts và sessions table
 * Responsive design với mobile-first approach
 */

import { Suspense, useState, useMemo } from 'react';

import { 
  BarChart3, 
  Users, 
  Activity,
  Menu,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedMetricCard } from './EnhancedMetricCard';
import { SessionsTable } from './SessionsTable';
import { AnalyticsCharts } from './AnalyticsCharts';

import type { DashboardStats, Session } from '@/types/components';

// API integration với OpenAPI generated client
const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch('/api/stats/overview');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }
  return response.json();
};

const fetchSessions = async (params: {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}): Promise<{ sessions: Session[]; total: number }> => {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.pageSize.toString(),
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.sortOrder && { sortOrder: params.sortOrder }),
    ...params.filters,
  });

  const response = await fetch(`/api/sessions?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }
  
  const data = await response.json();
  return {
    sessions: data.data.items,
    total: data.data.total,
  };
};

// Loading components
function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Metrics skeleton */}
      <div data-testid="metrics-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} data-testid="metric-card-skeleton" className="bg-gray-200 rounded-lg h-32" />
        ))}
      </div>
      
      {/* Charts skeleton */}
      <div data-testid="charts-skeleton" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-200 rounded-lg h-64" />
        <div className="bg-gray-200 rounded-lg h-64" />
      </div>
      
      {/* Table skeleton */}
      <div data-testid="table-skeleton" className="bg-gray-200 rounded-lg h-96" />
    </div>
  );
}

// Error boundary component
function DashboardErrorBoundary({ 
  error, 
  onRetry 
}: { 
  error: Error; 
  onRetry?: () => void;
}) {
  return (
    <div data-testid="dashboard-error-boundary" className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Failed to load dashboard data
        </h3>
        <p className="text-red-700 mb-4">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

// Sidebar component
function DashboardSidebar({ 
  isOpen, 
  onClose,
  className 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  className?: string;
}) {
  return (  
    <div 
      data-testid="dashboard-sidebar"
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:static lg:inset-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        !isOpen && 'mobile-collapsed',
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <nav className="p-4 space-y-2">
        <a href="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md">
          <BarChart3 className="h-4 w-4 mr-3" />
          Overview
        </a>
        <a href="/dashboard/sessions" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
          <Users className="h-4 w-4 mr-3" />
          Sessions
        </a>
        <a href="/dashboard/analytics" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
          <Activity className="h-4 w-4 mr-3" />
          Analytics
        </a>
      </nav>
    </div>
  );
}

// Main dashboard component
export function DashboardAnalytics({ 
  initialData,
  onRetry 
}: { 
  initialData?: DashboardStats;
  onRetry?: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsFilters, setSessionsFilters] = useState({});
  const [sessionsSort, setSessionsSort] = useState({ field: 'startedAt', direction: 'desc' as const });

  // Dashboard stats query
  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    initialData,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refresh every minute
  });

  // Sessions query  
  const { 
    data: sessionsData, 
    isLoading: sessionsLoading,
    error: sessionsError
  } = useQuery({
    queryKey: ['dashboard-sessions', sessionsPage, sessionsFilters, sessionsSort],
    queryFn: () => fetchSessions({
      page: sessionsPage,
      pageSize: 10,
      sortBy: sessionsSort.field,
      sortOrder: sessionsSort.direction,
      filters: sessionsFilters,
    }),
    staleTime: 30000,
  });

  // Chart data processing
  const chartData = useMemo(() => {
    if (!stats) return null;
    
    return {
      timeline: [
        // Mock timeline data - in real app, this would come from API
        { date: '2024-09-20', sessions: 145, detections: 12 },
        { date: '2024-09-21', sessions: 167, detections: 8 },
        { date: '2024-09-22', sessions: 189, detections: 15 },
        { date: '2024-09-23', sessions: 123, detections: 7 },
        { date: '2024-09-24', sessions: 198, detections: 11 },
      ],
      severity: [
        { name: 'CLEAN', value: 100 - stats.toxicPercent, color: '#10B981' },
        { name: 'OFFENSIVE', value: stats.toxicPercent * 0.7, color: '#F59E0B' },
        { name: 'HATE', value: stats.toxicPercent * 0.3, color: '#EF4444' },
      ],
      hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        activity: Math.floor(Math.random() * 100) + 20,
      })),
    };
  }, [stats]);

  // Error handling  
  if (statsError) {
    return (
      <DashboardErrorBoundary 
        error={statsError as Error}
        onRetry={() => {
          refetchStats();
          onRetry?.();
        }}
      />
    );
  }

  // Loading state
  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <DashboardSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 mr-2"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Analytics</h1>
                <p className="text-gray-600">Monitor your speech processing system</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => refetchStats()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Metrics Grid */}
          {stats && (
            <div data-testid="metrics-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <EnhancedMetricCard
                title="Total Sessions"
                value={stats.totalSessions}
                trend={stats.trends.sessions}
                icon="Users"
                color="blue"
              />
              <EnhancedMetricCard
                title="Total Detections"
                value={stats.totalDetections}
                trend={stats.trends.detections}
                icon="Shield"
                color="red"
              />
              <EnhancedMetricCard
                title="Accuracy Rate"
                value={stats.accuracyRate}
                unit="%"
                trend={stats.trends.accuracy}
                icon="Activity"
                color="green"
              />
              <EnhancedMetricCard
                title="Avg Processing Time"
                value={stats.averageProcessingTime}
                unit="ms"
                trend={stats.trends.processingTime}
                icon="Activity"
                color="yellow"
              />
            </div>
          )}

          {/* Charts Section */}
          <div data-testid="charts-section">
            <Suspense fallback={<div data-testid="charts-skeleton" className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-64" />}>
              {chartData && (
                <AnalyticsCharts 
                  data={chartData}
                  isLoading={false}
                />
              )}
            </Suspense>
          </div>

          {/* Sessions Table */}
          <div data-testid="sessions-table-section">
            <Suspense fallback={<div data-testid="table-skeleton" className="bg-white rounded-lg h-96" />}>
              {sessionsData && (
                <SessionsTable
                  sessions={sessionsData.sessions}
                  totalCount={sessionsData.total}
                  currentPage={sessionsPage}
                  pageSize={10}
                  isLoading={sessionsLoading}
                  onPageChange={setSessionsPage}
                  onSortChange={setSessionsSort}
                  onFilterChange={setSessionsFilters}
                />
              )}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}