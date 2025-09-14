import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleInit } from '@nestjs/common';
import { AiWorkerService } from './ai-worker.service';

@WebSocketGateway({ namespace: '/audio', transports: ['websocket'] })
export class AudioGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AudioGateway.name);

  constructor(private aiWorker: AiWorkerService) {}

  onModuleInit() {
    this.logger.log('AudioGateway initialized on namespace /audio');
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

      // Forward to AI worker and handle returned detections/partials
      const sessionId = client.data?.sessionId;
      const result = await this.aiWorker.forwardAudio(sessionId, buffer);

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
      this.logger.error('Error handling audio chunk: ' + err?.message);
      client.emit('error', { code: 'VSG-101', message: err?.message || 'Audio processing failed' });
    }
  }
}
