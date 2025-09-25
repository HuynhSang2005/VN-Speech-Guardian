/**
 * Enhanced TanStack Query caching strategies
 * - Optimized default settings cho different data types
 * - Query invalidation strategies
 * - Background refetching patterns
 * - Real-time data synchronization
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'

// Optimized query configurations cho different data types
export const QueryConfigs = {
  // Static data - rarely changes (user profile, app config)
  static: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  },

  // Semi-static data - changes occasionally (dashboard stats, user sessions)
  semiStatic: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always' as const,
  },

  // Dynamic data - changes frequently (live stats, real-time updates)
  dynamic: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always' as const,
    refetchInterval: 1000 * 60, // 1 minute polling
  },

  // Real-time data - immediate updates needed
  realtime: {
    staleTime: 0, // Always stale
    gcTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always' as const,
    refetchInterval: 1000 * 10, // 10 seconds polling
  },

  // Critical data - user authentication, permissions
  critical: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always' as const,
    retry: 5, // More retries for critical data
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
} as const

// Enhanced query client với performance optimizations
export function createOptimizedQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default settings - balanced performance
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        
        // Network behavior
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
        
        // Error handling
        retry: 3,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Performance optimizations
        structuralSharing: true, // Enable for JSON data
        placeholderData: undefined, // Disable by default, enable per query if needed
      },
      mutations: {
        // Mutation defaults
        retry: 1,
        retryDelay: 1000,
      },
    },
  })
}

// Query key factories cho consistent caching
export const QueryKeys = {
  // Authentication queries
  auth: {
    all: ['auth'] as const,
    user: () => [...QueryKeys.auth.all, 'user'] as const,
    permissions: () => [...QueryKeys.auth.all, 'permissions'] as const,
  },

  // Session queries
  sessions: {
    all: ['sessions'] as const,
    lists: () => [...QueryKeys.sessions.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...QueryKeys.sessions.lists(), filters] as const,
    details: () => [...QueryKeys.sessions.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.sessions.details(), id] as const,
    transcripts: (sessionId: string) => [...QueryKeys.sessions.all, 'transcripts', sessionId] as const,
  },

  // Statistics queries
  stats: {
    all: ['stats'] as const,
    overview: () => [...QueryKeys.stats.all, 'overview'] as const,
    charts: (timeRange: string) => [...QueryKeys.stats.all, 'charts', timeRange] as const,
    realtime: () => [...QueryKeys.stats.all, 'realtime'] as const,
  },

  // Detection queries
  detections: {
    all: ['detections'] as const,
    session: (sessionId: string) => [...QueryKeys.detections.all, 'session', sessionId] as const,
    recent: (limit: number) => [...QueryKeys.detections.all, 'recent', limit] as const,
  },
} as const

// Optimized query options factory
export function createQueryOptions<TData, TError = Error>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  config: keyof typeof QueryConfigs = 'semiStatic',
  overrides?: Partial<UseQueryOptions<TData, TError>>
): UseQueryOptions<TData, TError> {
  return {
    queryKey,
    queryFn,
    ...QueryConfigs[config],
    ...overrides,
  }
}

// Invalidation strategies
export class QueryInvalidationManager {
  constructor(private queryClient: QueryClient) {}

  // Invalidate user-related queries
  invalidateAuth() {
    this.queryClient.invalidateQueries({ queryKey: QueryKeys.auth.all })
  }

  // Invalidate session-related queries
  invalidateSession(sessionId?: string) {
    if (sessionId) {
      this.queryClient.invalidateQueries({ queryKey: QueryKeys.sessions.detail(sessionId) })
      this.queryClient.invalidateQueries({ queryKey: QueryKeys.sessions.transcripts(sessionId) })
      this.queryClient.invalidateQueries({ queryKey: QueryKeys.detections.session(sessionId) })
    } else {
      this.queryClient.invalidateQueries({ queryKey: QueryKeys.sessions.all })
    }
  }

  // Invalidate statistics
  invalidateStats() {
    this.queryClient.invalidateQueries({ queryKey: QueryKeys.stats.all })
  }

  // Smart invalidation - only invalidate related queries
  invalidateRelated(queryKey: readonly unknown[]) {
    const [domain] = queryKey as string[]
    
    switch (domain) {
      case 'sessions':
        this.invalidateSession()
        this.invalidateStats() // Sessions affect stats
        break
      case 'detections':
        this.invalidateStats() // Detections affect stats
        break
      case 'auth':
        // Auth changes might affect everything
        this.queryClient.invalidateQueries()
        break
      default:
        this.queryClient.invalidateQueries({ queryKey })
    }
  }

  // Background refresh for critical data
  backgroundRefresh() {
    // Refresh auth silently
    this.queryClient.refetchQueries({ 
      queryKey: QueryKeys.auth.all,
      type: 'active'
    })

    // Refresh real-time stats
    this.queryClient.refetchQueries({ 
      queryKey: QueryKeys.stats.realtime(),
      type: 'active'
    })
  }
}

// Prefetching strategies
export class QueryPrefetchManager {
  constructor(private queryClient: QueryClient) {}

  // Prefetch session list when user navigates to sessions
  async prefetchSessions(filters: Record<string, any> = {}) {
    await this.queryClient.prefetchQuery({
      queryKey: QueryKeys.sessions.list(filters),
      queryFn: () => fetch('/api/sessions').then(res => res.json()),
      ...QueryConfigs.semiStatic,
    })
  }

  // Prefetch session detail on hover
  async prefetchSessionDetail(sessionId: string) {
    await this.queryClient.prefetchQuery({
      queryKey: QueryKeys.sessions.detail(sessionId),
      queryFn: () => fetch(`/api/sessions/${sessionId}`).then(res => res.json()),
      ...QueryConfigs.semiStatic,
    })
  }

  // Prefetch dashboard data
  async prefetchDashboard() {
    const promises = [
      // Overview stats
      this.queryClient.prefetchQuery({
        queryKey: QueryKeys.stats.overview(),
        queryFn: () => fetch('/api/stats/overview').then(res => res.json()),
        ...QueryConfigs.semiStatic,
      }),

      // Chart data
      this.queryClient.prefetchQuery({
        queryKey: QueryKeys.stats.charts('7d'),
        queryFn: () => fetch('/api/stats/charts?range=7d').then(res => res.json()),
        ...QueryConfigs.semiStatic,
      }),
    ]

    await Promise.all(promises)
  }
}

// Enhanced Query Provider với performance optimizations
export function OptimizedQueryProvider({ 
  children,
  client
}: { 
  children: ReactNode
  client?: QueryClient 
}) {
  const queryClient = client || createOptimizedQueryClient()
  
  // Initialize managers
  const invalidationManager = new QueryInvalidationManager(queryClient)
  // const prefetchManager = new QueryPrefetchManager(queryClient) // Available for use

  // Background refresh interval
  if (typeof window !== 'undefined') {
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        invalidationManager.backgroundRefresh()
      }
    }, 1000 * 60 * 2) // Every 2 minutes
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

// Performance monitoring cho queries
export function useQueryPerformance(queryKey: readonly unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now()
    
    return {
      onSuccess: () => {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        if (duration > 1000) {
          console.warn(`Slow query detected: ${JSON.stringify(queryKey)} took ${duration.toFixed(2)}ms`)
        }
      },
      onError: (error: Error) => {
        console.error(`Query failed: ${JSON.stringify(queryKey)}`, error)
      }
    }
  }
  
  return {}
}

export default {
  QueryConfigs,
  QueryKeys,
  createOptimizedQueryClient,
  createQueryOptions,
  QueryInvalidationManager,
  QueryPrefetchManager,
  OptimizedQueryProvider,
  useQueryPerformance,
}