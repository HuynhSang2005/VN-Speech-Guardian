/**
 * Mục đích: Authentication & Authorization configuration
 * Sử dụng: Centralize auth settings cho Clerk integration
 */

export const AUTH_CONFIG = {
  // Clerk Configuration
  CLERK: {
    SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
    JWT_KEY: process.env.CLERK_JWT_KEY || '',
    WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || '',
    JWT_ISSUER: process.env.CLERK_JWT_ISSUER || 'https://clerk.dev',
  },

  // JWT Configuration
  JWT: {
    EXPIRATION: process.env.JWT_EXPIRATION || '7d',
    REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '30d',
    ALGORITHM: 'HS256' as const,
    ISSUER: 'vn-speech-guardian',
    AUDIENCE: 'vsg-api',
  },

  // Session Management
  SESSION: {
    COOKIE_NAME: 'vsg-session',
    COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    COOKIE_SECURE: process.env.NODE_ENV === 'production',
    COOKIE_HTTP_ONLY: true,
    COOKIE_SAME_SITE: 'lax' as const,
  },

  // Rate Limiting cho Auth endpoints
  RATE_LIMIT: {
    LOGIN: {
      TTL: 15 * 60 * 1000, // 15 minutes
      LIMIT: 5,            // 5 attempts per TTL
    },
    REGISTER: {
      TTL: 60 * 60 * 1000, // 1 hour 
      LIMIT: 3,            // 3 attempts per TTL
    },
    PASSWORD_RESET: {
      TTL: 60 * 60 * 1000, // 1 hour
      LIMIT: 3,            // 3 attempts per TTL
    },
  },
} as const;

export type AuthConfig = typeof AUTH_CONFIG;