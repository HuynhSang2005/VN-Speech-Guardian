import { Module } from '@nestjs/common';
import { AudioGateway } from './audio.gateway';
import { AiWorkerModule } from '../ai-worker/ai-worker.module';
import { SessionsModule } from '../sessions/sessions.module';

/**
 * Real-time Module 
 * 
 * Mục đích: Real-time audio processing với Socket.IO
 * Scope: WebSocket connections, audio streaming, real-time transcription
 * 
 * Dependencies:
 * - AiWorkerModule: gửi audio chunks đến AI Worker service
 * - SessionsModule: lưu transcript và detection results vào database
 * 
 * Architecture:
 * - AudioGateway: Socket.IO gateway cho client connections
 * - Audio buffering: aggregate chunks trước khi gửi AI Worker  
 * - Hysteresis logic: smooth detection events (2→toxic, 3→clean)
 */
@Module({
  imports: [AiWorkerModule, SessionsModule],
  providers: [AudioGateway],
  exports: [AudioGateway],
})
export class RealTimeModule {}