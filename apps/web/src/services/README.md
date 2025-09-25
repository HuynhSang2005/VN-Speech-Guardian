# Enhanced API Client - VN Speech Guardian

## Tổng quan

Enhanced API Client là một HTTP client cao cấp cho VN Speech Guardian, được xây dựng trên Axios với các tính năng enterprise như JWT interceptors, auto-retry logic, error handling toàn diện, và Vietnamese UX.

## Tính năng chính

### 🔐 JWT Authentication tự động
- Tự động inject JWT token từ Clerk
- Xử lý token expiry và refresh
- Hỗ trợ public endpoints (không cần token)

### ⚡ Auto-retry với Exponential Backoff
- Retry thông minh cho network errors và 5xx server errors
- Exponential backoff: 1s → 2s → 4s (max 30s)
- Không retry cho 4xx client errors
- Configurable retry logic per request

### 🛡️ Error Handling toàn diện
- Structured error types với Vietnamese messages
- Type-safe error handling
- Toast notifications tự động
- Performance monitoring cho failed requests

### 📊 Performance Monitoring
- Request timing tracking
- Retry count statistics
- Data size monitoring
- Performance analytics

### 🌐 Vietnamese UX
- Error messages bằng tiếng Việt
- User-friendly toast notifications
- Contextual error actions (retry, login, report)

### 📁 Binary Upload Support
- Progress tracking cho file uploads
- FormData và multipart support
- Large file handling

## Cài đặt và Sử dụng

### Basic Usage

```typescript
import { EnhancedApiClient } from '@/services/enhanced-api-client';

// Tạo client instance
const apiClient = new EnhancedApiClient('/api');

// Basic requests
const sessions = await apiClient.get<Session[]>('/sessions');
const newSession = await apiClient.post<Session>('/sessions', { name: 'New Session' });
const updatedSession = await apiClient.put<Session>(`/sessions/${id}`, { name: 'Updated' });
await apiClient.delete(`/sessions/${id}`);
```

### React Hook với Clerk Integration

```typescript
import { useApiClient } from '@/services/enhanced-api-client';

function MyComponent() {
  const apiClient = useApiClient(); // Tự động inject Clerk token
  
  const fetchData = async () => {
    try {
      const data = await apiClient.get('/protected-endpoint');
      console.log(data);
    } catch (error) {
      // Error đã được handle và show toast tự động
      console.error(error);
    }
  };
}
```

### TanStack Query Integration

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { useApiClient } from '@/services/enhanced-api-client';

