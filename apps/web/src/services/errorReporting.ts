/**
 * Error Reporting Service for VN Speech Guardian
 * Mục đích: Centralized error logging and monitoring integration
 * Features: Error context capture, privacy-aware logging, Sentry-like functionality
 */

export interface ErrorContext {
  componentStack?: string | undefined;
  errorBoundary?: string | undefined;
  errorId?: string | undefined;
  retryCount?: number | undefined;
  timestamp: string;
  userAgent: string;
  url: string;
  props?: string | undefined;
  userId?: string | undefined;
  sessionId?: string | undefined;
  feature?: string | undefined;
  severity?: 'low' | 'medium' | 'high' | 'critical' | undefined;
}

export interface ErrorReport {
  error: Error;
  context: ErrorContext;
  fingerprint?: string;
  tags?: Record<string, string>;
}

/**
 * Log error to monitoring service (Sentry-like functionality)
 */
export const logError = (error: Error, context: Partial<ErrorContext> = {}): void => {
  try {
    const errorReport: ErrorReport = {
      error,
      context: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context,
      },
      fingerprint: generateErrorFingerprint(error),
      tags: {
        app: 'vn-speech-guardian',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.info('Context:', errorReport.context);
      console.info('Fingerprint:', errorReport.fingerprint);
      console.groupEnd();
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      sendToMonitoringService(errorReport);
    }

    // Store in local storage for debugging (privacy-safe)
    storeErrorLocally(errorReport);
  } catch (loggingError) {
    console.error('Failed to log error:', loggingError);
  }
};

/**
 * Capture exception for external monitoring (Sentry-like)
 */
export const captureException = (error: Error, extra?: Record<string, any>): void => {
  try {
    // Mock Sentry captureException functionality
    const errorWithExtra = {
      ...error,
      extra: {
        timestamp: new Date().toISOString(),
        ...extra,
      },
    };

    if (process.env.NODE_ENV === 'development') {
      console.warn('📸 Captured Exception:', errorWithExtra);
    }

    // In production, this would integrate with Sentry or similar service
    // Sentry.captureException(error, { extra });
  } catch (captureError) {
    console.error('Failed to capture exception:', captureError);
  }
};

/**
 * Generate unique fingerprint for error grouping
 */
const generateErrorFingerprint = (error: Error): string => {
  const stack = error.stack || '';
  const message = error.message || '';
  const name = error.name || 'Error';
  
  // Create fingerprint from error characteristics
  const fingerprintData = `${name}:${message}:${stack.split('\n')[1] || ''}`;
  
  // Simple hash function for fingerprint
  let hash = 0;
  for (let i = 0; i < fingerprintData.length; i++) {
    const char = fingerprintData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
};

/**
 * Send error report to monitoring service
 */
const sendToMonitoringService = async (errorReport: ErrorReport): Promise<void> => {
  try {
    // Mock monitoring service endpoint
    const endpoint = process.env.VITE_ERROR_REPORTING_URL || 'https://api.example.com/errors';
    
    // Sanitize sensitive data before sending
    const sanitizedReport = sanitizeErrorReport(errorReport);
    
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.VITE_ERROR_REPORTING_API_KEY || '',
      },
      body: JSON.stringify(sanitizedReport),
    });
  } catch (sendError) {
    console.error('Failed to send error to monitoring service:', sendError);
  }
};

/**
 * Store error locally for debugging (privacy-safe)
 */
const storeErrorLocally = (errorReport: ErrorReport): void => {
  try {
    const errors = getStoredErrors();
    const sanitizedReport = sanitizeErrorReport(errorReport);
    
    errors.push({
      ...sanitizedReport,
      timestamp: Date.now(),
    });
    
    // Keep only last 10 errors
    const recentErrors = errors.slice(-10);
    
    localStorage.setItem('vsg_errors', JSON.stringify(recentErrors));
  } catch (storageError) {
    console.error('Failed to store error locally:', storageError);
  }
};

/**
 * Get stored errors from local storage
 */
export const getStoredErrors = (): any[] => {
  try {
    const stored = localStorage.getItem('vsg_errors');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Clear stored errors
 */
export const clearStoredErrors = (): void => {
  try {
    localStorage.removeItem('vsg_errors');
  } catch (error) {
    console.error('Failed to clear stored errors:', error);
  }
};

/**
 * Sanitize error report to remove sensitive information
 */
const sanitizeErrorReport = (errorReport: ErrorReport): ErrorReport => {
  const { context, ...rest } = errorReport;
  
  // Remove potentially sensitive information
  const sanitizedContext = {
    ...context,
    // Remove sensitive props
    props: context.props?.includes('token') || context.props?.includes('password') 
      ? '[SANITIZED]' 
      : context.props,
    // Sanitize URL to remove query parameters that might contain sensitive data
    url: sanitizeUrl(context.url),
  };
  
  return {
    ...rest,
    context: sanitizedContext,
  };
};

/**
 * Sanitize URL to remove sensitive query parameters
 */
const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const sensitiveParams = ['token', 'key', 'password', 'secret', 'api_key'];
    
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });
    
    return urlObj.toString();
  } catch {
    return url;
  }
};

/**
 * Error severity classification
 */
export const classifyErrorSeverity = (error: Error): ErrorContext['severity'] => {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  
  // Critical errors
  if (
    message.includes('chunk load error') ||
    message.includes('network error') ||
    message.includes('security') ||
    stack.includes('auth')
  ) {
    return 'critical';
  }
  
  // High severity
  if (
    message.includes('audio') ||
    message.includes('microphone') ||
    message.includes('session') ||
    message.includes('api')
  ) {
    return 'high';
  }
  
  // Medium severity
  if (
    message.includes('render') ||
    message.includes('component') ||
    message.includes('ui')
  ) {
    return 'medium';
  }
  
  // Low severity (default)
  return 'low';
};

/**
 * Create error context for Speech Guardian features
 */
export const createErrorContext = (
  feature: string,
  additionalContext: Partial<ErrorContext> = {}
): Partial<ErrorContext> => {
  return {
    feature,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...additionalContext,
  };
};