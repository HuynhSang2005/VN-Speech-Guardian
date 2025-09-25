/**
 * Enhanced API Client - TanStack Query Integration Test
 * Testing integration với React Query ecosystem
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { toast } from 'sonner';
import React from 'react';

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    warning: vi.fn(),
  }
}));

// MSW Server setup
const server = setupServer(
  http.get('http://localhost:3001/api/sessions', () => {
    return HttpResponse.json({
      success: true,
      data: { 
        sessions: [
          { id: '1', name: 'Test Session 1', status: 'active' },
          { id: '2', name: 'Test Session 2', status: 'inactive' }
        ] 
      },
      meta: { pagination: { page: 1, limit: 20, total: 2 } }
    });
  }),

  http.post('http://localhost:3001/api/sessions', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      success: true,
      data: { 
        id: '3', 
        name: body.name, 
        status: 'active',
        createdAt: new Date().toISOString()
      }
    });
  }),

  http.delete('http://localhost:3001/api/sessions/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { deleted: true, id: params.id }
    });
  }),
);

// Test component with TanStack Query
const SessionsList: React.FC = () => {
  const [apiClient, setApiClient] = React.useState<any>(null);

  React.useEffect(() => {
    const loadClient = async () => {
      const { EnhancedApiClient } = await import('../services/enhanced-api-client');
      setApiClient(new EnhancedApiClient('http://localhost:3001/api'));
    };
    loadClient();
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiClient?.get('/sessions'),
    enabled: !!apiClient,
  });

  const createMutation = useMutation({
    mutationFn: (newSession: { name: string }) => 
      apiClient?.post('/sessions', newSession),
    onSuccess: () => {
      toast.success('Session created successfully!');
    },
    onError: () => {
      toast.error('Failed to create session');
    },
  });

  if (isLoading) return <div>Loading sessions...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div>
      <h1>Sessions</h1>
      <div data-testid="sessions-list">
        {data?.data?.sessions?.map((session: any) => (
          <div key={session.id} data-testid={`session-${session.id}`}>
            {session.name} - {session.status}
          </div>
        ))}
      </div>
      <button
        data-testid="create-session"
        onClick={() => createMutation.mutate({ name: 'New Session' })}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create Session'}
      </button>
    </div>
  );
};

// Test wrapper với QueryClient
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Enhanced API Client - TanStack Query Integration', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('Query Integration', () => {
    it('should work with useQuery hook', async () => {
      render(
        <TestWrapper>
          <SessionsList />
        </TestWrapper>
      );

      // Should show loading state first
      expect(screen.getByText('Loading sessions...')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Sessions')).toBeInTheDocument();
      });

      // Should show the fetched sessions
      expect(screen.getByTestId('session-1')).toHaveTextContent('Test Session 1 - active');
      expect(screen.getByTestId('session-2')).toHaveTextContent('Test Session 2 - inactive');
    });

    it('should work with useMutation hook', async () => {
      render(
        <TestWrapper>
          <SessionsList />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sessions')).toBeInTheDocument();
      });

      // Click create button
      const createButton = screen.getByTestId('create-session');
      expect(createButton).toBeInTheDocument();
      
      createButton.click();

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });

      // Should show success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Session created successfully!');
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle query errors gracefully', async () => {
      // Mock a failed request
      server.use(
        http.get('http://localhost:3001/api/sessions', () => {
          return HttpResponse.json(
            { error: { message: 'Server Error', code: 'INTERNAL_ERROR' } },
            { status: 500 }
          );
        })
      );

      render(
        <TestWrapper>
          <SessionsList />
        </TestWrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it('should handle mutation errors with toast', async () => {
      // Mock a failed mutation
      server.use(
        http.post('http://localhost:3001/api/sessions', () => {
          return HttpResponse.json(
            { error: { message: 'Validation Error', code: 'VALIDATION_ERROR' } },
            { status: 400 }
          );
        })
      );

      render(
        <TestWrapper>
          <SessionsList />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sessions')).toBeInTheDocument();
      });

      // Click create button
      const createButton = screen.getByTestId('create-session');
      createButton.click();

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create session');
      });
    });
  });

  describe('Performance Integration', () => {
    it('should track performance metrics with React Query', async () => {
      let apiClient: any;

      const MetricsComponent: React.FC = () => {
        const [client, setClient] = React.useState<any>(null);
        const [metrics, setMetrics] = React.useState<any[]>([]);

        React.useEffect(() => {
          const loadClient = async () => {
            const { EnhancedApiClient } = await import('../services/enhanced-api-client');
            const newClient = new EnhancedApiClient('http://localhost:3001/api');
            setClient(newClient);
            apiClient = newClient;
          };
          loadClient();
        }, []);

        const { data } = useQuery({
          queryKey: ['sessions-metrics'],
          queryFn: () => client?.get('/sessions'),
          enabled: !!client,
          onSuccess: () => {
            if (client) {
              setMetrics(client.getPerformanceMetrics());
            }
          },
        });

        return (
          <div>
            <div data-testid="metrics-count">{metrics.length}</div>
            <div data-testid="avg-duration">
              {client ? client.getAverageRequestDuration() : 0}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <MetricsComponent />
        </TestWrapper>
      );

      // Wait for metrics to be recorded
      await waitFor(() => {
        const metricsCount = screen.getByTestId('metrics-count');
        expect(parseInt(metricsCount.textContent || '0')).toBeGreaterThan(0);
      });

      // Check average duration is recorded
      await waitFor(() => {
        const avgDuration = screen.getByTestId('avg-duration');
        expect(parseInt(avgDuration.textContent || '0')).toBeGreaterThanOrEqual(0);
      });
    });
  });
});