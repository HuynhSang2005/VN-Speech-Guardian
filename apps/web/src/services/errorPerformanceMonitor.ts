/**
 * Mục đích: Theo dõi hiệu suất và metrics cho Error Boundary system
 * Chức năng: Thu thập dữ liệu về tần suất lỗi, tỷ lệ phục hồi, thời gian xử lý
 * Tích hợp: Performance API, Speech Guardian analytics, privacy-aware logging
 */

// Định nghĩa interface cho error metrics
export interface ErrorMetrics {
  errorId: string;
  timestamp: number;
  errorType: string;
  componentName: string;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  recoveryTime?: number;
  userImpact: 'low' | 'medium' | 'high' | 'critical';
  context: {
    feature: string;
    userId?: string | undefined; // anonymized
    sessionId: string;
    userAgent: string;
    viewport: { width: number; height: number };
    route: string;
  };
}

// Interface cho error performance summary
export interface ErrorPerformanceSummary {
  totalErrors: number;
  errorRate: number; // errors per session
  recoverySuccessRate: number; // percentage
  averageRecoveryTime: number; // milliseconds
  errorsByType: Record<string, number>;
  errorsByComponent: Record<string, number>;
  userImpactDistribution: Record<string, number>;
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

// Performance monitoring class
class ErrorPerformanceMonitor {
  private metrics: ErrorMetrics[] = [];
  private sessionStart: number;
  private readonly maxMetricsHistory = 1000;

  constructor() {
    this.sessionStart = performance.now();
    
    // Initialize performance marks for error boundary tracking
    this.initializePerformanceMarks();
    
    // Set up periodic reporting
    this.setupPeriodicReporting();
  }

  /**
   * Ghi nhận lỗi mới với performance tracking
   */
  public recordError(
    error: Error,
    componentName: string,
    context: Partial<ErrorMetrics['context']> = {}
  ): string {
    const errorId = this.generateErrorId();
    const timestamp = performance.now();
    
    // Mark error occurrence for performance measurement
    performance.mark(`error-${errorId}-start`);
    
    const errorMetric: ErrorMetrics = {
      errorId,
      timestamp,
      errorType: this.categorizeError(error),
      componentName,
      recoveryAttempted: false,
      recoverySuccessful: false,
      userImpact: this.assessUserImpact(error, componentName),
      context: {
        feature: 'unknown',
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        route: window.location.pathname,
        ...context,
      },
    };

    this.metrics.push(errorMetric);
    this.trimMetricsHistory();
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Performance Metric');
      console.log('Error ID:', errorId);
      console.log('Component:', componentName);
      console.log('Type:', errorMetric.errorType);
      console.log('Impact:', errorMetric.userImpact);
      console.log('Context:', errorMetric.context);
      console.groupEnd();
    }

    return errorId;
  }

  /**
   * Ghi nhận thử phục hồi lỗi
   */
  public recordRecoveryAttempt(errorId: string): void {
    const metric = this.findMetric(errorId);
    if (metric) {
      metric.recoveryAttempted = true;
      performance.mark(`recovery-${errorId}-start`);
    }
  }