function SessionsList() {
  const apiClient = useApiClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiClient.get('/sessions'),
  });
  
  const createMutation = useMutation({
    mutationFn: (newSession: CreateSessionRequest) => 
      apiClient.post('/sessions', newSession),
    onSuccess: () => {
      // Success toast đã được handle tự động
      queryClient.invalidateQueries(['sessions']);
    },
  });
  
  return (
    <div>
      {isLoading && <div>Đang tải...</div>}
      {error && <div>Có lỗi xảy ra: {error.message}</div>}
      {data?.sessions.map(session => (
        <div key={session.id}>{session.name}</div>
      ))}
    </div>
  );
}
```

### Binary Upload với Progress

```typescript
const uploadAudio = async (audioFile: File) => {
  const onProgress = (progress: number) => {
    console.log(`Upload progress: ${progress}%`);
    setUploadProgress(progress);
  };
  
  try {
    const result = await apiClient.uploadBinary(
      '/upload/audio',
      audioFile,
      onProgress
    );
    
    console.log('Upload successful:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

## Advanced Configuration

### Custom Retry Logic

```typescript
const apiClient = new EnhancedApiClient('/api');

// Request với custom retry config
const data = await apiClient.get('/unreliable-endpoint', {
  retry: {
    retries: 5,
    retryDelay: (retryNumber) => 1000 * retryNumber, // Linear backoff
    retryCondition: (error) => {
      // Retry tất cả errors except 4xx
      return !error.response || error.response.status >= 500;
    },
  },
});
```

### Silent Requests (no toast)

```typescript
// Request không show toast notifications
const data = await apiClient.get('/background-sync', {
  silent: true,
});
```

### Performance Tracking

```typescript
// Get performance metrics
const metrics = apiClient.getPerformanceMetrics();
console.log('Average request duration:', apiClient.getAverageRequestDuration());
console.log('Total retry count:', apiClient.getTotalRetryCount());

// Clear metrics
apiClient.clearPerformanceMetrics();
```

## Error Handling

### Error Types

```typescript
import { 
  NetworkError, 
  AuthenticationError, 
  RateLimitError, 
  ClientError, 
  ServerError 
} from '@/types/errors';

try {
  await apiClient.get('/api/endpoint');
} catch (error) {
  if (error instanceof NetworkError) {
    // Handle network connectivity issues
    console.log('Network error:', error.getVietnameseMessage());
  } else if (error instanceof AuthenticationError) {
    // Handle auth issues (redirect to login)
    window.location.href = '/login';
  } else if (error instanceof RateLimitError) {
    // Handle rate limiting
    const retryAfter = error.retryAfter;
    console.log(`Rate limited. Retry after: ${retryAfter}s`);
  }
}
```

### Vietnamese Error Messages

Tất cả errors đều có Vietnamese messages cho user experience tốt hơn:

```typescript
// Error messages tự động bằng tiếng Việt
- "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại."
- "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
- "Quá nhiều yêu cầu. Vui lòng thử lại sau."
- "Lỗi máy chủ. Vui lòng thử lại sau."
- "Dữ liệu không hợp lệ. Vui lòng kiểm tra và thử lại."
```

## Testing

### Unit Tests

```typescript
import { EnhancedApiClient } from '@/services/enhanced-api-client';

describe('Enhanced API Client', () => {
  it('should handle authentication', async () => {
    const client = new EnhancedApiClient('http://localhost:3001/api');
    // Test implementation
  });
});
```

### MSW Integration

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('*/api/sessions', () => {
    return HttpResponse.json({ sessions: [] });
  })
);

// Use server.listen() in beforeAll, server.close() in afterAll
```

## Migration từ Basic API Client

### Before (Basic Client)

```typescript
// Trước đây
import axios from 'axios';

const response = await axios.get('/api/sessions', {
  headers: { Authorization: `Bearer ${token}` }
});

// Manual error handling
if (response.status !== 200) {
  toast.error('Có lỗi xảy ra');
}
```

### After (Enhanced Client)

```typescript
// Bây giờ
import { useApiClient } from '@/services/enhanced-api-client';

const apiClient = useApiClient(); // Auto JWT injection

// Automatic error handling + Vietnamese messages
const sessions = await apiClient.get('/sessions');
```

## Performance Tips

1. **Sử dụng Request Deduplication**: TanStack Query tự động dedupe requests
2. **Monitor Performance Metrics**: Track slow requests với `getPerformanceMetrics()`
3. **Optimize Binary Uploads**: Sử dụng progress tracking cho large files
4. **Configure Retry Strategy**: Customize retry logic based on endpoint reliability
5. **Use Silent Mode**: Cho background operations không cần user feedback

## Troubleshooting

### Common Issues

**1. Token không được inject**
```typescript
// Đảm bảo component được wrap trong ClerkProvider
const apiClient = useApiClient(); // Only works inside Clerk context
```

**2. Retry infinite loop**
```typescript
// Kiểm tra retry condition
const data = await apiClient.get('/endpoint', {
  retry: {
    retries: 3, // Giới hạn số lần retry
    retryCondition: (error) => {
      // Không retry 4xx errors
      return !error.response || error.response.status >= 500;
    },
  },
});
```

**3. Toast notifications spam**
```typescript
// Sử dụng silent mode cho background requests
const data = await apiClient.get('/background-endpoint', {
  silent: true,
});
```

## Roadmap

- [ ] GraphQL support
- [ ] Request caching layer  
- [ ] WebSocket integration
- [ ] Offline queue
- [ ] Request cancellation improvements
- [ ] Metrics dashboard
- [ ] Auto-refresh tokens

## Contributing

Khi contribute vào Enhanced API Client:

1. **TDD Approach**: Viết test trước, implementation sau
2. **Vietnamese UX**: Tất cả user-facing messages phải bằng tiếng Việt
3. **Type Safety**: 100% TypeScript với strict mode
4. **Performance**: Monitor và optimize performance metrics
5. **Error Handling**: Comprehensive error scenarios coverage

## Support

Nếu có issues hoặc questions:

1. Check troubleshooting section
2. Review test files for usage examples
3. Check performance metrics for optimization tips
4. Create issue với detailed reproduction steps