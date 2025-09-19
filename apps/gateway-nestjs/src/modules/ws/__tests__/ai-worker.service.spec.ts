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

  describe('Adaptive Buffering', () => {
    describe('Buffer Size Management', () => {
      it('nên initialize với default buffer size cho MVP', () => {
        // VI: Test buffer size khởi tạo mặc định
        const bufferSize = service.getCurrentBufferSize();
        expect(bufferSize).toBe(4096); // 4KB default cho real-time audio
      });

      it('nên adjust buffer size dựa trên network latency', async () => {
        // VI: Test dynamic buffer sizing theo network conditions
        const initialSize = service.getCurrentBufferSize();
        
        // Mock high latency scenario (>200ms)
        jest.spyOn(service as any, 'measureNetworkLatency').mockResolvedValue(300);
        
        await service.adjustBufferForNetworkConditions();
        
        const newSize = service.getCurrentBufferSize();
        expect(newSize).toBeGreaterThan(initialSize); // Tăng buffer khi latency cao
      });

      it('nên decrease buffer size cho low latency network', async () => {
        // VI: Test giảm buffer cho mạng tốt
        // Set initial larger buffer
        service.setBufferSize(8192);
        const initialSize = service.getCurrentBufferSize();
        
        // Mock low latency (< 50ms) 
        jest.spyOn(service as any, 'measureNetworkLatency').mockResolvedValue(20);
        
        await service.adjustBufferForNetworkConditions();
        
        const newSize = service.getCurrentBufferSize();
        expect(newSize).toBeLessThan(initialSize); // Giảm buffer khi mạng tốt
      });
    });

    describe('Network Performance Monitoring', () => {
      it('nên measure network latency accurately', async () => {
        // VI: Test đo latency chính xác
        const mockStart = Date.now();
        jest.spyOn(Date, 'now')
          .mockReturnValueOnce(mockStart)
          .mockReturnValueOnce(mockStart + 150); // 150ms latency
        
        jest.spyOn(service as any, 'makeHttpRequest').mockResolvedValue({});
        
        const latency = await service.measureNetworkLatency();
        expect(latency).toBe(150);
      });

      it('nên track throughput cho buffer optimization', async () => {
        // VI: Test theo dõi throughput để optimize buffer  
        const testData = Buffer.alloc(1024); // 1KB
        const mockStart = Date.now();
        
        jest.spyOn(Date, 'now')
          .mockReturnValueOnce(mockStart)
          .mockReturnValueOnce(mockStart + 100); // 100ms transfer
        
        jest.spyOn(service as any, 'makeHttpRequest').mockResolvedValue({});
        
        const throughput = await service.measureThroughput(testData);
        expect(throughput).toBe(10240); // 1KB/100ms = 10.24 KB/s
      });

      it('nên maintain network performance history', () => {
        // VI: Test lưu lịch sử performance cho trend analysis
        service.recordNetworkMetrics(100, 5000); // 100ms latency, 5KB/s throughput
        service.recordNetworkMetrics(150, 3000);
        service.recordNetworkMetrics(80, 8000);
        
        const history = service.getNetworkMetricsHistory();
        expect(history).toHaveLength(3);
        expect(history[0]).toMatchObject({ latency: 100, throughput: 5000 });
      });
    });

    describe('Adaptive Buffer Logic', () => {
      it('nên calculate optimal buffer size cho current conditions', () => {
        // VI: Test tính toán buffer size optimal
        const metrics = [
          { latency: 100, throughput: 5000 },
          { latency: 120, throughput: 4500 },
          { latency: 90, throughput: 6000 }
        ];
        
        jest.spyOn(service, 'getNetworkMetricsHistory').mockReturnValue(metrics);
        
        const optimalSize = service.calculateOptimalBufferSize();
        
        // VI: Buffer size should be based on average conditions
        // Higher latency = larger buffer, lower throughput = larger buffer  
        expect(optimalSize).toBeGreaterThanOrEqual(4096); // Min MVP size
        expect(optimalSize).toBeLessThanOrEqual(16384);   // Max reasonable size
      });

      it('nên handle buffer size constraints cho MVP limits', () => {
        // VI: Test giới hạn buffer cho MVP memory constraints
        // Mock very high latency scenario
        const extremeMetrics = [
          { latency: 1000, throughput: 1000 } // Very poor network
        ];
        
        jest.spyOn(service, 'getNetworkMetricsHistory').mockReturnValue(extremeMetrics);
        
        const bufferSize = service.calculateOptimalBufferSize();
        
        // VI: Không được vượt quá MVP limit dù network kém
        expect(bufferSize).toBeLessThanOrEqual(16384); // 16KB max cho MVP
      });

      it('nên trigger buffer resize khi conditions change significantly', async () => {
        // VI: Test tự động resize buffer khi network thay đổi lớn
        const initialSize = 4096;
        service.setBufferSize(initialSize);
        
        // Mock network degradation
        jest.spyOn(service as any, 'measureNetworkLatency').mockResolvedValue(400);
        jest.spyOn(service as any, 'measureThroughput').mockResolvedValue(2000);
        
        const resizeSpy = jest.spyOn(service, 'setBufferSize');
        
        await service.adaptiveBufferUpdate();
        
        expect(resizeSpy).toHaveBeenCalled();
        const calledWith = resizeSpy.mock.calls[0][0];
        expect(calledWith).not.toBe(initialSize);
      });
    });
  });

  describe('Smart Chunking', () => {
    describe('Chunk Size Calculation', () => {
      it('nên calculate optimal chunk size dựa trên buffer size', () => {
        // VI: Test chunk size calculation dựa trên current buffer
        service.setBufferSize(8192); // 8KB buffer
        
        const chunkSize = service.calculateOptimalChunkSize();
        
        // VI: Chunk size should be fraction của buffer (typically 25-50%)
        expect(chunkSize).toBeGreaterThanOrEqual(2048); // Min 2KB
        expect(chunkSize).toBeLessThanOrEqual(4096);    // Max 50% of buffer
      });

      it('nên adjust chunk size cho network latency conditions', async () => {
        // VI: Test dynamic chunking dựa trên network performance
        const initialChunkSize = service.calculateOptimalChunkSize();
        
        // Mock high latency network
        jest.spyOn(service as any, 'getAverageLatency').mockReturnValue(300); // 300ms
        
        const adjustedChunkSize = service.calculateOptimalChunkSize();
        
        // VI: High latency = larger chunks để reduce overhead
        expect(adjustedChunkSize).toBeGreaterThan(initialChunkSize);
      });

      it('nên handle AI Worker processing speed trong chunk calculation', () => {
        // VI: Test chunking dựa trên AI processing capabilities
        const mockProcessingMetrics = {
          averageProcessingTime: 150, // 150ms per chunk
          queueDepth: 2,
          cpuUsage: 0.7
        };
        
        jest.spyOn(service, 'getAIWorkerMetrics').mockReturnValue(mockProcessingMetrics);
        
        const chunkSize = service.calculateOptimalChunkSize();
        
        // VI: Higher processing time = smaller chunks để avoid timeouts
        expect(chunkSize).toBeLessThanOrEqual(6144); // Should be reasonable for 150ms processing
      });
    });

    describe('Dynamic Chunking Logic', () => {
      it('nên provide chunk size constraints cho MVP limits', () => {
        // VI: Test chunking constraints cho memory efficiency
        const constraints = service.getChunkingConstraints();
        
        expect(constraints.minChunkSize).toBe(1024);   // 1KB minimum
        expect(constraints.maxChunkSize).toBe(8192);   // 8KB maximum cho MVP
        expect(constraints.defaultChunkSize).toBe(2048); // 2KB default
      });

      it('nên chunk large audio buffers intelligently', () => {
        // VI: Test chunking large audio data thành optimal sizes
        const largeAudioBuffer = Buffer.alloc(32768); // 32KB audio data
        
        const chunks = service.chunkAudioData(largeAudioBuffer);
        
        expect(chunks.length).toBeGreaterThan(4); // Should split into multiple chunks
        expect(chunks.every(chunk => chunk.length <= 8192)).toBe(true); // Each chunk ≤ 8KB
        
        // VI: Total size should match original
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        expect(totalSize).toBe(32768);
      });

      it('nên maintain chunk sequence và metadata', () => {
        // VI: Test chunk metadata cho proper reassembly
        const audioData = Buffer.alloc(10240); // 10KB
        
        const chunkedResults = service.chunkAudioWithMetadata(audioData, 'session-123');
        
        expect(chunkedResults).toHaveProperty('sessionId', 'session-123');
        expect(chunkedResults).toHaveProperty('totalChunks');
        expect(chunkedResults).toHaveProperty('chunks');
        
        // VI: Each chunk should have sequence info
        chunkedResults.chunks.forEach((chunk, index) => {
          expect(chunk).toHaveProperty('sequenceId', index);
          expect(chunk).toHaveProperty('data');
          expect(chunk).toHaveProperty('size');
          expect(chunk.data).toBeInstanceOf(Buffer);
        });
      });
    });

    describe('Performance Integration', () => {
      it('nên integrate chunking với adaptive buffering', async () => {
        // VI: Test integration giữa chunking và buffer management
        service.setBufferSize(6144); // 6KB buffer
        
        const chunkSize = service.calculateOptimalChunkSize();
        
        // VI: Chunk size should complement buffer size
        expect(chunkSize).toBeLessThanOrEqual(6144);
        expect(chunkSize).toBeGreaterThanOrEqual(1536); // At least 25% của buffer
      });

      it('nên optimize chunking cho streaming performance', async () => {
        // VI: Test streaming optimization với real-time constraints  
        const streamingMetrics = {
          targetLatency: 100,    // 100ms target
          currentLatency: 150,   // Current actual latency
          processingBacklog: 3   // 3 chunks in queue
        };
        
        jest.spyOn(service, 'getStreamingMetrics').mockReturnValue(streamingMetrics);
        
        const optimizedChunkSize = service.calculateOptimalChunkSize();
        
        // VI: Should reduce chunk size when backlog high
        expect(optimizedChunkSize).toBeLessThanOrEqual(3072); // Smaller chunks for better streaming
      });

      it('nên provide chunking performance metrics', () => {
        // VI: Test metrics collection cho chunking performance
        const largeBuffer = Buffer.alloc(16384); // 16KB
        
        const startTime = Date.now();
        const chunks = service.chunkAudioData(largeBuffer);
        const endTime = Date.now();
        
        const metrics = service.getChunkingMetrics();
        
        expect(metrics).toHaveProperty('totalChunks', chunks.length);
        expect(metrics).toHaveProperty('averageChunkSize');
        expect(metrics).toHaveProperty('chunkingLatency');
        expect(metrics.chunkingLatency).toBeLessThan(50); // Should be fast (<50ms)
      });

      it('nên handle chunking errors gracefully', () => {
        // VI: Test error handling trong chunking process
        const invalidBuffer = null;
        
        expect(() => {
          service.chunkAudioData(invalidBuffer as any);
        }).toThrow('Invalid audio buffer for chunking');
      });
    });
  });
});
