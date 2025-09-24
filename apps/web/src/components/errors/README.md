# Error Boundary System Documentation
## VN Speech Guardian - Comprehensive Error Handling

### 📋 Overview

The VN Speech Guardian error boundary system provides comprehensive, production-ready error handling for React applications with Vietnamese localization, enterprise-grade monitoring, and Speech Guardian branding integration.

### 🏗️ Architecture

```
Error Boundary System
├── Core Components
│   ├── BaseErrorBoundary (React Class Component)
│   ├── QueryErrorBoundary (TanStack Query Integration)
│   └── AsyncErrorBoundary (Suspense Compatibility)
├── Fallback Components
│   ├── GenericErrorFallback
│   ├── AudioErrorFallback
│   ├── NetworkErrorFallback
│   └── AuthErrorFallback
├── Context System
│   ├── ErrorBoundaryProvider
│   ├── useErrorBoundary Hook
│   └── useErrorHandler Hook
├── Services
│   └── Error Reporting Service
└── Testing
    ├── ErrorBoundary.test.tsx
    └── ErrorBoundaryProvider.test.tsx
```

### 🚀 Quick Start

#### Basic Usage

```tsx
import { ErrorBoundary, GenericErrorFallback } from '@/components/errors/ErrorBoundary';
import { ErrorBoundaryProvider } from '@/contexts/error-boundary-context';

function App() {
  return (
    <ErrorBoundaryProvider>
      <ErrorBoundary FallbackComponent={GenericErrorFallback}>
        <YourApplication />
      </ErrorBoundary>
    </ErrorBoundaryProvider>
  );
}
```

#### Advanced Configuration

```tsx
import { ErrorBoundaryProvider, useErrorHandler } from '@/contexts/error-boundary-context';
import { QueryErrorBoundary, AudioErrorFallback } from '@/components/errors/ErrorBoundary';

const config = {
  theme: 'dark',
  maxRetries: 5,
  retryDelay: 2000,
  enableReporting: true,
  messages: {
    audio: 'Không thể truy cập microphone của bạn',
    network: 'Lỗi kết nối mạng - vui lòng thử lại',
  },
  branding: {
    primaryColor: '#3B82F6',
    supportUrl: '/support',
    contactEmail: 'support@vn-speech-guardian.com',
  },
};

function SpeechApp() {
  return (
    <ErrorBoundaryProvider config={config}>
      <QueryErrorBoundary>
        <ErrorBoundary FallbackComponent={AudioErrorFallback}>
          <AudioProcessingComponent />
        </ErrorBoundary>
      </QueryErrorBoundary>
    </ErrorBoundaryProvider>
  );
}
```

### 🔧 Components Reference

#### BaseErrorBoundary

The foundation error boundary class with comprehensive error handling.

**Props:**
- `children`: ReactNode - Components to wrap
- `FallbackComponent`: Component to render on error
- `fallbackRender`: Function to render fallback UI
- `onError`: Error callback function
- `onReset`: Reset callback function
- `resetKeys`: Array of keys that trigger reset
- `isolate`: Boolean to isolate error context

**Features:**
- Static `getDerivedStateFromError` for React 19 compatibility
- Comprehensive error context capture
- Automatic retry with exponential backoff
- Vietnamese error messages
- Performance monitoring integration

```tsx
<BaseErrorBoundary
  FallbackComponent={CustomFallback}
  onError={(error, errorInfo) => {
    console.log('Error captured:', error.message);
  }}
  onReset={() => {
    // Clean up application state
  }}
  resetKeys={['user', 'session']}
  isolate={true}
>
  <SensitiveComponent />
</BaseErrorBoundary>
```

#### QueryErrorBoundary

Specialized error boundary for TanStack Query integration.

**Features:**
- Automatic query reset on error recovery
- Optimistic update rollback
- API error categorization
- Network error detection

```tsx
<QueryErrorBoundary
  onReset={() => queryClient.resetQueries()}
  FallbackComponent={({ error, resetErrorBoundary }) => (
    <div>
      <h2>Lỗi API</h2>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>Thử lại</button>
    </div>
  )}
>
  <ApiDependentComponent />
</QueryErrorBoundary>
```

#### AsyncErrorBoundary

Error boundary compatible with React Suspense and async operations.

**Features:**
- Suspense integration
- Loading state management
- Async error catching
- Promise rejection handling

```tsx
<AsyncErrorBoundary
  loadingFallback={<LoadingSpinner />}
  FallbackComponent={AsyncErrorFallback}
>
  <Suspense fallback={<Loading />}>
    <LazyComponent />
  </Suspense>
</AsyncErrorBoundary>
```

