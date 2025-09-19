/**
 * Mục đích: Database configuration cho Prisma
 * Sử dụng: Centralize DB settings và connection pooling
 */

export const DATABASE_CONFIG = {
  // Prisma Configuration
  PRISMA: {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/vsg_dev',
    DIRECT_URL: process.env.DIRECT_DATABASE_URL, // For migrations
    LOG_QUERIES: process.env.NODE_ENV === 'development',
    LOG_LEVEL: process.env.PRISMA_LOG_LEVEL || 'warn',
  },

  // Connection Pooling
  CONNECTION_POOL: {
    MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    MIN_CONNECTIONS: parseInt(process.env.DB_MIN_CONNECTIONS || '2', 10),
    CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10), // 30s
    IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT || '600000', 10), // 10m
  },

  // Transaction Configuration  
  TRANSACTION: {
    MAX_WAIT: parseInt(process.env.DB_TX_MAX_WAIT || '5000', 10), // 5s
    TIMEOUT: parseInt(process.env.DB_TX_TIMEOUT || '10000', 10), // 10s
    ISOLATION_LEVEL: 'ReadCommitted' as const,
  },

  // Query Performance
  PERFORMANCE: {
    SLOW_QUERY_THRESHOLD: parseInt(process.env.DB_SLOW_QUERY_MS || '1000', 10), // 1s
    ENABLE_QUERY_LOGGING: process.env.DB_ENABLE_QUERY_LOG === 'true',
    MAX_QUERY_EXECUTION_TIME: parseInt(process.env.DB_MAX_QUERY_TIME || '30000', 10), // 30s
  },
} as const;

export type DatabaseConfig = typeof DATABASE_CONFIG;