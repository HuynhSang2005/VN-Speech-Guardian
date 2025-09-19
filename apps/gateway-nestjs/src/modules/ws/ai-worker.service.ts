import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';

/**
 * Network performance metrics interface cho adaptive buffering
 */
interface NetworkMetrics {
  latency: number;      // milliseconds
  throughput: number;   // bytes per second
  timestamp?: number;   // optional timestamp
}

/**
 * Smart chunking interfaces cho intelligent audio processing
 */
interface ChunkingConstraints {
  minChunkSize: number;     // bytes
  maxChunkSize: number;     // bytes  
  defaultChunkSize: number; // bytes
}

interface AudioChunk {
  sequenceId: number;       // chunk order
  data: Buffer;            // audio data
  size: number;            // data size in bytes
}

interface ChunkedAudioResult {
  sessionId: string;       // session identifier
  totalChunks: number;     // total number of chunks
  chunks: AudioChunk[];    // array of chunks với metadata
}

interface AIWorkerMetrics {
  averageProcessingTime: number;  // milliseconds per chunk
  queueDepth: number;            // pending chunks in queue
  cpuUsage: number;              // 0-1 CPU utilization
}

interface StreamingMetrics {
  targetLatency: number;    // target latency in ms
  currentLatency: number;   // current actual latency
  processingBacklog: number; // chunks waiting
}

interface ChunkingMetrics {
  totalChunks: number;      // total chunks processed
  averageChunkSize: number; // average size in bytes
  chunkingLatency: number;  // time to chunk in ms
}

/**
 * AI Worker Service - HTTP Connection Pooling Implementation
 * 
 * Mục đích: Optimize connection performance giữa Gateway và AI Worker
 * Architecture: HTTP/1.1 với connection pooling thay vì fetch() per-request
 * Performance: Target <2s final latency cho MVP 1-3 phiên đồng thời
 * 
 * Connection Pool Configuration:
 * - keepAlive: true (reuse TCP connections)
 * - maxSockets: 3 (phù hợp MVP workload)  
 * - maxFreeSockets: 2 (balance resource vs performance)
 * - scheduling: 'lifo' (better for low request rate)
 * - timeout: 5000ms (production stability)
 */
@Injectable()
export class AiWorkerService {
  private readonly logger = new Logger(AiWorkerService.name);
  private readonly baseUrl: string;
  
  // Connection pool agents cho HTTP và HTTPS
  private readonly httpAgent: http.Agent;
  private readonly httpsAgent: https.Agent;

  // ==================== CONFIGURATION CONSTANTS ====================
  
  // HTTP Connection Pool Configuration
  private static readonly CONNECTION_POOL_CONFIG = {
    KEEP_ALIVE: true,
    MAX_SOCKETS: 3,         // MVP limit 1-3 phiên đồng thời  
    MAX_FREE_SOCKETS: 2,    // Balance resource vs performance
    SCHEDULING: 'lifo' as const,  // Better cho low request rate
    TIMEOUT: 5000,          // 5s timeout cho stability
  };

  // Retry Strategy Configuration  
  private static readonly RETRY_CONFIG = {
    MAX_RETRIES: 3,
    BASE_DELAY_MS: 100,
    MULTIPLIER: 2,
    RETRYABLE_ERROR_CODES: ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
  };

  // Adaptive Buffering Configuration
  private static readonly BUFFER_CONFIG = {
    DEFAULT_SIZE: 4096,         // 4KB cho real-time audio
    MIN_SIZE: 2048,             // 2KB minimum  
    MAX_SIZE: 16384,            // 16KB max cho MVP
    HIGH_LATENCY_THRESHOLD: 200, // 200ms
    LOW_LATENCY_THRESHOLD: 50,   // 50ms
    METRICS_HISTORY_SIZE: 10,    // Lưu 10 measurements gần nhất
    LATENCY_PENALTY: 1000,       // 1s penalty cho failed measurements
    FALLBACK_THROUGHPUT: 1000,   // 1KB/s conservative estimate
  };