### 🎨 Fallback Components

#### GenericErrorFallback

Default fallback for unknown errors.

**Features:**
- Vietnamese localization
- Reload page button
- Error details (development only)
- Speech Guardian branding

#### AudioErrorFallback

Specialized fallback for audio processing errors.

**Features:**
- Microphone permission guidance
- Audio device troubleshooting
- Retry audio initialization
- Device compatibility check

#### NetworkErrorFallback

Fallback for network and API errors.

**Features:**
- Connection status check
- Retry with exponential backoff
- Offline mode detection
- API endpoint health check

#### AuthErrorFallback

Authentication and authorization error handling.

**Features:**
- Session expiration detection
- Re-authentication flow
- Permission escalation guidance
- Secure logout option

### 🔌 Context System

#### ErrorBoundaryProvider

Global configuration provider for error handling.

```tsx
interface ErrorBoundaryConfig {
  theme: 'light' | 'dark' | 'auto';
  showErrorDetails: boolean;
  maxRetries: number;
  retryDelay: number;
  enableReporting: boolean;
  messages: {
    generic: string;
    network: string;
    authentication: string;
    audio: string;
    permission: string;
  };
  branding: {
    logo?: string;
    primaryColor: string;
    supportUrl?: string;
    contactEmail?: string;
  };
}
```

#### useErrorBoundary Hook

Access error boundary configuration and utilities.

```tsx
function MyComponent() {
  const { config, theme, getErrorMessage, reportError } = useErrorBoundary();
  
  const handleError = () => {
    reportError(new Error('Custom error'), {
      feature: 'audio-processing',
      userId: currentUser.id,
    });
  };
  
  return (
    <div className={theme === 'dark' ? 'dark-theme' : 'light-theme'}>
      <p>{getErrorMessage('audio')}</p>
      <button onClick={handleError}>Report Error</button>
    </div>
  );
}
```

#### useErrorHandler Hook

Imperative error handling for async operations and event handlers.

```tsx
function AsyncComponent() {
  const handleError = useErrorHandler();
  
  const processAudio = async () => {
    try {
      await audioProcessingAPI.process(audioData);
    } catch (error) {
      // This will report the error and trigger the nearest error boundary
      handleError(error, {
        source: 'audio-processing',
        audioFormat: 'wav',
        duration: audioData.duration,
      });
    }
  };
  
  return <button onClick={processAudio}>Process Audio</button>;
}
```

### 📊 Error Reporting Integration

The error reporting service provides Sentry-like functionality with privacy-aware logging.

```tsx
import { logError, captureException } from '@/services/errorReporting';

// Automatic error context capture
logError(error, {
  componentStack: errorInfo.componentStack,
  errorBoundary: 'AudioProcessingBoundary',
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  feature: 'speech-recognition',
  severity: 'high',
});

// Exception capture with fingerprinting
captureException(error, {
  tags: {
    feature: 'audio-processing',
    language: 'vi',
  },
  context: {
    audioDevice: selectedDevice.id,
    sampleRate: audioContext.sampleRate,
  },
});
```

### 🧪 Testing Guidelines

#### Unit Testing Error Boundaries

```tsx
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

test('should catch and display error', () => {
  render(
    <ErrorBoundary>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );
  
  expect(screen.getByText(/Có lỗi xảy ra/)).toBeInTheDocument();
});
```

#### Integration Testing

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundaryProvider } from '@/contexts/error-boundary-context';

test('should integrate with TanStack Query', async () => {
  const queryClient = new QueryClient();
  
  render(
    <ErrorBoundaryProvider>
      <QueryClientProvider client={queryClient}>
        <QueryErrorBoundary>
          <ComponentWithFailingQuery />
        </QueryErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundaryProvider>
  );
  
  await waitFor(() => {
    expect(screen.getByText(/Lỗi tải dữ liệu/)).toBeInTheDocument();
  });
});
```

### 🎯 Speech Guardian Integration

#### Audio Processing Errors

```tsx
<ErrorBoundary
  FallbackComponent={AudioErrorFallback}
  onError={(error) => {
    if (error.message.includes('MICROPHONE_ACCESS_DENIED')) {
      // Guide user through permission setup
      showMicrophonePermissionGuide();
    }
  }}
>
  <AudioRecordingComponent />
</ErrorBoundary>
```

#### Real-time Connection Errors

```tsx
<ErrorBoundary
  FallbackComponent={NetworkErrorFallback}
  resetKeys={[connectionStatus]}
  onReset={() => {
    // Reconnect WebSocket
    reconnectWebSocket();
  }}
