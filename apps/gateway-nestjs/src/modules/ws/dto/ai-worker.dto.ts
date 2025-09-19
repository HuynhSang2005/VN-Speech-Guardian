/**
 * Mục đích: NestJS DTOs cho AI Worker endpoints
 * Sử dụng: Type-safe request/response validation với swagger docs
 */

import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import {
  NetworkMetricsSchema,
  ChunkedAudioResultSchema,
  AIWorkerMetricsSchema,
  ConnectionPoolStatusSchema,
  AIServiceResponseSchema,
} from '../models/ai-worker.model';

// Network Metrics DTO
export class NetworkMetricsDto extends createZodDto(NetworkMetricsSchema) {}

// Chunked Audio Result DTO
export class ChunkedAudioResultDto extends createZodDto(ChunkedAudioResultSchema) {}

// AI Worker Metrics DTO
export class AIWorkerMetricsDto extends createZodDto(AIWorkerMetricsSchema) {}

// Connection Pool Status DTO
export class ConnectionPoolStatusDto extends createZodDto(ConnectionPoolStatusSchema) {}

// AI Service Response DTO
export class AIServiceResponseDto extends createZodDto(AIServiceResponseSchema) {}

// Forward Audio Request DTO (for HTTP endpoints if needed)
export class ForwardAudioRequestDto {
  @ApiProperty({ description: 'Session identifier' })
  sessionId: string;

  @ApiProperty({ 
    description: 'Audio data as base64 encoded PCM16LE', 
    example: 'UklGRiYAAABXQVZFZm10IBAAAAABAAEA...' 
  })
  audioData: string;

  @ApiProperty({ description: 'Audio chunk sequence number', required: false })
  sequenceId?: number;
}

// Audio Processing Status Response
export class AudioProcessingStatusDto {
  @ApiProperty()
  status: 'processing' | 'completed' | 'error';

  @ApiProperty()
  sessionId: string;

  @ApiProperty({ required: false })
  progress?: number; // 0-100 percentage

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({ required: false })
  result?: AIServiceResponseDto;
}

// Metrics Summary DTO (cho monitoring endpoints)
export class MetricsSummaryDto {
  @ApiProperty()
  connectionPool: ConnectionPoolStatusDto;

  @ApiProperty()
  aiWorker: AIWorkerMetricsDto;

  @ApiProperty()
  networkPerformance: NetworkMetricsDto[];

  @ApiProperty()
  timestamp: number;
}