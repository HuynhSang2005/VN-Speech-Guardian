import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';
import { AI_WORKER_CONFIG } from '../../config/ai-worker.config';
import type {
  NetworkMetrics,
  ChunkingConstraints,
  AudioChunk,
  ChunkedAudioResult,
  AIWorkerMetrics,
  StreamingMetrics,
  ChunkingMetrics,
  ConnectionPoolStatus,
  AIServiceResponse,
} from './types/ai-worker.types';

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
 * - timeout: 30000ms (production stability)
 */
@Injectable()
export class AiWorkerService {
  private readonly logger = new Logger(AiWorkerService.name);
  private readonly baseUrl: string;
  private readonly httpAgent: http.Agent;
  private readonly httpsAgent: https.Agent;

  // ==================== INSTANCE STATE ====================

  // Adaptive buffering state
  private currentBufferSize: number = AI_WORKER_CONFIG.BUFFER.INITIAL_SIZE;
  private networkMetricsHistory: NetworkMetrics[] = [];

  // Smart chunking state
  private chunkingMetrics: ChunkingMetrics = {
    totalChunks: 0,
    averageChunkSize: AI_WORKER_CONFIG.CHUNKING.DEFAULT_CHUNK_SIZE,
    chunkingLatency: 0,
    optimalChunkSize: AI_WORKER_CONFIG.CHUNKING.DEFAULT_CHUNK_SIZE,
  };

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get('AI_WORKER_URL') || AI_WORKER_CONFIG.SERVICE.BASE_URL;
    
