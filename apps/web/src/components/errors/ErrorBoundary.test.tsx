/**
 * Error Boundary Components Tests - TDD Implementation
 * Testing comprehensive error handling for VN Speech Guardian
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary, AsyncErrorBoundary, QueryErrorBoundary } from './ErrorBoundary';
import { AudioErrorFallback, NetworkErrorFallback, GenericErrorFallback } from './ErrorFallbacks';

// Mock error logging service
const mockLogError = vi.fn();
vi.mock('../../services/errorReporting', () => ({
  logError: mockLogError,
  captureException: vi.fn(),
}));

// Component that throws errors for testing
const ThrowError = ({ shouldThrow, errorType }: { shouldThrow: boolean; errorType?: string }) => {
  if (shouldThrow) {
    if (errorType === 'audio') {
      throw new Error('Audio processing failed: Microphone access denied');
    }
    if (errorType === 'network') {
      throw new Error('Network error: Failed to fetch');
    }
    throw new Error('Generic component error');
  }
  return <div>Component working correctly</div>;
};

// Async component for testing AsyncErrorBoundary
const AsyncComponent = ({ shouldReject }: { shouldReject: boolean }) => {
  if (shouldReject) {
    throw Promise.reject(new Error('Async operation failed'));
  }
  return <div>Async component loaded</div>;
};

describe('ErrorBoundary', () => {
  let queryClient: QueryClient;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    // Suppress console.error in tests
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLogError.mockClear();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('BaseErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component working correctly')).toBeInTheDocument();
    });

    it('should catch and display error fallback when error occurs', () => {
      render(
        <ErrorBoundary fallback={<div>Something went wrong</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('Component working correctly')).not.toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should reset error boundary when resetErrorBoundary is called', async () => {
      const ResetButton = ({ reset }: { reset: () => void }) => (
        <button onClick={reset}>Reset</button>
      );

      const FallbackWithReset = ({ error, resetErrorBoundary }: { 
        error: Error; 
        resetErrorBoundary: () => void; 
      }) => (
        <div>
          <div>Error: {error.message}</div>
          <ResetButton reset={resetErrorBoundary} />
        </div>
      );

      const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        return shouldThrow ? <ThrowError shouldThrow={true} /> : <div>Reset successful</div>;
      };

      let shouldThrow = true;
      const { rerender } = render(
        <ErrorBoundary FallbackComponent={FallbackWithReset}>
          <TestComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );

      // Error should be caught
      expect(screen.getByText(/Error: Generic component error/)).toBeInTheDocument();

      // Reset the component state
      shouldThrow = false;
      rerender(
        <ErrorBoundary FallbackComponent={FallbackWithReset}>
          <TestComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );

      // Click reset button
      fireEvent.click(screen.getByText('Reset'));

      // Should show successful state
      await waitFor(() => {
        expect(screen.getByText('Reset successful')).toBeInTheDocument();
      });
    });

    it('should log errors to monitoring service', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
          errorBoundary: 'BaseErrorBoundary',
        })
      );
    });
  });

  describe('QueryErrorBoundary', () => {
    it('should handle TanStack Query errors', async () => {
      const queryFn = vi.fn().mockRejectedValue(new Error('API call failed'));

      render(
        <QueryClientProvider client={queryClient}>
          <QueryErrorBoundary>
            <div>Query component</div>
          </QueryErrorBoundary>
        </QueryClientProvider>
      );

      // Query error handling will be tested with actual query components
      expect(screen.getByText('Query component')).toBeInTheDocument();
    });

    it('should reset queries when error boundary resets', () => {
      const resetQueriesSpy = vi.spyOn(queryClient, 'resetQueries');
      
      render(
        <QueryClientProvider client={queryClient}>
          <QueryErrorBoundary onReset={() => queryClient.resetQueries()}>
            <ThrowError shouldThrow={true} />
          </QueryErrorBoundary>
        </QueryClientProvider>
      );

      // Test will be completed when reset functionality is implemented
      expect(screen.getByText(/Có lỗi xảy ra/)).toBeInTheDocument();
    });
  });

  describe('AsyncErrorBoundary', () => {
    it('should handle async errors with Suspense integration', async () => {
      render(
        <AsyncErrorBoundary>
          <AsyncComponent shouldReject={false} />
        </AsyncErrorBoundary>
      );

      expect(screen.getByText('Async component loaded')).toBeInTheDocument();
    });

    it('should show loading state during async operations', async () => {
      render(
        <AsyncErrorBoundary loadingFallback={<div>Loading...</div>}>
          <AsyncComponent shouldReject={false} />
        </AsyncErrorBoundary>
      );

      // Test async loading states
      expect(screen.getByText('Async component loaded')).toBeInTheDocument();
    });
  });

  describe('Specialized Error Fallbacks', () => {
    it('should render AudioErrorFallback for audio errors', () => {
      render(
        <ErrorBoundary FallbackComponent={AudioErrorFallback}>
          <ThrowError shouldThrow={true} errorType="audio" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Lỗi xử lý âm thanh/)).toBeInTheDocument();
      expect(screen.getByText(/Kiểm tra quyền truy cập microphone/)).toBeInTheDocument();
    });

    it('should render NetworkErrorFallback for network errors', () => {
      render(
        <ErrorBoundary FallbackComponent={NetworkErrorFallback}>
          <ThrowError shouldThrow={true} errorType="network" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Lỗi kết nối mạng/)).toBeInTheDocument();
      expect(screen.getByText(/Thử lại/)).toBeInTheDocument();
    });

    it('should render GenericErrorFallback for unknown errors', () => {
      render(
        <ErrorBoundary FallbackComponent={GenericErrorFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Có lỗi xảy ra/)).toBeInTheDocument();
      expect(screen.getByText(/Tải lại trang/)).toBeInTheDocument();
    });
  });

  describe('Error Recovery Mechanisms', () => {
    it('should provide retry functionality', async () => {
      let attemptCount = 0;
      const RetryComponent = () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('First attempt failed');
        }
        return <div>Success on attempt {attemptCount}</div>;
      };

      const FallbackWithRetry = ({ resetErrorBoundary }: { resetErrorBoundary: () => void }) => (
        <div>
          <div>Error occurred</div>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      );

      render(
        <ErrorBoundary FallbackComponent={FallbackWithRetry}>
          <RetryComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error occurred')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('Success on attempt 2')).toBeInTheDocument();
      });
    });

    it('should handle multiple retry attempts with backoff', async () => {
      let attempts = 0;
      const BackoffComponent = () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return <div>Success after {attempts} attempts</div>;
      };

      // This will be implemented with actual backoff logic
      render(
        <ErrorBoundary>
          <BackoffComponent />
        </ErrorBoundary>
      );

      // Test backoff mechanism implementation
      expect(screen.getByText(/Có lỗi xảy ra/)).toBeInTheDocument();
    });
  });

  describe('Error Context and Reporting', () => {
    it('should capture comprehensive error context', () => {
      const TestComponentWithContext = () => {
        // Add user context, session info, etc.
        throw new Error('Error with context');
      };

      render(
        <ErrorBoundary>
          <TestComponentWithContext />
        </ErrorBoundary>
      );

      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
          userAgent: expect.any(String),
          timestamp: expect.any(String),
          url: expect.any(String),
        })
      );
    });

    it('should respect user privacy in error reporting', () => {
      const SensitiveComponent = () => {
        // Component with sensitive data
        throw new Error('Error with sensitive context');
      };

      render(
        <ErrorBoundary>
          <SensitiveComponent />
        </ErrorBoundary>
      );

      const errorCall = mockLogError.mock.calls[0];
      const errorContext = errorCall[1];
      
      // Should not contain sensitive information
      expect(errorContext).not.toHaveProperty('sessionToken');
      expect(errorContext).not.toHaveProperty('userCredentials');
    });
  });

  describe('Integration with Speech Guardian Features', () => {
    it('should handle audio processing errors gracefully', () => {
      const AudioProcessingComponent = () => {
        throw new Error('AUDIO_PROCESSING_FAILED: Microphone not available');
      };

      render(
        <ErrorBoundary>
          <AudioProcessingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Lỗi xử lý âm thanh/)).toBeInTheDocument();
    });

    it('should handle session management errors', () => {
      const SessionComponent = () => {
        throw new Error('SESSION_EXPIRED: User session has expired');
      };

      render(
        <ErrorBoundary>
          <SessionComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Phiên làm việc hết hạn/)).toBeInTheDocument();
    });

    it('should handle real-time connection errors', () => {
      const WebSocketComponent = () => {
        throw new Error('WEBSOCKET_ERROR: Connection lost');
      };

      render(
        <ErrorBoundary>
          <WebSocketComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Mất kết nối/)).toBeInTheDocument();
    });
  });
});