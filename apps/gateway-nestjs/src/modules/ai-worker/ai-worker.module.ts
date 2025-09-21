import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiWorkerService } from './ai-worker.service';

/**
 * AI Worker Module
 * 
 * Mục đích: External HTTP service integration module
 * Scope: Xử lý communication với AI Worker (FastAPI) service
 * Dependencies: ConfigModule để đọc AI_SERVICE_BASE_URL và config khác
 * 
 * Exports AiWorkerService để các module khác có thể sử dụng:
 * - real-time module (WebSocket audio processing)  
 * - Có thể dùng cho REST endpoints trong tương lai
 */
@Module({
  imports: [ConfigModule],
  providers: [AiWorkerService],
  exports: [AiWorkerService],
})
export class AiWorkerModule {}