    // VI: Agent configuration từ centralized config
    const agentConfig = {
      keepAlive: AI_WORKER_CONFIG.CONNECTION_POOL.KEEP_ALIVE,
      maxSockets: AI_WORKER_CONFIG.CONNECTION_POOL.MAX_SOCKETS,
      maxFreeSockets: AI_WORKER_CONFIG.CONNECTION_POOL.MAX_FREE_SOCKETS,
      scheduling: AI_WORKER_CONFIG.CONNECTION_POOL.SCHEDULING,
      timeout: AI_WORKER_CONFIG.CONNECTION_POOL.TIMEOUT,
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
    
    for (let attempt = 1; attempt <= AI_WORKER_CONFIG.RETRY.MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(
          `Forward audio via HTTP Agent: ${url.toString()} ` +
          `(session=${sessionId}, attempt=${attempt}/${AI_WORKER_CONFIG.RETRY.MAX_RETRIES}, size=${audio.length}B)`
        );

        const response = await this.makeHttpRequest(url, sessionId, audio);
        
        // Success - log retry recovery nếu có
        if (attempt > 1) {
          this.logger.log(`AI worker recovered after ${attempt} attempts using connection pool`);
        }
        return response;
        
      } catch (err: any) {
        const isLastAttempt = attempt === AI_WORKER_CONFIG.RETRY.MAX_RETRIES;
        const shouldRetry = this.isRetryableError(err);
        
        if (!isLastAttempt && shouldRetry) {
          // Retryable error - apply exponential backoff
          this.logger.debug(`Retryable error on attempt ${attempt}: ${err?.message}`);
          const delayMs = AI_WORKER_CONFIG.RETRY.BASE_DELAY_MS * 
            Math.pow(AI_WORKER_CONFIG.RETRY.BACKOFF_MULTIPLIER, attempt - 1);
          await this.sleep(delayMs);
          continue;
        }
        
        // Final attempt or non-retryable error
        this.logger.error(
          `HTTP Agent request failed (attempt ${attempt}/${AI_WORKER_CONFIG.RETRY.MAX_RETRIES}): ${err?.message}`
        );
        throw err;
      }
    }
  }

  /**
   * Make HTTP request with connection pooling agent
   * 
   * @param url - Target URL  
   * @param sessionId - Session identifier
   * @param audio - Audio buffer
   * @returns Promise<any> - Parsed JSON response
   */
  private async makeHttpRequest(url: URL, sessionId: string | undefined, audio: Buffer): Promise<any> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const isHttps = url.protocol === 'https:';
      const agent = isHttps ? this.httpsAgent : this.httpAgent;
      const httpModule = isHttps ? https : http;

      const apiKey = process.env.GATEWAY_API_KEY || this.config.get('GATEWAY_API_KEY') || AI_WORKER_CONFIG.SERVICE.API_KEY;
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        agent, // Use pooled agent
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': audio.length,
          'x-session-id': sessionId || '',
          'x-api-key': apiKey,
        },
      };

      const req = httpModule.request(options, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          try {
            if (res.statusCode === 200) {
              const jsonData = JSON.parse(data);
              
              // VI: Record network metrics cho adaptive buffering
              this.recordNetworkMetrics(responseTime, audio.length);
              
              resolve(jsonData);
            } else {
              const statusCode = res.statusCode || 0;
              reject(new Error(`HTTP ${statusCode}: ${data}`));
            }
          } catch (parseErr) {
            reject(new Error(`Failed to parse JSON response: ${parseErr}`));
          }
        });
      });

      req.on('error', (err) => {
        const responseTime = Date.now() - startTime;
        // VI: Record failed network attempt cho metrics  
        this.recordNetworkMetrics(responseTime, audio.length, true);
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      // Write audio data as binary payload
      req.write(audio);
      req.end();
    });
  }

  /**
   * Determine if error is retryable based on error code/message
   * 
   * @param err - Error object
   * @returns boolean - true if should retry
   */
  private isRetryableError(err: any): boolean {
    if (!err) return false;
    
    // VI: Check error code cho network-related failures
    if (AI_WORKER_CONFIG.RETRY.RETRYABLE_ERROR_CODES.some(code => 
      err.code === code || err.message?.includes(code))) {
      return true;
    }

    // VI: Check HTTP status codes
    const errorMessage = err.message || '';
    const httpErrorMatch = errorMessage.match(/HTTP (\\d+):/);
    if (httpErrorMatch) {
      const statusCode = parseInt(httpErrorMatch[1], 10);
      return AI_WORKER_CONFIG.RETRY.RETRYABLE_STATUS_CODES.includes(statusCode as any);
    }

    return false;
  }

  /**
   * Sleep utility for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection pool status for monitoring
   * 
   * @returns ConnectionPoolStatus - Current pool statistics
   */
  getConnectionPoolStatus(): ConnectionPoolStatus {
    // VI: Extract metrics từ agent sockets (approximate)
    const httpSockets = (this.httpAgent as any).sockets || {};
    const httpFreeSockets = (this.httpAgent as any).freeSockets || {};
    const httpRequests = (this.httpAgent as any).requests || {};
    
    const httpsAgent = this.httpsAgent as any;
    const httpsSockets = httpsAgent.sockets || {};
    const httpsFreeSockets = httpsAgent.freeSockets || {};
    const httpsRequests = httpsAgent.requests || {};

    // VI: Count active connections across both agents
    const activeConnections = Object.values(httpSockets).flat().length + 
                             Object.values(httpsSockets).flat().length;
    const freeConnections = Object.values(httpFreeSockets).flat().length + 
                           Object.values(httpsFreeSockets).flat().length;
    const pendingRequests = Object.values(httpRequests).flat().length + 
                           Object.values(httpsRequests).flat().length;

    return {
      activeConnections,
      freeConnections,
      pendingRequests,
      totalRequests: activeConnections + freeConnections + pendingRequests,
      connectionReused: Math.max(0, (activeConnections + freeConnections) - 1), // Estimate reuse
    };
  }

  /**
   * Cleanup resources when service is destroyed
   */
  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up HTTP agents...');
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }

  // ==================== ADAPTIVE BUFFERING METHODS ====================

  /**
   * Set buffer size với constraints và logging
   * 
   * @param size - Target buffer size in bytes
   */
  private setBufferSize(size: number): void {
    const clampedSize = Math.max(
      AI_WORKER_CONFIG.BUFFER.MIN_SIZE,
      Math.min(size, AI_WORKER_CONFIG.BUFFER.MAX_SIZE)
    );

    if (clampedSize !== this.currentBufferSize) {
      this.logger.debug(
        `Adaptive buffer size: ${this.currentBufferSize}B → ${clampedSize}B ` +
        `(requested: ${size}B)`
      );
      this.currentBufferSize = clampedSize;
    }
  }

  /**
   * Record network performance metrics cho adaptive algorithms
   * 
   * @param latencyMs - Request latency in milliseconds
   * @param bytes - Data transferred in bytes  
   * @param failed - Whether request failed
   */
  private recordNetworkMetrics(latencyMs: number, bytes: number, failed = false): void {
    const latency = failed ? 1000 : latencyMs; // 1s penalty cho failed requests
    const throughput = failed ? 1000 : Math.round((bytes * 1000) / latencyMs); // bytes per second

    const metrics: NetworkMetrics = {
      latency,
      throughput,
      timestamp: Date.now(),
    };

    this.networkMetricsHistory.push(metrics);
    
    // VI: Maintain rolling window
    if (this.networkMetricsHistory.length > AI_WORKER_CONFIG.BUFFER.HISTORY_SIZE) {
      this.networkMetricsHistory.shift();
    }

    this.logger.debug(
      `Network metrics recorded: ${latency}ms latency, ` +
      `${(throughput / 1024).toFixed(1)}KB/s throughput ` +
      `(history: ${this.networkMetricsHistory.length})`
    );

    // VI: Trigger adaptive buffer resize nếu có enough data
    this.maybeAdjustBuffer();
  }

  /**
   * Calculate average latency từ recent metrics
   * 
   * @returns number - Average latency in ms, or fallback
   */
  private getAverageLatency(): number {
    if (this.networkMetricsHistory.length === 0) {
      return AI_WORKER_CONFIG.BUFFER.INITIAL_SIZE;
    }

    const avgLatency = this.networkMetricsHistory.reduce(
      (sum, metric) => sum + metric.latency, 0
    ) / this.networkMetricsHistory.length;

    let optimalSize = AI_WORKER_CONFIG.BUFFER.INITIAL_SIZE;

    // VI: Adjust dựa trên network latency patterns
    if (avgLatency > AI_WORKER_CONFIG.BUFFER.LATENCY_THRESHOLDS.HIGH) {
      optimalSize *= 2; // Increase buffer cho slow network
    } else if (avgLatency < AI_WORKER_CONFIG.BUFFER.LATENCY_THRESHOLDS.LOW) {
      optimalSize *= 0.75; // Decrease buffer cho fast network  
    }

    // VI: Factor in throughput
    const avgThroughput = this.getAverageThroughput();
    if (avgThroughput > AI_WORKER_CONFIG.BUFFER.THROUGHPUT_THRESHOLDS.HIGH) {
      optimalSize *= 0.8; // Smaller buffer cho high throughput
    } else if (avgThroughput < AI_WORKER_CONFIG.BUFFER.THROUGHPUT_THRESHOLDS.LOW) {
      optimalSize *= 1.5; // Larger buffer cho low throughput
    }

    return Math.max(
      AI_WORKER_CONFIG.BUFFER.MIN_SIZE,
      Math.min(optimalSize, AI_WORKER_CONFIG.BUFFER.MAX_SIZE)
    );
  }

  /**
   * Adaptive buffer adjustment cho current network conditions
   */
  private maybeAdjustBuffer(): void {
    if (this.networkMetricsHistory.length < 3) return; // Need some data

    const latency = this.getAverageLatency();

    if (latency > AI_WORKER_CONFIG.BUFFER.LATENCY_THRESHOLDS.HIGH) {
      // VI: Slow network - increase buffer để reduce round trips
      const newSize = Math.min(
        this.currentBufferSize * 1.5,
        AI_WORKER_CONFIG.BUFFER.MAX_SIZE
      );
      this.setBufferSize(newSize);
    } else if (latency < AI_WORKER_CONFIG.BUFFER.LATENCY_THRESHOLDS.LOW) {
      // VI: Fast network - decrease buffer để reduce memory usage  
      const newSize = Math.max(
        this.currentBufferSize * 0.8,
        AI_WORKER_CONFIG.BUFFER.MIN_SIZE
      );
      this.setBufferSize(newSize);
    }
  }

  /**
   * Calculate average throughput từ recent metrics
   * 
   * @returns number - Average throughput in bytes/second
   */
  private getAverageThroughput(): number {
    if (this.networkMetricsHistory.length === 0) {
      return 50000; // 50KB/s conservative fallback
    }

    return this.networkMetricsHistory.reduce(
      (sum, metric) => sum + metric.throughput, 0
    ) / this.networkMetricsHistory.length;
  }

  /**
   * Apply buffer resize nếu significant change detected
   */
  private applyBufferResize(): void {
    const optimalSize = this.getAverageLatency();
    
    if (Math.abs(optimalSize - this.currentBufferSize) > AI_WORKER_CONFIG.BUFFER.INITIAL_SIZE * 0.25) {
      this.setBufferSize(optimalSize);
    } else {
      this.setBufferSize(AI_WORKER_CONFIG.BUFFER.INITIAL_SIZE);
    }
  }

  // ==================== SMART CHUNKING METHODS ====================

  /**
   * Calculate optimal chunk size dựa trên current conditions
   * 
   * @param aiMetrics - Current AI worker metrics
   * @param streamingMetrics - Current streaming performance
   * @returns number - Optimal chunk size in bytes
   */
  calculateOptimalChunkSize(aiMetrics: AIWorkerMetrics, streamingMetrics: StreamingMetrics): number {
    // VI: Base chunk size on buffer size và config ratio
    let chunkSize = Math.round(this.currentBufferSize * AI_WORKER_CONFIG.CHUNKING.BUFFER_SIZE_RATIO);

    // VI: Adjust dựa trên network latency (from adaptive buffering)
    const avgLatency = this.getAverageLatency();
    
    if (avgLatency > 150) { // High latency threshold from config would be ideal
      chunkSize *= 1.2; // Larger chunks cho high latency
    } else if (avgLatency < AI_WORKER_CONFIG.BUFFER.LATENCY_THRESHOLDS.LOW) {
      chunkSize *= 0.8; // Smaller chunks cho low latency
    }

    // VI: Factor AI processing capabilities
    if (aiMetrics.averageProcessingTime > 150) { // Would use CHUNKING config threshold 
      chunkSize *= 0.9; // Smaller chunks nếu AI slow
    }

    // VI: Factor current streaming backlog
    if (streamingMetrics.processingBacklog > 2) { // Would use config threshold
      chunkSize *= 0.85; // Smaller chunks nếu backlog cao
    }

    // VI: Ensure constraints
    return Math.max(
      AI_WORKER_CONFIG.CHUNKING.MIN_CHUNK_SIZE,
      Math.min(chunkSize, AI_WORKER_CONFIG.CHUNKING.MAX_CHUNK_SIZE)
    );
  }

  /**
   * Apply intelligent chunking to audio buffer
   * 
   * @param sessionId - Session identifier
   * @param audioBuffer - Raw audio data
   * @param aiMetrics - Current AI worker metrics  
   * @param streamingMetrics - Current streaming metrics
   * @returns ChunkedAudioResult - Chunked data với metadata
   */
  applySmartChunking(
    sessionId: string,
    audioBuffer: Buffer,
    aiMetrics: AIWorkerMetrics,
    streamingMetrics: StreamingMetrics
  ): ChunkedAudioResult {
    const startTime = Date.now();
    
    // VI: Calculate optimal chunk size cho current conditions
    const optimalChunkSize = this.calculateOptimalChunkSize(aiMetrics, streamingMetrics);
    
    const chunks: AudioChunk[] = [];
    let sequenceId = 0;
    
    // VI: Split buffer into optimal-sized chunks
    for (let offset = 0; offset < audioBuffer.length; offset += optimalChunkSize) {
      const chunkData = audioBuffer.slice(offset, offset + optimalChunkSize);
      
      chunks.push({
        sequenceId: sequenceId++,
        data: chunkData,
        size: chunkData.length,
      });
    }

    const chunkingLatency = Date.now() - startTime;
    
    // VI: Update chunking metrics
    this.updateChunkingMetrics(chunks, chunkingLatency, optimalChunkSize);

    this.logger.debug(
      `Smart chunking applied: ${chunks.length} chunks, ` +
      `${optimalChunkSize}B optimal size, ${chunkingLatency}ms latency`
    );

    return {
      sessionId,
      totalChunks: chunks.length,
      chunks,
    };
  }

  /**
   * Update chunking performance metrics
   */
  private updateChunkingMetrics(chunks: AudioChunk[], latency: number, optimalSize: number): void {
    const chunkCount = chunks.length;
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const avgChunkSize = totalSize / chunkCount;

    // VI: Update rolling averages
    const totalChunks = this.chunkingMetrics.totalChunks + chunkCount;
    
    this.chunkingMetrics.averageChunkSize = Math.round(
      (this.chunkingMetrics.averageChunkSize * this.chunkingMetrics.totalChunks + avgChunkSize * chunkCount) / totalChunks
    );
    
    this.chunkingMetrics.chunkingLatency = Math.round(
      (this.chunkingMetrics.chunkingLatency * this.chunkingMetrics.totalChunks + latency * chunkCount) / totalChunks
    );
    
    this.chunkingMetrics.totalChunks = totalChunks;
    this.chunkingMetrics.optimalChunkSize = optimalSize;
  }

  /**
   * Get current chunking performance metrics
   * 
   * @returns ChunkingMetrics - Current metrics
   */
  getChunkingMetrics(): ChunkingMetrics {
    return { ...this.chunkingMetrics };
  }

  /**
   * Get current buffer size
   * 
   * @returns number - Current buffer size in bytes
   */
  getCurrentBufferSize(): number {
    return this.currentBufferSize;
  }

  /**
   * Get network performance history
   * 
   * @returns NetworkMetrics[] - Recent network performance data
   */
  getNetworkMetrics(): NetworkMetrics[] {
    return [...this.networkMetricsHistory];
  }
}