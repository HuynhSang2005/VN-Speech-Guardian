/**
 * API Client Configuration và Base Utilities
 * Cung cấp HTTP client, error handling, và request helpers
 * Sử dụng TypeScript strict typing với OpenAPI generated types
 */

import axios from 'axios'
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { toast } from 'sonner'

// Import API types
import type {
  ApiResponse,
  ApiErrorResponse,
  RequestConfig,
  ApiClientConfig,
  BatchRequest,
  BatchResponse,
} from './types'

// =============================================================================
// Environment Configuration
// =============================================================================

export const API_CONFIG: ApiClientConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second base delay
}

// =============================================================================
// Error Classes
// =============================================================================

export class ApiError extends Error {
  public readonly code: string
  public readonly status: number | undefined
  public readonly data?: unknown

  constructor(message: string, code: string, status?: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.data = data
  }

  static fromResponse(error: AxiosError): ApiError {
    const response = error.response
    const data = response?.data as ApiErrorResponse | undefined

    return new ApiError(
      data?.error?.message || error.message || 'Unknown API error',
      data?.error?.code || 'UNKNOWN_ERROR',
      response?.status,
      data?.error?.details
    )
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network connection failed') {
    super(message, 'NETWORK_ERROR')
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends ApiError {
  constructor(message = 'Request timeout') {
    super(message, 'TIMEOUT_ERROR')
    this.name = 'TimeoutError'
  }
}

// =============================================================================
// HTTP Client Factory
// =============================================================================

export function createApiClient(config: Partial<ApiClientConfig> = {}): AxiosInstance {
  const finalConfig = { ...API_CONFIG, ...config }
  
  const client = axios.create({
    baseURL: finalConfig.baseURL,
    timeout: finalConfig.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...finalConfig.headers,
    },
  })

  // Request interceptor for auth token
  client.interceptors.request.use(
    (config) => {
      // Note: Auth token sẽ được inject bởi useApiClient hook
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      // Convert axios errors to our custom error types
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new TimeoutError()
      }
      
      if (!error.response) {
        throw new NetworkError()
      }

      throw ApiError.fromResponse(error)
    }
  )

  return client
}

// =============================================================================
// Default Client Instance
// =============================================================================

export const apiClient = createApiClient()

// =============================================================================
// Request Helpers với Retry Logic
// =============================================================================

export async function makeRequest<T>(
  request: () => Promise<AxiosResponse<ApiResponse<T>>>,
  config: RequestConfig = {}
): Promise<T> {
  const { retry = true, silent = false } = config
  const retries = API_CONFIG.retries
  
  let lastError: Error | undefined
  const maxAttempts = retry ? retries + 1 : 1

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await request()
      const data = response.data

      // Check if API response indicates success
      if (data.success) {
        return data.data
      } else {
        // API returned error response
        const errorData = data as ApiErrorResponse
        throw new ApiError(
          errorData.error.message,
          errorData.error.code,
          response.status,
          errorData.error.details
        )
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on certain errors
      if (error instanceof ApiError && error.status) {
        // Don't retry 4xx errors (client errors)
        if (error.status >= 400 && error.status < 500) {
          break
        }
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break
      }

      // Wait before retry với exponential backoff
      const delay = API_CONFIG.retryDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // Show error toast unless silent
  if (!silent && lastError) {
    const message = lastError instanceof ApiError 
      ? lastError.message 
      : 'Network error occurred'
    
    toast.error('API Error', {
      description: message,
    })
  }

  throw lastError || new ApiError('Request failed', 'REQUEST_FAILED')
}

// =============================================================================
// Batch Operations Helper
// =============================================================================

export async function makeBatchRequest<T, R>(
  items: T[],
  requestFn: (item: T) => Promise<R>,
  options: BatchRequest<T>['options'] = { stopOnError: false, parallel: true }
): Promise<BatchResponse<R>> {
  const { stopOnError = false, parallel = true } = options
  const results: BatchResponse<R>['results'] = []
  let succeeded = 0
  let failed = 0

  if (parallel) {
    // Execute all requests in parallel
    const promises = items.map(async (item, index) => {
      try {
        const data = await requestFn(item)
        results[index] = { success: true, data }
        succeeded++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        results[index] = { success: false, error: errorMessage }
        failed++
        
        if (stopOnError) {
          throw error
        }
      }
    })

    await Promise.allSettled(promises)
  } else {
    // Execute requests sequentially
    for (const item of items) {
      try {
        const data = await requestFn(item)
        results.push({ success: true, data })
        succeeded++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        results.push({ success: false, error: errorMessage })
        failed++
        
        if (stopOnError) {
          break
        }
      }
    }
  }

  return {
    results,
    summary: {
      total: items.length,
      succeeded,
      failed,
    },
  }
}

// =============================================================================
// File Upload Helper
// =============================================================================

export async function uploadFile(
  file: File | Blob | ArrayBuffer,
  endpoint: string,
  options: {
    filename?: string
    contentType?: string
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  } = {}
): Promise<{ url: string; filename: string; size: number }> {
  const { filename, contentType, onProgress } = options
  
  const formData = new FormData()
  
  if (file instanceof File) {
    formData.append('file', file)
  } else if (file instanceof Blob) {
    formData.append('file', file, filename || 'upload')
  } else {
    // ArrayBuffer -> Blob
    const blob = new Blob([file], { type: contentType || 'application/octet-stream' })
    formData.append('file', blob, filename || 'upload')
  }

  const response = await apiClient.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100)
        onProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage,
        })
      }
    },
  })

  return response.data
}

// =============================================================================
// Auth Helper (to be used with Clerk useAuth hook)
// =============================================================================

export function createAuthenticatedClient(getToken: () => Promise<string | null>) {
  const authenticatedClient = axios.create({
    ...apiClient.defaults,
  })

  // Add auth token to requests
  authenticatedClient.interceptors.request.use(
    async (config) => {
      try {
        const token = await getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (error) {
        console.warn('Failed to get auth token:', error)
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Copy response interceptors from main client
  authenticatedClient.interceptors.response = apiClient.interceptors.response

  return {
    client: authenticatedClient,
    makeRequest: <T>(
      request: () => Promise<AxiosResponse<ApiResponse<T>>>,
      config?: RequestConfig
    ) => makeRequest(request, config),
    makeBatchRequest,
    uploadFile: (
      file: File | Blob | ArrayBuffer,
      endpoint: string,
      options?: Parameters<typeof uploadFile>[2]
    ) => uploadFile(file, endpoint, options),
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

// =============================================================================
// Query Key Factories (for TanStack Query)
// =============================================================================

export const queryKeys = {
  // Sessions
  sessions: () => ['sessions'] as const,
  sessionsList: (params?: Record<string, unknown>) => ['sessions', 'list', params] as const,
  session: (id: string) => ['sessions', id] as const,
  
  // Transcripts
  transcripts: () => ['transcripts'] as const,
  transcriptsList: (sessionId: string, params?: Record<string, unknown>) => 
    ['transcripts', 'list', sessionId, params] as const,
  transcript: (id: string) => ['transcripts', id] as const,
  
  // Stats
  stats: () => ['stats'] as const,
  statsOverview: (params?: Record<string, unknown>) => ['stats', 'overview', params] as const,
  
  // User
  user: () => ['user'] as const,
  userProfile: () => ['user', 'profile'] as const,
} as const