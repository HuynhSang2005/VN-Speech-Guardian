/**
 * Mục đích: AI Worker service configuration constants
 * Sử dụng: Thay thế static configs trong AiWorkerService
 */

export const AI_WORKER_CONFIG = {
  // Service Connection
  SERVICE: {
    BASE_URL: process.env.AI_SERVICE_BASE_URL || 'http://localhost:8001',
    API_KEY: process.env.GATEWAY_API_KEY || 'dev-secret',
    TIMEOUT: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),
  },

  // HTTP Connection Pooling - MVP optimized
  CONNECTION_POOL: {
    MAX_SOCKETS: 3,           // MVP: handle 1-3 concurrent sessions
    MAX_FREE_SOCKETS: 2,      // Keep connections alive
    TIMEOUT: 30000,           // 30s connection timeout
    FREE_SOCKET_TIMEOUT: 15000, // 15s keepalive timeout
    KEEP_ALIVE: true,         // Enable connection reuse
    SCHEDULING: 'lifo' as const, // LIFO scheduling for better cache locality
  },

  // Retry Logic
  RETRY: {
    MAX_RETRIES: 3,
    BASE_DELAY_MS: 100,
    BACKOFF_MULTIPLIER: 2,
    MAX_DELAY_MS: 1000,
    RETRYABLE_STATUS_CODES: [408, 429, 502, 503, 504],
    RETRYABLE_ERROR_CODES: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
  },

  // Adaptive Buffering - MVP tuned
  BUFFER: {
    INITIAL_SIZE: 4096,       // 4KB default
    MIN_SIZE: 2048,           // 2KB minimum
    MAX_SIZE: 16384,          // 16KB maximum cho MVP
    HISTORY_SIZE: 10,         // 10-metric rolling window
    LATENCY_THRESHOLDS: {
      LOW: 50,                // <50ms = good network
      HIGH: 200,              // >200ms = slow network
    },
    THROUGHPUT_THRESHOLDS: {
      LOW: 50000,             // <50KB/s = slow throughput  
      HIGH: 500000,           // >500KB/s = fast throughput
    },
  },

  // Smart Chunking - MVP optimized
  CHUNKING: {
    MIN_CHUNK_SIZE: 1024,     // 1KB minimum
    MAX_CHUNK_SIZE: 8192,     // 8KB maximum cho MVP
    DEFAULT_CHUNK_SIZE: 2048, // 2KB default
    BUFFER_SIZE_RATIO: 0.4,   // 40% of buffer size
    TARGET_LATENCY: 100,      // 100ms target
    AI_PROCESSING_BUFFER: 50, // 50ms buffer cho AI processing
  },
} as const;

export type AiWorkerConfig = typeof AI_WORKER_CONFIG;