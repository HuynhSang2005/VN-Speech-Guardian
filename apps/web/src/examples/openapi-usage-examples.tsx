/**
 * Example usage of generated OpenAPI hooks for VN Speech Guardian
 * Demonstrates modern React 19 patterns với TanStack Query v5 integration
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  useAuthControllerVerifyClerkToken,
  useSessionsControllerCreate,
  useSessionsControllerRemove,
  getStatsControllerOverviewQueryOptions,
  getSessionsControllerListQueryOptions,
  getSessionsControllerGetQueryOptions,
} from '@/api/generated/vNSpeechGuardianAPI';
import type { 
  SessionDto, 
  CreateSessionDto,
  StatsOverviewResponseDto,
  SessionListResponseDto 
} from '@/schemas/generated';
import { customInstance } from '@/lib/api-client';

// Example 1: Dashboard Stats với auto-refresh
export function DashboardStatsCard() {
  const { 
    data: statsResponse, 
    isLoading, 
    error
  } = useQuery({
    ...getStatsControllerOverviewQueryOptions(),
    // TanStack Query v5 options
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (isLoading) return <div>Loading stats...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;
  
  const stats = (statsResponse as StatsOverviewResponseDto)?.data;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="stats-card">
        <h3>Total Sessions</h3>
        <p className="text-2xl font-bold">{stats?.totalSessions}</p>
      </div>
      <div className="stats-card">
        <h3>Total Detections</h3>
        <p className="text-2xl font-bold">{stats?.totalDetections}</p>
      </div>
      <div className="stats-card">
        <h3>Toxic Percentage</h3>
        <p className="text-2xl font-bold">{stats?.toxicPercent}%</p>
      </div>
    </div>
  );
}

// Example 2: Sessions List với pagination
export function SessionsList() {
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);

  const { 
    data: sessionsResponse,
    isLoading,
    error,
    isPreviousData
  } = useQuery({
    ...getSessionsControllerListQueryOptions({ 
      page: page.toString(), 
      perPage: perPage.toString() 
    }),
    keepPreviousData: true, // Maintain previous data during pagination
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const sessions = (sessionsResponse as SessionListResponseDto)?.data.items || [];
  const total = (sessionsResponse as SessionListResponseDto)?.data.total || 0;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <h2>Sessions ({total} total)</h2>
      
      {isLoading && <div>Loading sessions...</div>}
      {error && <div>Error: {(error as Error).message}</div>}
      
      <div className="sessions-table">
        {sessions.map((session: SessionDto) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </div>
      
      {/* Pagination */}
      <div className="pagination">
        <button 
          disabled={page === 1} 
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button 
          disabled={page === totalPages} 
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
      
      {isPreviousData && <div>Loading new page...</div>}
    </div>
  );
}

// Example 3: Create Session với React 19 useActionState pattern
export function CreateSessionForm() {
  const queryClient = useQueryClient();
  
  const createSessionMutation = useSessionsControllerCreate({
    mutation: {
      onSuccess: (response) => {
        console.log('✅ Session created:', response.data);
        
        // Invalidate and refetch sessions list
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        
        // Optimistically update stats
        queryClient.setQueryData(['stats', 'overview'], (old: StatsOverviewResponseDto | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              totalSessions: old.data.totalSessions + 1
            }
          };
        });
      },
      onError: (error) => {
        console.error('❌ Failed to create session:', error);
      }
    }
  });

  const handleSubmit = (formData: FormData) => {
    const device = formData.get('device') as string;
    const sessionData: CreateSessionDto = {
      userId: formData.get('userId') as string,
      ...(device && { device }), // Only include device if it has a value
      lang: (formData.get('lang') as string) || 'vi',
    };

    createSessionMutation.mutate({ data: sessionData });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="userId">User ID</label>
        <input 
          id="userId" 
          name="userId" 
          required 
          className="input"
        />
      </div>
      
      <div>
        <label htmlFor="device">Device (optional)</label>
        <input 
          id="device" 
          name="device" 
          placeholder="e.g. Chrome on Windows" 
          className="input"
        />
      </div>
      
      <div>
        <label htmlFor="lang">Language</label>
        <select id="lang" name="lang" defaultValue="vi" className="select">
          <option value="vi">Vietnamese</option>
          <option value="en">English</option>
        </select>
      </div>
      
      <button 
        type="submit" 
        disabled={createSessionMutation.isPending}
        className="btn btn-primary"
      >
        {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
      </button>
      
      {createSessionMutation.error && (
        <div className="error">
          Error: {(createSessionMutation.error as Error).message}
        </div>
      )}
    </form>
  );
}

