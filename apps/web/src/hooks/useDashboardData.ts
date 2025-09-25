/**
 * Dashboard Data Hook (P27.5)
 * Real-time data integration với Socket.IO và REST API
 * Optimistic updates, error handling, retry logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { apiClient } from '../services/api';
import type { 
  DashboardStats, 
  Session, 
  SessionsResponse,
  RecentActivity 
} from '@/types/components';

// Types for dashboard data management
interface DashboardDataState {
  isOnline: boolean;
  lastUpdated: Date | null;
  realtimeEnabled: boolean;
  error: string | null;
}

interface SessionFilters {
  page?: number;
  limit?: number;
  status?: 'completed' | 'processing' | 'failed' | 'ALL';
  severity?: 'CLEAN' | 'OFFENSIVE' | 'HATE' | 'ALL';
  search?: string;
  sortBy?: keyof Session;
  sortOrder?: 'asc' | 'desc';
  dateRange?: {
    start: string;
    end: string;
  };
}

interface UseDashboardDataReturn {
  // Dashboard Overview Data
  stats: DashboardStats | undefined;
  sessions: Session[];
  recentActivity: RecentActivity[];
  
  // Loading & Error States
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Pagination & Filtering
  totalSessions: number;
  currentPage: number;
  totalPages: number;
  filters: SessionFilters;
  
  // Real-time State
  realtimeState: DashboardDataState;
  
  // Actions
  actions: {
    refreshAll: () => Promise<void>;
    updateFilters: (newFilters: Partial<SessionFilters>) => void;
    changePage: (page: number) => void;
    toggleRealtime: () => void;
    exportSessions: (format: 'csv' | 'json') => Promise<void>;
    retryFailedRequests: () => void;
  };
}

// Custom hook for dashboard data management
export function useDashboardData(initialFilters: SessionFilters = {}): UseDashboardDataReturn {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();
  
  // Local state management
  const [filters, setFilters] = useState<SessionFilters>({
    page: 1,
    limit: 20,
    status: 'ALL',
    severity: 'ALL',
    search: '',
    sortBy: 'startTime',
    sortOrder: 'desc',
    ...initialFilters,
  });
  
  const [realtimeState, setRealtimeState] = useState<DashboardDataState>({
    isOnline: navigator.onLine,
    lastUpdated: null,
    realtimeEnabled: true,
    error: null,
  });
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Query keys for cache management
  const statsQueryKey = ['dashboard', 'stats'];
  const sessionsQueryKey = ['dashboard', 'sessions', filters];
  const recentActivityQueryKey = ['dashboard', 'recent-activity'];

  // Dashboard Stats Query với stale-while-revalidate strategy
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: statsQueryKey,
    queryFn: () => apiClient.stats.overview(),
    staleTime: 30000, // 30 seconds
    gcTime: 300000,   // 5 minutes
    retry: (failureCount, error) => {
      // Retry logic for network errors
      return failureCount < 3 && error.message.includes('network');
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Sessions Query với pagination and filtering
  const {
    data: sessionsResponse,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery<SessionsResponse>({
    queryKey: sessionsQueryKey,
    queryFn: () => apiClient.sessions.list(filters),
    staleTime: 15000, // 15 seconds
    gcTime: 300000,   // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data during pagination
    retry: 2,
  });

  // Recent Activity Query
  const {
    data: recentActivity = [],
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: recentActivityQueryKey,
    queryFn: () => apiClient.activity.recent(10),
    staleTime: 10000, // 10 seconds
    gcTime: 60000,    // 1 minute
    retry: 1,
  });

  // Export Sessions Mutation
  const exportMutation = useMutation({
    mutationFn: async ({ format }: { format: 'csv' | 'json' }) => {
      const response = await apiClient.sessions.export(filters, format);
      
      // Download file
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sessions-export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return response;
    },
    onSuccess: () => {
      console.log('✅ Sessions exported successfully');
    },
    onError: (error) => {
      console.error('❌ Export failed:', error);
      setRealtimeState(prev => ({ ...prev, error: 'Export failed' }));
    },
  });

  // Real-time updates với Socket.IO
  useEffect(() => {
    if (!socket || !isConnected || !realtimeState.realtimeEnabled) return;

    // Listen for dashboard updates
    socket.on('dashboard:stats-update', (newStats: DashboardStats) => {
      queryClient.setQueryData(statsQueryKey, newStats);
      setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }));
    });

    socket.on('dashboard:session-update', (updatedSession: Session) => {
      queryClient.setQueryData<SessionsResponse>(sessionsQueryKey, (old) => {
        if (!old) return old;
        
        const updatedSessions = old.sessions.map(session =>
          session.id === updatedSession.id ? { ...session, ...updatedSession } : session
        );
        
        return { ...old, sessions: updatedSessions };
      });
    });

    socket.on('dashboard:new-activity', (activity: RecentActivity) => {
      queryClient.setQueryData<RecentActivity[]>(recentActivityQueryKey, (old = []) => {
        return [activity, ...old.slice(0, 9)]; // Keep only 10 most recent
      });
    });

    // Handle connection errors
    socket.on('disconnect', () => {
      setRealtimeState(prev => ({ 
        ...prev, 
        error: 'Real-time connection lost',
        isOnline: false 
      }));
    });

    socket.on('connect', () => {
      setRealtimeState(prev => ({ 
        ...prev, 
        error: null,
        isOnline: true 
      }));
    });

    return () => {
      socket.off('dashboard:stats-update');
      socket.off('dashboard:session-update');
      socket.off('dashboard:new-activity');
      socket.off('disconnect');
      socket.off('connect');
    };
  }, [socket, isConnected, realtimeState.realtimeEnabled, queryClient, statsQueryKey, sessionsQueryKey, recentActivityQueryKey]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setRealtimeState(prev => ({ ...prev, isOnline: true, error: null }));
      // Refetch all data when coming back online
      refreshAll();
    };

    const handleOffline = () => {
      setRealtimeState(prev => ({ 
        ...prev, 
        isOnline: false,
        error: 'You are currently offline' 
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  // Auto-refresh setup (fallback when real-time is disabled)
  useEffect(() => {
    if (realtimeState.realtimeEnabled || !realtimeState.isOnline) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      return;
    }

    // Refresh data every 30 seconds when real-time is off
    refreshIntervalRef.current = setInterval(() => {
      refetchStats();
      refetchSessions();
      refetchActivity();
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [realtimeState.realtimeEnabled, realtimeState.isOnline, refetchStats, refetchSessions, refetchActivity]);

  // Action handlers
  const refreshAll = useCallback(async () => {
    try {
      setRealtimeState(prev => ({ ...prev, error: null }));
      
      await Promise.all([
        refetchStats(),
        refetchSessions(),
        refetchActivity(),
      ]);
      
      setRealtimeState(prev => ({ ...prev, lastUpdated: new Date() }));
    } catch (error) {
      console.error('❌ Failed to refresh dashboard data:', error);
      setRealtimeState(prev => ({ 
        ...prev, 
        error: 'Failed to refresh data' 
      }));
    }
  }, [refetchStats, refetchSessions, refetchActivity]);

  const updateFilters = useCallback((newFilters: Partial<SessionFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page || 1, // Reset to page 1 when filters change
    }));
  }, []);

  const changePage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const toggleRealtime = useCallback(() => {
    setRealtimeState(prev => ({ 
      ...prev, 
      realtimeEnabled: !prev.realtimeEnabled 
    }));
  }, []);

  const exportSessions = useCallback(async (format: 'csv' | 'json') => {
    await exportMutation.mutateAsync({ format });
  }, [exportMutation]);

  const retryFailedRequests = useCallback(() => {
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Retry with exponential backoff
    retryTimeoutRef.current = setTimeout(() => {
      refreshAll();
    }, 1000);
  }, [refreshAll]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Computed values
  const isLoading = statsLoading || sessionsLoading || activityLoading;
  const isError = Boolean(statsError || sessionsError || activityError);
  const error = statsError || sessionsError || activityError || null;
  const sessions = (sessionsResponse as SessionsResponse)?.sessions || [];
  const totalSessions = (sessionsResponse as SessionsResponse)?.pagination.total || 0;
  const totalPages = (sessionsResponse as SessionsResponse)?.pagination.totalPages || 1;
  const currentPage = filters.page || 1;

  return {
    // Data
    stats,
    sessions,
    recentActivity,
    
    // States
    isLoading,
    isError,
    error,
    
    // Pagination
    totalSessions,
    currentPage,
    totalPages,
    filters,
    
    // Real-time
    realtimeState,
    
    // Actions
    actions: {
      refreshAll,
      updateFilters,
      changePage,
      toggleRealtime,
      exportSessions,
      retryFailedRequests,
    },
  };
}

// Performance optimization hook for heavy components
export function useDashboardPerformance() {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    queryCount: 0,
    realtimeEvents: 0,
  });

  const trackRender = useCallback((componentName: string, startTime: number) => {
    const renderTime = performance.now() - startTime;
    
    if (renderTime > 16.67) { // > 60fps threshold
      console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
    
    setPerformanceMetrics(prev => ({
      ...prev,
      renderTime: Math.max(prev.renderTime, renderTime),
    }));
  }, []);

  const trackQuery = useCallback(() => {
    setPerformanceMetrics(prev => ({
      ...prev,
      queryCount: prev.queryCount + 1,
    }));
  }, []);

  const trackRealtimeEvent = useCallback(() => {
    setPerformanceMetrics(prev => ({
      ...prev,
      realtimeEvents: prev.realtimeEvents + 1,
    }));
  }, []);

  return {
    performanceMetrics,
    trackRender,
    trackQuery,
    trackRealtimeEvent,
  };
}