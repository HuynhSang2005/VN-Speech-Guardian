/**
 * Comprehensive Error Boundary System for VN Speech Guardian
 * Mục đích: Professional error handling với React class components
 * Features: Error boundaries, fallback UIs, monitoring integration, recovery mechanisms
 */

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { logError, captureException } from '../../services/errorReporting';

// Error boundary state interface
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

// Common error boundary props
interface BaseErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | undefined;
  FallbackComponent?: React.ComponentType<ErrorFallbackProps> | undefined;
  fallbackRender?: ((props: ErrorFallbackProps) => ReactNode) | undefined;
  onError?: ((error: Error, errorInfo: ErrorInfo) => void) | undefined;
  onReset?: (() => void) | undefined;
  resetKeys?: Array<string | number> | undefined;
  resetOnPropsChange?: boolean | undefined;
  isolate?: boolean | undefined;
}

// Error fallback component props
export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  errorId?: string | undefined;
  retryCount?: number | undefined;
}

/**
 * Base Error Boundary Class - Foundation for all error boundaries
 * Implements React 19 compatible error boundary with comprehensive error handling
 */
export class BaseErrorBoundary extends Component<BaseErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  private retryTimeoutId: number | null = null;

  constructor(props: BaseErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo,
      retryCount: this.state.retryCount + 1,
    });

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  override componentDidUpdate(prevProps: BaseErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    if (hasError) {
      // Reset on prop changes if enabled
      if (resetOnPropsChange && prevProps !== this.props) {
        this.resetErrorBoundary();
        return;
      }

      // Reset on resetKeys change
      if (resetKeys) {
        const prevResetKeys = prevProps.resetKeys || [];
        const hasResetKeyChanged = resetKeys.some((key, index) => key !== prevResetKeys[index]);
        
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  override componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    const errorContext = {
      componentStack: errorInfo.componentStack || undefined,
      errorBoundary: this.constructor.name,
      errorId: this.state.errorId || undefined,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      props: this.props.isolate ? '[ISOLATED]' : Object.keys(this.props).join(', '),
    };

    // Log to error monitoring service
    logError(error, errorContext);
    captureException(error);
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });

    this.props.onReset?.();
  };



  override render() {
    const { hasError, error, errorId, retryCount } = this.state;
    const { children, fallback, FallbackComponent, fallbackRender } = this.props;

    if (hasError && error) {
      const errorFallbackProps: ErrorFallbackProps = {
        error,
        resetErrorBoundary: this.resetErrorBoundary,
        errorId: errorId || undefined,
        retryCount,
      };

      // Render fallback in priority order
      if (fallbackRender) {
        return fallbackRender(errorFallbackProps);
      }
      
      if (FallbackComponent) {
        return <FallbackComponent {...errorFallbackProps} />;
      }
      
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return <DefaultErrorFallback {...errorFallbackProps} />;
    }

    return children;
  }
}

/**
 * Error Boundary for standard React components
 * Wrapper around BaseErrorBoundary with Speech Guardian styling
 */
export const ErrorBoundary: React.FC<BaseErrorBoundaryProps> = (props) => {
  return <BaseErrorBoundary {...props} />;
};

/**
 * Query Error Boundary - Specialized for TanStack Query errors
 * Integrates with QueryErrorResetBoundary for query reset functionality
 */
interface QueryErrorBoundaryProps extends BaseErrorBoundaryProps {
  queryClient?: any; // TanStack QueryClient
}

export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({ 
  queryClient, 
  ...props 
}) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <BaseErrorBoundary
          {...props}
          onReset={() => {
            reset();
            queryClient?.resetQueries?.();
            props.onReset?.();
          }}
          FallbackComponent={props.FallbackComponent || QueryErrorFallback}
        />
      )}
    </QueryErrorResetBoundary>
  );
};

/**
 * Async Error Boundary - For handling async operations and Suspense
 * Includes loading states and async error recovery
 */
interface AsyncErrorBoundaryProps extends BaseErrorBoundaryProps {
  loadingFallback?: ReactNode;
  suspenseEnabled?: boolean;
}

export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({ 
  loadingFallback, 
  suspenseEnabled = true,
  ...props 
}) => {
  const fallbackComponent = props.FallbackComponent || AsyncErrorFallback;

  if (suspenseEnabled) {
    return (
      <React.Suspense fallback={loadingFallback || <DefaultLoadingFallback />}>
        <BaseErrorBoundary {...props} FallbackComponent={fallbackComponent} />
      </React.Suspense>
    );
  }

  return <BaseErrorBoundary {...props} FallbackComponent={fallbackComponent} />;
};

/**
 * Default Error Fallback Component
 * Generic error UI with Speech Guardian branding
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary, 
  errorId,
  retryCount = 0,
}) => {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-8 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Có lỗi xảy ra
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Đã xảy ra lỗi không mong muốn. Vui lòng thử lại hoặc tải lại trang.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer mb-2">
              Chi tiết lỗi (Dev Mode)
            </summary>
            <pre className="text-xs text-red-600 bg-red-50 p-2 rounded border overflow-auto max-h-32">
              {error.message}
              {errorId && `\nError ID: ${errorId}`}
              {retryCount > 0 && `\nRetry Count: ${retryCount}`}
            </pre>
          </details>
        )}
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Query Error Fallback - Specialized for API/Query errors
 */
const QueryErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary,
  retryCount = 0,
}) => {
  const isNetworkError = error.message.toLowerCase().includes('network') || 
                        error.message.toLowerCase().includes('fetch');

  return (
    <div className="min-h-[200px] flex items-center justify-center p-8 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isNetworkError ? 'Lỗi kết nối' : 'Lỗi tải dữ liệu'}
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          {isNetworkError 
            ? 'Không thể kết nối với máy chủ. Kiểm tra kết nối mạng của bạn.'
            : 'Không thể tải dữ liệu. Vui lòng thử lại.'
          }
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            disabled={retryCount >= 3}
            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {retryCount >= 3 ? 'Đã thử tối đa' : 'Thử lại'}
          </button>
        </div>

        {retryCount > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Đã thử {retryCount} lần
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Async Error Fallback - For async operations
 */
const AsyncErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary 
}) => {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-8 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-purple-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Lỗi xử lý bất đồng bộ
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Có lỗi xảy ra trong quá trình xử lý. Đang thử kết nối lại...
          {process.env.NODE_ENV === 'development' && (
            <>
              <br />
              <span className="text-xs text-gray-500 mt-2 font-mono">
                {error.message}
              </span>
            </>
          )}
        </p>

        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
        >
          Thử lại ngay
        </button>
      </div>
    </div>
  );
};

/**
 * Default Loading Fallback for Suspense
 */
const DefaultLoadingFallback: React.FC = () => {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-8">
      <div className="text-center">
        <svg
          className="mx-auto h-8 w-8 text-blue-500 animate-spin mb-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm text-gray-600">Đang tải...</p>
      </div>
    </div>
  );
};

export type { BaseErrorBoundaryProps, QueryErrorBoundaryProps, AsyncErrorBoundaryProps };