// Example 4: Session Detail với dependent queries
export function SessionDetail({ sessionId }: { sessionId: string }) {
  // Main session data
  const { 
    data: sessionResponse,
    isLoading: sessionLoading,
    error: sessionError
  } = useQuery({
    ...getSessionsControllerGetQueryOptions(sessionId),
    enabled: !!sessionId, // Only run if sessionId exists
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (sessionLoading) return <div>Loading session...</div>;
  if (sessionError) return <div>Error: {(sessionError as Error).message}</div>;

  const session = sessionResponse?.data;

  return (
    <div className="space-y-6">
      <div className="session-header">
        <h1>Session {session?.id}</h1>
        <p>Started: {new Date(session?.startedAt || '').toLocaleString()}</p>
        <p>Status: {session?.endedAt ? 'Completed' : 'Active'}</p>
      </div>
    </div>
  );
}

// Example 5: Delete Session với optimistic updates
function SessionRow({ session }: { session: SessionDto }) {
  const queryClient = useQueryClient();
  
  const deleteSessionMutation = useSessionsControllerRemove({
    mutation: {
      onMutate: async (sessionId: string) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['sessions'] });
        
        // Snapshot previous value
        const previousSessions = queryClient.getQueryData(['sessions']);
        
        // Optimistically remove session từ cache
        queryClient.setQueryData(['sessions'], (old: SessionListResponseDto | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.filter((s: SessionDto) => s.id !== sessionId)
            }
          };
        });
        
        return { previousSessions };
      },
      
      onError: (error, _sessionId, context) => {
        // Rollback on error
        if (context?.previousSessions) {
          queryClient.setQueryData(['sessions'], context.previousSessions);
        }
        console.error('❌ Failed to delete session:', error);
      },
      
      onSettled: () => {
        // Always refetch after error or success
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
      }
    }
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this session?')) {
      deleteSessionMutation.mutate(session.id);
    }
  };

  return (
    <div className="session-row">
      <div>
        <strong>{session.id}</strong>
        <p>Language: {session.lang}</p>
        <p>Device: {session.device || 'Unknown'}</p>
      </div>
      
      <div className="session-actions">
        <button 
          onClick={handleDelete}
          disabled={deleteSessionMutation.isPending}
          className="btn btn-danger"
        >
          {deleteSessionMutation.isPending ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

// Example 6: Authentication với Clerk integration (placeholder for P22)
export function AuthExample() {
  const authMutation = useAuthControllerVerifyClerkToken({
    mutation: {
      onSuccess: (response) => {
        console.log('✅ Authentication successful:', response);
        // Store user data, redirect, etc.
      },
      onError: (error) => {
        console.error('❌ Authentication failed:', error);
      }
    }
  });

  const handleAuth = (token: string) => {
    authMutation.mutate({ 
      data: { token } 
    });
  };

  return (
    <div>
      <button 
        onClick={() => handleAuth('mock-clerk-token')}
        disabled={authMutation.isPending}
      >
        {authMutation.isPending ? 'Authenticating...' : 'Authenticate'}
      </button>
    </div>
  );
}

// Export all examples for documentation
export const OpenAPIExamples = {
  DashboardStatsCard,
  SessionsList,
  CreateSessionForm,
  SessionDetail,
  AuthExample,
};