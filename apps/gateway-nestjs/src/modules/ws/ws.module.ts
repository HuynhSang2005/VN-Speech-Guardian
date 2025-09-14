import { Module } from '@nestjs/common';
import { AudioGateway } from './audio.gateway';
import { AiWorkerService } from './ai-worker.service';

@Module({
  providers: [AudioGateway, AiWorkerService],
  exports: [AudioGateway, AiWorkerService],
})
export class WsModule {}
