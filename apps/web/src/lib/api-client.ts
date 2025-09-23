/**
 * Custom API client instance for VN Speech Guardian
 * Integrates với Clerk authentication, error handling, and React 19 patterns
 */

import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Clerk token provider function type
type TokenProvider = () => Promise<string | null>

// Global token provider - will be set by auth hook
let globalTokenProvider: TokenProvider | null = null

/**
 * Set global token provider function
 * Called by useAuth hook to provide token access
 */
export const setTokenProvider = (provider: TokenProvider): void => {
  globalTokenProvider = provider
}

// Create Axios instance với professional configuration
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': '1.0.0',
  },
  withCredentials: true, // Include cookies for auth
});

// Request interceptor - Auto-inject Clerk JWT
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Inject Clerk JWT token
      if (globalTokenProvider) {
        const token = await globalTokenProvider()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
      
      // Add request ID for tracing
      config.headers['X-Request-ID'] = crypto.randomUUID();
      
      // Add timestamp
      config.headers['X-Request-Time'] = new Date().toISOString();
      
      return config;
    } catch (error) {
      console.warn('Failed to setup request headers:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors với sophisticated retry logic
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful requests trong development
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.status);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Auto-retry logic for network errors
    if (error.code === 'NETWORK_ERROR' && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      if (originalRequest._retryCount <= 3) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, originalRequest._retryCount - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`🔄 Retrying request (${originalRequest._retryCount}/3) after ${delay}ms`);
        return axiosInstance(originalRequest);
      }
    }
    
    // Handle specific error status codes
    if (error.response?.status === 401) {
      console.error('🔐 Authentication failed - redirecting to login');
      // TODO: Implement proper auth error handling trong P22
      // window.location.href = '/login';
    } else if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || '60';
      console.warn(`⚠️ Rate limited - retry after ${retryAfter} seconds`);
    } else if (error.response?.status && error.response.status >= 500) {
      console.error('🔥 Server error:', error.response.data);
    }
    
    // Enhanced error logging trong development
    if (import.meta.env.DEV) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });
    }
    
    return Promise.reject(error);
  }
);

// Custom instance function compatible với orval
export const customInstance = <T = unknown>(config: AxiosRequestConfig): Promise<T> => {
  const source = axios.CancelToken.source();
  
  const promise = axiosInstance({
    ...config,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // Add cancel method cho request cancellation
  (promise as any).cancel = () => {
    source.cancel('Query was cancelled by React Query');
  };

  return promise;
};

// Export configured axios instance cho direct usage
export { axiosInstance };

// Types cho error handling
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
  statusCode: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
  };
  error?: ApiError;
}

// Utility functions cho API responses
export const isApiError = (response: any): response is { error: ApiError } => {
  return response && !response.success && response.error;
};

export const extractApiData = <T>(response: ApiResponse<T>): T => {
  if (isApiError(response)) {
    throw new Error(response.error.message);
  }
  return response.data;
};