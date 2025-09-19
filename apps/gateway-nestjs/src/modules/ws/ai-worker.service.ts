import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';

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

  // Retry configuration constants
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 100;
  private static readonly RETRY_MULTIPLIER = 2;

  // Network error codes that should trigger retry
  private static readonly RETRYABLE_ERROR_CODES = [
    'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'
  ];

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get('AI_WORKER_URL') || 'http://localhost:8000';
    
    // Agent configuration được optimize cho MVP workload
    const agentConfig = {
      keepAlive: true,
      maxSockets: 3,          // Tối đa 3 connections đồng thời
      maxFreeSockets: 2,      // Giữ 2 idle connections trong pool
      scheduling: 'lifo' as const,  // LIFO better cho low request rate
      timeout: 5000,          // 5s timeout cho stability
    };

    this.httpAgent = new http.Agent(agentConfig);
    this.httpsAgent = new https.Agent(agentConfig);
    
    this.logger.debug(
      `HTTP Agent initialized: keepAlive=${agentConfig.keepAlive}, ` +
      `maxSockets=${agentConfig.maxSockets}, maxFreeSockets=${agentConfig.maxFreeSockets}, ` +
      `scheduling=${agentConfig.scheduling}`
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
    
    for (let attempt = 1; attempt <= AiWorkerService.MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(
          `Forward audio via HTTP Agent: ${url.toString()} ` +
          `(session=${sessionId}, attempt=${attempt}/${AiWorkerService.MAX_RETRIES}, size=${audio.length}B)`
        );

        const response = await this.makeHttpRequest(url, sessionId, audio);
        
        // Success - log retry recovery nếu có
        if (attempt > 1) {
          this.logger.log(`AI worker recovered after ${attempt} attempts using connection pool`);
        }
        return response;
        
      } catch (err: any) {
        const isLastAttempt = attempt === AiWorkerService.MAX_RETRIES;
        const shouldRetry = this.isRetryableError(err);
        
        if (!isLastAttempt && shouldRetry) {
          // Retryable error - apply exponential backoff
          this.logger.debug(`Retryable error on attempt ${attempt}: ${err?.message}`);
          const delayMs = AiWorkerService.BASE_DELAY_MS * Math.pow(AiWorkerService.RETRY_MULTIPLIER, attempt - 1);
          await this.sleep(delayMs);
          continue;
        }
        
        // Final attempt or non-retryable error
        this.logger.error(
          `HTTP Agent request failed (attempt ${attempt}/${AiWorkerService.MAX_RETRIES}): ${err?.message}`
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
    if (AiWorkerService.RETRYABLE_ERROR_CODES.some(code => 
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
