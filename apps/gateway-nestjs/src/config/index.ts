/**
 * Mục đích: Centralized exports cho tất cả configuration
 * Sử dụng: import { APP_CONFIG, AI_WORKER_CONFIG, ... } from '@/config'
 */

export * from './app.config';
export * from './ai-worker.config';
export * from './auth.config';
export * from './database.config';
export * from './env.config';
export * from './circuit-breaker.config';

// Re-export commonly used configs
export { APP_CONFIG } from './app.config';
export { AI_WORKER_CONFIG } from './ai-worker.config';
export { AUTH_CONFIG } from './auth.config';
export { DATABASE_CONFIG } from './database.config';
export { ENV, validateEnv } from './env.config';
export { CIRCUIT_BREAKER_CONFIG } from './circuit-breaker.config';