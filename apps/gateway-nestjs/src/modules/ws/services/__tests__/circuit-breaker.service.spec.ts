/**
 * Mục đích: TDD Red Phase - failing tests cho Circuit Breaker Pattern
 * Test Coverage: State machine, thresholds, recovery, AI Worker integration
 * Pattern: Martin Fowler Circuit Breaker với Vietnamese comments
 */

// Mock environment variables before any imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.CLERK_SECRET_KEY = 'sk_test_mock_key_for_tests';
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key_for_tests';
process.env.NODE_ENV = 'test';
process.env.AI_WORKER_BASE_URL = 'http://localhost:8000';
process.env.AI_WORKER_API_KEY = 'test-api-key';

import { Test } from '@nestjs/testing';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { CIRCUIT_BREAKER_CONFIG } from '@/config';
import { 
  CircuitBreakerState, 
  CircuitBreakerMetrics, 
  CircuitBreakerCallResult,
  HealthCheckResult
} from '@/modules/ws/models';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let mockAIWorkerService: any;
  let mockLogger: any;

  beforeEach(async () => {
    // Setup fake timers BEFORE creating service
    jest.useFakeTimers();
    
    // Mock dependencies
    mockAIWorkerService = {
      forwardAudioChunk: jest.fn(),
      checkHealth: jest.fn(),
      processModeration: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        {
          provide: 'AI_WORKER_SERVICE',
          useValue: mockAIWorkerService,
        },
        {
          provide: 'LOGGER',
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    // Clean up timers to prevent leaks
    jest.useRealTimers();
  });

  describe('Circuit Breaker State Machine', () => {
    it('should start in CLOSED state', () => {
      // TDD Red: Service chưa exists
      expect(service.getCurrentState()).toBe('closed');
      expect(service.getMetrics().state).toBe('closed');
    });

    it('should transition from CLOSED to OPEN after failure threshold', async () => {
      // TDD Red: cần implement state machine logic
      const config = CIRCUIT_BREAKER_CONFIG.aiWorker;
      
      // Mock failures
      mockAIWorkerService.forwardAudioChunk.mockRejectedValue(new Error('AI Worker down'));
      
      // Gửi đủ failures để trip breaker
      for (let i = 0; i < config.failureThreshold; i++) {
        await expect(
          service.executeCall('forwardAudioChunk', [Buffer.from('audio')])
        ).rejects.toThrow();
      }
      
      expect(service.getCurrentState()).toBe('open');
      expect(service.getMetrics().failureCount).toBe(config.failureThreshold);
    });

    it('should reject calls immediately when in OPEN state', async () => {
      // TDD Red: cần implement open state behavior
      // Set state to open
      await service.tripCircuitBreaker('manual test');
      
      // Calls should be rejected without hitting AI Worker
      await expect(
        service.executeCall('forwardAudioChunk', [Buffer.from('audio')])
      ).rejects.toThrow('Circuit breaker is OPEN');
      
      // AI Worker không được gọi
      expect(mockAIWorkerService.forwardAudioChunk).not.toHaveBeenCalled();
    });

    it('should transition from OPEN to HALF-OPEN after timeout', async () => {
      // TDD Red: cần implement timeout logic
      const config = CIRCUIT_BREAKER_CONFIG.aiWorker;
      
      // Trip breaker
      await service.tripCircuitBreaker('test timeout');
      expect(service.getCurrentState()).toBe('open');
      
      // Fast forward time
      jest.advanceTimersByTime(config.resetTimeoutMs + 1000);
      
      // VI: Test Martin Fowler pattern: open → half-open → closed
      // Mock successful call để test transition
      mockAIWorkerService.forwardAudioChunk.mockResolvedValue({ success: true });
      
      const result = await service.executeCall('forwardAudioChunk', [Buffer.from('audio')]);
      
      // VI: Sau successful call trong half-open state, nó chuyển thành closed
      expect(service.getCurrentState()).toBe('closed');
      expect(result.success).toBe(true);
    });

    it('should transition from HALF-OPEN to CLOSED on success', async () => {
      // TDD Red: cần implement half-open success logic
      // Set to half-open state
      await service.setStateToHalfOpen();
      
      const initialMetrics = service.getMetrics();
      const initialSuccessCount = initialMetrics.successCount;
      console.log('🔍 Initial metrics:', initialMetrics);
      
      // Successful call should close breaker
      mockAIWorkerService.forwardAudioChunk.mockResolvedValue({ success: true });
      const result = await service.executeCall('forwardAudioChunk', [Buffer.from('audio')]);
      
      console.log('🔍 Call result:', result);
      expect(result.success).toBe(true);
      expect(service.getCurrentState()).toBe('closed');
      
      const finalMetrics = service.getMetrics();
      console.log('🔍 Final metrics:', finalMetrics);
      expect(finalMetrics.successCount).toBe(initialSuccessCount + 1);
    });

    it('should transition from HALF-OPEN to OPEN on failure', async () => {
      // TDD Red: cần implement half-open failure logic
      // Set to half-open state
      await service.setStateToHalfOpen();
      
      // Failed call should open breaker again
      mockAIWorkerService.forwardAudioChunk.mockRejectedValue(new Error('Still failing'));
      
      await expect(
        service.executeCall('forwardAudioChunk', [Buffer.from('audio')])
      ).rejects.toThrow();
      
      expect(service.getCurrentState()).toBe('open');
    });
  });

  describe('Failure Thresholds', () => {
    it('should calculate error percentage correctly', async () => {
      // TDD Red: cần implement metrics calculation
      const config = CIRCUIT_BREAKER_CONFIG.aiWorker;
      
      // Mix of success/failure calls
      mockAIWorkerService.forwardAudioChunk
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('failure 1'))
        .mockRejectedValueOnce(new Error('failure 2'));
      
      // Execute calls
      await service.executeCall('forwardAudioChunk', [Buffer.from('audio')]);
      await service.executeCall('forwardAudioChunk', [Buffer.from('audio')]);
      try { await service.executeCall('forwardAudioChunk', [Buffer.from('audio')]); } catch {}
      try { await service.executeCall('forwardAudioChunk', [Buffer.from('audio')]); } catch {}
      
      const metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(4);
      expect(metrics.failureCount).toBe(2);
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureRate).toBe(0.5); // 50%
    });

    it('should trip breaker based on error percentage', async () => {
      // TDD Red: cần implement percentage-based tripping
      const config = CIRCUIT_BREAKER_CONFIG.aiWorker;
      
      // VI: Generate pattern: success-fail-success-fail để avoid hitting failureThreshold
      // Total: 10 requests, 5 failures, 5 successes = 50% error rate
      const pattern = ['success', 'fail', 'success', 'fail', 'success', 'fail', 'success', 'fail', 'success', 'fail'];
      
      for (const callType of pattern) {
        if (callType === 'fail') {
          mockAIWorkerService.forwardAudioChunk.mockRejectedValueOnce(new Error('fail'));
          try { await service.executeCall('forwardAudioChunk', [Buffer.from('audio')]); } catch {}
        } else {
          mockAIWorkerService.forwardAudioChunk.mockResolvedValueOnce({ success: true });
          await service.executeCall('forwardAudioChunk', [Buffer.from('audio')]);
        }
      }
      
      expect(service.getCurrentState()).toBe('open');
    });

    it('should handle slow calls as failures', async () => {
      // TDD Red: cần implement slow call detection
      const config = CIRCUIT_BREAKER_CONFIG.aiWorker;
      const slowCallDuration = config.slowCallDurationThresholdMs + 100;
      
      // Start with CLOSED circuit (not half-open)
      expect(service.getCurrentState()).toBe('closed');
      
      // Mock Date.now để simulate slow call duration
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        // Return increasing timestamps để simulate call duration
        const baseTime = 1000000000000; // Fixed base time
        return baseTime + (callCount++ % 2 === 0 ? 0 : slowCallDuration);
      });
      
      // Mock AI Worker service for slow calls  
      mockAIWorkerService.forwardAudioChunk.mockResolvedValue({ success: true });
      
      try {
        // Execute calls that will be measured as slow
        for (let i = 0; i < config.requestVolumeThreshold; i++) {
          await service.executeCall('forwardAudioChunk', [Buffer.from('audio')]);
        }
        
        // Check slow call metrics after enough volume
        const metrics = service.getMetrics();
        console.log('🔍 Slow call metrics:', metrics);
        
        expect(metrics.slowCallCount).toBe(config.requestVolumeThreshold);
        expect(metrics.slowCallRate).toBe(1.0); // 100%
        
        // Circuit should trip because slow call rate (100%) > threshold (50%)
        expect(service.getCurrentState()).toBe('open');
      } finally {
        // Restore original Date.now
        Date.now = originalDateNow;
      }
    });
  });

  describe('Health Check Integration', () => {
    it('should check AI Worker health periodically', async () => {
      // TDD Red: cần implement health checking
      mockAIWorkerService.checkHealth.mockResolvedValue({
        healthy: true,
        responseTime: 100,
        statusCode: 200,
      });
      
      const healthResult = await service.checkAIWorkerHealth();
      
      expect(healthResult.healthy).toBe(true);
      expect(healthResult.responseTime).toBeLessThan(1000);
      expect(mockAIWorkerService.checkHealth).toHaveBeenCalled();
    });

    it('should use different thresholds for health checks', async () => {
      // TDD Red: cần implement separate health check breaker
      const healthConfig = CIRCUIT_BREAKER_CONFIG.healthCheck;
      
      // Health check failures (less than main service failures)
      mockAIWorkerService.checkHealth.mockRejectedValue(new Error('Health check failed'));
      
      for (let i = 0; i < healthConfig.failureThreshold; i++) {
        try {
          await service.checkAIWorkerHealth();
        } catch {}
      }
      
      // Health check breaker should be separate
      expect(service.getHealthCheckState()).toBe('open');
      expect(service.getCurrentState()).toBe('closed'); // Main breaker still closed
    });

    it('should reset health check breaker faster', async () => {
      // TDD Red: cần implement different reset timeouts
      const healthConfig = CIRCUIT_BREAKER_CONFIG.healthCheck;
      
      // Trip health check breaker
      await service.tripHealthCheckBreaker('test');
      expect(service.getHealthCheckState()).toBe('open');
      
      // Health check reset should be faster
      jest.advanceTimersByTime(healthConfig.resetTimeoutMs + 1000);
      
      mockAIWorkerService.checkHealth.mockResolvedValue({ healthy: true, responseTime: 100 });
      await service.checkAIWorkerHealth();
      
      expect(service.getHealthCheckState()).toBe('closed');
    });
  });

  describe('Exponential Backoff', () => {
    it('should implement exponential backoff for retries', async () => {
      // TDD Red: cần implement backoff logic  
      const backoffConfig = CIRCUIT_BREAKER_CONFIG.backoff;
      
      mockAIWorkerService.forwardAudioChunk.mockRejectedValue(new Error('Temporary failure'));
      
      // Mock private sleep method để tránh real delays
      const sleepSpy = jest.spyOn(service as any, 'sleep').mockImplementation(async () => {});
      
      try {
        await service.executeCallWithRetry('forwardAudioChunk', [Buffer.from('audio')], 3);
      } catch {}
      
      // Verify exponential delays were calculated
      expect(sleepSpy).toHaveBeenCalledTimes(3); // 3 retry delays
      
      // Check delays are exponential: 100ms, 200ms, 400ms (with 2x multiplier)
      const calls = sleepSpy.mock.calls;
      const delays = calls.map(call => call[0]); // Extract delay values
      
      expect(delays[0]).toBeGreaterThanOrEqual(backoffConfig.initialDelayMs * 0.9); // Allow 10% variance for jitter
      expect(delays[1]).toBeGreaterThanOrEqual((backoffConfig.initialDelayMs * backoffConfig.multiplier) * 0.9);
      expect(delays[2]).toBeGreaterThanOrEqual((backoffConfig.initialDelayMs * Math.pow(backoffConfig.multiplier, 2)) * 0.9);
      
      sleepSpy.mockRestore();
    });

    it('should add jitter to prevent thundering herd', async () => {
      // TDD Red: cần implement jitter logic
      const delays: number[] = [];
      
      // Mock private sleep method và capture delays
      const sleepSpy = jest.spyOn(service as any, 'sleep').mockImplementation(async (ms: number) => {
        delays.push(ms);
      });
      
      mockAIWorkerService.forwardAudioChunk.mockRejectedValue(new Error('Network error'));
      
      // Execute multiple retries
      try {
        await service.executeCallWithRetry('forwardAudioChunk', [Buffer.from('test')], 3);
      } catch {}
      
      // Verify jitter được applied - delays không should giống hệt nhau
      expect(delays).toHaveLength(3);
      expect(delays[0]).toBeGreaterThanOrEqual(100 * 0.9); // Base delay với jitter
      expect(delays[1]).toBeGreaterThanOrEqual(200 * 0.9); // 2x base với jitter  
      expect(delays[2]).toBeGreaterThanOrEqual(400 * 0.9); // 4x base với jitter
      
      sleepSpy.mockRestore();
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track detailed metrics', () => {
      // TDD Red: cần implement metrics collection
      const metrics = service.getMetrics();
      
      expect(metrics).toMatchObject({
        state: expect.any(String),
        failureCount: expect.any(Number),
        successCount: expect.any(Number),
        totalRequests: expect.any(Number),
        failureRate: expect.any(Number),
        slowCallCount: expect.any(Number),
        slowCallRate: expect.any(Number),
        stateTransitionCount: expect.any(Number),
        uptime: expect.any(Number),
      });
    });

    it('should emit events on state changes', async () => {
      // TDD Red: cần implement event emission
      const eventSpy = jest.fn();
      service.on('state_change', eventSpy); // Fix: use underscore 
      
      // Trip breaker
      await service.tripCircuitBreaker('test event');
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'state_change',
          previousState: 'closed',
          newState: 'open',
          reason: 'test event',
        })
      );
    });

    it('should maintain event history', async () => {
      // TDD Red: cần implement event history
      await service.tripCircuitBreaker('event 1');
      await service.resetCircuitBreaker('event 2');
      
      const history = service.getEventHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('state_change');
      expect(history[1].type).toBe('manual_reset');
    });

    it('should limit event history size', async () => {
      // TDD Red: cần implement history size limit
      const maxEvents = CIRCUIT_BREAKER_CONFIG.maxEventsInHistory;
      
      // Generate more events than max
      for (let i = 0; i < maxEvents + 10; i++) {
        await service.tripCircuitBreaker(`event ${i}`);
        await service.resetCircuitBreaker(`reset ${i}`);
      }
      
      const history = service.getEventHistory();
      expect(history.length).toBeLessThanOrEqual(maxEvents);
    });
  });

  describe('Manual Controls', () => {
    it('should allow manual circuit breaker trip', async () => {
      // TDD Red: cần implement manual controls
      expect(service.getCurrentState()).toBe('closed');
      
      await service.tripCircuitBreaker('manual maintenance');
      
      expect(service.getCurrentState()).toBe('open');
      expect(service.getMetrics().stateTransitionCount).toBe(1);
    });

    it('should allow manual circuit breaker reset', async () => {
      // TDD Red: cần implement manual reset
      await service.tripCircuitBreaker('test');
      expect(service.getCurrentState()).toBe('open');
      
      await service.resetCircuitBreaker('manual recovery');
      
      expect(service.getCurrentState()).toBe('closed');
      expect(service.getMetrics().failureCount).toBe(0);
    });

    it('should allow circuit breaker disable/enable', async () => {
      // TDD Red: cần implement enable/disable
      service.disableCircuitBreaker();
      
      // Even with failures, breaker should stay closed when disabled
      mockAIWorkerService.forwardAudioChunk.mockRejectedValue(new Error('fail'));
      
      for (let i = 0; i < 10; i++) {
        try {
          await service.executeCall('forwardAudioChunk', [Buffer.from('audio')]);
        } catch {}
      }
      
      expect(service.getCurrentState()).toBe('closed');
      expect(service.isEnabled()).toBe(false);
      
      // Re-enable should work normally
      service.enableCircuitBreaker();
      expect(service.isEnabled()).toBe(true);
    });
  });
});