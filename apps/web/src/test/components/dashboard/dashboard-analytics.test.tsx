/**
 * Test Suite cho Dashboard Analytics Components (P27)
 * TDD Approach - Write tests first, then implement components
 * Testing: Enhanced layout, Recharts integration, MetricCards, SessionsTable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routes/__root';

// Components to be implemented
import { DashboardAnalytics } from '@/components/dashboard/DashboardAnalytics';
import { EnhancedMetricCard } from '@/components/dashboard/EnhancedMetricCard';
import { SessionsTable } from '@/components/dashboard/SessionsTable';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';

// Mock data types
interface MockStatsData {
  totalSessions: number;
  totalDetections: number;
  toxicPercent: number;
  trends: {
    sessions: number;
    detections: number;
    accuracy: number;
    processingTime: number;
  };
  chartData: {
    timeline: Array<{ date: string; sessions: number; detections: number }>;
    severity: Array<{ name: string; value: number; color: string }>;
    hourlyActivity: Array<{ hour: number; activity: number }>;
  };
}

interface MockSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  detectionCount: number;
  severity: 'CLEAN' | 'OFFENSIVE' | 'HATE';
  status: 'ACTIVE' | 'COMPLETED' | 'ERROR';
}

// Mock data
const mockStatsData: MockStatsData = {
  totalSessions: 1247,
  totalDetections: 89,
  toxicPercent: 7.1,
  trends: {
    sessions: 12.5,
    detections: -5.2,
    accuracy: 2.1,
    processingTime: -8.3,
  },
  chartData: {
    timeline: [
      { date: '2024-09-01', sessions: 145, detections: 12 },
      { date: '2024-09-02', sessions: 167, detections: 8 },
      { date: '2024-09-03', sessions: 189, detections: 15 },
      { date: '2024-09-04', sessions: 123, detections: 7 },
      { date: '2024-09-05', sessions: 198, detections: 11 },
    ],
    severity: [
      { name: 'CLEAN', value: 85.2, color: '#10B981' },
      { name: 'OFFENSIVE', value: 10.1, color: '#F59E0B' },
      { name: 'HATE', value: 4.7, color: '#EF4444' },
    ],
    hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      activity: Math.floor(Math.random() * 100) + 20,
    })),
  },
};

const mockSessions: MockSession[] = [
  {
    id: 'session-1',
    userId: 'user-1',
    startedAt: '2024-09-24T10:00:00Z',
    endedAt: '2024-09-24T10:15:00Z',
    detectionCount: 3,
    severity: 'OFFENSIVE',
    status: 'COMPLETED',
  },
  {
    id: 'session-2', 
    userId: 'user-2',
    startedAt: '2024-09-24T11:30:00Z',
    endedAt: null,
    detectionCount: 0,
    severity: 'CLEAN',
    status: 'ACTIVE',
  },
  {
    id: 'session-3',
    userId: 'user-3',
    startedAt: '2024-09-24T09:45:00Z',
    endedAt: '2024-09-24T10:02:00Z',
    detectionCount: 8,
    severity: 'HATE',
    status: 'COMPLETED',
  },
];

// Test wrapper với providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const memoryHistory = createMemoryHistory({
    initialEntries: ['/dashboard'],
  });

  const router = createRouter({ routeTree, history: memoryHistory });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('DashboardAnalytics Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('Layout & Structure', () => {
    it('should render dashboard with proper layout structure', async () => {
      render(
        <TestWrapper>
          <DashboardAnalytics />
        </TestWrapper>
      );

      // Header section
      expect(screen.getByRole('heading', { name: /dashboard analytics/i })).toBeInTheDocument();
      
      // Metrics cards section
      expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
      
      // Charts section
      expect(screen.getByTestId('charts-section')).toBeInTheDocument();
      
      // Sessions table section
      expect(screen.getByTestId('sessions-table-section')).toBeInTheDocument();
    });

    it('should be responsive and collapse sidebar on mobile', async () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640, // Mobile width
      });

      render(
        <TestWrapper>
          <DashboardAnalytics />
        </TestWrapper>
      );

      // Should show mobile hamburger menu
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toBeInTheDocument();

      // Sidebar should be collapsed initially on mobile
      const sidebar = screen.getByTestId('dashboard-sidebar');
      expect(sidebar).toHaveClass('mobile-collapsed');
    });

    it('should handle loading states properly', async () => {
      render(
        <TestWrapper>
          <DashboardAnalytics />
        </TestWrapper>
      );

      // Should show loading skeletons initially
      expect(screen.getAllByTestId('metric-card-skeleton')).toHaveLength(4);
      expect(screen.getByTestId('charts-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error boundary when API fails', async () => {
      // Mock API failure
      vi.mocked(fetch).mockRejectedValueOnce(new Error('API Error'));

      render(
        <TestWrapper>
          <DashboardAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-error-boundary')).toBeInTheDocument();
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
      });
    });

    it('should have retry functionality on error', async () => {
      const retryFn = vi.fn();
      
      render(
        <TestWrapper>
          <DashboardAnalytics onRetry={retryFn} />
        </TestWrapper>
      );

      // Trigger error state
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      expect(retryFn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('EnhancedMetricCard Component', () => {
  const defaultProps = {
    title: 'Total Sessions',
    value: 1247,
    trend: 12.5,
    icon: 'Users',
    color: 'blue' as const,
  };

  it('should render metric card with all properties', () => {
    render(
      <TestWrapper>
        <EnhancedMetricCard {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Total Sessions')).toBeInTheDocument();
    expect(screen.getByText('1,247')).toBeInTheDocument();
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByTestId('trend-indicator')).toHaveClass('positive');
  });

  it('should handle negative trends correctly', () => {
    render(
      <TestWrapper>
        <EnhancedMetricCard {...defaultProps} trend={-5.2} />
      </TestWrapper>
    );

    expect(screen.getByText('-5.2%')).toBeInTheDocument();
    expect(screen.getByTestId('trend-indicator')).toHaveClass('negative');
  });

  it('should format large numbers properly', () => {
    render(
      <TestWrapper>
        <EnhancedMetricCard {...defaultProps} value={1234567} />
      </TestWrapper>
    );

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <TestWrapper>
        <EnhancedMetricCard {...defaultProps} isLoading={true} />
      </TestWrapper>
    );

    expect(screen.getByTestId('metric-card-skeleton')).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA labels', () => {
    render(
      <TestWrapper>
        <EnhancedMetricCard {...defaultProps} />
      </TestWrapper>
    );

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', 'Total Sessions metric: 1,247 with 12.5% positive trend');
  });
});

describe('SessionsTable Component', () => {
  const defaultProps = {
    sessions: mockSessions,
    totalCount: 1247,
    currentPage: 1,
    pageSize: 10,
    onPageChange: vi.fn(),
    onSortChange: vi.fn(),
    onFilterChange: vi.fn(),
  };

  it('should render sessions table with data', () => {
    render(
      <TestWrapper>
        <SessionsTable {...defaultProps} />
      </TestWrapper>
    );

    // Table headers
    expect(screen.getByText('Session ID')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Detections')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();

    // Session data
    expect(screen.getByText('session-1')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should handle pagination correctly', async () => {
    const onPageChange = vi.fn();
    
    render(
      <TestWrapper>
        <SessionsTable {...defaultProps} onPageChange={onPageChange} />
      </TestWrapper>
    );

    const nextButton = screen.getByRole('button', { name: /next page/i });
    await userEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('should handle sorting by columns', async () => {
    const onSortChange = vi.fn();
    
    render(
      <TestWrapper>
        <SessionsTable {...defaultProps} onSortChange={onSortChange} />
      </TestWrapper>
    );

    const startedAtHeader = screen.getByRole('button', { name: /sort by started at/i });
    await userEvent.click(startedAtHeader);

    expect(onSortChange).toHaveBeenCalledWith({
      field: 'startedAt',
      direction: 'desc',
    });
  });

  it('should filter by severity', async () => {
    const onFilterChange = vi.fn();
    
    render(
      <TestWrapper>
        <SessionsTable {...defaultProps} onFilterChange={onFilterChange} />
      </TestWrapper>
    );

    const severityFilter = screen.getByRole('combobox', { name: /filter by severity/i });
    await userEvent.selectOptions(severityFilter, 'OFFENSIVE');

    expect(onFilterChange).toHaveBeenCalledWith({
      severity: 'OFFENSIVE',
    });
  });

  it('should handle search functionality', async () => {
    const onFilterChange = vi.fn();
    
    render(
      <TestWrapper>
        <SessionsTable {...defaultProps} onFilterChange={onFilterChange} />
      </TestWrapper>
    );

    const searchInput = screen.getByRole('textbox', { name: /search sessions/i });
    await userEvent.type(searchInput, 'session-1');

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({
        search: 'session-1',
      });
    });
  });

  it('should show empty state when no sessions', () => {
    render(
      <TestWrapper>
        <SessionsTable {...defaultProps} sessions={[]} />
      </TestWrapper>
    );

    expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
    expect(screen.getByTestId('empty-sessions-state')).toBeInTheDocument();
  });
});

describe('AnalyticsCharts Component', () => {
  const defaultProps = {
    data: mockStatsData.chartData,
    isLoading: false,
  };

  it('should render all chart types', () => {
    render(
      <TestWrapper>
        <AnalyticsCharts {...defaultProps} />
      </TestWrapper>
    );

    // Should render LineChart for timeline
    expect(screen.getByTestId('timeline-chart')).toBeInTheDocument();
    
    // Should render PieChart for severity distribution
    expect(screen.getByTestId('severity-chart')).toBeInTheDocument();
    
    // Should render BarChart for hourly activity
    expect(screen.getByTestId('activity-chart')).toBeInTheDocument();
  });

  it('should handle chart interactions', async () => {
    const onChartClick = vi.fn();
    
    render(
      <TestWrapper>
        <AnalyticsCharts {...defaultProps} onChartClick={onChartClick} />
      </TestWrapper>
    );

    const timelineChart = screen.getByTestId('timeline-chart');
    await userEvent.click(timelineChart);

    expect(onChartClick).toHaveBeenCalledWith({
      chartType: 'timeline',
      dataPoint: expect.any(Object),
    });
  });

  it('should be responsive and adjust to screen size', () => {
    // Mock different screen sizes
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768, // Tablet width
    });

    render(
      <TestWrapper>
        <AnalyticsCharts {...defaultProps} />
      </TestWrapper>
    );

    const charts = screen.getAllByTestId(/chart$/);
    charts.forEach(chart => {
      expect(chart).toHaveStyle('width: 100%');
    });
  });

  it('should show loading skeletons', () => {
    render(
      <TestWrapper>
        <AnalyticsCharts {...defaultProps} isLoading={true} />
      </TestWrapper>
    );

    expect(screen.getAllByTestId('chart-skeleton')).toHaveLength(3);
  });

  it('should handle empty data gracefully', () => {
    const emptyData = {
      timeline: [],
      severity: [],
      hourlyActivity: [],
    };

    render(
      <TestWrapper>
        <AnalyticsCharts {...defaultProps} data={emptyData} />
      </TestWrapper>
    );

    expect(screen.getAllByText(/no data available/i)).toHaveLength(3);
  });
});

describe('Dashboard Integration Tests', () => {
  it('should integrate all components properly', async () => {
    render(
      <TestWrapper>
        <DashboardAnalytics />
      </TestWrapper>
    );

    // Should render all major sections
    await waitFor(() => {
      expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
      expect(screen.getByTestId('charts-section')).toBeInTheDocument();
      expect(screen.getByTestId('sessions-table-section')).toBeInTheDocument();
    });
  });

  it('should handle real-time updates', async () => {
    const { rerender } = render(
      <TestWrapper>
        <DashboardAnalytics />
      </TestWrapper>
    );

    // Mock real-time data update
    const updatedData = {
      ...mockStatsData,
      totalSessions: 1250,
    };

    // Simulate data update
    rerender(
      <TestWrapper>
        <DashboardAnalytics initialData={updatedData} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });
  });
});