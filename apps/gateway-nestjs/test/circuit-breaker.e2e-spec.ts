/**
 * Mục đích: TDD Red Phase - E2E tests cho Circuit Breaker với real AI Worker
 * Test Scope: Real network calls, actual failures, recovery timing
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { Socket, io as ioc } from 'socket.io-client';
import { CircuitBreakerService } from '../src/modules/ws/services/circuit-breaker.service';
import { AIWorkerService } from '../src/modules/ws/services/ai-worker.service';
import * as request from 'supertest';

describe('CircuitBreaker E2E Tests', () => {
  let app: INestApplication;
  let circuitBreakerService: CircuitBreakerService;
  let aiWorkerService: AIWorkerService;
  let clientSocket: Socket;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0); // Random port

    circuitBreakerService = app.get<CircuitBreakerService>(CircuitBreakerService);
    aiWorkerService = app.get<AIWorkerService>(AIWorkerService);

    const address = app.getHttpServer().address();
    const baseUrl = `http://localhost:${address.port}`;

    clientSocket = ioc(`${baseUrl}/audio`, {
      auth: {
        token: 'mock-jwt-token', // TDD Red: cần mock auth
      },
    });

    await new Promise((resolve) => clientSocket.on('connect', resolve));
  });

  afterAll(async () => {
    clientSocket.disconnect();
    await app.close();
  });

  describe('Real AI Worker Failures', () => {
    it('should handle actual network timeouts', async () => {
      // TDD Red: cần test với real network conditions
      // Mock AI Worker to be unreachable
      const originalBaseUrl = aiWorkerService.getBaseUrl();
      jest.spyOn(aiWorkerService, 'getBaseUrl').mockReturnValue('http://localhost:9999'); // Unreachable port

      const mockAudioData = Buffer.alloc(1024, 0); // 1KB silence

      // Attempt to send audio - should timeout and trip circuit breaker
      const startTime = Date.now();
      
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);
        } catch (error) {
          expect(error.message).toContain('timeout');
        }
      }

      const endTime = Date.now();
      expect(circuitBreakerService.getCurrentState()).toBe('open');
      
      // Should fail fast after circuit trips (< 1 second total)
      expect(endTime - startTime).toBeLessThan(10000); // Allow some time for network timeouts
      
      // Restore original URL
      jest.spyOn(aiWorkerService, 'getBaseUrl').mockReturnValue(originalBaseUrl);
    });

    it('should handle AI Worker returning HTTP errors', async () => {
      // TDD Red: cần test HTTP error handling
      // Mock AI Worker to return 500 errors
      jest.spyOn(aiWorkerService, 'forwardAudioChunk').mockImplementation(async () => {
        const error = new Error('Internal Server Error');
        (error as any).status = 500;
        throw error;
      });

      const mockAudioData = Buffer.alloc(512, 0);

      // Generate HTTP errors
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);
        } catch (error) {
          expect(error.status).toBe(500);
        }
      }

      expect(circuitBreakerService.getCurrentState()).toBe('open');
      expect(circuitBreakerService.getMetrics().failureCount).toBe(5);
    });

    it('should recover when AI Worker becomes available', async () => {
      // TDD Red: cần test recovery với real AI Worker
      // First, trip the circuit with failures
      jest.spyOn(aiWorkerService, 'forwardAudioChunk').mockRejectedValue(
        new Error('Service unavailable')
      );

      const mockAudioData = Buffer.alloc(256, 0);

      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);
        } catch {}
      }

      expect(circuitBreakerService.getCurrentState()).toBe('open');

      // Wait for reset timeout (use shorter timeout for testing)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      jest.advanceTimersByTime(30000);

      // AI Worker becomes available
      jest.spyOn(aiWorkerService, 'forwardAudioChunk').mockResolvedValue({
        status: 'ok',
        partial: { text: 'recovered' },
        final: { text: 'service recovered', words: [] },
        detections: [],
      });

      // Next call should attempt recovery
      const result = await circuitBreakerService.executeCall('forwardAudioChunk', [mockAudioData]);

      expect(result.status).toBe('ok');
      expect(circuitBreakerService.getCurrentState()).toBe('closed');
    });
  });

  describe('WebSocket Integration E2E', () => {
    it('should notify clients when circuit breaker trips during audio streaming', async () => {
      // TDD Red: cần implement WebSocket notifications
      const circuitBreakerEvents: any[] = [];

      clientSocket.on('circuit_breaker_state_change', (event) => {
        circuitBreakerEvents.push(event);
      });

      // Send audio chunks that will cause failures
      jest.spyOn(aiWorkerService, 'forwardAudioChunk').mockRejectedValue(
        new Error('AI Worker overloaded')
      );

      const mockAudioChunk = {
        sessionId: 'test-session-e2e',
        sequenceNumber: 1,
        data: Buffer.alloc(1024, 0).toString('base64'),
      };

      // Send multiple chunks to trip circuit breaker
      for (let i = 0; i < 5; i++) {
        clientSocket.emit('audio', { ...mockAudioChunk, sequenceNumber: i + 1 });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(circuitBreakerEvents).toHaveLength(1);
      expect(circuitBreakerEvents[0]).toMatchObject({
        type: 'state_change',
        newState: 'open',
        timestamp: expect.any(Number),
      });
    });

    it('should handle graceful degradation during circuit breaker open state', async () => {
      // TDD Red: cần implement graceful degradation
      // Trip circuit breaker manually
      await circuitBreakerService.tripCircuitBreaker('e2e test degradation');

      const errorEvents: any[] = [];
      clientSocket.on('error', (error) => {
        errorEvents.push(error);
      });

      // Send audio chunk - should get fast rejection
      const mockAudioChunk = {
        sessionId: 'test-degradation',
        sequenceNumber: 1,
        data: Buffer.alloc(512, 0).toString('base64'),
      };

      const startTime = Date.now();
      clientSocket.emit('audio', mockAudioChunk);
      
      await new Promise((resolve) => setTimeout(resolve, 200));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Fast failure
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({
        code: 'CIRCUIT_BREAKER_OPEN',
        message: expect.stringContaining('temporarily unavailable'),
      });
    });
  });

  describe('API Endpoints E2E', () => {
    it('should expose circuit breaker metrics via REST API', async () => {
      // TDD Red: cần implement metrics endpoint
      const response = await request(app.getHttpServer())
        .get('/api/circuit-breaker/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          state: expect.stringMatching(/^(open|closed|half-open)$/),
          failureCount: expect.any(Number),
          successCount: expect.any(Number),
          totalRequests: expect.any(Number),
          failureRate: expect.any(Number),
          uptime: expect.any(Number),
        },
      });
    });

    it('should allow manual circuit breaker control via API', async () => {
      // TDD Red: cần implement control endpoints
      // Manual trip
      const tripResponse = await request(app.getHttpServer())
        .post('/api/circuit-breaker/trip')
        .send({ reason: 'e2e manual test' })
        .expect(200);

      expect(tripResponse.body).toMatchObject({
        success: true,
        data: {
          state: 'open',
          reason: 'e2e manual test',
        },
      });

      // Manual reset
      const resetResponse = await request(app.getHttpServer())
        .post('/api/circuit-breaker/reset')
        .send({ reason: 'e2e manual recovery' })
        .expect(200);

      expect(resetResponse.body).toMatchObject({
        success: true,
        data: {
          state: 'closed',
          reason: 'e2e manual recovery',
        },
      });
    });

    it('should provide circuit breaker event history', async () => {
      // TDD Red: cần implement history endpoint
      // Generate some events
      await circuitBreakerService.tripCircuitBreaker('e2e history test 1');
      await circuitBreakerService.resetCircuitBreaker('e2e history test 2');

      const response = await request(app.getHttpServer())
        .get('/api/circuit-breaker/events')
        .query({ limit: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          events: expect.arrayContaining([
            expect.objectContaining({
              type: expect.stringMatching(/^(state_change|manual_trip|manual_reset)$/),
              timestamp: expect.any(Number),
              reason: expect.any(String),
            }),
          ]),
          total: expect.any(Number),
        },
      });
    });
  });

  describe('Performance E2E', () => {
    it('should handle realistic audio streaming load', async () => {
      // TDD Red: cần test realistic load
      const numberOfClients = 3;
      const audioChunksPerClient = 10;
      const clients: Socket[] = [];

      // Create multiple clients
      for (let i = 0; i < numberOfClients; i++) {
        const client = ioc(`http://localhost:${app.getHttpServer().address().port}/audio`, {
          auth: { token: `mock-jwt-token-${i}` },
        });
        clients.push(client);
        await new Promise((resolve) => client.on('connect', resolve));
      }

      // Mock successful AI Worker responses
      jest.spyOn(aiWorkerService, 'forwardAudioChunk').mockResolvedValue({
        status: 'ok',
        partial: { text: 'streaming test' },
        final: { text: 'audio streaming load test', words: [] },
        detections: [],
      });

      // Start concurrent streaming from all clients
      const startTime = Date.now();
      const streamingPromises: Promise<void>[] = [];

      clients.forEach((client, clientIndex) => {
        const promise = new Promise<void>((resolve) => {
          let chunksReceived = 0;
          
          client.on('partial', () => chunksReceived++);
          client.on('final', () => {
            if (chunksReceived >= audioChunksPerClient) resolve();
          });

          // Send audio chunks
          for (let chunkIndex = 0; chunkIndex < audioChunksPerClient; chunkIndex++) {
            setTimeout(() => {
              client.emit('audio', {
                sessionId: `load-test-session-${clientIndex}`,
                sequenceNumber: chunkIndex + 1,
                data: Buffer.alloc(1024, chunkIndex).toString('base64'),
              });
            }, chunkIndex * 100);
          }
        });

        streamingPromises.push(promise);
      });

      await Promise.all(streamingPromises);
      const endTime = Date.now();

      // Circuit breaker should remain closed under normal load
      expect(circuitBreakerService.getCurrentState()).toBe('closed');
      expect(circuitBreakerService.getMetrics().totalRequests).toBe(
        numberOfClients * audioChunksPerClient
      );

      // Performance should be reasonable
      const totalDuration = endTime - startTime;
      const expectedMinimumDuration = audioChunksPerClient * 100; // Based on chunk timing
      expect(totalDuration).toBeGreaterThan(expectedMinimumDuration);
      expect(totalDuration).toBeLessThan(expectedMinimumDuration * 2); // Allow some overhead

      // Clean up clients
      clients.forEach((client) => client.disconnect());
    });
  });
});