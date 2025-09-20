/**
 * Mục đích: TDD Red Phase - Integration tests cho Circuit Breaker với AI Worker
 * Test Scope: Real-world scenarios, WebSocket integration, error handling
 */

import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { AIWorkerService } from '../ai-worker.service';
import { AudioGateway } from '../../audio.gateway';
import { Socket } from 'socket.io';
import { CIRCUIT_BREAKER_CONFIG } from '@/config';

describe('CircuitBreaker Integration Tests', () => {
  let circuitBreakerService: CircuitBreakerService;
  let aiWorkerService: AIWorkerService;
  let audioGateway: AudioGateway;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    mockSocket = {
      emit: jest.fn(),
      id: 'test-socket-id',
      user: { id: 'test-user-id' },
    };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ ...CIRCUIT_BREAKER_CONFIG })],
        }),
      ],
      providers: [
        CircuitBreakerService,
        {
          provide: AIWorkerService,
          useValue: {
            forwardAudioChunk: jest.fn(),
            checkHealth: jest.fn(),
            processModeration: jest.fn(),
            getBaseUrl: jest.fn().mockReturnValue('http://localhost:8001'),
          },
        },
        {
          provide: AudioGateway,
          useValue: {
            handleAudioChunk: jest.fn(),
            notifyCircuitBreakerStateChange: jest.fn(),
            getConnectedClientsCount: jest.fn().mockReturnValue(1),
          },
        },
      ],
    }).compile();

    circuitBreakerService = module.get<CircuitBreakerService>(CircuitBreakerService);
    aiWorkerService = module.get<AIWorkerService>(AIWorkerService);
    audioGateway = module.get<AudioGateway>(AudioGateway);
  });

  describe('Audio Processing with Circuit Breaker', () => {
    it('should process audio normally when circuit is closed', async () => {
      // TDD Red: cần tích hợp circuit breaker với audio gateway
      const mockAudioData = Buffer.from('mock-audio-data');
      const mockResponse = {
        status: 'ok',
        partial: { text: 'xin chào' },
        final: { text: 'xin chào bạn', words: [] },
        detections: [],
      };

      (aiWorkerService.forwardAudioChunk as jest.Mock).mockResolvedValue(mockResponse);

      const result = await circuitBreakerService.executeCall(
        'forwardAudioChunk',
        [mockAudioData, { sessionId: 'test-session' }]
      );

      expect(result).toBe(mockResponse);
      expect(aiWorkerService.forwardAudioChunk).toHaveBeenCalledWith(
        mockAudioData,
        { sessionId: 'test-session' }
      );
      expect(circuitBreakerService.getCurrentState()).toBe('closed');
    });

    it('should fallback gracefully when circuit breaker trips', async () => {
      // TDD Red: cần implement fallback behavior
      const mockAudioData = Buffer.from('mock-audio-data');

      // Simulate AI Worker failures
      (aiWorkerService.forwardAudioChunk as jest.Mock).mockRejectedValue(
        new Error('AI Worker connection timeout')
      );

      // Trip the circuit breaker
      for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.aiWorker.failureThreshold; i++) {
        try {
          await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreakerService.getCurrentState()).toBe('open');

      // Next call should fail fast without hitting AI Worker
      const start = Date.now();
      await expect(
        circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData])
      ).rejects.toThrow('Circuit breaker is OPEN');
      const duration = Date.now() - start;

      // Should fail quickly (< 100ms) without network call
      expect(duration).toBeLessThan(100);
    });

    it('should notify WebSocket clients of circuit breaker state changes', async () => {
      // TDD Red: cần implement WebSocket notification
      // Setup event listener
      circuitBreakerService.on('stateChange', (event) => {
        audioGateway.notifyCircuitBreakerStateChange(event);
      });

      // Trip circuit breaker
      await circuitBreakerService.tripCircuitBreaker('integration test');

      expect(audioGateway.notifyCircuitBreakerStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'state_change',
          newState: 'open',
          reason: 'integration test',
        })
      );
    });
  });

  describe('Multi-Service Circuit Breaker Scenarios', () => {
    it('should handle different failure rates for ASR vs Moderation', async () => {
      // TDD Red: cần implement per-service circuit breaking
      const mockAudioData = Buffer.from('audio');
      const mockText = ['test text'];

      // ASR failures
      (aiWorkerService.forwardAudioChunk as jest.Mock).mockRejectedValue(
        new Error('ASR service down')
      );

      // Moderation still works
      (aiWorkerService.processModeration as jest.Mock).mockResolvedValue({
        results: [{ label: 'safe', score: 0.95 }],
      });

      // Trip ASR circuit
      for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.aiWorker.failureThreshold; i++) {
        try {
          await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);
        } catch {}
      }

      // ASR should be open, but moderation should still work
      expect(circuitBreakerService.getCurrentState()).toBe('open');

      const moderationResult = await circuitBreakerService.executeCall(
        'processModeration',
        [mockText]
      );
      expect(moderationResult.results[0].label).toBe('safe');
    });

    it('should implement cascading failure protection', async () => {
      // TDD Red: cần implement cascade protection
      const mockAudioData = Buffer.from('audio');

      // Slow AI Worker responses (not failures, but slow)
      (aiWorkerService.forwardAudioChunk as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ status: 'ok', partial: { text: '' } }),
              CIRCUIT_BREAKER_CONFIG.aiWorker.slowCallDurationThresholdMs + 1000
            )
          )
      );

      // Generate slow calls
      const promises = [];
      for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.aiWorker.requestVolumeThreshold; i++) {
        promises.push(circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]));
      }

      await Promise.all(promises);

      // Circuit should trip due to slow calls
      expect(circuitBreakerService.getCurrentState()).toBe('open');
      expect(circuitBreakerService.getMetrics().slowCallRate).toBeGreaterThan(
        CIRCUIT_BREAKER_CONFIG.aiWorker.slowCallPercentageThreshold / 100
      );
    });
  });

  describe('Recovery Scenarios', () => {
    it('should recover automatically after AI Worker is healthy', async () => {
      // TDD Red: cần implement automatic recovery
      const mockAudioData = Buffer.from('audio');

      // Trip circuit breaker
      (aiWorkerService.forwardAudioChunk as jest.Mock).mockRejectedValue(
        new Error('Service temporarily down')
      );

      for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.aiWorker.failureThreshold; i++) {
        try {
          await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);
        } catch {}
      }

      expect(circuitBreakerService.getCurrentState()).toBe('open');

      // Wait for reset timeout
      jest.advanceTimersByTime(CIRCUIT_BREAKER_CONFIG.aiWorker.resetTimeoutMs + 1000);

      // AI Worker becomes healthy
      (aiWorkerService.forwardAudioChunk as jest.Mock).mockResolvedValue({
        status: 'ok',
        final: { text: 'recovered', words: [] },
        detections: [],
      });

      // First call after timeout should attempt recovery
      const result = await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);

      expect(result.status).toBe('ok');
      expect(circuitBreakerService.getCurrentState()).toBe('closed');
    });

    it('should handle partial recovery scenarios', async () => {
      // TDD Red: cần implement partial recovery logic
      const mockAudioData = Buffer.from('audio');

      // Set to half-open state
      await circuitBreakerService.setStateToHalfOpen();

      // Mix of success and failure during recovery
      (aiWorkerService.forwardAudioChunk as jest.Mock)
        .mockResolvedValueOnce({ status: 'ok', partial: { text: 'success 1' } })
        .mockResolvedValueOnce({ status: 'ok', partial: { text: 'success 2' } })
        .mockRejectedValueOnce(new Error('still unstable'));

      // First two calls succeed
      await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);
      await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);

      expect(circuitBreakerService.getCurrentState()).toBe('closed');

      // Third call fails - should it immediately trip back to open?
      try {
        await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);
      } catch {}

      // Behavior depends on recovery strategy - document expected behavior
      const finalState = circuitBreakerService.getCurrentState();
      expect(['closed', 'open']).toContain(finalState);
    });
  });

  describe('Load Testing and Performance', () => {
    it('should handle high concurrent request load', async () => {
      // TDD Red: cần test concurrent requests
      const mockAudioData = Buffer.from('audio');
      const concurrentRequests = 50;

      (aiWorkerService.forwardAudioChunk as jest.Mock).mockResolvedValue({
        status: 'ok',
        partial: { text: 'concurrent' },
      });

      // Execute many concurrent requests
      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() => circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentRequests);
      expect(circuitBreakerService.getMetrics().totalRequests).toBe(concurrentRequests);
      expect(circuitBreakerService.getCurrentState()).toBe('closed');
    });

    it('should handle memory efficiently with many events', async () => {
      // TDD Red: cần test memory management
      const maxEvents = CIRCUIT_BREAKER_CONFIG.maxEventsInHistory;

      // Generate many state changes
      for (let i = 0; i < maxEvents * 2; i++) {
        await circuitBreakerService.tripCircuitBreaker(`test ${i}`);
        await circuitBreakerService.resetCircuitBreaker(`reset ${i}`);
      }

      const history = circuitBreakerService.getEventHistory();
      const metrics = circuitBreakerService.getMetrics();

      expect(history.length).toBeLessThanOrEqual(maxEvents);
      expect(metrics.stateTransitionCount).toBe(maxEvents * 4); // 2 transitions per loop
    });
  });

  describe('Monitoring Integration', () => {
    it('should expose Prometheus metrics', () => {
      // TDD Red: cần implement Prometheus metrics
      const prometheusMetrics = circuitBreakerService.getPrometheusMetrics();

      expect(prometheusMetrics).toContain('circuit_breaker_state');
      expect(prometheusMetrics).toContain('circuit_breaker_requests_total');
      expect(prometheusMetrics).toContain('circuit_breaker_failures_total');
      expect(prometheusMetrics).toContain('circuit_breaker_request_duration_seconds');
    });

    it('should log state changes with structured data', async () => {
      // TDD Red: cần implement structured logging
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      circuitBreakerService.setLogger(mockLogger);

      await circuitBreakerService.tripCircuitBreaker('test logging');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'circuit_breaker_state_change',
          previousState: 'closed',
          newState: 'open',
          reason: 'test logging',
          timestamp: expect.any(Number),
        })
      );
    });
  });
});