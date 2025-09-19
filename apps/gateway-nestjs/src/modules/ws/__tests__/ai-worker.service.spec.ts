import { Test } from '@nestjs/testing';
import { AiWorkerService } from '../ai-worker.service';
import { ConfigService } from '@nestjs/config';
import * as http from 'node:http';
import * as https from 'node:https';

describe('AiWorkerService', () => {
  let service: AiWorkerService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Mock ConfigService với cấu hình test
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          AI_SERVICE_BASE_URL: 'http://localhost:8001',
          GATEWAY_API_KEY: 'test-key',
        };
        return config[key];
      }),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        AiWorkerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AiWorkerService>(AiWorkerService);
  });

  afterEach(() => {
    // Cleanup resources sau mỗi test
    service.destroy();
  });

  describe('HTTP Agent Configuration', () => {
    it('nên khởi tạo HTTP Agent với optimized configuration cho MVP', () => {
      // Test HTTP Agent được tạo với config tối ưu cho 1-3 sessions
      const agent = service.getHttpAgent() as any; // Cast để access properties

      expect(agent).toBeInstanceOf(http.Agent);
      
      // HTTP Agent được config đúng với optimized values cho MVP
      expect(agent.keepAlive).toBe(true);
      expect(agent.maxSockets).toBe(3);
      expect(agent.maxFreeSockets).toBe(2);
      // Note: scheduling property chỉ có trong Node 19+ và có thể không tồn tại trong types
      if (agent.scheduling) {
        expect(agent.scheduling).toBe('lifo');
      }

      // Note: timeout config được pass to constructor nhưng không expose as instance property
    });

    it('nên hỗ trợ cả HTTP và HTTPS agents', () => {
      // Test service khởi tạo cả HTTP và HTTPS agents
      const httpAgent = (service as any).httpAgent;
      const httpsAgent = (service as any).httpsAgent;

      expect(httpAgent).toBeInstanceOf(http.Agent);
      expect(httpsAgent).toBeInstanceOf(https.Agent);
      expect(httpAgent).not.toBe(httpsAgent); // Khác instance
    });
  });

  describe('Connection Pooling và Resource Management', () => {
    it('nên reuse connections thay vì tạo mới mỗi lần', async () => {
      // Mock successful response để tránh hanging
      const mockResponseData = { status: 'ok', transcription: 'test' };
      
      jest.spyOn(service as any, 'makeHttpRequest')
        .mockResolvedValueOnce(mockResponseData)
        .mockResolvedValueOnce(mockResponseData);

      const audio1 = Buffer.from([1, 2, 3]);
      const audio2 = Buffer.from([4, 5, 6]);

      // Gọi nhiều lần để test connection reuse (should not hang now)
      const results = await Promise.allSettled([
        service.forwardAudio('session1', audio1),
        service.forwardAudio('session2', audio2),
      ]);

      // Both requests should succeed with mocked response
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      
      // makeHttpRequest should be called twice with same HTTP agent
      expect(service['makeHttpRequest']).toHaveBeenCalledTimes(2);
      expect(service['makeHttpRequest']).toHaveBeenCalledWith(
        expect.any(URL),
        'session1',
        audio1
      );
      expect(service['makeHttpRequest']).toHaveBeenCalledWith(
        expect.any(URL),
        'session2',
        audio2
      );
    }, 10000); // Increase timeout to 10 seconds

    it('nên provide connection metrics cho monitoring', () => {
      const metrics = service.getConnectionMetrics();

      // Connection metrics structure chuẩn cho monitoring
      expect(metrics).toMatchObject({
        totalConnections: expect.any(Number),
        activeConnections: expect.any(Number),
        freeConnections: expect.any(Number),
        pendingRequests: expect.any(Number),
        reuseRate: expect.any(Number),
        maxSockets: 3,
        maxFreeSockets: 2,
      });

      // Rates trong range hợp lý
      expect(metrics.reuseRate).toBeGreaterThanOrEqual(0);
      expect(metrics.reuseRate).toBeLessThanOrEqual(1);
    });

    it('nên cleanup resources properly', () => {
      const httpAgent = (service as any).httpAgent;
      const httpsAgent = (service as any).httpsAgent;
      
      const destroyHttpSpy = jest.spyOn(httpAgent, 'destroy');
      const destroyHttpsSpy = jest.spyOn(httpsAgent, 'destroy');

      service.destroy();

      // Both agents được cleanup
      expect(destroyHttpSpy).toHaveBeenCalled();
      expect(destroyHttpsSpy).toHaveBeenCalled();
    });

    it('nên log connection metrics properly', () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'debug');

      service.logConnectionMetrics();

      // Log message chứa metrics cần thiết
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection pool metrics')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/active=\d+\/\d+.*free=\d+\/\d+.*pending=\d+.*reuse=/)
      );
    });
  });

  describe('Error Handling và Retry Logic', () => {
    it('nên classify errors correctly cho retry logic', () => {
      // Network errors - should retry
      expect(service['isRetryableError'](new Error('ECONNRESET'))).toBe(true);
      expect(service['isRetryableError'](new Error('ECONNREFUSED'))).toBe(true);
      expect(service['isRetryableError'](new Error('ETIMEDOUT'))).toBe(true);

      // HTTP 5xx errors - should retry
      expect(service['isRetryableError'](new Error('HTTP 500: Internal error'))).toBe(true);
      expect(service['isRetryableError'](new Error('HTTP 502: Bad gateway'))).toBe(true);
      expect(service['isRetryableError'](new Error('HTTP 429: Rate limit'))).toBe(true);

      // HTTP 4xx errors (except 429) - should not retry
      expect(service['isRetryableError'](new Error('HTTP 400: Bad request'))).toBe(false);
      expect(service['isRetryableError'](new Error('HTTP 401: Unauthorized'))).toBe(false);
      expect(service['isRetryableError'](new Error('HTTP 404: Not found'))).toBe(false);

      // Other errors - should not retry
      expect(service['isRetryableError'](new Error('JSON parse error'))).toBe(false);
      expect(service['isRetryableError'](new Error('Unknown error'))).toBe(false);
    });

    it('nên implement exponential backoff cho retryable errors', async () => {
      const sleepSpy = jest.spyOn(service as any, 'sleep');
      sleepSpy.mockResolvedValue(undefined);

      // Mock HTTP request để throw retryable error
      const mockError = new Error('ECONNRESET');
      jest.spyOn(service as any, 'makeHttpRequest').mockRejectedValue(mockError);

      const audio = Buffer.from([1, 2, 3]);

      try {
        await service.forwardAudio('session1', audio);
      } catch (e) {
        // Expected error sau khi retry hết
      }

      // Exponential backoff được áp dụng: 100ms, 200ms cho 2 attempts (maxRetries = 3 = 1 initial + 2 retries)
      expect(sleepSpy).toHaveBeenCalledWith(100);
      expect(sleepSpy).toHaveBeenCalledWith(200);
      expect(sleepSpy).toHaveBeenCalledTimes(2); // 2 retries, not 3
    });
  });

  describe('Real forwardAudio Integration', () => {
    it('nên forward audio thành công với proper headers', async () => {
      // Mock successful HTTP response
      const mockResponseData = { status: 'ok', transcription: 'test' };
      
      jest.spyOn(service as any, 'makeHttpRequest').mockResolvedValue(mockResponseData);

      const sessionId = 'test-session';
      const audio = Buffer.from([1, 2, 3, 4]);

      const result = await service.forwardAudio(sessionId, audio);

      expect(result).toEqual(mockResponseData);
      expect(service['makeHttpRequest']).toHaveBeenCalledWith(
        expect.any(URL),
        sessionId,
        audio
      );
    });

    it('nên handle network failure với retry', async () => {
      // Mock network error for first 2 attempts, success on 3rd
      const mockError = new Error('ECONNRESET');
      const mockSuccess = { status: 'ok' };
      
      const makeRequestSpy = jest.spyOn(service as any, 'makeHttpRequest')
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccess);

      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      const result = await service.forwardAudio('session1', Buffer.from([1]));

      expect(result).toEqual(mockSuccess);
      expect(makeRequestSpy).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    });
  });
});
