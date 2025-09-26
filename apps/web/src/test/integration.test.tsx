/**
 * Integration Tests - VN Speech Guardian
 * Comprehensive integration testing cho component interactions và workflows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock components for integration testing
import { 
  Layout, 
  Header, 
  Sidebar, 
  MainContent,
  DashboardLayout,
  LiveLayout,
} from '../../components/layout';
import { Button, Input, Card, CardContent } from '../../components/ui';

// =============================================================================
// Test Wrappers & Utilities
// =============================================================================

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock API responses
const mockSessionsData = [
  {
    id: '1',
    name: 'Test Session 1',
    status: 'completed',
    createdAt: '2025-01-21T10:00:00Z',
    duration: 120,
  },
  {
    id: '2', 
    name: 'Test Session 2',
    status: 'active',
    createdAt: '2025-01-21T11:00:00Z',
    duration: 60,
  },
];

const mockApiClient = {
  sessions: {
    list: vi.fn().mockResolvedValue({
      data: mockSessionsData,
      meta: { pagination: { page: 1, limit: 20, total: 2 } },
    }),
    create: vi.fn().mockResolvedValue({ id: 'new-session-id' }),
    get: vi.fn().mockResolvedValue(mockSessionsData[0]),
  },
  stats: {
    overview: vi.fn().mockResolvedValue({
      totalSessions: 150,
      totalMinutes: 2400,
      safetyScore: 95,
      activeUsers: 12,
    }),
  },
};

vi.mock('../../lib/enhanced-api-client', () => ({
  apiClient: mockApiClient,
}));

// =============================================================================
// Layout Integration Tests
// =============================================================================

describe('Layout Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete layout with header, sidebar, and main content', () => {
    render(
      <TestWrapper>
        <Layout variant="sidebar">
          <Header 
            title="VN Speech Guardian"
            showSearch={true}
            showNotifications={true}
          />
          <Sidebar>
            <nav>
              <a href="/dashboard">Dashboard</a>
              <a href="/sessions">Sessions</a>
            </nav>
          </Sidebar>
          <MainContent>
            <div data-testid="main-content">Test Content</div>
          </MainContent>
        </Layout>
      </TestWrapper>
    );

    // All layout components should be present
    expect(screen.getByText('VN Speech Guardian')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('handles responsive sidebar toggle correctly', async () => {
    const user = userEvent.setup();
    
    // Mock window.matchMedia for mobile viewport
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <TestWrapper>
        <Layout variant="sidebar">
          <Header title="Test" />
          <Sidebar data-testid="sidebar">
            <nav>Navigation</nav>
          </Sidebar>
          <MainContent>Content</MainContent>
        </Layout>
      </TestWrapper>
    );

    const sidebar = screen.getByTestId('sidebar');
    
    // On mobile, sidebar should be hidden initially
    expect(sidebar).toHaveClass('hidden', 'lg:flex');

    // Find and click menu toggle button
    const menuToggle = screen.getByRole('button', { name: /menu/i });
    await user.click(menuToggle);

    // Sidebar should become visible
    await waitFor(() => {
      expect(sidebar).toHaveClass('flex');
    });
  });

  it('integrates search functionality across components', async () => {
    const handleSearch = vi.fn();
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Layout variant="sidebar">
          <Header 
            title="Test App"
            showSearch={true}
            onSearchChange={handleSearch}
          />
          <MainContent>
            <div>Search results will appear here</div>
          </MainContent>
        </Layout>
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'test query');

    expect(handleSearch).toHaveBeenCalledWith('test query');
  });

  it('handles navigation state changes', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DashboardLayout>
          <div data-testid="dashboard-content">
            <Card>
              <CardContent>
                <h2>Dashboard Overview</h2>
                <div className="grid grid-cols-3 gap-4">
                  <Button>View Sessions</Button>
                  <Button>Start Recording</Button>
                  <Button>Settings</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </TestWrapper>
    );

    // Dashboard should render with navigation
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Sessions' })).toBeInTheDocument();

    // Click navigation should work
    const startRecordingButton = screen.getByRole('button', { name: 'Start Recording' });
    await user.click(startRecordingButton);
    
    // Button interaction should work without errors
    expect(startRecordingButton).toBeInTheDocument();
  });
});

// =============================================================================
// Cross-Component Communication Tests
// =============================================================================

describe('Cross-Component Communication', () => {
  it('passes data between parent and child components', async () => {
    const handleNotificationClick = vi.fn();
    const user = userEvent.setup();

    function TestParent() {
      const [notifications, setNotifications] = React.useState([
        { id: '1', message: 'New session created', read: false },
        { id: '2', message: 'Detection alert', read: true },
      ]);

      const handleClick = (id: string) => {
        handleNotificationClick(id);
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      };

      return (
        <Layout variant="sidebar">
          <Header
            title="Test App"
            notifications={notifications}
            onNotificationClick={handleClick}
          />
          <MainContent>
            <div data-testid="notification-count">
              Unread: {notifications.filter(n => !n.read).length}
            </div>
          </MainContent>
        </Layout>
      );
    }

    render(
      <TestWrapper>
        <TestParent />
      </TestWrapper>
    );

    // Should show initial unread count
    expect(screen.getByTestId('notification-count')).toHaveTextContent('Unread: 1');

    // Click notification should update state
    const notificationButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationButton);

    // Find and click first notification
    const firstNotification = screen.getByText('New session created');
    await user.click(firstNotification);

    expect(handleNotificationClick).toHaveBeenCalledWith('1');
    
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('Unread: 0');
    });
  });

  it('handles form submission with layout updates', async () => {
    const user = userEvent.setup();

    function TestFormPage() {
      const [sessionName, setSessionName] = React.useState('');
      const [isSubmitting, setIsSubmitting] = React.useState(false);
      const [submitStatus, setSubmitStatus] = React.useState<string | null>(null);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
          await mockApiClient.sessions.create({ name: sessionName });
          setSubmitStatus('Session created successfully');
        } catch (error) {
          setSubmitStatus('Failed to create session');
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <DashboardLayout>
          <Card>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="session-name">Session Name</label>
                  <Input
                    id="session-name"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                
                <Button type="submit" disabled={isSubmitting || !sessionName}>
                  {isSubmitting ? 'Creating...' : 'Create Session'}
                </Button>
                
                {submitStatus && (
                  <div data-testid="submit-status" className={
                    submitStatus.includes('success') ? 'text-green-600' : 'text-red-600'
                  }>
                    {submitStatus}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </DashboardLayout>
      );
    }

    render(
      <TestWrapper>
        <TestFormPage />
      </TestWrapper>
    );

    // Form should be present
    const sessionNameInput = screen.getByLabelText('Session Name');
    const submitButton = screen.getByRole('button', { name: 'Create Session' });

    // Button should be disabled initially
    expect(submitButton).toBeDisabled();

    // Fill form
    await user.type(sessionNameInput, 'New Test Session');
    
    // Button should be enabled
    expect(submitButton).not.toBeDisabled();

    // Submit form
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Should show success message
    await waitFor(() => {
      expect(screen.getByTestId('submit-status')).toHaveTextContent('Session created successfully');
    });

    expect(mockApiClient.sessions.create).toHaveBeenCalledWith({
      name: 'New Test Session'
    });
  });
});

// =============================================================================
// User Workflow Integration Tests  
// =============================================================================

describe('User Workflow Integration', () => {
  it('completes dashboard to live recording workflow', async () => {
    const user = userEvent.setup();

    function TestWorkflow() {
      const [currentView, setCurrentView] = React.useState<'dashboard' | 'live'>('dashboard');
      const [isRecording, setIsRecording] = React.useState(false);

      const startRecording = () => {
        setCurrentView('live');
        setIsRecording(true);
      };

      const stopRecording = () => {
        setIsRecording(false);
        setCurrentView('dashboard');
      };

      if (currentView === 'dashboard') {
        return (
          <DashboardLayout>
            <Card>
              <CardContent>
                <h2>Dashboard</h2>
                <div className="space-y-4">
                  <div data-testid="stats">
                    <p>Total Sessions: 150</p>
                    <p>Safety Score: 95%</p>
                  </div>
                  <Button onClick={startRecording}>
                    Start New Recording
                  </Button>
                </div>
              </CardContent>
            </Card>
          </DashboardLayout>
        );
      }

      return (
        <LiveLayout>
          <div data-testid="live-interface" className="text-center">
            <h2>Live Recording</h2>
            <div data-testid="recording-status">
              Status: {isRecording ? 'Recording...' : 'Ready'}
            </div>
            <div className="space-y-4">
              <div data-testid="audio-visualizer">
                🎵 Audio Visualizer Placeholder
              </div>
              <Button 
                onClick={stopRecording}
                variant="destructive"
              >
                Stop Recording
              </Button>
            </div>
          </div>
        </LiveLayout>
      );
    }

    render(
      <TestWrapper>
        <TestWorkflow />
      </TestWrapper>
    );

    // Should start in dashboard
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('stats')).toBeInTheDocument();
    expect(screen.getByText('Total Sessions: 150')).toBeInTheDocument();

    // Click start recording
    const startButton = screen.getByRole('button', { name: 'Start New Recording' });
    await user.click(startButton);

    // Should transition to live view
    await waitFor(() => {
      expect(screen.getByText('Live Recording')).toBeInTheDocument();
      expect(screen.getByTestId('recording-status')).toHaveTextContent('Status: Recording...');
      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument();
    });

    // Stop recording
    const stopButton = screen.getByRole('button', { name: 'Stop Recording' });
    await user.click(stopButton);

    // Should return to dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Live Recording')).not.toBeInTheDocument();
    });
  });

  it('handles error states across component boundaries', async () => {
    const user = userEvent.setup();

    // Mock API error
    mockApiClient.sessions.create.mockRejectedValueOnce(new Error('Network error'));

    function TestErrorHandling() {
      const [error, setError] = React.useState<string | null>(null);

      const handleError = (errorMessage: string) => {
        setError(errorMessage);
      };

      const clearError = () => {
        setError(null);
      };

      return (
        <DashboardLayout>
          {error && (
            <div data-testid="global-error" className="bg-red-50 p-4 mb-4">
              <p className="text-red-600">{error}</p>
              <Button onClick={clearError} variant="outline" size="sm">
                Dismiss
              </Button>
            </div>
          )}
          
          <Card>
            <CardContent>
              <Button
                onClick={async () => {
                  try {
                    await mockApiClient.sessions.create({ name: 'Test' });
                  } catch (err) {
                    handleError((err as Error).message);
                  }
                }}
              >
                Create Session (Will Fail)
              </Button>
            </CardContent>
          </Card>
        </DashboardLayout>
      );
    }

    render(
      <TestWrapper>
        <TestErrorHandling />
      </TestWrapper>
    );

    // Trigger error
    const createButton = screen.getByRole('button', { name: 'Create Session (Will Fail)' });
    await user.click(createButton);

    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByTestId('global-error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Clear error
    const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
    await user.click(dismissButton);

    // Error should be removed
    await waitFor(() => {
      expect(screen.queryByTestId('global-error')).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// Performance Integration Tests
// =============================================================================

describe('Performance Integration', () => {
  it('handles rapid state updates without performance degradation', async () => {
    const user = userEvent.setup();
    let renderCount = 0;

    function TestPerformance() {
      const [count, setCount] = React.useState(0);
      const [updates, setUpdates] = React.useState<string[]>([]);
      
      renderCount++;

      const handleRapidUpdates = async () => {
        const newUpdates: string[] = [];
        
        for (let i = 0; i < 10; i++) {
          setCount(prev => prev + 1);
          newUpdates.push(`Update ${i + 1}`);
        }
        
        setUpdates(newUpdates);
      };

      return (
        <Layout variant="sidebar">
          <MainContent>
            <Card>
              <CardContent>
                <div data-testid="render-count">Renders: {renderCount}</div>
                <div data-testid="count">Count: {count}</div>
                <div data-testid="updates-count">Updates: {updates.length}</div>
                
                <Button onClick={handleRapidUpdates}>
                  Trigger Rapid Updates
                </Button>
                
                <div data-testid="updates-list">
                  {updates.map((update, index) => (
                    <div key={index}>{update}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </MainContent>
        </Layout>
      );
    }

    render(
      <TestWrapper>
        <TestPerformance />
      </TestWrapper>
    );

    const initialRenderCount = renderCount;
    
    // Trigger rapid updates
    const updateButton = screen.getByRole('button', { name: 'Trigger Rapid Updates' });
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('Count: 10');
      expect(screen.getByTestId('updates-count')).toHaveTextContent('Updates: 10');
    });

    // Render count should be reasonable (not excessive)
    const finalRenderCount = renderCount;
    expect(finalRenderCount - initialRenderCount).toBeLessThan(15); // Allow some batching
  });

  it('manages memory correctly with component mounting/unmounting', async () => {
    const user = userEvent.setup();

    function TestMemoryManagement() {
      const [showComponent, setShowComponent] = React.useState(true);
      const [data, setData] = React.useState<any[]>([]);

      // Simulate data loading
      React.useEffect(() => {
        if (showComponent) {
          const newData = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            value: Math.random(),
          }));
          setData(newData);
        }
      }, [showComponent]);

      return (
        <DashboardLayout>
          <Card>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={() => setShowComponent(!showComponent)}
                >
                  {showComponent ? 'Hide' : 'Show'} Data Component
                </Button>

                {showComponent && (
                  <div data-testid="data-component">
                    <h3>Data Component ({data.length} items)</h3>
                    <div data-testid="data-list" className="max-h-48 overflow-y-auto">
                      {data.map(item => (
                        <div key={item.id} className="p-2 border-b">
                          {item.name}: {item.value.toFixed(3)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </DashboardLayout>
      );
    }

    render(
      <TestWrapper>
        <TestMemoryManagement />
      </TestWrapper>
    );

    // Component should be visible initially
    expect(screen.getByTestId('data-component')).toBeInTheDocument();
    expect(screen.getByText('Data Component (100 items)')).toBeInTheDocument();

    // Hide component
    const toggleButton = screen.getByRole('button', { name: 'Hide Data Component' });
    await user.click(toggleButton);

    // Component should be unmounted
    await waitFor(() => {
      expect(screen.queryByTestId('data-component')).not.toBeInTheDocument();
    });

    // Show component again
    const showButton = screen.getByRole('button', { name: 'Show Data Component' });
    await user.click(showButton);

    // Component should be remounted with fresh data
    await waitFor(() => {
      expect(screen.getByTestId('data-component')).toBeInTheDocument();
      expect(screen.getByText('Data Component (100 items)')).toBeInTheDocument();
    });
  });
});