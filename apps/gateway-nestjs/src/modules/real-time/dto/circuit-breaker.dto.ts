/**
 * Mục đích: NestJS DTOs với Swagger integration cho Circuit Breaker API
 * Sử dụng: API documentation và validation for circuit breaker endpoints
 */

import { createZodDto } from 'nestjs-zod';
import {
  CircuitBreakerConfigSchema,
  CircuitBreakerMetricsSchema,
  CircuitBreakerEventSchema,
  CircuitBreakerCallResultSchema,
  HealthCheckResultSchema,
  AIWorkerCircuitBreakerContextSchema,
} from '../../infrastructure/circuit-breaker/circuit-breaker.types';

// Circuit Breaker Configuration DTO
export class CircuitBreakerConfigDto extends createZodDto(CircuitBreakerConfigSchema) {}

// Circuit Breaker Metrics DTO
export class CircuitBreakerMetricsDto extends createZodDto(CircuitBreakerMetricsSchema) {}

// Circuit Breaker Event DTO
export class CircuitBreakerEventDto extends createZodDto(CircuitBreakerEventSchema) {}

// Circuit Breaker Call Result DTO
export class CircuitBreakerCallResultDto extends createZodDto(CircuitBreakerCallResultSchema) {}

// Health Check Result DTO
export class HealthCheckResultDto extends createZodDto(HealthCheckResultSchema) {}

// AI Worker Circuit Breaker Context DTO
export class AIWorkerCircuitBreakerContextDto extends createZodDto(AIWorkerCircuitBreakerContextSchema) {}

// Request DTOs for API endpoints
export class TripCircuitBreakerRequestDto extends createZodDto(
  CircuitBreakerEventSchema.pick({ reason: true, metadata: true })
) {}

export class ResetCircuitBreakerRequestDto extends createZodDto(
  CircuitBreakerEventSchema.pick({ reason: true })
) {}

// Response DTOs for API endpoints
export class CircuitBreakerStatusResponseDto extends createZodDto(
  CircuitBreakerMetricsSchema.extend({
    config: CircuitBreakerConfigSchema,
    isHealthy: CircuitBreakerConfigSchema.shape.failureThreshold.transform(() => true), // Will be computed
    nextRetryTimeMs: CircuitBreakerConfigSchema.shape.resetTimeoutMs.optional(),
  })
) {}

// Bulk metrics for multiple services
export class BulkCircuitBreakerMetricsDto extends createZodDto(
  CircuitBreakerMetricsSchema.extend({
    serviceName: CircuitBreakerConfigSchema.shape.failureThreshold.transform(() => 'ai-worker'), // Service identifier
    endpoint: CircuitBreakerConfigSchema.shape.failureThreshold.transform(() => '/asr'), // Specific endpoint
  }).array()
) {}