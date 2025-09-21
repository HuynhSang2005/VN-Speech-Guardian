/**
 * Constants & configuration values cho VN Speech Guardian
 * Centralized constants theo frontend.instructions.md patterns
 */

// =============================================================================
// Audio Configuration Constants
// =============================================================================

export const AUDIO_CONFIG = {
  // Sample rates supported
  SAMPLE_RATES: {
    SPEECH_RECOGNITION: 16000,   // Optimal cho speech-to-text
    HIGH_QUALITY: 44100,         // CD quality
    PHONE_QUALITY: 8000,         // Phone call quality
  } as const,
  
  // Audio processing parameters
  CHUNK_SIZE: 4096,              // Buffer size in samples
  CHANNELS: 1,                   // Mono audio cho speech processing
  BIT_DEPTH: 16,                 // 16-bit PCM
  
  // Voice Activity Detection
  VAD: {
    THRESHOLD: 0.3,              // Energy threshold 0-1
    WINDOW_SIZE: 1024,           // Analysis window in samples
    SILENCE_DURATION: 2000,      // Silence timeout in ms
    MIN_SPEECH_DURATION: 100,    // Minimum speech length in ms
  },
  
  // Audio constraints cho getUserMedia
  CONSTRAINTS: {
    audio: {
      channelCount: 1,
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  },
} as const

// =============================================================================
// Detection & Moderation Constants  
// =============================================================================

export const MODERATION_CONFIG = {
  // Classification thresholds
  THRESHOLDS: {
    BLOCK: 0.8,                  // Auto-block threshold
    WARN: 0.5,                   // Warning threshold
    SAFE: 0.2,                   // Safe content threshold
  },
  
  // Hysteresis parameters cho smooth detection
  HYSTERESIS: {
    WINDOW_SIZE: 5,              // Decision window size
    CONFIRM_COUNT: 3,            // Confirmations needed
    RESET_COUNT: 2,              // Resets needed to clear
  },
  
  // Detection labels với Vietnamese descriptions
  LABELS: {
    SAFE: { 
      label: 'An toàn', 
      color: 'success',
      severity: 'low' 
    },
    OFFENSIVE: { 
      label: 'Xúc phạm', 
      color: 'warning',
      severity: 'medium' 
    },
    HATE_SPEECH: { 
      label: 'Lời nói thù hận', 
      color: 'danger',
      severity: 'high' 
    },
    TOXIC: { 
      label: 'Độc hại', 
      color: 'danger',
      severity: 'high' 
    },
    SPAM: { 
      label: 'Spam', 
      color: 'warning',
      severity: 'low' 
    },
    INAPPROPRIATE: { 
      label: 'Không phù hợp', 
      color: 'warning',
      severity: 'medium' 
    },
  },
} as const

// =============================================================================
// UI Constants - Theme & Layout
// =============================================================================

export const UI_CONFIG = {
  // Breakpoints (matching TailwindCSS)
  BREAKPOINTS: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
  
  // Z-index layers
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080,
  },
  
  // Animation durations
  ANIMATION: {
    FAST: 150,                   // Fast transitions
    NORMAL: 300,                 // Normal transitions  
    SLOW: 500,                   // Slow transitions
    AUDIO_PULSE: 2000,           // Audio visualizer pulse
  },
  
  // Component sizes
  SIZES: {
    AUDIO_VISUALIZER: {
      sm: 120,
      md: 200,
      lg: 300,
      xl: 400,
    },
    SIDEBAR_WIDTH: 280,
    HEADER_HEIGHT: 64,
  },
} as const

// =============================================================================
// API Configuration Constants
// =============================================================================

export const API_CONFIG = {
  // Endpoints
  ENDPOINTS: {
    BASE: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
    WS: import.meta.env.VITE_WS_URL || 'ws://localhost:4000',
    
    // REST endpoints
    SESSIONS: '/api/sessions',
    TRANSCRIPTIONS: '/api/transcriptions', 
    DETECTIONS: '/api/detections',
    STATS: '/api/stats',
    HEALTH: '/api/health',
    
    // WebSocket events
    WS_EVENTS: {
      SESSION_START: 'session:start',
      SESSION_END: 'session:end',  
      AUDIO_CHUNK: 'audio:chunk',
      TRANSCRIPTION_PARTIAL: 'transcription:partial',
      TRANSCRIPTION_FINAL: 'transcription:final',
      DETECTION_ALERT: 'detection:alert',
      ERROR: 'error',
    },
  },
  
  // Request configuration
  REQUEST: {
    TIMEOUT: 10000,              // 10s timeout
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,           // 1s delay between retries
    
    // Headers
    HEADERS: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  },
  
  // WebSocket configuration
  WEBSOCKET: {
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 2000,       // 2s delay
    HEARTBEAT_INTERVAL: 30000,   // 30s heartbeat
    CONNECTION_TIMEOUT: 5000,    // 5s connection timeout
  },
} as const

// =============================================================================
// Storage Constants - LocalStorage & SessionStorage
// =============================================================================

