/**
 * Custom API Client Generator for VN Speech Guardian
 * Type-safe client based on OpenAPI schema without orval dependency
 * Tích hợp với NestJS backend endpoints và TanStack Query
 */

import type { components } from '../schemas/generated/api-types'
import { apiClient as enhancedApiClient } from './enhanced-api-client'

// Extract types from OpenAPI schema
export type UserDto = components['schemas']['UserSwaggerDto']
export type SessionDto = components['schemas']['SessionDto']
export type DetectionDto = components['schemas']['DetectionDto']
export type TranscriptDto = components['schemas']['TranscriptDto']
export type CreateSessionDto = components['schemas']['CreateSessionDto']
export type StatsOverviewDto = components['schemas']['StatsOverviewDto']

// Response wrapper types
export type SessionResponseDto = components['schemas']['SessionResponseDto']
export type SessionListResponseDto = components['schemas']['SessionListResponseDto']
export type SessionCreateResponseDto = components['schemas']['SessionCreateResponseDto']
export type TranscriptListResponseDto = components['schemas']['TranscriptListResponseDto']
export type StatsOverviewResponseDto = components['schemas']['StatsOverviewResponseDto']

// Query parameters
export type SessionsListParams = {
  page?: string | number
  perPage?: string | number
}

/**
 * Type-safe API client cho VN Speech Guardian
 * Hand-crafted thay vì orval-generated để tránh dependency conflicts
 */
export const apiClient = {
  // Auth endpoints
  auth: {
    /**
     * Verify Clerk JWT token
     * POST /api/auth/clerk
     */
    verifyClerkToken: async (token: string): Promise<UserDto> => {
      const response = await enhancedApiClient.post<{ success: boolean; data: UserDto }>(
        '/api/auth/clerk',
        { token }
      )
      return response.data
    },

    /**
     * Get current user
     * GET /api/auth/me
     */
    getCurrentUser: async (): Promise<UserDto> => {
      const response = await enhancedApiClient.get<{ success: boolean; data: UserDto }>(
        '/api/auth/me'
      )
      return response.data
    },
  },

  // Session endpoints
  sessions: {
    /**
     * List sessions with pagination
     * GET /api/sessions
     */
    list: async (params: SessionsListParams = {}): Promise<SessionListResponseDto> => {
      const response = await enhancedApiClient.get<SessionListResponseDto>(
        '/api/sessions',
        { params }
      )
      return response
    },

    /**
     * Create new session
     * POST /api/sessions
     */
    create: async (data: CreateSessionDto): Promise<SessionDto> => {
      const response = await enhancedApiClient.post<SessionCreateResponseDto>(
        '/api/sessions',
        data
      )
      return response.data
    },

    /**
     * Get session by ID
     * GET /api/sessions/{id}
     */
    get: async (id: string): Promise<SessionDto> => {
      const response = await enhancedApiClient.get<SessionResponseDto>(
        `/api/sessions/${id}`
      )
      return response.data
    },

    /**
     * Delete session
     * DELETE /api/sessions/{id}
     */
    delete: async (id: string): Promise<void> => {
      await enhancedApiClient.delete(`/api/sessions/${id}`)
    },

    /**
     * Get transcripts for session
     * GET /api/sessions/{id}/transcripts
     */
    transcripts: async (id: string): Promise<TranscriptDto[]> => {
      const response = await enhancedApiClient.get<TranscriptListResponseDto>(
        `/api/sessions/${id}/transcripts`
      )
      return response.data.items
    },
  },

  // Stats endpoints
  stats: {
    /**
     * Get overview statistics
     * GET /api/stats/overview
     */
    overview: async (): Promise<StatsOverviewDto> => {
      const response = await enhancedApiClient.get<StatsOverviewResponseDto>(
        '/api/stats/overview'
      )
      return response.data
    },
  },

  // Health endpoints
  health: {
    /**
     * Health check
     * GET /health
     */
    check: async (): Promise<{ status: string }> => {
      const response = await enhancedApiClient.get<{ status: string }>('/health')
      return response
    },

    /**
     * Readiness check
     * GET /ready
     */
    ready: async (): Promise<{ status: string }> => {
      const response = await enhancedApiClient.get<{ status: string }>('/ready')
      return response
    },
  },

  // Metrics endpoint
  metrics: {
    /**
     * Get application metrics
     * GET /metrics
     */
    get: async (): Promise<string> => {
      const response = await enhancedApiClient.get<string>('/metrics')
      return response
    },
  },
}

// Export enhanced client for direct use
export { enhancedApiClient }

// Default export
export default apiClient