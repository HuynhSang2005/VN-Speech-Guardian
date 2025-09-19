import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiWorkerService {
  private readonly logger = new Logger(AiWorkerService.name);
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get('AI_WORKER_URL') || 'http://localhost:8000';
  }

  /**
   * Forward audio buffer to AI worker with exponential backoff retry.
   * Implements retry pattern theo Microsoft Azure guidelines:
   * - Base delay: 100ms, Max retries: 3, Exponential factor: 2
   * - Idempotent operation, an toàn để retry POST /asr/stream
   * - Log initial failures as debug, chỉ log final failure as error
   */
  async forwardAudio(sessionId: string | undefined, audio: Buffer): Promise<any> {
    const url = `${this.baseUrl}/asr/stream`;
    const maxRetries = 3;
    const baseDelayMs = 100;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Forwarding audio to AI worker ${url} (session=${sessionId}) attempt=${attempt}/${maxRetries} [binary]`);

        const apiKey = process.env.GATEWAY_API_KEY || this.config.get('GATEWAY_API_KEY') || '';
        const res = await (globalThis as any).fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-session-id': sessionId || '',
            // attach shared secret so AI Worker can verify the request origin
            ...(apiKey ? { 'x-api-key': apiKey } : {}),
          },
          body: audio,
        });

        if (!res.ok) {
          const text = await res.text();
          
          // Transient errors (5xx, 429) → retry; permanent errors (4xx except 429) → fail fast
          if ((res.status >= 500 && res.status < 600) || res.status === 429) {
            if (attempt < maxRetries) {
              this.logger.debug(`AI worker responded ${res.status} (transient), will retry attempt ${attempt + 1}: ${text}`);
              // Exponential backoff: 100ms, 200ms, 400ms
              const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
              await this.sleep(delayMs);
              continue;
            }
          }
          
          // Final attempt or permanent error
          this.logger.error(`AI worker responded ${res.status}: ${text}`);
          throw new Error(`AI worker error ${res.status}`);
        }

        // Success
        const data = await res.json();
        if (attempt > 1) {
          this.logger.log(`AI worker success after ${attempt} attempts`);
        }
        return data;
        
      } catch (err: any) {
        const isLastAttempt = attempt === maxRetries;
        const isFetchError = err.name === 'TypeError' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET';
        
        if (!isLastAttempt && isFetchError) {
          // Network error, retry
          this.logger.debug(`Network error on attempt ${attempt}, will retry: ${err?.message}`);
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
          await this.sleep(delayMs);
          continue;
        }
        
        // Final attempt or non-retryable error
        this.logger.error(`Failed to forward audio to AI worker (attempt ${attempt}/${maxRetries}): ${err?.message}`);
        throw err;
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