  // Smart Chunking Configuration
  private static readonly CHUNKING_CONFIG = {
    MIN_CHUNK_SIZE: 1024,        // 1KB minimum chunk
    MAX_CHUNK_SIZE: 8192,        // 8KB maximum chunk cho MVP
    DEFAULT_CHUNK_SIZE: 2048,    // 2KB default chunk
    CHUNK_BUFFER_RATIO: 0.4,     // Chunk = 40% của buffer size
    HIGH_PROCESSING_THRESHOLD: 150,  // 150ms processing time
    BACKLOG_THRESHOLD: 3,        // Max 3 chunks in queue
    TARGET_STREAMING_LATENCY: 100,  // 100ms target
  };

  // ==================== INSTANCE STATE ====================

  // Adaptive buffering state
  private currentBufferSize: number = AiWorkerService.BUFFER_CONFIG.DEFAULT_SIZE;
  private networkMetricsHistory: NetworkMetrics[] = [];

  // Smart chunking state
  private chunkingMetrics: ChunkingMetrics = {
    totalChunks: 0,
    averageChunkSize: AiWorkerService.CHUNKING_CONFIG.DEFAULT_CHUNK_SIZE,
    chunkingLatency: 0
  };

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get('AI_WORKER_URL') || 'http://localhost:8000';
    
    // VI: Agent configuration từ centralized config
    const agentConfig = {
      keepAlive: AiWorkerService.CONNECTION_POOL_CONFIG.KEEP_ALIVE,
      maxSockets: AiWorkerService.CONNECTION_POOL_CONFIG.MAX_SOCKETS,
      maxFreeSockets: AiWorkerService.CONNECTION_POOL_CONFIG.MAX_FREE_SOCKETS,
      scheduling: AiWorkerService.CONNECTION_POOL_CONFIG.SCHEDULING,
      timeout: AiWorkerService.CONNECTION_POOL_CONFIG.TIMEOUT,
    };

    this.httpAgent = new http.Agent(agentConfig);
    this.httpsAgent = new https.Agent(agentConfig);
    
