/**
 * Mục đích: Zod schemas và types cho Circuit Breaker Pattern domain
 * Sử dụng: Type-safe validation cho circuit breaker states và metrics
 * Research: Based on Martin Fowler's Circuit Breaker pattern - https://martinfowler.com/bliki/CircuitBreaker.html
 */

import { z } from 'zod';

// Circuit Breaker States Schema
export const CircuitBreakerStateSchema = z.enum(['closed', 'open', 'half-open']);

// Circuit Breaker Configuration Schema
export const CircuitBreakerConfigSchema = z.object({
  failureThreshold: z.number().int().positive(), // Number of failures to trip breaker
  resetTimeoutMs: z.number().positive(), // Time to wait before half-open attempt
  requestVolumeThreshold: z.number().int().positive(), // Min requests before calculation
  errorPercentageThreshold: z.number().min(0).max(100), // % of errors to trip breaker
  slowCallDurationThresholdMs: z.number().positive(), // Duration considered as slow call
  slowCallPercentageThreshold: z.number().min(0).max(100), // % of slow calls to trip
});

// Circuit Breaker Metrics Schema
export const CircuitBreakerMetricsSchema = z.object({
  state: CircuitBreakerStateSchema,
  failureCount: z.number().int().nonnegative(), // Current failure count
  successCount: z.number().int().nonnegative(), // Current success count
  totalRequests: z.number().int().nonnegative(), // Total requests in window
  failureRate: z.number().min(0).max(1), // Failure rate (0-1)
  slowCallCount: z.number().int().nonnegative(), // Number of slow calls
  slowCallRate: z.number().min(0).max(1), // Slow call rate (0-1)
  lastFailureTime: z.number().optional(), // Timestamp of last failure
  lastSuccessTime: z.number().optional(), // Timestamp of last success
  stateTransitionCount: z.number().int().nonnegative(), // Number of state changes
  uptime: z.number().nonnegative(), // Time since last reset (ms)
});

// Circuit Breaker Call Result Schema
export const CircuitBreakerCallResultSchema = z.object({
  success: z.boolean(), // Whether call was successful
  duration: z.number().nonnegative(), // Call duration in ms
  error: z.string().optional(), // Error message if failed
  bypassed: z.boolean(), // Whether breaker was bypassed (open state)
  timestamp: z.number(), // When call was made
});

// Circuit Breaker Event Schema
export const CircuitBreakerEventSchema = z.object({
  type: z.enum([
    'state_change', 
    'call_success', 
    'call_failure', 
    'call_timeout',
    'call_rejected',
    'manual_trip',
    'manual_reset'
  ]),
  timestamp: z.number(),
  previousState: CircuitBreakerStateSchema.optional(),
  newState: CircuitBreakerStateSchema.optional(),
  reason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(), // Additional context
});

// Health Check Result Schema (for AI Worker)
export const HealthCheckResultSchema = z.object({
  healthy: z.boolean(),
  responseTime: z.number().nonnegative(), // Response time in ms
  statusCode: z.number().int().optional(), // HTTP status if applicable
  error: z.string().optional(), // Error message if unhealthy
  timestamp: z.number(),
});

// Exponential Backoff Configuration Schema
export const ExponentialBackoffConfigSchema = z.object({
  initialDelayMs: z.number().positive(), // Initial delay
  maxDelayMs: z.number().positive(), // Maximum delay
  multiplier: z.number().min(1), // Backoff multiplier
  jitter: z.boolean().default(true), // Add random jitter
});

// AI Worker Circuit Breaker Context Schema
export const AIWorkerCircuitBreakerContextSchema = z.object({
  sessionId: z.string().optional(), // Associated session
  requestType: z.enum(['asr', 'moderation', 'health']), // Type of request
  retryAttempt: z.number().int().nonnegative().default(0), // Current retry attempt
  originalRequestTime: z.number(), // When original request started
  userAgent: z.string().optional(), // For tracking purposes
});

// Exported Types
export type CircuitBreakerState = z.infer<typeof CircuitBreakerStateSchema>;
export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;
export type CircuitBreakerMetrics = z.infer<typeof CircuitBreakerMetricsSchema>;
export type CircuitBreakerCallResult = z.infer<typeof CircuitBreakerCallResultSchema>;
export type CircuitBreakerEvent = z.infer<typeof CircuitBreakerEventSchema>;
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;
export type ExponentialBackoffConfig = z.infer<typeof ExponentialBackoffConfigSchema>;
export type AIWorkerCircuitBreakerContext = z.infer<typeof AIWorkerCircuitBreakerContextSchema>;