>
  <RealTimeTranscriptionComponent />
</ErrorBoundary>
```

#### Session Management Errors

```tsx
<ErrorBoundary
  FallbackComponent={AuthErrorFallback}
  onError={(error) => {
    if (error.message.includes('SESSION_EXPIRED')) {
      // Redirect to login
      redirectToLogin();
    }
  }}
>
  <ProtectedComponent />
</ErrorBoundary>
```

### 🚀 Performance Considerations

#### Error Boundary Optimization

1. **Strategic Placement**: Place error boundaries at component tree boundaries, not around every component
2. **Fallback Optimization**: Use lightweight fallback components to minimize performance impact
3. **Error Context**: Limit error context data to essential information
4. **Retry Logic**: Implement exponential backoff to prevent infinite retry loops

#### Monitoring Integration

```tsx
// Performance tracking
const errorBoundaryMetrics = {
  errorCount: 0,
  errorRate: 0,
  recoverySuccessRate: 0,
  averageRecoveryTime: 0,
};

// Integration with performance monitoring
useEffect(() => {
  if (hasError) {
    performance.mark('error-boundary-triggered');
  }
}, [hasError]);
```

### 🔐 Security Considerations

#### Privacy-Aware Error Reporting

```tsx
const sanitizeErrorContext = (context: any) => {
  const {
    // Remove sensitive data
    password,
    token,
    sessionKey,
    personalInfo,
    ...safeContext
  } = context;
  
  return {
    ...safeContext,
    // Add safe identifiers
    sessionId: generateAnonymousId(),
    timestamp: new Date().toISOString(),
  };
};
```

#### Production Error Handling

```tsx
const ProductionErrorBoundary = ({ children }: { children: ReactNode }) => {
  return (
    <ErrorBoundaryProvider
      config={{
        enableReporting: process.env.NODE_ENV === 'production',
        showErrorDetails: process.env.NODE_ENV === 'development',
        maxRetries: 3,
      }}
    >
      <ErrorBoundary
        FallbackComponent={({ error, resetErrorBoundary }) => (
          <div className="error-container">
            <h2>Xin lỗi, đã xảy ra lỗi không mong muốn</h2>
            <p>Chúng tôi đã ghi nhận lỗi và sẽ khắc phục sớm nhất.</p>
            <button onClick={resetErrorBoundary}>Thử lại</button>
            <a href="/support">Liên hệ hỗ trợ</a>
          </div>
        )}
      >
        {children}
      </ErrorBoundary>
    </ErrorBoundaryProvider>
  );
};
```

### 📚 Best Practices

1. **Error Boundary Placement**
   - Place at route boundaries
   - Wrap expensive or error-prone components
   - Consider user experience impact

2. **Fallback Design**
   - Provide clear error messages in Vietnamese
   - Include recovery actions
   - Maintain application branding

3. **Error Reporting**
   - Capture sufficient context for debugging
   - Respect user privacy
   - Implement rate limiting

4. **Testing Strategy**
   - Test all error scenarios
   - Verify recovery mechanisms
   - Test integration with external services

5. **Performance**
   - Monitor error boundary overhead
   - Optimize fallback components
   - Implement proper cleanup

### 🔍 Troubleshooting

#### Common Issues

**Error boundaries not catching errors:**
- Ensure errors are thrown during render, not in event handlers
- Use `useErrorHandler` hook for imperative error handling
- Check that error boundaries are class components

**Fallback components not rendering:**
- Verify FallbackComponent prop is correctly passed
- Check for TypeScript interface compliance
- Ensure fallback components handle all required props

**Context provider errors:**
- Verify ErrorBoundaryProvider wraps error boundary consumers
- Check configuration object structure
- Ensure hooks are called within provider scope

#### Debug Mode

```tsx
<ErrorBoundaryProvider
  config={{
    showErrorDetails: true,
    enableReporting: false,
  }}
>
  <YourApp />
</ErrorBoundaryProvider>
```

### 📈 Metrics and Analytics

Track error boundary effectiveness:

- Error frequency by component
- Recovery success rates
- User impact measurements
- Performance implications

### 🔄 Migration Guide

Migrating from basic error boundaries:

1. Install error boundary system
2. Replace existing error boundaries
3. Add ErrorBoundaryProvider
4. Configure error reporting
5. Update fallback components
6. Add comprehensive tests

---

**© 2025 VN Speech Guardian Team**  
For support: support@vn-speech-guardian.com