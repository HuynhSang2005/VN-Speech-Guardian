# API Integration Schema Documentation

## Overview

This document outlines the comprehensive API integration system for the VN Speech Guardian frontend application. The system provides type-safe API integration using OpenAPI-generated types, React Query hooks, and custom error handling.

## Architecture

```
src/schemas/api/
├── generated/
│   └── api-types.ts          # OpenAPI generated types (DO NOT EDIT)
├── types.ts                  # API integration types & interfaces
├── client.ts                 # HTTP client & request utilities
├── hooks.ts                  # React Query hooks & mutations
└── index.ts                  # Centralized exports
```

## Key Features

### 🔧 Type Safety
- **OpenAPI Generated Types**: All API types are generated from the backend OpenAPI specification
- **Strict TypeScript**: Full TypeScript 5.9 compliance with exactOptionalPropertyTypes
- **Runtime Validation**: Built-in request/response validation with proper error typing

### 🚀 Performance
- **React Query Integration**: Efficient caching, background updates, and optimistic updates
- **Request Batching**: Support for batch operations with parallel/sequential execution
- **Smart Retries**: Exponential backoff with configurable retry logic

### 🛡️ Error Handling
- **Custom Error Classes**: ApiError, NetworkError, TimeoutError with proper inheritance
- **Centralized Error Management**: Consistent error handling across all API calls
- **User-Friendly Messages**: Automatic toast notifications with contextual error messages

### 🔐 Authentication
- **Clerk Integration**: Ready for Clerk authentication with JWT token management
- **Authenticated Client**: Automatic token injection for protected endpoints
- **Session Management**: Proper auth state handling with error recovery

## Usage Examples

### Basic API Calls

```typescript
import { useSessionsList, useCreateSession } from '@/schemas/api'

// List sessions with filtering
const { data: sessions, isLoading, error } = useSessionsList({
  page: 1,
  perPage: 10,
  status: 'active'
})

// Create new session
const createSession = useCreateSession()
const handleCreateSession = async (data) => {
  try {
    const session = await createSession.mutateAsync(data)
    console.log('Created session:', session)
  } catch (error) {
    console.error('Failed to create session:', error)
  }
}
```

### Custom API Client

```typescript
import { useApiClient } from '@/schemas/api'

function MyComponent() {
  const { client, makeRequest } = useApiClient()
  
  const handleCustomRequest = async () => {
    try {
      const result = await makeRequest(
        () => client.get('/custom-endpoint'),
        { retry: true, silent: false }
      )
      console.log('Custom request result:', result)
    } catch (error) {
      // Error handling is automatic with toast notifications
      console.error('Request failed:', error)
    }
  }
}
```

### WebSocket Integration

```typescript
import type { WebSocketEventMessage, TranscriptMessage } from '@/schemas/api'

// Type-safe WebSocket message handling
const handleWebSocketMessage = (message: WebSocketEventMessage) => {
  switch (message.type) {
    case 'transcript':
      const transcriptMsg = message as TranscriptMessage
      console.log('New transcript:', transcriptMsg.data.text)
      break
      
    case 'detection':
      // Handle detection messages...
      break
      
    case 'error':
      // Handle error messages...
      break
  }
}
```

## Configuration

### Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000
```

### API Client Configuration

```typescript
import { API_CONFIG } from '@/schemas/api'

// Default configuration
{
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000
}
```

## Type System

### Core Types

- **ApiUser**: User profile information
- **ApiSession**: Session data with transcripts and detections
- **ApiTranscript**: Speech-to-text results with timing
- **ApiDetection**: Content moderation results with confidence scores
- **ApiStatsOverview**: Analytics and dashboard data

### Request/Response Types

- **SessionsListParams**: Query parameters for session filtering
- **ApiResponse<T>**: Generic API response wrapper
- **ApiErrorResponse**: Standardized error response format

### WebSocket Types

- **TranscriptMessage**: Real-time speech recognition updates
- **DetectionMessage**: Real-time content moderation alerts
- **SessionStatusMessage**: Session lifecycle events

## Error Handling

### Error Hierarchy

```
Error
├── ApiError (base API error)
├── NetworkError (connection issues)
└── TimeoutError (request timeouts)
```

### Error Codes

- **UNAUTHORIZED**: Authentication required
- **FORBIDDEN**: Access denied
- **VALIDATION_ERROR**: Invalid request data
- **RATE_LIMIT_EXCEEDED**: Too many requests
- **NETWORK_ERROR**: Connection failure
- **TIMEOUT_ERROR**: Request timeout

## Best Practices

### 1. Use Type-Safe Hooks
```typescript
// ✅ Good: Type-safe with auto-completion
const { data: sessions } = useSessionsList()

