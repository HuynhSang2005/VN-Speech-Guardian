/**
 * Enhanced API Client Tests - VN Speech Guardian
 * TDD implementation cho P23 Enhanced Axios Client
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios, { AxiosError } from 'axios';
import { EnhancedApiClient, ApiResponse } from '../services/enhanced-api-client';
import { NetworkError, AuthenticationError, ServerError, RateLimitError } from '../types/errors';

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }
}));

// Mock Clerk token provider
const mockTokenProvider = vi.fn();

// MSW Server setup để test real HTTP scenarios
const server = setupServer(
  // Success response
  http.get('http://localhost:3001/api/sessions', () => {
    return HttpResponse.json({
      success: true,
      data: { sessions: [] },
      meta: { pagination: { page: 1, limit: 20, total: 0 } }
    });
  }),

  // Auth error
  http.get('http://localhost:3001/api/auth/me', () => {
    return HttpResponse.json(
      { error: { message: 'Unauthorized', code: 'AUTH_001' } },
      { status: 401 }
    );
  }),

  // Rate limit error
  http.post('http://localhost:3001/api/sessions', () => {
    return HttpResponse.json(
      { error: { message: 'Rate limit exceeded', code: 'RATE_001' } },
      { 
        status: 429,
        headers: { 'Retry-After': '60' }
      }
    );
  }),

  // Server error với retry
  http.get('http://localhost:3001/api/stats/overview', () => {
    return HttpResponse.json(
      { error: { message: 'Internal server error', code: 'SERVER_001' } },
      { status: 500 }
    );
  }),

  // Network error simulation
  http.get('http://localhost:3001/api/network-test', () => {
    return HttpResponse.error();
  }),

  // Binary upload endpoint
  http.post('http://localhost:3001/api/sessions/:id/audio', () => {
    return HttpResponse.json({
      success: true,
      data: { uploaded: true, size: 1024 }
    });
  })
);

// Test setup
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

describe('Enhanced API Client', () => {
  let apiClient: EnhancedApiClient;
  let queryClient: QueryClient;

  beforeEach(() => {
    // Reset mocks
    mockTokenProvider.mockClear();
    
    // Create fresh instances
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    apiClient = new EnhancedApiClient({
      baseURL: 'http://localhost:3001',
      tokenProvider: mockTokenProvider
    });
  });

  describe('Authentication Integration', () => {
    it('should inject JWT token from provider', async () => {
      const mockToken = 'test-jwt-token';
      mockTokenProvider.mockResolvedValue(mockToken);

      server.use(
        http.get('http://localhost:3001/api/sessions', ({ request }) => {
          const authHeader = request.headers.get('authorization');
          expect(authHeader).toBe(`Bearer ${mockToken}`);
          return HttpResponse.json({ success: true, data: [] });
        })
      );

      await apiClient.get('/api/sessions');
      expect(mockTokenProvider).toHaveBeenCalledOnce();
    });

    it('should handle missing token gracefully', async () => {
      mockTokenProvider.mockResolvedValue(null);

      server.use(
        http.get('http://localhost:3001/api/sessions', ({ request }) => {
          const authHeader = request.headers.get('authorization');
          expect(authHeader).toBeNull();
          return HttpResponse.json({ success: true, data: [] });
        })
      );

      await apiClient.get('/api/sessions');
    });

    it('should handle token provider errors', async () => {
      mockTokenProvider.mockRejectedValue(new Error('Token fetch failed'));

      server.use(
        http.get('http://localhost:3001/api/sessions', ({ request }) => {
          const authHeader = request.headers.get('authorization');
          expect(authHeader).toBeNull();
          return HttpResponse.json({ success: true, data: [] });
        })
      );

      await apiClient.get('/api/sessions');
    });
  });

  describe('Request Enhancement', () => {
    it('should add request tracking headers', async () => {
      server.use(
        http.get('http://localhost:3001/api/sessions', ({ request }) => {
          expect(request.headers.get('x-request-id')).toBeTruthy();
          expect(request.headers.get('x-request-time')).toBeTruthy();
          expect(request.headers.get('x-client-version')).toBe('1.0.0');
          return HttpResponse.json({ success: true, data: [] });
        })
      );

      await apiClient.get('/api/sessions');
    });

    it('should include XSRF protection headers', async () => {
      server.use(
        http.post('http://localhost:3001/api/sessions', ({ request }) => {
          expect(request.headers.get('x-requested-with')).toBe('XMLHttpRequest');
          return HttpResponse.json({ success: true, data: {} });
        })
      );

      await apiClient.post('/api/sessions', {});
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 authentication errors', async () => {
      const mockOnAuthError = vi.fn();
      apiClient.setAuthErrorHandler(mockOnAuthError);

      await expect(apiClient.get('/api/auth/me')).rejects.toThrow(AuthenticationError);
      expect(mockOnAuthError).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(toast.error).toHaveBeenCalledWith(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      );
    });

    it('should handle 429 rate limit errors', async () => {
      await expect(apiClient.post('/api/sessions', {})).rejects.toThrow(RateLimitError);
      expect(toast.error).toHaveBeenCalledWith(
        'Quá nhiều yêu cầu. Vui lòng thử lại sau 60 giây.'
      );
    });

    it('should handle 5xx server errors', async () => {
      await expect(apiClient.get('/api/stats/overview')).rejects.toThrow(ServerError);
      expect(toast.error).toHaveBeenCalledWith(
        'Lỗi máy chủ. Vui lòng thử lại sau.'
      );
    });

    it('should handle network errors', async () => {
      await expect(apiClient.get('/api/network-test')).rejects.toThrow(NetworkError);
      expect(toast.error).toHaveBeenCalledWith(
        'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.'
      );
    });
  });

  describe('Retry Logic', () => {
    it('should retry network errors with exponential backoff', async () => {
      let attemptCount = 0;
      
      server.use(
        http.get('http://localhost:3001/api/retry-test', () => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.error();
          }
          return HttpResponse.json({ success: true, data: { attempt: attemptCount } });
        })
      );

      const result = await apiClient.get('/api/retry-test');
      expect(attemptCount).toBe(3);
      expect(result.data.attempt).toBe(3);
    });

    it('should not retry 4xx client errors', async () => {
      let attemptCount = 0;
      
      server.use(
        http.get('http://localhost:3001/api/client-error', () => {
          attemptCount++;
          return HttpResponse.json(
            { error: { message: 'Bad request' } },
            { status: 400 }
          );
        })
      );

      await expect(apiClient.get('/api/client-error')).rejects.toThrow();
      expect(attemptCount).toBe(1);
    });

    it('should respect max retry attempts', async () => {
      let attemptCount = 0;
      
      server.use(
        http.get('http://localhost:3001/api/max-retry-test', () => {
          attemptCount++;
          return HttpResponse.error();
        })
      );

      await expect(apiClient.get('/api/max-retry-test')).rejects.toThrow(NetworkError);
      expect(attemptCount).toBe(4); // 1 initial + 3 retries
    });
  });

  describe('Binary Upload Support', () => {
    it('should upload binary data with progress tracking', async () => {
      const audioData = new ArrayBuffer(1024);
      const onProgress = vi.fn();

      const result = await apiClient.uploadBinary('/api/sessions/123/audio', audioData, {
        onUploadProgress: onProgress,
        contentType: 'application/octet-stream'
      });

      expect(result.data.uploaded).toBe(true);
      expect(result.data.size).toBe(1024);
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle multipart form data uploads', async () => {
      const formData = new FormData();
      formData.append('audio', new Blob([new ArrayBuffer(1024)], { type: 'audio/wav' }));
      formData.append('sessionId', '123');

      const result = await apiClient.post('/api/sessions/123/audio', formData);
      expect(result.data.uploaded).toBe(true);
    });
  });

  describe('Toast Integration', () => {
    it('should show loading toast during requests', async () => {
      const promise = apiClient.get('/api/sessions');
      expect(toast.loading).toHaveBeenCalledWith('Đang tải...');
      
      await promise;
      expect(toast.dismiss).toHaveBeenCalled();
    });

    it('should show success toast for successful requests', async () => {
      await apiClient.post('/api/sessions', {});
      expect(toast.success).toHaveBeenCalledWith('Thành công!');
    });

    it('should show Vietnamese error messages', async () => {
      await expect(apiClient.get('/api/auth/me')).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Phiên đăng nhập')
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track request timing', async () => {
      const onMetrics = vi.fn();
      apiClient.setMetricsHandler(onMetrics);

      await apiClient.get('/api/sessions');

      expect(onMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/sessions',
          method: 'GET',
          duration: expect.any(Number),
          status: 200
        })
      );
    });

    it('should track error metrics', async () => {
      const onMetrics = vi.fn();
      apiClient.setMetricsHandler(onMetrics);

      await expect(apiClient.get('/api/auth/me')).rejects.toThrow();

      expect(onMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/auth/me',
          method: 'GET',
          status: 401,
          error: true
        })
      );
    });
  });

  describe('Request Cancellation', () => {
    it('should support request cancellation', async () => {
      const controller = new AbortController();
      
      const promise = apiClient.get('/api/sessions', {
        signal: controller.signal
      });

      controller.abort();
      
      await expect(promise).rejects.toThrow('canceled');
    });
  });

  describe('Type Safety', () => {
    it('should provide typed response interfaces', async () => {
      interface SessionsResponse {
        sessions: Array<{ id: string; name: string }>;
      }

      const response = await apiClient.get<SessionsResponse>('/api/sessions');
      
      // TypeScript should infer the correct type
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data.sessions)).toBe(true);
    });

    it('should handle generic API responses', async () => {
      const response = await apiClient.get<ApiResponse<{ count: number }>>('/api/sessions');
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });
  });
});

// Component Integration Tests
describe('API Client Integration with React Components', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  it('should integrate with TanStack Query', async () => {
    const TestComponent = () => {
      // This would use the enhanced API client in real implementation
      return <div>API Integration Test</div>;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    expect(screen.getByText('API Integration Test')).toBeInTheDocument();
  });
});