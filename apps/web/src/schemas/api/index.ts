/**
 * API Schema Module Index
 * Centralized exports cho tất cả API types, clients, và hooks
 * Single import point cho API integration
 */

// Import for type guards and default export
import { apiClient, queryKeys } from './client'
import type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from './types'

// =============================================================================
// Core API Types
// =============================================================================

export type {
  // Generated OpenAPI Types
  ApiUser,
  ApiSession,
  ApiDetection,
  ApiTranscript,
  ApiCreateSession,
  ApiStatsOverview,
  ApiSessionListItem,
  ApiTranscriptListItem,
  
  // Response Types
  ApiSessionResponse,
  ApiSessionListResponse,
  ApiSessionCreateResponse,
  ApiTranscriptListResponse,
  ApiStatsOverviewResponse,
  
  // Request Parameter Types
  SessionsListParams,
  SessionsFilterParams,
  
  // Generic API Types
  ApiResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
  RequestConfig,
  ApiClientConfig,
  BatchRequest,
  BatchResponse,
  
  // WebSocket Types
  WebSocketMessage,
  TranscriptMessage,
  DetectionMessage,
  SessionStatusMessage,
  ErrorMessage,
  WebSocketEventMessage,
  
  // File Upload Types
  FileUploadRequest,
  FileUploadResponse,
  UploadProgress,
  
  // Cache Types
  CacheEntry,
  CacheOptions,
} from './types'

// =============================================================================
// HTTP Client
// =============================================================================

export {
  // Client Factory
  createApiClient,
  createAuthenticatedClient,
  apiClient,
  
  // Request Helpers
  makeRequest,
  makeBatchRequest,
  uploadFile,
  
  // Configuration
  API_CONFIG,
  
  // Error Classes
  ApiError,
  NetworkError,
  TimeoutError,
  
  // Error Utilities
  isApiError,
  isNetworkError,
  isTimeoutError,
  getErrorMessage,
  
  // Query Keys
  queryKeys,
} from './client'

// =============================================================================
// React Hooks
// =============================================================================

export {
  // Client Hook
  useApiClient,
  
  // User Hooks
  useCurrentUser,
  
  // Session Hooks
  useSessionsList,
  useSession,
  useCreateSession,
  useDeleteSession,
  useUpdateSession,
  
  // Transcript Hooks
  useTranscriptsList,
  useTranscript,
  
  // Stats Hooks
  useStatsOverview,
  
  // Utility Hooks
  useOptimisticUpdate,
  usePrefetch,
  useCacheManager,
  useApiErrorHandler,
} from './hooks'

// =============================================================================
// OpenAPI Generated Types (Re-export)
// =============================================================================

export type { components, paths, operations } from '../generated/api-types'

// =============================================================================
// Legacy Schema Exports (Zod-based)
// =============================================================================

// Authentication schemas
export * from './auth.schemas';

// Session management schemas  
export * from './sessions.schemas';

// Re-export common validation utilities
export * from '../../lib/validation';

// =============================================================================
// Utility Constants
// =============================================================================

export const API_ENDPOINTS = {
  // Auth
  AUTH_PROFILE: '/auth/profile',
  
  // Sessions
  SESSIONS: '/sessions',
  SESSION_BY_ID: (id: string) => `/sessions/${id}`,
  SESSION_TRANSCRIPTS: (id: string) => `/sessions/${id}/transcripts`,
  
  // Transcripts
  TRANSCRIPTS: '/transcripts',
  TRANSCRIPT_BY_ID: (id: string) => `/transcripts/${id}`,
  
  // Stats
  STATS_OVERVIEW: '/stats/overview',
  
  // Health
  HEALTH: '/health',
  READY: '/ready',
  METRICS: '/metrics',
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

export const API_ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Unknown
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

// =============================================================================
// Type Guards
// =============================================================================

export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true
}

export function isErrorResponse(
  response: ApiResponse<unknown>
): response is ApiErrorResponse {
  return response.success === false
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  // Main client
  client: apiClient,
  
  // Constants
  endpoints: API_ENDPOINTS,
  status: HTTP_STATUS,
  errorCodes: API_ERROR_CODES,
  
  // Query keys factory
  queryKeys,
}