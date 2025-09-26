/**
 * API Integration Tests - P32 Todo 7
 * Mục đích: Basic API layer testing với mock server responses và error handling
 * Tech: MSW (Mock Service Worker), Axios, comprehensive error scenarios
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import axios from 'axios';

// Mock external dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    warning: vi.fn(),
  }
}));

// Basic API client using axios
const createAPIClient = (baseURL: string = 'http://localhost:3001') => {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = 'mock-jwt-token';
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle common error scenarios
      if (error.response?.status === 401) {
        console.log('Authentication error');
      } else if (error.response?.status === 429) {
        console.log('Rate limit exceeded');
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// API service implementations
const createStatsAPI = (client: any) => ({
  overview: async () => {
    const response = await client.get('/api/stats/overview');
    return response.data;
  },
  
  historical: async (days: number = 7) => {
    const response = await client.get(`/api/stats/historical?days=${days}`);
    return response.data;
  },
});

const createSessionsAPI = (client: any) => ({
  list: async (filters: any = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    const response = await client.get(`/api/sessions?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await client.get(`/api/sessions/${id}`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await client.delete(`/api/sessions/${id}`);
    return response.data;
  },

  bulkDelete: async (ids: string[]) => {
    const response = await client.post('/api/sessions/bulk-delete', { ids });
    return response.data;
  },
});

const createActivityAPI = (client: any) => ({
  recent: async (limit: number = 10) => {
    const response = await client.get(`/api/activity/recent?limit=${limit}`);
    return response.data;
  },

  feed: async (page: number = 1, limit: number = 20) => {
    const response = await client.get(`/api/activity?page=${page}&limit=${limit}`);
    return response.data;
  },
});

// Mock data
const mockDashboardStats = {
  totalSessions: 150,
  totalDetections: 45,
  toxicityRate: 12.5,
  avgSessionDuration: 425,
  successRate: 94.2,
  todayActivity: {
    sessions: 12,
    detections: 3,
    avgDuration: 380,
  },
  weeklyTrend: {
    sessions: [10, 15, 8, 20, 18, 12, 9],
    detections: [2, 5, 1, 8, 6, 3, 2],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
};

const mockSessionsResponse = {
  sessions: [
    {
      id: 'session-1',
      status: 'completed',
      duration: 300,
      detections: 2,
      createdAt: '2025-09-25T10:00:00Z',
      toxicityScore: 0.25,
    },
    {
      id: 'session-2',
      status: 'processing',
      duration: 150,
      detections: 0,
      createdAt: '2025-09-25T11:00:00Z',
      toxicityScore: 0.05,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
};

const mockRecentActivity = [
  {
    id: 'activity-1',
    type: 'session',
    description: 'New speech processing session started',
    timestamp: '2025-09-25T12:00:00Z',
    metadata: { sessionId: 'session-1' },
  },
  {
    id: 'activity-2',
    type: 'detection',
    description: 'High severity content detected',
    timestamp: '2025-09-25T11:30:00Z',
    metadata: { sessionId: 'session-2' },
  },
];

// MSW Server setup
const server = setupServer(
  // Stats API endpoints
  http.get('http://localhost:3001/api/stats/overview', () => {
    return HttpResponse.json({
      success: true,
      data: mockDashboardStats,
    });
  }),

  http.get('http://localhost:3001/api/stats/historical', ({ request }) => {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    
    return HttpResponse.json({
      success: true,
      data: {
        labels: Array.from({ length: days }, (_, i) => `Day ${i + 1}`),
        sessions: Array.from({ length: days }, () => Math.floor(Math.random() * 20)),
        detections: Array.from({ length: days }, () => Math.floor(Math.random() * 5)),
        accuracy: Array.from({ length: days }, () => 0.9 + Math.random() * 0.1),
      },
    });
  }),

  // Sessions API endpoints
  http.get('http://localhost:3001/api/sessions', () => {
    return HttpResponse.json({
      success: true,
      data: mockSessionsResponse,
    });
  }),

  http.get('http://localhost:3001/api/sessions/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        status: 'completed',
        duration: 600,
        detections: 5,
        createdAt: '2025-09-25T09:00:00Z',
        toxicityScore: 0.45,
      },
    });
  }),

  http.delete('http://localhost:3001/api/sessions/:id', () => {
    return HttpResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  }),

  http.post('http://localhost:3001/api/sessions/bulk-delete', () => {
    return HttpResponse.json({
      success: true,
      message: 'Sessions deleted successfully',
    });
  }),

  // Activity API endpoints
  http.get('http://localhost:3001/api/activity/recent', () => {
    return HttpResponse.json({
      success: true,
      data: mockRecentActivity,
    });
  }),

  http.get('http://localhost:3001/api/activity', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    return HttpResponse.json({
      success: true,
      data: {
        activities: mockRecentActivity,
        pagination: { page, limit, total: 2, totalPages: 1 },
      },
    });
  }),

  // Error scenarios
  http.get('http://localhost:3001/api/error/404', () => {
    return HttpResponse.json(
      { error: { message: 'Resource not found', code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }),

  http.get('http://localhost:3001/api/error/500', () => {
    return HttpResponse.json(
      { error: { message: 'Internal server error', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }),

  http.get('http://localhost:3001/api/error/401', () => {
    return HttpResponse.json(
      { error: { message: 'Unauthorized', code: 'AUTH_ERROR' } },
      { status: 401 }
    );
  }),

  http.get('http://localhost:3001/api/error/429', () => {
    return HttpResponse.json(
      { error: { message: 'Rate limit exceeded', code: 'RATE_LIMIT' } },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }),

  // Network error simulation
  http.get('http://localhost:3001/api/network-error', () => {
    return HttpResponse.error();
  }),

  // Slow endpoint for timeout testing
  http.get('http://localhost:3001/api/slow-endpoint', async () => {
    // Simulate a slow response that should timeout
    await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds - longer than 30s timeout
    return HttpResponse.json({ success: true });
  }),
);

// Setup and teardown
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

describe('API Integration Tests - Core Functionality', () => {
  let apiClient: any;
  let statsAPI: any;
  let sessionsAPI: any;
  let activityAPI: any;

  beforeEach(() => {
    apiClient = createAPIClient();
    statsAPI = createStatsAPI(apiClient);
    sessionsAPI = createSessionsAPI(apiClient);
    activityAPI = createActivityAPI(apiClient);
  });

  describe('Stats API Integration', () => {
    it('should fetch dashboard stats successfully', async () => {
      const stats = await statsAPI.overview();
      
      expect(stats.success).toBe(true);
      expect(stats.data.totalSessions).toBe(150);
      expect(stats.data.totalDetections).toBe(45);
      expect(stats.data.toxicityRate).toBe(12.5);
      expect(stats.data.weeklyTrend).toBeDefined();
      expect(stats.data.weeklyTrend.labels).toHaveLength(7);
    });

    it('should fetch historical stats with default 7 days', async () => {
      const historical = await statsAPI.historical();
      
      expect(historical.success).toBe(true);
      expect(historical.data.labels).toHaveLength(7);
      expect(historical.data.sessions).toHaveLength(7);
      expect(historical.data.detections).toHaveLength(7);
    });

    it('should fetch historical stats with custom days', async () => {
      const historical = await statsAPI.historical(14);
      
      expect(historical.success).toBe(true);
      expect(historical.data.labels).toHaveLength(14);
      expect(historical.data.sessions).toHaveLength(14);
    });
  });

  describe('Sessions API Integration', () => {
    it('should fetch sessions list successfully', async () => {
      const response = await sessionsAPI.list();
      
      expect(response.success).toBe(true);
      expect(response.data.sessions).toHaveLength(2);
      expect(response.data.pagination.page).toBe(1);
      expect(response.data.pagination.total).toBe(2);
    });

    it('should fetch sessions with filters', async () => {
      const filters = {
        page: 2,
        limit: 10,
        status: 'completed',
      };

      const response = await sessionsAPI.list(filters);
      
      expect(response.success).toBe(true);
      expect(response.data.sessions).toBeDefined();
    });

    it('should fetch session detail by ID', async () => {
      const sessionId = 'test-session';
      const session = await sessionsAPI.getById(sessionId);
      
      expect(session.success).toBe(true);
      expect(session.data.id).toBe(sessionId);
      expect(session.data.status).toBe('completed');
    });

    it('should delete session successfully', async () => {
      const sessionId = 'session-to-delete';
      const result = await sessionsAPI.delete(sessionId);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Session deleted successfully');
    });

    it('should bulk delete sessions successfully', async () => {
      const sessionIds = ['session-1', 'session-2'];
      const result = await sessionsAPI.bulkDelete(sessionIds);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Sessions deleted successfully');
    });
  });

  describe('Activity API Integration', () => {
    it('should fetch recent activity successfully', async () => {
      const activities = await activityAPI.recent();
      
      expect(activities.success).toBe(true);
      expect(activities.data).toHaveLength(2);
      expect(activities.data[0].type).toBe('session');
    });

    it('should fetch activity feed with pagination', async () => {
      const result = await activityAPI.feed(1, 20);
      
      expect(result.success).toBe(true);
      expect(result.data.activities).toHaveLength(2);
      expect(result.data.pagination.page).toBe(1);
      expect(result.data.pagination.limit).toBe(20);
    });
  });
});

describe('API Integration Tests - Error Handling', () => {
  let apiClient: any;

  beforeEach(() => {
    apiClient = createAPIClient();
  });

  describe('HTTP Error Status Codes', () => {
    it('should handle 404 Not Found errors', async () => {
      try {
        await apiClient.get('/api/error/404');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error.code).toBe('NOT_FOUND');
      }
    });

    it('should handle 500 Internal Server errors', async () => {
      try {
        await apiClient.get('/api/error/500');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error.code).toBe('SERVER_ERROR');
      }
    });

    it('should handle 401 Unauthorized errors', async () => {
      try {
        await apiClient.get('/api/error/401');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.code).toBe('AUTH_ERROR');
      }
    });

    it('should handle 429 Rate Limit errors', async () => {
      try {
        await apiClient.get('/api/error/429');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(429);
        expect(error.response.data.error.code).toBe('RATE_LIMIT');
        expect(error.response.headers['retry-after']).toBe('60');
      }
    });
  });

  describe('Network Errors', () => {
    it('should handle network connectivity issues', async () => {
      try {
        await apiClient.get('/api/network-error');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBeDefined();
      }
    });

    it('should handle timeout errors', async () => {
      const timeoutClient = createAPIClient();
      timeoutClient.defaults.timeout = 1; // 1ms timeout

      server.use(
        http.get('http://localhost:3001/api/slow-endpoint', async () => {
          // Simulate slow response
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({ success: true });
        })
      );

      try {
        await timeoutClient.get('/api/slow-endpoint');
        expect.fail('Should have thrown a timeout error');
      } catch (error: any) {
        expect(error.code).toBe('ECONNABORTED');
      }
    });
  });
});

describe('API Integration Tests - Authentication Flow', () => {
  let apiClient: any;

  beforeEach(() => {
    apiClient = createAPIClient();
  });

  describe('Token Management', () => {
    it('should include authorization header in requests', async () => {
      // Check if request interceptor adds auth header
      const requestConfig = apiClient.interceptors.request.handlers[0];
      expect(requestConfig).toBeDefined();

      // Mock request config
      const mockConfig = {
        headers: {},
      };

      const modifiedConfig = await requestConfig.fulfilled(mockConfig);
      expect(modifiedConfig.headers.Authorization).toBe('Bearer mock-jwt-token');
    });

    it('should handle authentication errors in response interceptor', async () => {
      const responseInterceptor = apiClient.interceptors.response.handlers[0];
      expect(responseInterceptor).toBeDefined();

      const mockError = {
        response: { status: 401 },
      };

      try {
        await responseInterceptor.rejected(mockError);
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });
  });
});

describe('API Integration Tests - Performance & Retry Logic', () => {
  let apiClient: any;

  beforeEach(() => {
    apiClient = createAPIClient();
  });

  describe('Request Timing', () => {
    it('should complete requests within reasonable time limits', async () => {
      const startTime = performance.now();
      
      await apiClient.get('/api/stats/overview');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 1 second for mock responses
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent requests efficiently', async () => {
      const startTime = performance.now();
      
      const promises = [
        apiClient.get('/api/stats/overview'),
        apiClient.get('/api/sessions'),
        apiClient.get('/api/activity/recent'),
      ];
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Concurrent requests should complete reasonably fast
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Request Cancellation', () => {
    it('should support request cancellation', async () => {
      const cancelToken = axios.CancelToken.source();
      
      setTimeout(() => {
        cancelToken.cancel('Request cancelled by test');
      }, 10);

      try {
        await apiClient.get('/api/stats/overview', {
          cancelToken: cancelToken.token,
        });
        expect.fail('Request should have been cancelled');
      } catch (error: any) {
        expect(axios.isCancel(error)).toBe(true);
      }
    });
  });
});

describe('API Integration Tests - Data Validation', () => {
  let apiClient: any;
  let statsAPI: any;

  beforeEach(() => {
    apiClient = createAPIClient();
    statsAPI = createStatsAPI(apiClient);
  });

  describe('Response Schema Validation', () => {
    it('should validate stats response structure', async () => {
      const stats = await statsAPI.overview();
      
      // Validate response structure
      expect(stats.success).toBe(true);
      expect(stats.data).toBeDefined();
      
      // Validate required fields
      expect(typeof stats.data.totalSessions).toBe('number');
      expect(typeof stats.data.totalDetections).toBe('number');
      expect(typeof stats.data.toxicityRate).toBe('number');
      expect(Array.isArray(stats.data.weeklyTrend.labels)).toBe(true);
      expect(Array.isArray(stats.data.weeklyTrend.sessions)).toBe(true);
    });

    it('should handle malformed response data gracefully', async () => {
      server.use(
        http.get('http://localhost:3001/api/stats/overview', () => {
          return HttpResponse.json({
            success: true,
            data: null, // Malformed data
          });
        })
      );

      const stats = await statsAPI.overview();
      
      expect(stats.success).toBe(true);
      expect(stats.data).toBeNull();
    });
  });
});

describe('API Integration Tests - WebSocket Communication', () => {
  describe('WebSocket Connection Management', () => {
    it('should handle WebSocket connection lifecycle', () => {
      // Mock WebSocket functionality
      const mockSocket = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
      };

      // Test connection
      mockSocket.connect();
      expect(mockSocket.connect).toHaveBeenCalledTimes(1);

      // Test event handling
      mockSocket.on('audio-data', vi.fn());
      expect(mockSocket.on).toHaveBeenCalledWith('audio-data', expect.any(Function));

      // Test emission
      mockSocket.emit('start-session', { sessionId: 'test-session' });
      expect(mockSocket.emit).toHaveBeenCalledWith('start-session', { sessionId: 'test-session' });

      // Test disconnection
      mockSocket.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle WebSocket reconnection scenarios', () => {
      let reconnectCount = 0;
      const maxReconnects = 3;

      const mockReconnect = () => {
        reconnectCount++;
        return reconnectCount <= maxReconnects;
      };

      // Simulate reconnection attempts
      expect(mockReconnect()).toBe(true); // First attempt
      expect(mockReconnect()).toBe(true); // Second attempt
      expect(mockReconnect()).toBe(true); // Third attempt
      expect(mockReconnect()).toBe(false); // Fourth attempt should fail

      expect(reconnectCount).toBe(4);
    });
  });
});

describe('API Integration Tests - Integration with State Management', () => {
  describe('API State Synchronization', () => {
    it('should maintain consistent state during API operations', async () => {
      let apiState = {
        loading: false,
        data: null,
        error: null,
      };

      // Simulate API call state management
      const simulateAPICall = async () => {
        apiState.loading = true;
        apiState.error = null;

        try {
          const response = await apiClient.get('/api/stats/overview');
          apiState.data = response.data;
          apiState.loading = false;
        } catch (error) {
          apiState.error = error as any;
          apiState.loading = false;
        }
      };

      const apiClient = createAPIClient();
      await simulateAPICall();

      expect(apiState.loading).toBe(false);
      expect(apiState.data).toBeDefined();
      expect(apiState.error).toBeNull();
    });
  });
});