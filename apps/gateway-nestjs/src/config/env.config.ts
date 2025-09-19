/**
 * Mục đích: Environment configuration validation & parsing
 * Sử dụng: Type-safe environment variables với Zod validation
 */

import { z } from 'zod';

// Environment Schema Validation
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_DATABASE_URL: z.string().url().optional(),

  // Auth (Clerk)
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_JWT_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // AI Service
  AI_SERVICE_BASE_URL: z.string().url().default('http://localhost:8001'),
  GATEWAY_API_KEY: z.string().min(1).default('dev-secret'),
  AI_SERVICE_TIMEOUT: z.coerce.number().default(30000),

  // CORS
  CORS_ORIGINS: z.string().optional(),
  WS_CORS_ORIGINS: z.string().optional(),

  // Rate Limiting
  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  // Performance Tuning
  DB_MAX_CONNECTIONS: z.coerce.number().default(10),
  DB_MIN_CONNECTIONS: z.coerce.number().default(2),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  PRISMA_LOG_LEVEL: z.enum(['query', 'info', 'warn', 'error']).default('warn'),

  // Monitoring (optional)
  SENTRY_DSN: z.string().optional(),
  PROMETHEUS_ENABLED: z.coerce.boolean().default(false),
});

/**
 * Validate và parse environment variables
 * Throws validation error nếu required vars missing
 */
export function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues || [];
      const missingVars = issues
        .filter(err => err.code === 'invalid_type' && (err as any).received === 'undefined')
        .map(err => err.path.join('.'));
      
      const invalidVars = issues
        .filter(err => err.code !== 'invalid_type' || (err as any).received !== 'undefined')
        .map(err => `${err.path.join('.')}: ${err.message}`);

      let errorMessage = 'Environment validation failed:\n';
      
      if (missingVars.length > 0) {
        errorMessage += `Missing required variables: ${missingVars.join(', ')}\n`;
      }
      
      if (invalidVars.length > 0) {
        errorMessage += `Invalid variables: ${invalidVars.join(', ')}\n`;
      }

      throw new Error(errorMessage);
    }
    throw error;
  }
}

// Validated environment variables
export const ENV = validateEnv();

export type ValidatedEnv = z.infer<typeof envSchema>;