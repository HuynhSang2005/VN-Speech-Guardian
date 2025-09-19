import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AiWorkerService } from './ai-worker.service';

interface AudioBuffer {
  chunks: Buffer[];
  timer: NodeJS.Timeout | null;
  totalSize: number;
}

@WebSocketGateway({ namespace: '/audio', transports: ['websocket'] })
export class AudioGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AudioGateway.name);
  private readonly sessionBuffers = new Map<string, AudioBuffer>();
  
  // Audio aggregation config: collect chunks for 400ms or until 8KB, whichever comes first
  private readonly BUFFER_TIME_MS = 400;
  private readonly BUFFER_SIZE_LIMIT = 8192; // 8KB

  constructor(private aiWorker: AiWorkerService) {}

  onModuleInit() {
    this.logger.log('AudioGateway initialized on namespace /audio');
  }

  onModuleDestroy() {
    // Clear all pending buffers on shutdown
    for (const [sessionId, buffer] of this.sessionBuffers) {
      if (buffer.timer) {
        clearTimeout(buffer.timer);
      }
    }
    this.sessionBuffers.clear();
    this.logger.log('AudioGateway destroyed, cleared all pending buffers');
  }

  @SubscribeMessage('audio')
  async handleAudio(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
    // payload is expected to be { audio: ArrayBuffer or base64 string, seq?: number }
    try {
      let buffer: Buffer;
      if (payload instanceof ArrayBuffer) {
        buffer = Buffer.from(payload);
      } else if (payload.audio && typeof payload.audio === 'string') {
        // client may send base64
        buffer = Buffer.from(payload.audio, 'base64');
      } else {
        this.logger.warn('Received unsupported audio payload');
        client.emit('error', { code: 'VSG-100', message: 'Unsupported audio payload' });
        return;
      }

      const sessionId = client.data?.sessionId || client.id;
      
      // Add to buffer for aggregation
      this.addToBuffer(sessionId, buffer, client);

    } catch (err: any) {
      this.logger.error('Error handling audio chunk: ' + err?.message);
      client.emit('error', { code: 'VSG-101', message: err?.message || 'Audio processing failed' });
    }
  }

  /**
   * Add audio chunk to buffer; flush when time/size limit reached
   * Implements WebSocket audio streaming best practices để reduce HTTP overhead
   */
  private addToBuffer(sessionId: string, chunk: Buffer, client: Socket) {
    let audioBuffer = this.sessionBuffers.get(sessionId);
    
    if (!audioBuffer) {
      audioBuffer = {
        chunks: [],
        timer: null,
        totalSize: 0
      };
      this.sessionBuffers.set(sessionId, audioBuffer);
    }

    // Add chunk to buffer
    audioBuffer.chunks.push(chunk);
    audioBuffer.totalSize += chunk.length;

    // Start timer on first chunk
    if (audioBuffer.chunks.length === 1) {
      audioBuffer.timer = setTimeout(() => {
        this.flushBuffer(sessionId, client);
      }, this.BUFFER_TIME_MS);
    }

    // Flush immediately if size limit reached (8KB threshold for low-latency)
    if (audioBuffer.totalSize >= this.BUFFER_SIZE_LIMIT) {
      this.flushBuffer(sessionId, client);
    }
  }

  /**
   * Flush aggregated audio chunks to AI Worker
   */
  private async flushBuffer(sessionId: string, client: Socket) {
    const audioBuffer = this.sessionBuffers.get(sessionId);
    if (!audioBuffer || audioBuffer.chunks.length === 0) {
      return;
    }

    // Clear timer
    if (audioBuffer.timer) {
      clearTimeout(audioBuffer.timer);
      audioBuffer.timer = null;
    }

    // Concatenate all chunks into single buffer
    const aggregatedBuffer = Buffer.concat(audioBuffer.chunks);
    const chunkCount = audioBuffer.chunks.length;
    
    // Reset buffer
    audioBuffer.chunks = [];
    audioBuffer.totalSize = 0;

    this.logger.debug(`Flushing ${chunkCount} audio chunks (${aggregatedBuffer.length} bytes) for session ${sessionId}`);

    try {
      // Forward aggregated buffer to AI worker
      const result = await this.aiWorker.forwardAudio(sessionId, aggregatedBuffer);

      // emit partial/final depending on result shape
      if (result?.partial) client.emit('partial', result.partial);
      if (result?.final) client.emit('final', result.final);

      // Hysteresis logic for detection events
      // maintain per-session counters in client.data: toxicCount, cleanCount, isToxic
      client.data.toxicCount = client.data.toxicCount || 0;
      client.data.cleanCount = client.data.cleanCount || 0;
      client.data.isToxic = client.data.isToxic || false;

      // support both `detection` (singular) and `detections` (array) shapes from AI worker
      const detection = result?.detection ?? (Array.isArray(result?.detections) && result.detections.length ? result.detections[0] : undefined);

      if (detection) {
        const label = detection.label; // expected 'CLEAN' | 'OFFENSIVE' | 'HATE'
        if (label !== 'CLEAN') {
          client.data.toxicCount += 1;
          client.data.cleanCount = 0;
        } else {
          client.data.cleanCount += 1;
          client.data.toxicCount = 0;
        }

        // thresholds: toxic if toxicCount >= 2; clean if cleanCount >= 3
        if (!client.data.isToxic && client.data.toxicCount >= 2) {
          client.data.isToxic = true;
          client.emit('detection', { label: 'TOXIC', detail: detection });
        }

        if (client.data.isToxic && client.data.cleanCount >= 3) {
          client.data.isToxic = false;
          client.emit('detection', { label: 'CLEAN', detail: detection });
        }
      }
    } catch (err: any) {
      this.logger.error(`Error processing aggregated audio for session ${sessionId}: ${err?.message}`);
      client.emit('error', { code: 'VSG-101', message: err?.message || 'Audio processing failed' });
    }
  }
}