// ❌ Bad: Manual API calls without types
const sessions = await fetch('/sessions').then(r => r.json())
```

### 2. Handle Loading States
```typescript
const { data, isLoading, error } = useSessionsList()

if (isLoading) return <LoadingSpinner />
if (error) return <ErrorMessage error={error} />
if (!data) return <EmptyState />

return <SessionsList sessions={data.items} />
```

### 3. Use Optimistic Updates
```typescript
const updateSession = useUpdateSession()

const handleUpdate = async (id: string, data: Partial<ApiSession>) => {
  // Optimistically update UI
  const { mutate, revert } = useOptimisticUpdate(
    queryKeys.session(id),
    (old) => ({ ...old, ...data })
  )
  
  mutate()
  
  try {
    await updateSession.mutateAsync({ id, data })
  } catch (error) {
    revert() // Rollback on error
    throw error
  }
}
```

### 4. Cache Management
```typescript
const { clearSessions, refreshSessions } = useCacheManager()

// Clear cache when needed
const handleLogout = () => {
  clearSessions()
}

// Refresh data
const handleRefresh = () => {
  refreshSessions()
}
```

## Migration Guide

### From Manual Fetch to API Hooks

```typescript
// Before: Manual fetch with error handling
const [sessions, setSessions] = useState([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

useEffect(() => {
  const fetchSessions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sessions')
      const data = await response.json()
      setSessions(data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }
  
  fetchSessions()
}, [])

// After: Type-safe hook with caching
const { data: sessions, isLoading, error } = useSessionsList()
```

## Testing

### Mock API Responses

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

test('sessions list renders correctly', async () => {
  const queryClient = createTestQueryClient()
  
  // Set mock data
  queryClient.setQueryData(['sessions', 'list'], {
    items: [{ id: '1', name: 'Test Session' }],
    total: 1
  })
  
  render(
    <QueryClientProvider client={queryClient}>
      <SessionsList />
    </QueryClientProvider>
  )
  
  // Test component behavior...
})
```

## Troubleshooting

### Common Issues

1. **Type Errors**: Ensure OpenAPI types are up-to-date with `npm run generate:api`
2. **Auth Errors**: Check Clerk configuration and token expiration
3. **Network Errors**: Verify API base URL and CORS settings
4. **Cache Issues**: Use React Query DevTools for debugging

### Debug Tools

```typescript
import { useCacheManager } from '@/schemas/api'

function DebugPanel() {
  const { getCacheStats } = useCacheManager()
  const stats = getCacheStats()
  
  return (
    <div>
      <p>Queries: {stats.queries}</p>
      <p>Stale: {stats.stale}</p>
      <p>Fetching: {stats.fetching}</p>
    </div>
  )
}
```

## Performance Optimization

### Query Key Strategies

```typescript
// Static keys for global data
queryKeys.statsOverview()

// Dynamic keys with parameters
queryKeys.sessionsList({ page: 1, status: 'active' })

// Hierarchical keys for relationships
queryKeys.transcriptsList(sessionId, { page: 1 })
```

### Prefetching

```typescript
const { prefetchSession } = usePrefetch()

// Prefetch on hover
const handleSessionHover = (sessionId: string) => {
  prefetchSession(sessionId)
}
```

## Future Enhancements

1. **GraphQL Integration**: Add GraphQL client alongside REST API
2. **Offline Support**: PWA-ready with offline data sync
3. **Real-time Subscriptions**: Enhanced WebSocket management
4. **Request Caching**: Advanced caching strategies with Redis
5. **API Versioning**: Support for multiple API versions

---

This API integration system provides a robust, type-safe, and performant foundation for the VN Speech Guardian frontend application, following modern React and TypeScript best practices.