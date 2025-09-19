/**
 * Mục đích: Centralized app configuration constants
 * Sử dụng: Import thay vì hardcode values trong service files
 */

export const APP_CONFIG = {
  // HTTP Server Configuration
  HTTP: {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || '0.0.0.0',
    GLOBAL_PREFIX: 'api',
    CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  },

  // WebSocket Configuration  
  WEBSOCKET: {
    NAMESPACE: '/audio',
    CORS: {
      origin: process.env.WS_CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
  },

  // Rate Limiting
  THROTTLE: {
    TTL: parseInt(process.env.THROTTLE_TTL || '60000', 10), // 1 minute in ms
    LIMIT: parseInt(process.env.THROTTLE_LIMIT || '100', 10), // requests per TTL
  },

  // Session Configuration
  SESSION: {
    BUFFER_CLEANUP_INTERVAL: 30000, // 30 seconds
    MAX_SESSION_DURATION: 3600000, // 1 hour
  },
} as const;

export type AppConfig = typeof APP_CONFIG;