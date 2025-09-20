/**
 * Mục đích: Circuit Breaker configuration cho AI Worker service
 * Default values: Based on Martin Fowler recommendations và real-time requirements
 */

import { z } from 'zod';
import { CircuitBreakerConfigSchema, ExponentialBackoffConfigSchema } from '@/modules/ws/models';

// Circuit Breaker Config Schema with defaults
const CIRCUIT_BREAKER_CONFIG_SCHEMA = z.object({
  // AI Worker service config
  aiWorker: CircuitBreakerConfigSchema.default({
    failureThreshold: 5, // Mở sau 5 lỗi liên tục
    resetTimeoutMs: 30000, // 30s timeout trước khi thử half-open
    requestVolumeThreshold: 10, // Tối thiểu 10 requests để tính toán
    errorPercentageThreshold: 50, // 50% error rate để mở breaker
    slowCallDurationThresholdMs: 5000, // > 5s coi như slow call
    slowCallPercentageThreshold: 50, // 50% slow calls để mở breaker
  }),

  // Health check specific config (more lenient)
  healthCheck: CircuitBreakerConfigSchema.default({
    failureThreshold: 3, // Mở sau 3 lỗi health check
    resetTimeoutMs: 15000, // 15s timeout cho health check
    requestVolumeThreshold: 5, // Chỉ cần 5 requests
    errorPercentageThreshold: 60, // 60% error rate (health check có thể bị false positive)
    slowCallDurationThresholdMs: 2000, // > 2s cho health check là chậm
    slowCallPercentageThreshold: 70, // 70% slow health checks
  }),

  // Exponential backoff for retries
  backoff: ExponentialBackoffConfigSchema.default({
    initialDelayMs: 100, // Bắt đầu với 100ms
    maxDelayMs: 5000, // Tối đa 5s delay
    multiplier: 2.0, // x2 mỗi lần retry
    jitter: true, // Thêm random để tránh thundering herd
  }),

  // Global circuit breaker settings
  enableCircuitBreaker: z.boolean().default(true), // Có thể tắt trong dev
  enableMetricsLogging: z.boolean().default(true), // Log metrics cho monitoring
  maxEventsInHistory: z.number().default(1000), // Số events tối đa giữ trong memory
  metricsWindowSizeMs: z.number().default(60000), // 1 minute window cho metrics
});

// Environment variables mapping
const AI_WORKER_CB_CONFIG_SCHEMA = z.object({
  // Circuit breaker enable/disable
  AI_WORKER_CIRCUIT_BREAKER_ENABLED: z.string().default('true').transform(val => val === 'true'),
  
  // AI Worker thresholds
  AI_WORKER_FAILURE_THRESHOLD: z.string().default('5').transform(Number),
  AI_WORKER_RESET_TIMEOUT_MS: z.string().default('30000').transform(Number),
  AI_WORKER_ERROR_PERCENTAGE_THRESHOLD: z.string().default('50').transform(Number),
  AI_WORKER_SLOW_CALL_THRESHOLD_MS: z.string().default('5000').transform(Number),
  
  // Health check thresholds (có thể khác với AI Worker)
  HEALTH_CHECK_FAILURE_THRESHOLD: z.string().default('3').transform(Number),
  HEALTH_CHECK_RESET_TIMEOUT_MS: z.string().default('15000').transform(Number),
  
  // Backoff configuration
  RETRY_INITIAL_DELAY_MS: z.string().default('100').transform(Number),
  RETRY_MAX_DELAY_MS: z.string().default('5000').transform(Number),
  RETRY_MULTIPLIER: z.string().default('2').transform(Number),
  
  // Metrics và monitoring
  CIRCUIT_BREAKER_METRICS_ENABLED: z.string().default('true').transform(val => val === 'true'),
  CIRCUIT_BREAKER_METRICS_WINDOW_MS: z.string().default('60000').transform(Number),
});

// Parse environment và tạo config object
const parseCircuitBreakerConfig = () => {
  const envVars = AI_WORKER_CB_CONFIG_SCHEMA.parse(process.env);
  
  return CIRCUIT_BREAKER_CONFIG_SCHEMA.parse({
    aiWorker: {
      failureThreshold: envVars.AI_WORKER_FAILURE_THRESHOLD,
      resetTimeoutMs: envVars.AI_WORKER_RESET_TIMEOUT_MS,
      requestVolumeThreshold: 10, // Fixed, không cần env var
      errorPercentageThreshold: envVars.AI_WORKER_ERROR_PERCENTAGE_THRESHOLD,
      slowCallDurationThresholdMs: envVars.AI_WORKER_SLOW_CALL_THRESHOLD_MS,
      slowCallPercentageThreshold: 50, // Fixed
    },
    healthCheck: {
      failureThreshold: envVars.HEALTH_CHECK_FAILURE_THRESHOLD,
      resetTimeoutMs: envVars.HEALTH_CHECK_RESET_TIMEOUT_MS,
      requestVolumeThreshold: 5, // Fixed
      errorPercentageThreshold: 60, // Fixed
      slowCallDurationThresholdMs: 2000, // Fixed
      slowCallPercentageThreshold: 70, // Fixed
    },
    backoff: {
      initialDelayMs: envVars.RETRY_INITIAL_DELAY_MS,
      maxDelayMs: envVars.RETRY_MAX_DELAY_MS,
      multiplier: envVars.RETRY_MULTIPLIER,
      jitter: true, // Fixed
    },
    enableCircuitBreaker: envVars.AI_WORKER_CIRCUIT_BREAKER_ENABLED,
    enableMetricsLogging: envVars.CIRCUIT_BREAKER_METRICS_ENABLED,
    maxEventsInHistory: 1000, // Fixed
    metricsWindowSizeMs: envVars.CIRCUIT_BREAKER_METRICS_WINDOW_MS,
  });
};

// Export config object
export const CIRCUIT_BREAKER_CONFIG = parseCircuitBreakerConfig();

// Export types
export type CircuitBreakerConfigType = z.infer<typeof CIRCUIT_BREAKER_CONFIG_SCHEMA>;