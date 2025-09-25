/**
 * MSW Setup for API Mocking - P32 Professional Unit Tests
 * Mục đích: Setup MSW với OpenAPI schema integration
 * Research: Latest MSW 2.6+ patterns với type-safe handlers
 */

import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import type { 
  SessionDto, 
  DetectionDto, 
  TranscriptDto,
  StatsOverviewDto,
  UserSwaggerDto
} from '@/schemas/generated/api-types'

// =============================================================================
// Mock Data Factories - Type-safe test data generation
// =============================================================================

export const mockSessionFactory = (overrides?: Partial<SessionDto>): SessionDto => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user_2yJ8Zq3nGp7XvH1kK4xR2sM9w6Y',
  device: 'desktop',
  lang: 'vi',
  startedAt: '2025-09-25T10:00:00.000Z',
  endedAt: null,
  ...overrides,
})

export const mockDetectionFactory = (overrides?: Partial<DetectionDto>): DetectionDto => ({
  id: '660e8400-e29b-41d4-a716-446655440001',
  sessionId: '550e8400-e29b-41d4-a716-446655440000',
  transcriptId: '770e8400-e29b-41d4-a716-446655440002',
  label: 'CLEAN',
  score: 0.95,
  startMs: 1000,
  endMs: 3000,
  snippet: 'Xin chào, tôi muốn hỏi về dịch vụ',
  severity: 'LOW',
  createdAt: '2025-09-25T10:00:05.000Z',
  ...overrides,
})

export const mockTranscriptFactory = (overrides?: Partial<TranscriptDto>): TranscriptDto => ({
  id: '770e8400-e29b-41d4-a716-446655440002',
  sessionId: '550e8400-e29b-41d4-a716-446655440000',
  segIdx: 0,
  text: 'Xin chào, tôi muốn hỏi về dịch vụ của công ty',
  startMs: 1000,
  endMs: 4000,
  ...overrides,
})

export const mockStatsFactory = (overrides?: Partial<StatsOverviewDto>): StatsOverviewDto => ({
  totalSessions: 1250,
  totalDetections: 89,
  toxicPercent: 7.12,
  ...overrides,
})

export const mockUserFactory = (overrides?: Partial<UserSwaggerDto>): UserSwaggerDto => ({
  id: 'user_2yJ8Zq3nGp7XvH1kK4xR2sM9w6Y',
  firstName: 'Nguyen',
  lastName: 'Van A',
  emailAddress: 'test@vnsg.dev',
  imageUrl: 'https://img.clerk.com/test-avatar.jpg',
  ...overrides,
})

// =============================================================================
// MSW Request Handlers - Based on OpenAPI Schema
// =============================================================================

