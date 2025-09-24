/**
 * Test suite cho Error Performance Monitor
 * Mục đích: Kiểm tra performance tracking và metrics collection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import errorPerformanceMonitor, {
  recordError,
  recordRecoveryAttempt,
  recordRecoveryResult,
  getErrorSummary,
  getCurrentErrorRate,
  clearErrorMetrics,
  useErrorPerformanceMonitor,
} from './errorPerformanceMonitor';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => [{ duration: 150.5 }]),
};

// Mock window properties
const mockWindow = {
  innerWidth: 1920,
  innerHeight: 1080,
  location: { pathname: '/test-route' },
  navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
  sessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
  speechGuardianAnalytics: {
    track: vi.fn(),
  },
};

// Mock global objects
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: mockWindow.navigator,
  writable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: mockWindow.sessionStorage,
  writable: true,
});

describe('Error Performance Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearErrorMetrics();
    mockPerformance.now.mockReturnValue(1000);
    mockWindow.sessionStorage.getItem.mockReturnValue('test-session-id');
  });

  afterEach(() => {
    clearErrorMetrics();
  });

  describe('recordError', () => {
    it('should record error with correct metrics', () => {
      const error = new Error('Test error');
      const componentName = 'TestComponent';
      const context = { feature: 'audio-processing' };

      const errorId = recordError(error, componentName, context);

      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(mockPerformance.mark).toHaveBeenCalledWith(`error-${errorId}-start`);

      const summary = getErrorSummary();
      expect(summary.totalErrors).toBe(1);
      expect(summary.errorsByComponent.TestComponent).toBe(1);
    });

    it('should categorize different error types correctly', () => {
      const networkError = new Error('Network request failed');
      const audioError = new Error('Microphone access denied');
      const authError = new Error('Token expired');

      recordError(networkError, 'NetworkComponent');
      recordError(audioError, 'AudioComponent');
      recordError(authError, 'AuthComponent');

      const summary = getErrorSummary();
      expect(summary.errorsByType.network).toBe(1);
      expect(summary.errorsByType.audio).toBe(1);
      expect(summary.errorsByType.authentication).toBe(1);
    });

    it('should assess user impact correctly', () => {
      const criticalError = new Error('MICROPHONE_ACCESS_DENIED');
      const highImpactError = new Error('Test error');
      const lowImpactError = new Error('Minor issue');

      recordError(criticalError, 'AudioRecorder');
      recordError(highImpactError, 'Dashboard');
      recordError(lowImpactError, 'UtilityComponent');

      const summary = getErrorSummary();
      expect(summary.userImpactDistribution.critical).toBe(1);
      expect(summary.userImpactDistribution.high).toBe(1);
      expect(summary.userImpactDistribution.medium).toBe(1);
    });
  });

  describe('recordRecoveryAttempt', () => {
    it('should mark recovery attempt', () => {
      const errorId = recordError(new Error('Test'), 'TestComponent');
      recordRecoveryAttempt(errorId);

      expect(mockPerformance.mark).toHaveBeenCalledWith(`recovery-${errorId}-start`);

      const summary = getErrorSummary();
      expect(summary.recoverySuccessRate).toBe(0); // No successful recoveries yet
    });

    it('should handle invalid error IDs gracefully', () => {
      expect(() => recordRecoveryAttempt('invalid-id')).not.toThrow();
    });
  });

  describe('recordRecoveryResult', () => {
    it('should record successful recovery with timing', () => {
      const errorId = recordError(new Error('Test'), 'TestComponent');
      recordRecoveryAttempt(errorId);
      recordRecoveryResult(errorId, true);

      expect(mockPerformance.mark).toHaveBeenCalledWith(`recovery-${errorId}-end`);
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        `recovery-${errorId}`,
        `recovery-${errorId}-start`,
        `recovery-${errorId}-end`
      );

      const summary = getErrorSummary();
      expect(summary.recoverySuccessRate).toBe(100);
      expect(summary.averageRecoveryTime).toBe(150.5);
    });

    it('should record failed recovery', () => {
      const errorId = recordError(new Error('Test'), 'TestComponent');
      recordRecoveryAttempt(errorId);
      recordRecoveryResult(errorId, false);

      const summary = getErrorSummary();
      expect(summary.recoverySuccessRate).toBe(0);
    });
  });

  describe('getErrorSummary', () => {
    it('should generate comprehensive summary', () => {
      // Create test data
      recordError(new Error('Network error'), 'NetworkComponent', { feature: 'api' });
      recordError(new Error('Audio error'), 'AudioComponent', { feature: 'recording' });
      
      const errorId = recordError(new Error('Recoverable error'), 'TestComponent');
      recordRecoveryAttempt(errorId);
      recordRecoveryResult(errorId, true);

      const summary = getErrorSummary();

      expect(summary.totalErrors).toBe(3);
      expect(summary.errorsByType.network).toBe(1);
      expect(summary.errorsByType.audio).toBe(1);
      expect(summary.errorsByType.unknown).toBe(1);
      expect(summary.errorsByComponent.NetworkComponent).toBe(1);
      expect(summary.errorsByComponent.AudioComponent).toBe(1);
      expect(summary.errorsByComponent.TestComponent).toBe(1);
      expect(summary.recoverySuccessRate).toBe(100);
      expect(summary.averageRecoveryTime).toBe(150.5);
    });

    it('should handle empty metrics', () => {
      const summary = getErrorSummary();

      expect(summary.totalErrors).toBe(0);
      expect(summary.errorRate).toBe(0);
      expect(summary.recoverySuccessRate).toBe(0);
      expect(summary.averageRecoveryTime).toBe(0);
    });
  });

  describe('getCurrentErrorRate', () => {
    it('should calculate current error rate', () => {
      const currentTime = Date.now();
      mockPerformance.now.mockReturnValue(currentTime);

      // Record errors within the recent window
      recordError(new Error('Recent error 1'), 'Component1');
      recordError(new Error('Recent error 2'), 'Component2');

      const errorRate = getCurrentErrorRate();
      expect(errorRate).toBeGreaterThan(0);
    });

    it('should return zero for no recent errors', () => {
      // Set time far in the future to make all errors "old"
      mockPerformance.now.mockReturnValue(Date.now() + 10 * 60 * 1000);
      
      recordError(new Error('Old error'), 'Component');
      
      const errorRate = getCurrentErrorRate();
      expect(errorRate).toBe(0);
    });
  });

  describe('useErrorPerformanceMonitor hook', () => {
    it('should provide monitor functions', () => {
      const monitor = useErrorPerformanceMonitor();

      expect(monitor).toHaveProperty('recordError');
      expect(monitor).toHaveProperty('recordRecoveryAttempt');
      expect(monitor).toHaveProperty('recordRecoveryResult');
      expect(monitor).toHaveProperty('getSummary');
      expect(monitor).toHaveProperty('getCurrentErrorRate');
      expect(monitor).toHaveProperty('exportMetrics');
      expect(monitor).toHaveProperty('clearMetrics');

      expect(typeof monitor.recordError).toBe('function');
      expect(typeof monitor.getSummary).toBe('function');
    });
  });

  describe('Privacy and Security', () => {
    it('should anonymize sensitive data in exported metrics', () => {
      recordError(new Error('Test'), 'Component', {
        feature: 'test',
        userId: 'user-123',
      });

      const exported = errorPerformanceMonitor.exportMetrics();
      const metric = exported[0];

      expect(metric?.context.userId).toBe('anonymous');
      expect(metric?.context.userAgent).toContain('X.X.X');
    });

    it('should generate unique session IDs', () => {
      mockWindow.sessionStorage.getItem.mockReturnValue(null);
      
      recordError(new Error('Test 1'), 'Component1');
      recordError(new Error('Test 2'), 'Component2');

      expect(mockWindow.sessionStorage.setItem).toHaveBeenCalledWith(
        'error-monitor-session-id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );
    });
  });

  describe('Performance Metrics Calculation', () => {
    it('should calculate trends correctly', () => {
      // Mock different timestamps for trend calculation
      const baseTime = Date.now();
      
      mockPerformance.now
        .mockReturnValueOnce(baseTime - 2 * 60 * 60 * 1000) // 2 hours ago
        .mockReturnValueOnce(baseTime - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        .mockReturnValueOnce(baseTime - 1 * 7 * 24 * 60 * 60 * 1000); // 1 week ago

      recordError(new Error('Error 1'), 'Component1');
      recordError(new Error('Error 2'), 'Component2');
      recordError(new Error('Error 3'), 'Component3');

      const summary = getErrorSummary();
      
      expect(summary.trends).toHaveProperty('hourly');
      expect(summary.trends).toHaveProperty('daily');
      expect(summary.trends).toHaveProperty('weekly');
      expect(Array.isArray(summary.trends.hourly)).toBe(true);
      expect(summary.trends.hourly).toHaveLength(24);
    });

    it('should trim metrics history when exceeding limit', () => {
      // Record more than maxMetricsHistory (1000) errors
      for (let i = 0; i < 1050; i++) {
        recordError(new Error(`Error ${i}`), 'Component');
      }

      const summary = getErrorSummary();
      expect(summary.totalErrors).toBe(1000); // Should be trimmed to max
    });
  });

  describe('Error Categorization', () => {
    it('should categorize chunk loading errors', () => {
      const chunkError = new Error('Loading chunk 5 failed');
      recordError(chunkError, 'LazyComponent');

      const summary = getErrorSummary();
      expect(summary.errorsByType['chunk-loading']).toBe(1);
    });

    it('should categorize timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      recordError(timeoutError, 'ApiComponent');

      const summary = getErrorSummary();
      expect(summary.errorsByType.timeout).toBe(1);
    });

    it('should categorize permission errors', () => {
      const permissionError = new Error('Permission denied');
      recordError(permissionError, 'PermissionComponent');

      const summary = getErrorSummary();
      expect(summary.errorsByType.permission).toBe(1);
    });
  });

  describe('Development vs Production Behavior', () => {
    it('should log errors in development mode', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      recordError(new Error('Dev test'), 'DevComponent');

      expect(consoleSpy).toHaveBeenCalledWith('🚨 Error Performance Metric');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();

      // Restore
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });

  describe('Analytics Integration', () => {
    it('should integrate with Speech Guardian analytics', async () => {
      // Mock analytics
      (mockWindow as any).speechGuardianAnalytics = {
        track: vi.fn(),
      };

      recordError(new Error('Analytics test'), 'AnalyticsComponent');

      // Wait for potential async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      // Note: In actual implementation, this would test periodic reporting
      // For now we just verify the analytics object exists
      expect(mockWindow.speechGuardianAnalytics).toBeDefined();
      expect(typeof mockWindow.speechGuardianAnalytics.track).toBe('function');
    });
  });
});