  /**
   * Ghi nhận kết quả phục hồi
   */
  public recordRecoveryResult(errorId: string, successful: boolean): void {
    const metric = this.findMetric(errorId);
    if (metric) {
      metric.recoverySuccessful = successful;
      
      performance.mark(`recovery-${errorId}-end`);
      
      // Measure recovery time
      try {
        performance.measure(
          `recovery-${errorId}`,
          `recovery-${errorId}-start`,
          `recovery-${errorId}-end`
        );
        
        const measures = performance.getEntriesByName(`recovery-${errorId}`);
        if (measures.length > 0 && measures[0]) {
          metric.recoveryTime = measures[0].duration;
        }
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }

      // Log recovery result
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `🔄 Recovery ${successful ? 'successful' : 'failed'} for ${errorId}`,
          metric.recoveryTime ? `in ${metric.recoveryTime.toFixed(2)}ms` : ''
        );
      }
    }
  }

  /**
   * Tạo báo cáo performance summary
   */
  public generateSummary(): ErrorPerformanceSummary {
    const sessionDuration = performance.now() - this.sessionStart;
    const sessionHours = sessionDuration / (1000 * 60 * 60);

    const errorsByType = this.metrics.reduce((acc, metric) => {
      acc[metric.errorType] = (acc[metric.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByComponent = this.metrics.reduce((acc, metric) => {
      acc[metric.componentName] = (acc[metric.componentName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userImpactDistribution = this.metrics.reduce((acc, metric) => {
      acc[metric.userImpact] = (acc[metric.userImpact] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recoveryMetrics = this.metrics.filter(m => m.recoveryAttempted);
    const successfulRecoveries = recoveryMetrics.filter(m => m.recoverySuccessful);
    const recoveryTimes = successfulRecoveries
      .map(m => m.recoveryTime)
      .filter((time): time is number => time !== undefined);

    return {
      totalErrors: this.metrics.length,
      errorRate: sessionHours > 0 ? this.metrics.length / sessionHours : 0,
      recoverySuccessRate: recoveryMetrics.length > 0 
        ? (successfulRecoveries.length / recoveryMetrics.length) * 100 
        : 0,
      averageRecoveryTime: recoveryTimes.length > 0 
        ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length 
        : 0,
      errorsByType,
      errorsByComponent,
      userImpactDistribution,
      trends: this.calculateTrends(),
    };
  }

  /**
   * Export metrics cho external analytics
   */
  public exportMetrics(): ErrorMetrics[] {
    return this.metrics.map(metric => ({
      ...metric,
      // Anonymize sensitive data
      context: {
        ...metric.context,
        userId: metric.context.userId ? 'anonymous' : undefined,
        userAgent: this.anonymizeUserAgent(metric.context.userAgent),
      },
    }));
  }

  /**
   * Clear metrics history
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.sessionStart = performance.now();
  }

  /**
   * Lấy real-time error rate
   */
  public getCurrentErrorRate(): number {
    const now = performance.now();
    const recentWindow = 5 * 60 * 1000; // 5 minutes
    const recentErrors = this.metrics.filter(
      metric => (now - metric.timestamp) < recentWindow
    );
    
    return (recentErrors.length / (recentWindow / 1000)) * 60; // errors per minute
  }

  /**
   * Private methods
   */
  private initializePerformanceMarks(): void {
    performance.mark('error-monitoring-session-start');
  }

  private setupPeriodicReporting(): void {
    // Report summary every 5 minutes in production
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        const summary = this.generateSummary();
        this.reportToAnalytics(summary);
      }, 5 * 60 * 1000);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('permission') || message.includes('access')) {
      return 'permission';
    }
    if (message.includes('audio') || message.includes('microphone')) {
      return 'audio';
    }
    if (message.includes('auth') || message.includes('token')) {
      return 'authentication';
    }
    if (stack.includes('chunkloadererror') || message.includes('loading chunk')) {
      return 'chunk-loading';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    
    return 'unknown';
  }

  private assessUserImpact(error: Error, componentName: string): ErrorMetrics['userImpact'] {
    const criticalComponents = ['AudioRecorder', 'TranscriptionEngine', 'AuthProvider'];
    const highImpactComponents = ['Dashboard', 'SessionManager', 'RealTimeProcessor'];
    
    if (criticalComponents.some(comp => componentName.includes(comp))) {
      return 'critical';
    }
    if (highImpactComponents.some(comp => componentName.includes(comp))) {
      return 'high';
    }
    if (error.message.includes('MICROPHONE_ACCESS_DENIED')) {
      return 'critical';
    }
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 'medium';
    }
    
    return 'low';
  }

  private findMetric(errorId: string): ErrorMetrics | undefined {
    return this.metrics.find(metric => metric.errorId === errorId);
  }

  private trimMetricsHistory(): void {
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error-monitor-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-monitor-session-id', sessionId);
    }
    return sessionId;
  }

  private calculateTrends(): ErrorPerformanceSummary['trends'] {
    const now = Date.now();
    const hourlyBuckets = new Array(24).fill(0);
    const dailyBuckets = new Array(7).fill(0);
    const weeklyBuckets = new Array(4).fill(0);

    this.metrics.forEach(metric => {
      const hoursAgo = Math.floor((now - metric.timestamp) / (1000 * 60 * 60));
      const daysAgo = Math.floor((now - metric.timestamp) / (1000 * 60 * 60 * 24));
      const weeksAgo = Math.floor((now - metric.timestamp) / (1000 * 60 * 60 * 24 * 7));

      if (hoursAgo < 24) {
        hourlyBuckets[23 - hoursAgo]++;
      }
      if (daysAgo < 7) {
        dailyBuckets[6 - daysAgo]++;
      }
      if (weeksAgo < 4) {
        weeklyBuckets[3 - weeksAgo]++;
      }
    });

    return {
      hourly: hourlyBuckets,
      daily: dailyBuckets,
      weekly: weeklyBuckets,
    };
  }

  private anonymizeUserAgent(userAgent: string): string {
    // Remove version numbers and specific identifiers
    return userAgent
      .replace(/\d+\.\d+\.\d+/g, 'X.X.X')
      .replace(/Chrome\/[\d.]+/g, 'Chrome/X.X.X')
      .replace(/Firefox\/[\d.]+/g, 'Firefox/X.X.X')
      .replace(/Safari\/[\d.]+/g, 'Safari/X.X.X');
  }

  private async reportToAnalytics(summary: ErrorPerformanceSummary): Promise<void> {
    try {
      // Only report if there are errors to report
      if (summary.totalErrors === 0) return;

      // In a real application, this would send to your analytics service
      console.log('📊 Error Performance Summary:', summary);
      
      // Example integration with Speech Guardian analytics
      if (typeof window !== 'undefined' && (window as any).speechGuardianAnalytics) {
        (window as any).speechGuardianAnalytics.track('error_performance_summary', {
          ...summary,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.warn('Failed to report error analytics:', error);
    }
  }
}

// Singleton instance
const errorPerformanceMonitor = new ErrorPerformanceMonitor();

export default errorPerformanceMonitor;

// Convenience functions for easier integration
export const recordError = (error: Error, componentName: string, context?: Partial<ErrorMetrics['context']>) => 
  errorPerformanceMonitor.recordError(error, componentName, context);

export const recordRecoveryAttempt = (errorId: string) => 
  errorPerformanceMonitor.recordRecoveryAttempt(errorId);

export const recordRecoveryResult = (errorId: string, successful: boolean) => 
  errorPerformanceMonitor.recordRecoveryResult(errorId, successful);

export const getErrorSummary = () => 
  errorPerformanceMonitor.generateSummary();

export const getCurrentErrorRate = () => 
  errorPerformanceMonitor.getCurrentErrorRate();

export const exportErrorMetrics = () => 
  errorPerformanceMonitor.exportMetrics();

export const clearErrorMetrics = () => 
  errorPerformanceMonitor.clearMetrics();

// React hook for using error performance monitoring
export const useErrorPerformanceMonitor = () => {
  return {
    recordError,
    recordRecoveryAttempt,
    recordRecoveryResult,
    getSummary: getErrorSummary,
    getCurrentErrorRate,
    exportMetrics: exportErrorMetrics,
    clearMetrics: clearErrorMetrics,
  };
};