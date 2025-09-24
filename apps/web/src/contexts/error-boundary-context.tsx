/**
 * Error Boundary Provider Context for VN Speech Guardian
 * Mục đích: Global error handling configuration và theme-aware error displays
 * Features: Context provider, configuration management, error boundary integration
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';

// Error boundary configuration interface
export interface ErrorBoundaryConfig {
  /** Theme for error displays */
  theme: 'light' | 'dark' | 'auto';
  /** Show detailed error info in development */  
  showErrorDetails: boolean;
  /** Maximum number of automatic retries before giving up */
  maxRetries: number;
  /** Retry delay in milliseconds (with exponential backoff) */
  retryDelay: number;
  /** Enable error reporting to external service */
  enableReporting: boolean;
  /** Custom error messages with Vietnamese localization */
  messages: {
    generic: string;
    network: string;
    authentication: string;
    audio: string;
    permission: string;
  };
  /** Brand configuration for Speech Guardian */
  branding: {
    logo?: string;
    primaryColor: string;
    supportUrl?: string;
    contactEmail?: string;
  };
}

// Default configuration for VN Speech Guardian
const DEFAULT_CONFIG: ErrorBoundaryConfig = {
  theme: 'auto',
  showErrorDetails: process.env.NODE_ENV === 'development',
  maxRetries: 3,
  retryDelay: 1000,
  enableReporting: process.env.NODE_ENV === 'production',
  messages: {
    generic: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.',
    network: 'Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng của bạn.',
    authentication: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    audio: 'Không thể truy cập microphone. Kiểm tra quyền trình duyệt.',
    permission: 'Không có quyền thực hiện thao tác này.',
  },
  branding: {
    primaryColor: '#3B82F6',
    supportUrl: '/support',
    contactEmail: 'support@vn-speech-guardian.com',
  },
};

// Context interface
interface ErrorBoundaryContextValue {
  config: ErrorBoundaryConfig;
  updateConfig: (updates: Partial<ErrorBoundaryConfig>) => void;
  reportError: (error: Error, context?: Record<string, any>) => void;
  getErrorMessage: (errorType: keyof ErrorBoundaryConfig['messages']) => string;
  theme: 'light' | 'dark';
}

// Create context
const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue | null>(null);

// Provider props
interface ErrorBoundaryProviderProps {
  children: ReactNode;
  config?: Partial<ErrorBoundaryConfig> | undefined;
}

/**
 * ErrorBoundaryProvider Component
 * Provides global error handling configuration throughout the app
 */
export function ErrorBoundaryProvider({ 
  children, 
  config: userConfig = {} 
}: ErrorBoundaryProviderProps) {
  // Merge user config with defaults
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...userConfig,
    messages: {
      ...DEFAULT_CONFIG.messages,
      ...userConfig.messages,
    },
    branding: {
      ...DEFAULT_CONFIG.branding,
      ...userConfig.branding,
    },
  }), [userConfig]);

  // Determine current theme
  const theme = useMemo(() => {
    if (config.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return config.theme;
  }, [config.theme]);

  // Update configuration function
  const updateConfig = useMemo(() => (updates: Partial<ErrorBoundaryConfig>) => {
    // In a real app, this would update state and persist to localStorage
    console.log('Updating error boundary config:', updates);
  }, []);

  // Error reporting function
  const reportError = useMemo(() => (error: Error, context?: Record<string, any>) => {
    if (!config.enableReporting) return;

    // Enhanced error context for VN Speech Guardian
    const errorContext = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: 'anonymous', // Would be populated from auth context
      sessionId: crypto.randomUUID(),
      theme,
      language: 'vi',
      ...context,
    };

    // In production, this would send to error reporting service
    console.error('Reporting error:', {
      message: error.message,
      stack: error.stack,
      context: errorContext,
    });
  }, [config.enableReporting, theme]);

  // Get localized error message
  const getErrorMessage = useMemo(() => (errorType: keyof ErrorBoundaryConfig['messages']) => {
    return config.messages[errorType] || config.messages.generic;
  }, [config.messages]);

  const contextValue = useMemo(() => ({
    config,
    updateConfig,
    reportError,
    getErrorMessage,
    theme,
  }), [config, updateConfig, reportError, getErrorMessage, theme]);

  return (
    <ErrorBoundaryContext.Provider value={contextValue}>
      {children}  
    </ErrorBoundaryContext.Provider>
  );
}

/**
 * useErrorBoundary Hook
 * Access error boundary configuration and utilities
 */
export function useErrorBoundary() {
  const context = useContext(ErrorBoundaryContext);
  
  if (!context) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider');
  }
  
  return context;
}

/**
 * useErrorHandler Hook  
 * Imperative error handling for async operations and event handlers
 */
export function useErrorHandler() {
  const { reportError } = useErrorBoundary();

  const handleError = useMemo(() => (error: Error, context?: Record<string, any>) => {
    reportError(error, context);
    
    // Create a synthetic error to trigger nearest error boundary
    const errorEvent = new Error(error.message);
    if (error.stack) {
      errorEvent.stack = error.stack;
    }
    throw errorEvent;
  }, [reportError]);

  return handleError;
}

/**
 * withErrorBoundaryConfig HOC
 * Wrap component with error boundary configuration
 */
export function withErrorBoundaryConfig<P extends object>(
  Component: React.ComponentType<P>,
  config?: Partial<ErrorBoundaryConfig> | undefined
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryProvider config={config || undefined}>
      <Component {...props} />
    </ErrorBoundaryProvider>
  );

  WrappedComponent.displayName = `withErrorBoundaryConfig(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}