export const STORAGE_KEYS = {
  // User preferences
  USER_SETTINGS: 'vn-speech-guardian:user-settings',
  AUDIO_CONFIG: 'vn-speech-guardian:audio-config',
  MODERATION_CONFIG: 'vn-speech-guardian:moderation-config',
  
  // Session data
  CURRENT_SESSION: 'vn-speech-guardian:current-session',
  SESSION_HISTORY: 'vn-speech-guardian:session-history',
  
  // UI state
  THEME: 'vn-speech-guardian:theme',
  SIDEBAR_STATE: 'vn-speech-guardian:sidebar-state',
  
  // Cache
  TRANSCRIPTION_CACHE: 'vn-speech-guardian:transcription-cache',
  DETECTION_CACHE: 'vn-speech-guardian:detection-cache',
} as const

// =============================================================================
// Error Messages - Vietnamese Localization
// =============================================================================

export const ERROR_MESSAGES = {
  // Audio errors
  AUDIO_PERMISSION_DENIED: 'Quyền truy cập microphone bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt.',
  AUDIO_DEVICE_ERROR: 'Không thể truy cập thiết bị audio. Kiểm tra microphone và thử lại.',
  AUDIO_NOT_SUPPORTED: 'Trình duyệt không hỗ trợ ghi âm. Vui lòng sử dụng Chrome, Firefox hoặc Safari.',
  
  // Connection errors
  WEBSOCKET_CONNECTION_FAILED: 'Không thể kết nối tới server. Kiểm tra kết nối mạng.',
  API_REQUEST_FAILED: 'Yêu cầu API thất bại. Vui lòng thử lại.',
  CONNECTION_TIMEOUT: 'Kết nối timeout. Kiểm tra mạng và thử lại.',
  
  // Session errors
  SESSION_EXPIRED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  SESSION_NOT_FOUND: 'Không tìm thấy phiên làm việc.',
  INVALID_SESSION_DATA: 'Dữ liệu phiên không hợp lệ.',
  
  // Processing errors  
  PROCESSING_TIMEOUT: 'Xử lý audio timeout. Thử với file ngắn hơn.',
  INVALID_AUDIO_FORMAT: 'Định dạng audio không được hỗ trợ.',
  QUOTA_EXCEEDED: 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau.',
  
  // Generic errors
  UNKNOWN_ERROR: 'Lỗi không xác định. Vui lòng liên hệ hỗ trợ.',
  NETWORK_ERROR: 'Lỗi kết nối mạng. Kiểm tra internet và thử lại.',
} as const

// =============================================================================
// Success Messages - Vietnamese Localization  
// =============================================================================

export const SUCCESS_MESSAGES = {
  SESSION_STARTED: 'Đã bắt đầu phiên ghi âm mới',
  SESSION_ENDED: 'Đã kết thúc phiên ghi âm',
  AUDIO_PERMISSION_GRANTED: 'Đã cấp quyền truy cập microphone',
  SETTINGS_SAVED: 'Đã lưu cài đặt',
  TRANSCRIPTION_COMPLETE: 'Hoàn thành chuyển đổi giọng nói sang văn bản',
  DETECTION_COMPLETE: 'Hoàn thành phân tích nội dung',
} as const

// =============================================================================
// Development Constants
// =============================================================================

export const DEV_CONFIG = {
  // Logging levels
  LOG_LEVELS: {
    ERROR: 0,
    WARN: 1, 
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
  },
  
  // Debug flags
  DEBUG: {
    AUDIO: import.meta.env.DEV,
    WEBSOCKET: import.meta.env.DEV,
    API: import.meta.env.DEV,
    RENDERING: false,
  },
  
  // Mock data flags
  USE_MOCK_DATA: import.meta.env.DEV && false,
  MOCK_DELAY: 1000,            // Mock response delay
} as const

// =============================================================================
// Feature Flags - Progressive Enhancement
// =============================================================================

export const FEATURE_FLAGS = {
  // Experimental features
  REACT_COMPILER: false,        // React 19 compiler
  CONCURRENT_FEATURES: true,    // React concurrent features
  
  // Audio features
  NOISE_CANCELLATION: true,     // Advanced noise cancellation
  REAL_TIME_VAD: true,          // Real-time voice activity detection
  
  // Detection features
  ADVANCED_MODERATION: true,    // Enhanced content moderation
  SENTIMENT_ANALYSIS: false,    // Sentiment analysis (future)
  
  // UI features
  DARK_MODE: true,              // Dark theme support
  KEYBOARD_SHORTCUTS: true,     // Keyboard navigation
  ACCESSIBILITY: true,          // Enhanced accessibility
  
  // Performance features
  SERVICE_WORKER: false,        // Offline support (future)
  BACKGROUND_PROCESSING: false, // Background audio processing
} as const

// =============================================================================
// Export all constants  
// =============================================================================

export const CONSTANTS = {
  AUDIO_CONFIG,
  MODERATION_CONFIG,
  UI_CONFIG,
  API_CONFIG,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DEV_CONFIG,
  FEATURE_FLAGS,
} as const

// Type helpers cho constants
export type TAudioConfig = typeof AUDIO_CONFIG
export type TModerationConfig = typeof MODERATION_CONFIG  
export type TUIConfig = typeof UI_CONFIG
export type TAPIConfig = typeof API_CONFIG