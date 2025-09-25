/**
 * Enhanced API Client MSW Tests
 * Testing HTTP functionality with proper MSW setup
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { toast } from 'sonner';

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    warning: vi.fn(),
  }
}));

// MSW Server setup với proper baseURL
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
      { error: { message: 'Too Many Requests', code: 'RATE_LIMIT' } },
      { 
        status: 429,
        headers: { 'Retry-After': '60' }
      }
    );
  }),

  // Server error
  http.get('http://localhost:3001/api/stats/overview', () => {
    return HttpResponse.json(
      { error: { message: 'Internal Server Error', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }),

  // Network error simulation
  http.get('http://localhost:3001/api/network-test', () => {
    return HttpResponse.error();
  }),
);

describe('Enhanced API Client - MSW Integration', () => {
  let apiClient: any;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import and create client with proper base URL
    const { EnhancedApiClient } = await import('../services/enhanced-api-client');
    apiClient = new EnhancedApiClient('http://localhost:3001/api');
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('Basic HTTP Operations', () => {
    it('should make successful GET request', async () => {
      const response = await apiClient.get('/sessions');
      
      expect(response).toEqual({
        success: true,
        data: { sessions: [] },
        meta: { pagination: { page: 1, limit: 20, total: 0 } }
      });
    });

    it('should make successful POST request', async () => {
      // Add a successful POST handler
      server.use(
        http.post('http://localhost:3001/api/test-post', () => {
          return HttpResponse.json({ success: true, data: { id: 123 } });
        })
      );

      const response = await apiClient.post('/test-post', { name: 'test' });
      
      expect(response).toEqual({
        success: true,
        data: { id: 123 }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 authentication errors', async () => {
      try {
        await apiClient.get('/auth/me');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.statusCode).toBe(401);
        expect(error.message).toContain('Unauthorized');
      }
    });

    it('should handle 429 rate limit errors', async () => {
      try {
        await apiClient.post('/sessions', {});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.statusCode).toBe(429);
        expect(error.message).toContain('Too Many Requests');
      }
    });

    it('should handle 500 server errors', async () => {
      try {
        await apiClient.get('/stats/overview');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.message).toContain('Internal Server Error');
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      await apiClient.get('/sessions');
      
      const metrics = apiClient.getPerformanceMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      
      const avgDuration = apiClient.getAverageRequestDuration();
      expect(avgDuration).toBeGreaterThanOrEqual(0);
    });

    it('should track retry count', async () => {
      const initialRetryCount = apiClient.getTotalRetryCount();
      
      // Make a successful request (no retries)
      await apiClient.get('/sessions');
      
      const finalRetryCount = apiClient.getTotalRetryCount();
      expect(finalRetryCount).toBe(initialRetryCount);
    });
  });

  describe('Utility Methods', () => {
    it('should support clearing performance metrics', () => {
      // Make a request to generate metrics
      apiClient.get('/sessions');
      
      // Clear metrics
      apiClient.clearPerformanceMetrics();
      
      const metrics = apiClient.getPerformanceMetrics();
      expect(metrics.length).toBe(0);
    });

    it('should support health check', async () => {
      // Add health check handler
      server.use(
        http.get('http://localhost:3001/api/health', () => {
          return HttpResponse.json({ status: 'ok' });
        })
      );

      const health = await apiClient.healthCheck();
      
      expect(health.status).toBe('ok');
      expect(health.timestamp).toBeDefined();
    });
  });
});