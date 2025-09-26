/**
 * Enhanced API Client với comprehensive error handling và modern patterns
 * Extends basic api-client với additional enterprise features
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { customInstance } from './api-client';

// Enhanced API client configuration
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  tokenProvider?: () => Promise<string | null>;
}

// Standard API response wrapper
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
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Paginated response type
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
  };
}

// Upload progress callback type
export type UploadProgressCallback = (progress: number) => void;

/**
 * Enhanced API client với professional error handling
 */
export class EnhancedApiClient {
  private baseURL: string;
  private retries: number;
  private tokenProvider?: () => Promise<string | null>;

  constructor(config: ApiClientConfig | string = {}) {
    // Support both string baseURL và object config for backward compatibility
    if (typeof config === 'string') {
      this.baseURL = config;
      this.retries = 3;
    } else {
      this.baseURL = config.baseURL || 'http://localhost:3001';
      this.retries = config.retries || 3;
      this.tokenProvider = config.tokenProvider;
    }
  }

  /**
   * Generic request method với retry logic
   */
  private async request<T>(
    config: AxiosRequestConfig,
    retryCount = 0
  ): Promise<T> {
    try {
      // Add auth token if available
      if (this.tokenProvider) {
        const token = await this.tokenProvider();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      const response: AxiosResponse<T> = await customInstance(config);
      return response.data;
    } catch (error: any) {
      // Retry logic for network errors
      if (retryCount < this.retries && this.shouldRetry(error)) {
        await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        return this.request<T>(config, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: any): boolean {
    if (!error.response) return true; // Network errors
    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors và rate limits
  }

  /**
   * Delay utility for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Session Management APIs
  // ============================================================================

  async getSessions(params: any = {}): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/sessions',
      params,
    });
  }

  async createSession(data: any): Promise<any> {
    return this.request({
      method: 'POST',
      url: '/api/sessions',
      data,
    });
  }

  async getSession(id: string): Promise<any> {
    return this.request({
      method: 'GET',
      url: `/api/sessions/${id}`,
    });
  }

  async deleteSession(id: string): Promise<void> {
    return this.request({
      method: 'DELETE',
      url: `/api/sessions/${id}`,
    });
  }

  async uploadAudio(
    sessionId: string, 
    audioData: ArrayBuffer,
    onProgress?: UploadProgressCallback
  ): Promise<any> {
    const formData = new FormData();
    formData.append('audio', new Blob([audioData], { type: 'application/octet-stream' }));
    
    return this.request({
      method: 'POST',
      url: `/api/sessions/${sessionId}/audio`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        const progress = progressEvent.total 
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;
        onProgress(progress);
      } : undefined,
    });
  }

  // ============================================================================
  // Stats & Analytics APIs  
  // ============================================================================

  async getStats(): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/api/stats/overview',
    });
  }

  // ============================================================================
  // Health Check API
  // ============================================================================

  async healthCheck(): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/health',
    });
  }
}

// Export singleton instance
export const apiClient = new EnhancedApiClient();