    this.logger.debug(
      `HTTP Agent initialized: keepAlive=${agentConfig.keepAlive}, ` +
      `maxSockets=${agentConfig.maxSockets}, maxFreeSockets=${agentConfig.maxFreeSockets}, ` +
      `scheduling=${agentConfig.scheduling}, timeout=${agentConfig.timeout}ms`
    );
  }

  /**
   * Forward audio buffer to AI worker using HTTP/1.1 connection pooling.
   * Implements exponential backoff retry pattern for reliability.
   * 
   * @param sessionId - Session identifier for tracking
   * @param audio - Binary audio data (PCM 16kHz mono)
   * @returns Promise resolving to AI worker JSON response
   * @throws Error after all retries exhausted
   */
  async forwardAudio(sessionId: string | undefined, audio: Buffer): Promise<any> {
    const url = new URL('/asr/stream', this.baseUrl);
    
    for (let attempt = 1; attempt <= AiWorkerService.RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(
          `Forward audio via HTTP Agent: ${url.toString()} ` +
          `(session=${sessionId}, attempt=${attempt}/${AiWorkerService.RETRY_CONFIG.MAX_RETRIES}, size=${audio.length}B)`
        );

        const response = await this.makeHttpRequest(url, sessionId, audio);
        
        // Success - log retry recovery nếu có
        if (attempt > 1) {
          this.logger.log(`AI worker recovered after ${attempt} attempts using connection pool`);
        }
        return response;
        
      } catch (err: any) {
        const isLastAttempt = attempt === AiWorkerService.RETRY_CONFIG.MAX_RETRIES;
        const shouldRetry = this.isRetryableError(err);
        
        if (!isLastAttempt && shouldRetry) {
          // Retryable error - apply exponential backoff
          this.logger.debug(`Retryable error on attempt ${attempt}: ${err?.message}`);
          const delayMs = AiWorkerService.RETRY_CONFIG.BASE_DELAY_MS * 
            Math.pow(AiWorkerService.RETRY_CONFIG.MULTIPLIER, attempt - 1);
          await this.sleep(delayMs);
          continue;
        }
        
        // Final attempt or non-retryable error
        this.logger.error(
          `HTTP Agent request failed (attempt ${attempt}/${AiWorkerService.RETRY_CONFIG.MAX_RETRIES}): ${err?.message}`
        );
        throw err;
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Thực hiện HTTP request sử dụng Node.js http module với connection pooling.
   * Tự động chọn HTTP/HTTPS agent dựa trên protocol của URL.
   * @param url - Target URL (HTTP hoặc HTTPS)
   * @param sessionId - Session ID để tracking
   * @param audio - Binary audio buffer
   * @returns Promise với parsed JSON response
   */
  private async makeHttpRequest(url: URL, sessionId: string | undefined, audio: Buffer): Promise<any> {
    const isHttps = url.protocol === 'https:';
    const agent = isHttps ? this.httpsAgent : this.httpAgent;
    const httpModule = isHttps ? https : http;
    
    const apiKey = process.env.GATEWAY_API_KEY || this.config.get('GATEWAY_API_KEY') || '';

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        agent,  // Sử dụng connection pooling agent
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': Buffer.byteLength(audio),
          'x-session-id': sessionId || '',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
      };

      const req = httpModule.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } catch (parseErr) {
              reject(new Error(`JSON parse error: ${parseErr}`));
            }
          } else {
            // HTTP error responses
            const statusCode = res.statusCode || 0;
            if ((statusCode >= 500 && statusCode < 600) || statusCode === 429) {
              // Transient errors - sẽ được retry
              reject(new Error(`HTTP ${statusCode}: ${data}`));
            } else {
              // Permanent errors - fail fast
              reject(new Error(`HTTP ${statusCode}: ${data}`));
            }
          }
        });
      });

      req.on('error', (err) => {
        // Network errors (connection refused, reset, etc.)
        reject(err);
      });

      // Ghi audio data và kết thúc request
      req.write(audio);
      req.end();
    });
  }

  /**
   * Kiểm tra xem error có thể retry không.
   * 
   * @param err - Error object từ network request
   * @returns true nếu error có thể retry (network errors, 5xx, 429)
   */
  private isRetryableError(err: any): boolean {
    // Check network error codes
    if (AiWorkerService.RETRY_CONFIG.RETRYABLE_ERROR_CODES.some(code => 
      err.code === code || err.message?.includes(code)
    )) {
      return true;
    }

    // Check HTTP error status codes
    const errorMessage = err.message || '';
    const httpErrorMatch = errorMessage.match(/HTTP (\d+):/);
    if (httpErrorMatch) {
      const statusCode = parseInt(httpErrorMatch[1], 10);
      // 5xx server errors và 429 rate limit có thể retry
      return (statusCode >= 500 && statusCode < 600) || statusCode === 429;
    }

    return false;
  }

  /**
   * Get HTTP Agent instance để test và monitor.
   * @returns HTTP Agent (http hoặc https tùy baseUrl)
   */
  getHttpAgent(): http.Agent | https.Agent {
    const isHttps = this.baseUrl.startsWith('https:');
    return isHttps ? this.httpsAgent : this.httpAgent;
  }

  /**
   * Get connection pool metrics cho monitoring và debugging.
   * @returns Object chứa các metrics về connection pool
   */
  getConnectionMetrics(): any {
    const agent = this.getHttpAgent();
    
    // Tính total active connections từ all hosts
    let totalConnections = 0;
    let freeConnections = 0;
    let pendingRequests = 0;

    // Node.js Agent có thể có multiple hosts
    if (agent.sockets) {
      Object.values(agent.sockets).forEach((socketArray: any) => {
        totalConnections += socketArray.length;
      });
    }

    if (agent.freeSockets) {
      Object.values(agent.freeSockets).forEach((socketArray: any) => {
        freeConnections += socketArray.length;
      });
    }

    if (agent.requests) {
      Object.values(agent.requests).forEach((requestArray: any) => {
        pendingRequests += requestArray.length;
      });
    }

    const activeConnections = totalConnections - freeConnections;
    const reuseRate = totalConnections > 0 ? (freeConnections / totalConnections) : 0;

    return {
      totalConnections,
      activeConnections,
      freeConnections,
      pendingRequests,
      reuseRate: Math.round(reuseRate * 100) / 100, // round to 2 decimal places
      maxSockets: agent.maxSockets,
      maxFreeSockets: agent.maxFreeSockets,
    };
  }

  /**
   * Log connection pool metrics để monitor performance.
   * Thường được gọi periodically hoặc on-demand.
   */
  logConnectionMetrics(): void {
    const metrics = this.getConnectionMetrics();
    this.logger.debug(
      `Connection pool metrics: ` +
      `active=${metrics.activeConnections}/${metrics.maxSockets}, ` +
      `free=${metrics.freeConnections}/${metrics.maxFreeSockets}, ` +
      `pending=${metrics.pendingRequests}, ` +
      `reuse=${(metrics.reuseRate * 100).toFixed(1)}%`
    );
  }

  // ==================== ADAPTIVE BUFFERING METHODS ====================

  /**
   * Lấy current buffer size cho real-time audio processing
   */
  getCurrentBufferSize(): number {
    return this.currentBufferSize;
  }

  /**
   * Set buffer size với validation cho MVP constraints
   */
  setBufferSize(size: number): void {
    const clampedSize = Math.max(
      AiWorkerService.BUFFER_CONFIG.MIN_SIZE,
      Math.min(size, AiWorkerService.BUFFER_CONFIG.MAX_SIZE)
    );
    
    if (clampedSize !== this.currentBufferSize) {
      this.logger.debug(`Buffer size changed: ${this.currentBufferSize} -> ${clampedSize} bytes`);
      this.currentBufferSize = clampedSize;
    }
  }

  /**
   * Measure network latency bằng cách ping AI Worker
   */
  async measureNetworkLatency(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // VI: Sử dụng HEAD request để minimize data transfer
      await this.makeHttpRequest(new URL('/health', this.baseUrl), '', Buffer.alloc(0));
      return Date.now() - startTime;
    } catch (error) {
      // VI: Nếu lỗi, assume worst case latency
      return AiWorkerService.BUFFER_CONFIG.LATENCY_PENALTY;
    }
  }

  /**
   * Measure throughput bằng test data transfer
   */
  async measureThroughput(testData: Buffer): Promise<number> {
    const startTime = Date.now();
    const dataSize = testData.length;
    
    try {
      await this.makeHttpRequest(new URL('/ping', this.baseUrl), 'throughput-test', testData);
      const duration = Date.now() - startTime;
      
      // VI: Throughput = bytes per second
      return Math.round((dataSize * 1000) / duration);
    } catch (error) {
      // VI: Fallback throughput assumption cho failed measurements  
      return AiWorkerService.BUFFER_CONFIG.FALLBACK_THROUGHPUT;
    }
  }

  /**
   * Record network metrics cho trend analysis
   */
  recordNetworkMetrics(latency: number, throughput: number): void {
    const metrics: NetworkMetrics = {
      latency,
      throughput,
      timestamp: Date.now()
    };

    this.networkMetricsHistory.push(metrics);

    // VI: Giữ chỉ METRICS_HISTORY_SIZE measurements gần nhất
    if (this.networkMetricsHistory.length > AiWorkerService.BUFFER_CONFIG.METRICS_HISTORY_SIZE) {
      this.networkMetricsHistory.shift();
    }

    this.logger.debug(`Network metrics recorded: latency=${latency}ms, throughput=${throughput} B/s`);
  }

  /**
   * Get network metrics history cho analysis
   */
  getNetworkMetricsHistory(): NetworkMetrics[] {
    return [...this.networkMetricsHistory]; // Return copy để avoid mutation
  }

  /**
   * Calculate optimal buffer size dựa trên network metrics history
   */
  calculateOptimalBufferSize(): number {
    if (this.networkMetricsHistory.length === 0) {
      return AiWorkerService.BUFFER_CONFIG.DEFAULT_SIZE;
    }

    // VI: Tính average latency và throughput
    const avgLatency = this.networkMetricsHistory.reduce((sum, m) => sum + m.latency, 0) / this.networkMetricsHistory.length;
    const avgThroughput = this.networkMetricsHistory.reduce((sum, m) => sum + m.throughput, 0) / this.networkMetricsHistory.length;

    let optimalSize = AiWorkerService.BUFFER_CONFIG.DEFAULT_SIZE;

    // VI: Logic để adjust buffer dựa trên network conditions
    if (avgLatency > AiWorkerService.BUFFER_CONFIG.HIGH_LATENCY_THRESHOLD) {
      // High latency = cần buffer lớn hơn để avoid underruns
      optimalSize = Math.round(optimalSize * 1.5);
    } else if (avgLatency < AiWorkerService.BUFFER_CONFIG.LOW_LATENCY_THRESHOLD) {
      // Low latency = có thể dùng buffer nhỏ hơn cho lower memory usage
      optimalSize = Math.round(optimalSize * 0.8);
    }

    // VI: Adjust dựa trên throughput (lower throughput = larger buffer needed)
    if (avgThroughput < 3000) { // < 3KB/s
      optimalSize = Math.round(optimalSize * 1.3);
    }

    // VI: Ensure constraints cho MVP
    return Math.max(
      AiWorkerService.BUFFER_CONFIG.MIN_SIZE,
      Math.min(optimalSize, AiWorkerService.BUFFER_CONFIG.MAX_SIZE)
    );
  }

  /**
   * Adjust buffer size dựa trên current network conditions
   */
  async adjustBufferForNetworkConditions(): Promise<void> {
    const latency = await this.measureNetworkLatency();
    
    if (latency > AiWorkerService.BUFFER_CONFIG.HIGH_LATENCY_THRESHOLD) {
      // VI: High latency -> increase buffer
      const newSize = Math.min(
        this.currentBufferSize * 1.25,
        AiWorkerService.BUFFER_CONFIG.MAX_SIZE
      );
      this.setBufferSize(Math.round(newSize));
    } else if (latency < AiWorkerService.BUFFER_CONFIG.LOW_LATENCY_THRESHOLD) {
      // VI: Low latency -> decrease buffer để save memory  
      const newSize = Math.max(
        this.currentBufferSize * 0.85,
        AiWorkerService.BUFFER_CONFIG.MIN_SIZE
      );
      this.setBufferSize(Math.round(newSize));
    }
  }

  /**
   * Comprehensive adaptive buffer update với metrics recording
   */
  async adaptiveBufferUpdate(): Promise<void> {
    try {
      // VI: Measure current network performance
      const testBuffer = Buffer.alloc(1024); // 1KB test data
      const [latency, throughput] = await Promise.all([
        this.measureNetworkLatency(),
        this.measureThroughput(testBuffer)
      ]);

      // VI: Record metrics cho trend analysis
      this.recordNetworkMetrics(latency, throughput);

      // VI: Calculate và apply optimal buffer size
      const optimalSize = this.calculateOptimalBufferSize();
      this.setBufferSize(optimalSize);

    } catch (error) {
      this.logger.warn(`Adaptive buffer update failed: ${error.message}`);
      // VI: Fallback to default nếu measurements fail
      this.setBufferSize(AiWorkerService.BUFFER_CONFIG.DEFAULT_SIZE);
    }
  }

  // ==================== SMART CHUNKING METHODS ====================

  /**
   * Calculate optimal chunk size dựa trên buffer size, network conditions và AI Worker performance
   */
  calculateOptimalChunkSize(): number {
    // VI: Base chunk size từ current buffer với intelligent ratio
    let chunkSize = Math.round(this.currentBufferSize * AiWorkerService.CHUNKING_CONFIG.CHUNK_BUFFER_RATIO);
    
    // VI: Advanced adjustments dựa trên multiple factors
    const avgLatency = this.getAverageLatency();
    const aiMetrics = this.getAIWorkerMetrics();
    const streamingMetrics = this.getStreamingMetrics();
    
    // VI: Network latency adjustments
    if (avgLatency > AiWorkerService.CHUNKING_CONFIG.HIGH_PROCESSING_THRESHOLD) {
      // High latency = larger chunks để reduce network overhead
      chunkSize = Math.round(chunkSize * 1.3);
    } else if (avgLatency < AiWorkerService.BUFFER_CONFIG.LOW_LATENCY_THRESHOLD) {
      // Low latency = smaller chunks cho better real-time responsiveness
      chunkSize = Math.round(chunkSize * 0.75);
    }
    
    // VI: AI Worker processing speed adjustments
    if (aiMetrics.averageProcessingTime > AiWorkerService.CHUNKING_CONFIG.HIGH_PROCESSING_THRESHOLD) {
      // Slow processing = smaller chunks để avoid timeouts
      chunkSize = Math.round(chunkSize * 0.8);
    }
    
    // VI: Streaming backlog adjustments
    if (streamingMetrics.processingBacklog > AiWorkerService.CHUNKING_CONFIG.BACKLOG_THRESHOLD) {
      // High backlog = smaller chunks để clear queue faster
      chunkSize = Math.round(chunkSize * 0.7);
    }

    // VI: Ensure MVP constraints với performance bounds
    return Math.max(
      AiWorkerService.CHUNKING_CONFIG.MIN_CHUNK_SIZE,
      Math.min(chunkSize, AiWorkerService.CHUNKING_CONFIG.MAX_CHUNK_SIZE)
    );
  }

  /**
   * Get chunking constraints cho MVP limits
   */
  getChunkingConstraints(): ChunkingConstraints {
    return {
      minChunkSize: AiWorkerService.CHUNKING_CONFIG.MIN_CHUNK_SIZE,
      maxChunkSize: AiWorkerService.CHUNKING_CONFIG.MAX_CHUNK_SIZE,
      defaultChunkSize: AiWorkerService.CHUNKING_CONFIG.DEFAULT_CHUNK_SIZE
    };
  }

  /**
   * Chunk large audio buffer thành optimal sizes với intelligent sizing
   */
  chunkAudioData(audioBuffer: Buffer): Buffer[] {
    if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
      throw new Error('Invalid audio buffer for chunking');
    }

    const startTime = Date.now();
    const optimalChunkSize = this.calculateOptimalChunkSize();
    const chunks: Buffer[] = [];
    
    // VI: Intelligent chunking với adaptive sizing
    let remainingBytes = audioBuffer.length;
    let offset = 0;
    
    while (offset < audioBuffer.length) {
      // VI: Adjust chunk size for last chunk để avoid very small remainder
      let currentChunkSize = optimalChunkSize;
      if (remainingBytes < optimalChunkSize * 1.5) {
        // Nếu remaining < 1.5x chunk size, sử dụng hết remaining
        currentChunkSize = remainingBytes;
      }
      
      const end = Math.min(offset + currentChunkSize, audioBuffer.length);
      const chunk = audioBuffer.subarray(offset, end);
      chunks.push(chunk);
      
      offset = end;
      remainingBytes = audioBuffer.length - offset;
    }

    // VI: Update performance metrics với detailed tracking
    const processingTime = Date.now() - startTime;
    this.updateChunkingMetrics(chunks.length, optimalChunkSize, processingTime);

    this.logger.debug(
      `Smart chunking completed: ${chunks.length} chunks, ` +
      `avg size: ${optimalChunkSize}B, processing: ${processingTime}ms`
    );
    
    return chunks;
  }

  /**
   * Update chunking metrics với detailed performance tracking
   */
  private updateChunkingMetrics(chunkCount: number, avgChunkSize: number, processingTime: number): void {
    // VI: Rolling average cho metrics
    const totalChunks = this.chunkingMetrics.totalChunks + chunkCount;
    this.chunkingMetrics.averageChunkSize = Math.round(
      (this.chunkingMetrics.averageChunkSize * this.chunkingMetrics.totalChunks + avgChunkSize * chunkCount) / totalChunks
    );
    
    this.chunkingMetrics.totalChunks = totalChunks;
    this.chunkingMetrics.chunkingLatency = processingTime;
  }

  /**
   * Chunk audio với metadata cho proper reassembly
   */
  chunkAudioWithMetadata(audioBuffer: Buffer, sessionId: string): ChunkedAudioResult {
    const chunks = this.chunkAudioData(audioBuffer);
    
    const audioChunks: AudioChunk[] = chunks.map((chunk, index) => ({
      sequenceId: index,
      data: chunk,
      size: chunk.length
    }));

    return {
      sessionId,
      totalChunks: chunks.length,
      chunks: audioChunks
    };
  }

  /**
   * Get current chunking performance metrics
   */
  getChunkingMetrics(): ChunkingMetrics {
    return { ...this.chunkingMetrics }; // Return copy
  }

  /**
   * Get average network latency từ metrics history
   */
  private getAverageLatency(): number {
    if (this.networkMetricsHistory.length === 0) {
      return AiWorkerService.BUFFER_CONFIG.LOW_LATENCY_THRESHOLD; // Default assumption
    }

    const totalLatency = this.networkMetricsHistory.reduce((sum, m) => sum + m.latency, 0);
    return totalLatency / this.networkMetricsHistory.length;
  }

  /**
   * Comprehensive performance optimization integrating chunking với buffer management
   */
  async optimizeChunkingPerformance(): Promise<void> {
    try {
      // VI: Update network metrics first
      const testBuffer = Buffer.alloc(1024);
      const [latency, throughput] = await Promise.all([
        this.measureNetworkLatency(),
        this.measureThroughput(testBuffer)
      ]);
      
      this.recordNetworkMetrics(latency, throughput);
      
      // VI: Update buffer size based on latest metrics
      const optimalBufferSize = this.calculateOptimalBufferSize();
      this.setBufferSize(optimalBufferSize);
      
      // VI: Log optimization results
      const chunkSize = this.calculateOptimalChunkSize();
      this.logger.debug(
        `Performance optimized: buffer=${optimalBufferSize}B, chunk=${chunkSize}B, ` +
        `latency=${latency}ms, throughput=${throughput}B/s`
      );
      
    } catch (error) {
      this.logger.warn(`Performance optimization failed: ${error.message}`);
    }
  }

  /**
   * Get AI Worker processing metrics (mock implementation cho MVP)
   */
  getAIWorkerMetrics(): AIWorkerMetrics {
    // VI: Mock metrics - trong production sẽ lấy từ AI Worker API
    const avgLatency = this.getAverageLatency();
    return {
      averageProcessingTime: Math.max(50, avgLatency * 0.8), // Estimate processing time
      queueDepth: Math.random() > 0.7 ? 2 : 1, // Random queue depth
      cpuUsage: Math.min(0.8, avgLatency / 200) // Estimate CPU từ latency
    };
  }

  /**
   * Get streaming performance metrics
   */
  getStreamingMetrics(): StreamingMetrics {
    const currentLatency = this.getAverageLatency();
    const aiMetrics = this.getAIWorkerMetrics();
    
    return {
      targetLatency: AiWorkerService.CHUNKING_CONFIG.TARGET_STREAMING_LATENCY,
      currentLatency,
      processingBacklog: aiMetrics.queueDepth
    };
  }

  /**
   * Cleanup resources khi service shutdown.
   * Đóng tất cả connections trong pool để tránh memory leaks.
   */
  destroy(): void {
    this.logger.debug('AiWorkerService cleanup: destroying HTTP agents');
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}
