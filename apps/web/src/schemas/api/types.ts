/**
 * API Integration Types
 * Types for API requests, responses, và HTTP client integration
 * Re-exports và transforms from generated OpenAPI types
 */

// Import generated OpenAPI types from components.schemas
import type { components } from '../generated/api-types'

// Re-export generated OpenAPI types with convenient aliases
export type ApiUser = components['schemas']['UserSwaggerDto']
export type ApiSession = components['schemas']['SessionDto']
export type ApiDetection = components['schemas']['DetectionDto']
export type ApiTranscript = components['schemas']['TranscriptDto']
export type ApiCreateSession = components['schemas']['CreateSessionDto']
export type ApiStatsOverview = components['schemas']['StatsOverviewDto']
export type ApiSessionListItem = components['schemas']['SessionListItemDto']
export type ApiTranscriptListItem = components['schemas']['TranscriptListItemDto']

// Response wrapper types (generated from operations)
export type ApiSessionResponse = components['schemas']['SessionResponseDto']
export type ApiSessionListResponse = components['schemas']['SessionListResponseDto']
export type ApiSessionCreateResponse = components['schemas']['SessionCreateResponseDto']
export type ApiTranscriptListResponse = components['schemas']['TranscriptListResponseDto']
export type ApiStatsOverviewResponse = components['schemas']['StatsOverviewResponseDto']

// =============================================================================
// Request Parameter Types
// =============================================================================

export interface SessionsListParams {
  page?: string | number
  perPage?: string | number
  status?: 'active' | 'completed' | 'failed'
  userId?: string
  dateFrom?: string
  dateTo?: string
  orderBy?: 'startedAt' | 'endedAt' | 'detectionsCount'
  sortOrder?: 'asc' | 'desc'
}

export interface SessionsFilterParams {
  search?: string
  severity?: ('CLEAN' | 'OFFENSIVE' | 'HATE')[]
  dateRange?: {
    start: string
    end: string
  }
}

// =============================================================================
// API Error Types
// =============================================================================

export interface ApiErrorResponse {
  success: false
  error: {
    message: string
    code: string
    details?: Record<string, unknown>
  }
  timestamp?: string
}

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
    }
    timestamp?: string
  }
}

// Union type for all API responses
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// =============================================================================
// Clerk Integration Types
// =============================================================================

export interface ClerkTokenRequest {
  token: string
}

export interface ClerkUserSync {
  userId: string
  clerkId: string
  email: string
  role: string
}

// =============================================================================
// Real-time API Types (WebSocket)
// =============================================================================

export interface WebSocketMessage {
  type: string
  sessionId?: string
  data: unknown
  timestamp: string
}

export interface TranscriptMessage extends WebSocketMessage {
  type: 'transcript'
  data: {
    segmentIndex: number
    text: string
    startTimeMs: number
    endTimeMs: number
    confidence: number
    isFinal: boolean
  }
}

export interface DetectionMessage extends WebSocketMessage {
  type: 'detection'
  data: {
    label: 'CLEAN' | 'OFFENSIVE' | 'HATE'
    confidence: number
    startTimeMs: number
    endTimeMs: number
    snippet: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
  }
}

export interface SessionStatusMessage extends WebSocketMessage {
  type: 'session_status'
  data: {
    status: 'started' | 'ended' | 'error'
    message?: string
  }
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error'
  data: {
    code: string
    message: string
    recoverable: boolean
  }
}

// Union type for all WebSocket messages
export type WebSocketEventMessage = 
  | TranscriptMessage 
  | DetectionMessage 
  | SessionStatusMessage 
  | ErrorMessage

// =============================================================================
// HTTP Client Configuration Types
// =============================================================================

export interface ApiClientConfig {
  baseURL: string
  timeout: number
  retries: number
  retryDelay: number
  headers?: Record<string, string>
}

export interface RequestConfig {
  retry?: boolean
  silent?: boolean
  skipAuth?: boolean
  timeout?: number
  signal?: AbortSignal
}

// =============================================================================
// File Upload Types
// =============================================================================

export interface FileUploadRequest {
  file: File | Blob | ArrayBuffer
  filename?: string
  contentType?: string
}

export interface FileUploadResponse {
  url: string
  filename: string
  size: number
  contentType: string
  uploadedAt: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

// =============================================================================
// Batch Operations
// =============================================================================

export interface BatchRequest<T = unknown> {
  items: T[]
  options?: {
    stopOnError: boolean
    parallel: boolean
  }
}

export interface BatchResponse<T = unknown> {
  results: Array<{
    success: boolean
    data?: T
    error?: string
  }>
  summary: {
    total: number
    succeeded: number
    failed: number
  }
}

// =============================================================================
// Cache Types
// =============================================================================

export interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
  ttl: number
}

export interface CacheOptions {
  ttl?: number
  key?: string
  tags?: string[]
}

// All API types are exported automatically