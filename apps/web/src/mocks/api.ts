/**
 * MSW API Mock Server
 * Mục đích: Mock server cho testing environment
 */

import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock handlers for basic API endpoints
const handlers = [
  // Health check endpoint
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: Date.now() })
  }),

  // Sessions endpoint
  http.get('/api/sessions', () => {
    return HttpResponse.json({
      sessions: [],
      total: 0,
      page: 1,
      limit: 10
    })
  }),

  // Generic catch-all for other endpoints
  http.all('*', ({ request }) => {
    console.warn(`Unhandled request: ${request.method} ${request.url}`)
    return HttpResponse.json({ error: 'Not implemented' }, { status: 501 })
  })
]

// Create and export the mock server
export const server = setupServer(...handlers)