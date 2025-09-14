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
   * Forward audio buffer to AI worker. Returns parsed JSON response.
   * Simple implementation: POST JSON { sessionId, audioBase64 }
   */
  async forwardAudio(sessionId: string | undefined, audio: Buffer): Promise<any> {
    const url = `${this.baseUrl}/v1/stream`;
    this.logger.debug(`Forwarding audio to AI worker ${url} (session=${sessionId}) [binary]`);

    try {
      // Send binary body to avoid base64 overhead; provide session id in header
      const res = await (globalThis as any).fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-session-id': sessionId || '',
        },
        body: audio,
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`AI worker responded ${res.status}: ${text}`);
        throw new Error(`AI worker error ${res.status}`);
      }

      // AI worker may stream JSON; read as JSON
      const data = await res.json();
      return data;
    } catch (err: any) {
      this.logger.error('Failed to forward audio to AI worker: ' + err?.message);
      throw err;
    }
  }
}