export const handlers = [
  // Authentication Endpoints
  http.post('/api/auth/clerk', () => {
    return HttpResponse.json({
      success: true,
      data: mockUserFactory(),
      meta: { timestamp: new Date().toISOString() }
    })
  }),

  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      success: true,
      data: mockUserFactory(),
      meta: { timestamp: new Date().toISOString() }
    })
  }),

  // VI: Auth errors for testing
  http.get('/api/auth/me', ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('error') === '401') {
      return HttpResponse.json(
        { error: 'Unauthorized', message: 'Token invalid' },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: mockUserFactory(),
      meta: { timestamp: new Date().toISOString() }
    });
  }),

  // Session Management Endpoints
  http.get('/api/sessions', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const perPage = parseInt(url.searchParams.get('perPage') || '10', 10)
    
    // Generate mock sessions
    const sessions = Array.from({ length: perPage }, (_, i) => 
      mockSessionFactory({
        id: `session-${page}-${i}`,
        startedAt: new Date(Date.now() - i * 60000).toISOString(),
      })
    )

    return HttpResponse.json({
      success: true,
      data: {
        items: sessions,
        total: 1250,
        page,
        perPage,
        totalPages: Math.ceil(1250 / perPage),
      },
      meta: { 
        pagination: { page, limit: perPage, total: 1250 },
        timestamp: new Date().toISOString() 
      }
    })
  }),

  http.post('/api/sessions', async ({ request }) => {
    const body = await request.json() as { userId?: string; device?: string; lang?: string }
    
    const newSession = mockSessionFactory({
      userId: body.userId || 'user_2yJ8Zq3nGp7XvH1kK4xR2sM9w6Y',
      device: body.device || 'desktop',
      lang: body.lang || 'vi',
      startedAt: new Date().toISOString(),
    })

    return HttpResponse.json({
      success: true,
      data: newSession,
      meta: { timestamp: new Date().toISOString() }
    }, { status: 201 })
  }),

  http.get('/api/sessions/:id', ({ params }) => {
    const session = mockSessionFactory({ 
      id: params.id as string,
      endedAt: new Date().toISOString() 
    })

    return HttpResponse.json({
      success: true,
      data: session,
      meta: { timestamp: new Date().toISOString() }
    })
  }),

  http.delete('/api/sessions/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { deletedId: params.id },
      meta: { timestamp: new Date().toISOString() }
    })
  }),

  // Transcript Endpoints
  http.get('/api/sessions/:id/transcripts', ({ params }) => {
    const transcripts = Array.from({ length: 5 }, (_, i) => 
      mockTranscriptFactory({
        sessionId: params.id as string,
        segIdx: i,
        text: `Đoạn phiên âm số ${i + 1} cho phiên ${params.id}`,
        startMs: i * 2000,
        endMs: (i + 1) * 2000,
      })
    )

    return HttpResponse.json({
      success: true,
      data: transcripts,
      meta: { timestamp: new Date().toISOString() }
    })
  }),

  // Detection Endpoints  
  http.get('/api/sessions/:id/detections', ({ params, request }) => {
    const url = new URL(request.url)
    const severity = url.searchParams.get('severity')
    
    let detections = Array.from({ length: 3 }, (_, i) => 
      mockDetectionFactory({
        sessionId: params.id as string,
        label: i === 0 ? 'CLEAN' : i === 1 ? 'OFFENSIVE' : 'HATE',
        severity: i === 0 ? 'LOW' : i === 1 ? 'MEDIUM' : 'HIGH',
        snippet: `Nội dung phát hiện ${i + 1}`,
        score: 0.9 - i * 0.1,
      })
    )

    // Filter by severity nếu có
    if (severity) {
      detections = detections.filter(d => d.severity === severity)
    }

    return HttpResponse.json({
      success: true,
      data: detections,
      meta: { timestamp: new Date().toISOString() }
    })
  }),

  // Dashboard Stats Endpoints
  http.get('/api/stats/overview', () => {
    return HttpResponse.json({
      success: true,
      data: mockStatsFactory(),
      meta: { timestamp: new Date().toISOString() }
    })
  }),

  http.get('/api/stats/sessions-timeline', ({ request }) => {
    const url = new URL(request.url)
    const period = url.searchParams.get('period') || '7d'
    
    const timelineData = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      sessions: Math.floor(Math.random() * 50) + 10,
      detections: Math.floor(Math.random() * 10) + 1,
    })).reverse()

    return HttpResponse.json({
      success: true,
      data: { timeline: timelineData, period },
      meta: { timestamp: new Date().toISOString() }
    })
  }),

  http.get('/api/stats/detections-breakdown', () => {
    const breakdown = [
      { label: 'CLEAN', count: 1161, percentage: 92.88 },
      { label: 'OFFENSIVE', count: 67, percentage: 5.36 },
      { label: 'HATE', count: 22, percentage: 1.76 },
    ]

    return HttpResponse.json({
      success: true,
      data: { breakdown },
      meta: { timestamp: new Date().toISOString() }
    })
  }),

  http.get('/api/stats/hourly-activity', () => {
    const activity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sessions: Math.floor(Math.random() * 20) + 5,
      detections: Math.floor(Math.random() * 5),
    }))

    return HttpResponse.json({
      success: true,
      data: activity,
      meta: { timestamp: new Date().toISOString() }
    })
  }),

  // Health Check Endpoints
  http.get('/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    })
  }),

  http.get('/ready', () => {
    return HttpResponse.json({
      status: 'ready',
      services: {
        database: 'connected',
        redis: 'connected',
        aiWorker: 'connected'
      }
    })
  }),

  // Error Simulation Handlers (for testing error states)
  http.get('/api/sessions/error-simulation', () => {
    return HttpResponse.json({
      success: false,
      error: {
        code: 'VSG-001',
        message: 'Simulated server error for testing',
        details: { timestamp: new Date().toISOString() }
      }
    }, { status: 500 })
  }),

  http.get('/api/sessions/unauthorized', () => {
    return HttpResponse.json({
      success: false,
      error: {
        code: 'AUTH-001',
        message: 'Unauthorized access',
        details: { reason: 'Invalid or expired token' }
      }
    }, { status: 401 })
  }),

  http.get('/api/sessions/rate-limited', () => {
    return HttpResponse.json({
      success: false,
      error: {
        code: 'RATE-001',
        message: 'Rate limit exceeded',
        details: { retryAfter: 60 }
      }
    }, { 
      status: 429,
      headers: { 'Retry-After': '60' }
    })
  }),

  // VI: Additional missing endpoints from test warnings
  http.post('/api/test-post', async ({ request }) => {
    const body = await request.json() as { name: string };
    return HttpResponse.json({
      success: true,
      data: { id: 'test-id', name: body.name },
      meta: { timestamp: new Date().toISOString() }
    }, { status: 201 });
  }),

  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: { database: 'up', ai: 'up' }
    });
  }),

  // VI: Generic fallback handlers for unmatched requests
  http.get('*/api/*', ({ request }) => {
    console.warn(`Unhandled GET request to: ${request.url}`);
    return HttpResponse.json({
      success: false,
      error: { message: 'Endpoint not implemented in MSW mock' }
    }, { status: 404 });
  }),

  http.post('*/api/*', ({ request }) => {
    console.warn(`Unhandled POST request to: ${request.url}`);
    return HttpResponse.json({
      success: false,
      error: { message: 'Endpoint not implemented in MSW mock' }
    }, { status: 404 });
  }),
]

// =============================================================================
// MSW Server Setup
// =============================================================================

export const server = setupServer(...handlers)

// VI: Server lifecycle should be managed in setup-enhanced.ts or individual test files

// =============================================================================
// Test Utilities & Helpers
// =============================================================================

export const createMockResponse = <T>(data: T, options?: {
  success?: boolean;
  error?: any;
  meta?: any;
}) => ({
  success: options?.success ?? true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    ...options?.meta,
  },
  ...(options?.error && { error: options.error }),
})

export const simulateNetworkDelay = (ms: number = 100) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const mockErrorResponse = (code: string, message: string, status: number = 500) => {
  return HttpResponse.json({
    success: false,
    error: { code, message, details: { timestamp: new Date().toISOString() } }
  }, { status })
}

// Export for use in individual test files
export { http, HttpResponse } from 'msw'