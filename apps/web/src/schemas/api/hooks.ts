/**
 * API React Hooks với TanStack Query Integration
 * Cung cấp type-safe hooks cho tất cả API endpoints
 * Sử dụng generated OpenAPI types và custom error handling
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// Temporary mock for useAuth - will be replaced with actual Clerk integration
const useAuth = () => ({
  getToken: async () => null as string | null,
})
import { toast } from 'sonner'

// Import API client và types
import { 
  createAuthenticatedClient, 
  queryKeys, 
  isApiError,
  getErrorMessage,
} from './client'

import type {
  ApiSession,
  ApiTranscript,
  ApiStatsOverview,
  ApiCreateSession,
  SessionsListParams,
  ApiUser,
} from './types'

// =============================================================================
// Auth Hook Extension
// =============================================================================

export function useApiClient() {
  const { getToken } = useAuth()
  return createAuthenticatedClient(getToken)
}

// =============================================================================
// User Hooks
// =============================================================================

export function useCurrentUser() {
  const { client } = useApiClient()
  
  return useQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: async (): Promise<ApiUser> => {
      const response = await client.get('/auth/profile')
      return response.data.data
    },
  })
}

// =============================================================================
// Sessions Hooks
// =============================================================================

export function useSessionsList(params: SessionsListParams = {}) {
  const { client } = useApiClient()
  
  return useQuery({
    queryKey: queryKeys.sessionsList(params as Record<string, unknown>),
    queryFn: async (): Promise<{ items: ApiSession[]; total: number }> => {
      const response = await client.get('/sessions', { params })
      return response.data.data
    },
  })
}

export function useSession(id: string) {
  const { client } = useApiClient()
  
  return useQuery({
    queryKey: queryKeys.session(id),
    queryFn: async (): Promise<ApiSession> => {
      const response = await client.get(`/sessions/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useCreateSession() {
  const { client } = useApiClient()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: ApiCreateSession): Promise<ApiSession> => {
      const response = await client.post('/sessions', data)
      return response.data.data
    },
    onSuccess: (session) => {
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() })
      
      // Add to cache
      queryClient.setQueryData(queryKeys.session(session.id), session)
      
      toast.success('Session created successfully')
    },
    onError: (error) => {
      const message = isApiError(error) 
        ? error.message 
        : 'Failed to create session'
      
      toast.error('Session Error', {
        description: message,
      })
    },
  })
}

export function useDeleteSession() {
  const { client } = useApiClient()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await client.delete(`/sessions/${id}`)
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.session(id) })
      
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() })
      
      toast.success('Session deleted successfully')
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      toast.error('Delete Error', {
        description: message,
      })
    },
  })
}

export function useUpdateSession() {
  const { client } = useApiClient()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { 
      id: string
      data: Partial<ApiSession> 
    }): Promise<ApiSession> => {
      const response = await client.patch(`/sessions/${id}`, data)
      return response.data.data
    },
    onSuccess: (session) => {
      // Update cache
      queryClient.setQueryData(queryKeys.session(session.id), session)
      
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() })
      
      toast.success('Session updated successfully')
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      toast.error('Update Error', {
        description: message,
      })
    },
  })
}

// =============================================================================
// Transcripts Hooks
// =============================================================================

export function useTranscriptsList(sessionId: string, params: Record<string, unknown> = {}) {
  const { client } = useApiClient()
  
  return useQuery({
    queryKey: queryKeys.transcriptsList(sessionId, params),
    queryFn: async (): Promise<{ items: ApiTranscript[]; total: number }> => {
      const response = await client.get(`/sessions/${sessionId}/transcripts`, { params })
      return response.data.data
    },
    enabled: !!sessionId,
  })
}

export function useTranscript(id: string) {
  const { client } = useApiClient()
  
  return useQuery({
    queryKey: queryKeys.transcript(id),
    queryFn: async (): Promise<ApiTranscript> => {
      const response = await client.get(`/transcripts/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

// =============================================================================
// Stats Hooks
// =============================================================================

export function useStatsOverview(params: Record<string, unknown> = {}) {
  const { client } = useApiClient()
  
  return useQuery({
    queryKey: queryKeys.statsOverview(params),
    queryFn: async (): Promise<ApiStatsOverview> => {
      const response = await client.get('/stats/overview', { params })
      return response.data.data
    },
  })
}

// =============================================================================
// Optimistic Updates Helper
// =============================================================================

export function useOptimisticUpdate<T>(
  queryKey: readonly unknown[],
  updater: (old: T | undefined) => T
) {
  const queryClient = useQueryClient()
  
  return {
    mutate: () => {
      queryClient.setQueryData(queryKey, updater)
    },
    revert: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  }
}

// =============================================================================
// Prefetch Helpers
// =============================================================================

export function usePrefetch() {
  const { client } = useApiClient()
  const queryClient = useQueryClient()
  
  return {
    prefetchSession: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.session(id),
        queryFn: async () => {
          const response = await client.get(`/sessions/${id}`)
          return response.data.data
        },
      })
    },
    
    prefetchTranscripts: (sessionId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.transcriptsList(sessionId),
        queryFn: async () => {
          const response = await client.get(`/sessions/${sessionId}/transcripts`)
          return response.data.data
        },
      })
    },
    
    prefetchStats: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.statsOverview(),
        queryFn: async () => {
          const response = await client.get('/stats/overview')
          return response.data.data
        },
      })
    },
  }
}

// =============================================================================
// Cache Management Hooks
// =============================================================================

export function useCacheManager() {
  const queryClient = useQueryClient()
  
  return {
    // Clear all cached data
    clearAll: () => {
      queryClient.clear()
      toast.info('Cache cleared')
    },
    
    // Clear specific data
    clearSessions: () => {
      queryClient.removeQueries({ queryKey: queryKeys.sessions() })
    },
    
    clearTranscripts: () => {
      queryClient.removeQueries({ queryKey: queryKeys.transcripts() })
    },
    
    clearStats: () => {
      queryClient.removeQueries({ queryKey: queryKeys.stats() })
    },
    
    // Invalidate and refetch
    refreshAll: () => {
      queryClient.invalidateQueries()
      toast.info('Refreshing data...')
    },
    
    refreshSessions: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() })
    },
    
    refreshStats: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() })
    },
    
    // Get cache status
    getCacheStats: () => {
      const cache = queryClient.getQueryCache()
      return {
        queries: cache.getAll().length,
        stale: cache.getAll().filter(q => q.isStale()).length,
        fetching: cache.getAll().filter(q => q.state.fetchStatus === 'fetching').length,
      }
    },
  }
}

// =============================================================================
// Error Boundary Integration
// =============================================================================

export function useApiErrorHandler() {
  return {
    handleError: (error: unknown, context?: string) => {
      console.error(`API Error${context ? ` in ${context}` : ''}:`, error)
      
      if (isApiError(error)) {
        // Handle specific API errors
        switch (error.code) {
          case 'UNAUTHORIZED':
            toast.error('Authentication required', {
              description: 'Please log in to continue',
            })
            break
            
          case 'FORBIDDEN':
            toast.error('Access denied', {
              description: 'You do not have permission for this action',
            })
            break
            
          case 'VALIDATION_ERROR':
            toast.error('Validation failed', {
              description: error.message,
            })
            break
            
          case 'RATE_LIMIT_EXCEEDED':
            toast.error('Too many requests', {
              description: 'Please wait before trying again',
            })
            break
            
          default:
            toast.error('API Error', {
              description: error.message,
            })
        }
      } else {
        // Handle unknown errors
        toast.error('Unexpected Error', {
          description: getErrorMessage(error),
        })
      }
    },
    
    isRetryableError: (error: unknown): boolean => {
      if (isApiError(error)) {
        // Don't retry client errors (4xx)
        return !error.status || error.status >= 500
      }
      return true
    },
  }
}

// =============================================================================
// Type Exports
// =============================================================================

export type { ApiError } from './client'
export type {
  ApiSession,
  ApiTranscript,
  ApiStatsOverview,
  SessionsListParams,
  SessionsFilterParams,
} from './types'