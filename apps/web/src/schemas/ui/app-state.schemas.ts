/**
 * UI State schemas cho VN Speech Guardian Frontend
 * Zod schemas cho app state, notifications, settings validation
 */

import { z } from 'zod';

// =============================================================================
// Audio Processing Schemas
// =============================================================================

export const AudioConfigSchema = z.object({
  sampleRate: z.number().positive().default(16000), // 16kHz for speech recognition
  channels: z.number().int().positive().max(2).default(1), // Mono for optimal processing
  bitDepth: z.number().int().positive().default(16), // 16-bit PCM
  chunkSize: z.number().int().positive().default(4096), // Buffer size in samples
  vadThreshold: z.number().min(0).max(1).default(0.5), // Voice Activity Detection threshold
});

export const AudioChunkSchema = z.object({
  data: z.instanceof(Float32Array),
  timestamp: z.number().positive(),
  sequenceNumber: z.number().int().nonnegative(),
  isFinal: z.boolean().default(false),
});

export const WordSegmentSchema = z.object({
  word: z.string().min(1),
  start: z.number().nonnegative(), // Word start time in ms
  end: z.number().nonnegative(), // Word end time in ms
  confidence: z.number().min(0).max(1),
}).superRefine(({ start, end }, ctx) => {
  if (end <= start) {
    ctx.addIssue({
      code: 'custom',
      message: 'End time must be greater than start time',
      path: ['end'],
    });
  }
});

export const TranscriptionResultSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  startTime: z.number().nonnegative(),
  endTime: z.number().nonnegative(),
  words: z.array(WordSegmentSchema).optional(),
  language: z.enum(['vi', 'en']).default('vi'),
}).superRefine(({ startTime, endTime }, ctx) => {
  if (endTime <= startTime) {
    ctx.addIssue({
      code: 'custom',
      message: 'End time must be greater than start time',
      path: ['endTime'],
    });
  }
});

// =============================================================================
// Content Moderation Schemas
// =============================================================================

export const DetectionLabelSchema = z.enum([
  'SAFE',
  'OFFENSIVE',
  'HATE_SPEECH',
  'TOXIC',
  'SPAM',
  'INAPPROPRIATE',
]);

export const DetectionSeveritySchema = z.enum(['low', 'medium', 'high']);

export const DetectionResultSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  label: DetectionLabelSchema,
  score: z.number().min(0).max(1),
  snippet: z.string().min(1),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
  timestamp: z.date(),
  severity: DetectionSeveritySchema,
}).superRefine(({ startMs, endMs }, ctx) => {
  if (endMs <= startMs) {
    ctx.addIssue({
      code: 'custom',
      message: 'End time must be greater than start time',
      path: ['endMs'],
    });
  }
});

export const ModerationConfigSchema = z.object({
  blockThreshold: z.number().min(0).max(1).default(0.8),
  warnThreshold: z.number().min(0).max(1).default(0.5),
  enableRealTime: z.boolean().default(true),
  hysteresisWindow: z.number().int().positive().default(3),
}).superRefine(({ warnThreshold, blockThreshold }, ctx) => {
  if (blockThreshold <= warnThreshold) {
    ctx.addIssue({
      code: 'custom',
      message: 'Block threshold must be higher than warn threshold',
      path: ['blockThreshold'],
    });
  }
});

// =============================================================================
// Session Management Schemas  
// =============================================================================

export const SessionStatusSchema = z.enum(['active', 'paused', 'completed', 'error']);

export const SessionMetadataSchema = z.object({
  userAgent: z.string(),
  ipAddress: z.string().optional(),
  duration: z.number().nonnegative(), // Total session duration in ms
  audioProcessed: z.number().nonnegative(), // Total audio processed in ms
  detectionCount: z.record(DetectionLabelSchema, z.number().int().nonnegative()),
  averageConfidence: z.number().min(0).max(1),
});

export const SessionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: SessionStatusSchema,
  audioConfig: AudioConfigSchema,
  moderationConfig: ModerationConfigSchema,
  transcriptions: z.array(TranscriptionResultSchema),
  detections: z.array(DetectionResultSchema),
  metadata: SessionMetadataSchema,
});

// =============================================================================
// UI State Schemas
// =============================================================================

// Notification schemas
export const NotificationTypeSchema = z.enum(['success', 'warning', 'error', 'info']);

export const NotificationActionSchema = z.object({
  label: z.string().min(1),
  onClick: z.function(),
  variant: z.enum(['primary', 'secondary', 'danger']).optional(),
});

export const NotificationSchema = z.object({
  id: z.string().min(1),
  type: NotificationTypeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.date(),
  autoClose: z.number().positive().optional(),
  actions: z.array(NotificationActionSchema).optional(),
});

// User settings schemas
export const UserSettingsSchema = z.object({
  audioConfig: AudioConfigSchema,
  moderationConfig: ModerationConfigSchema,
  notifications: z.object({
    realTimeAlerts: z.boolean().default(true),
    soundEnabled: z.boolean().default(true),
    desktopNotifications: z.boolean().default(false),
  }),
  display: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    compactMode: z.boolean().default(false),
    showConfidenceScores: z.boolean().default(true),
  }),
  privacy: z.object({
    storeTranscriptions: z.boolean().default(true),
    anonymousMode: z.boolean().default(false),
    dataRetention: z.number().int().positive().max(365).default(30), // Days
  }),
});

// App state schema
export const AppStateSchema = z.object({
  // Session state
  currentSession: SessionSchema.nullable(),
  isRecording: z.boolean().default(false),
  isProcessing: z.boolean().default(false),
  
  // UI state
  theme: z.enum(['light', 'dark']).default('light'),
  sidebarOpen: z.boolean().default(true),
  notifications: z.array(NotificationSchema).default([]),
  
  // Audio state
  audioLevel: z.number().min(0).max(100).default(0), // Current microphone level 0-100
  vadActive: z.boolean().default(false), // Voice Activity Detection
  
  // Settings
  settings: UserSettingsSchema,
});

// =============================================================================
// API Communication Schemas
// =============================================================================

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  timestamp: z.date(),
  requestId: z.string().min(1),
});

export const StreamingResponseStatusSchema = z.enum(['processing', 'partial', 'final', 'error']);

export const StreamingResponseSchema = z.object({
  status: StreamingResponseStatusSchema,
  sessionId: z.string().min(1),
  transcription: z.object({
    id: z.string().optional(),
    text: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    startTime: z.number().nonnegative().optional(),
    endTime: z.number().nonnegative().optional(),
    words: z.array(WordSegmentSchema).optional(),
    language: z.enum(['vi', 'en']).optional(),
  }).optional(),
  detection: DetectionResultSchema.optional(),
  error: z.string().optional(),
});

// WebSocket event schemas
export const SocketEventSchema = z.enum([
  'session:start',
  'session:end',
  'audio:chunk',
  'transcription:partial',
  'transcription:final',
  'detection:alert',
  'error'
]);

export const SocketMessageSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  event: SocketEventSchema,
  sessionId: z.string().min(1),
  data: dataSchema,
  timestamp: z.number().positive(),
});

// =============================================================================
// Component Props Schemas
// =============================================================================

export const BaseComponentPropsSchema = z.object({
  className: z.string().optional(),
  children: z.any().optional(), // ReactNode type
  testId: z.string().optional(),
});

export const AudioVisualizerPropsSchema = BaseComponentPropsSchema.extend({
  audioLevel: z.number().min(0).max(100),
  isRecording: z.boolean(),
  isProcessing: z.boolean(),
  detectionState: DetectionLabelSchema,
  size: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
  animated: z.boolean().default(true),
});

export const TranscriptionDisplayPropsSchema = BaseComponentPropsSchema.extend({
  transcriptions: z.array(TranscriptionResultSchema),
  showConfidence: z.boolean().default(false),
  highlightDetections: z.boolean().default(true),
  maxHeight: z.number().positive().optional(),
  autoScroll: z.boolean().default(true),
});

export const DetectionAlertPropsSchema = BaseComponentPropsSchema.extend({
  detection: DetectionResultSchema,
  onDismiss: z.function().optional(),
  onBlock: z.function().optional(),
  showActions: z.boolean().default(true),
});

// =============================================================================
// Error Handling Schemas
// =============================================================================

export const ErrorCodeSchema = z.enum([
  'AUDIO_PERMISSION_DENIED',
  'AUDIO_DEVICE_ERROR',
  'WEBSOCKET_CONNECTION_FAILED',
  'API_REQUEST_FAILED',
  'SESSION_EXPIRED',
  'INVALID_AUDIO_FORMAT',
  'PROCESSING_TIMEOUT',
  'QUOTA_EXCEEDED',
]);

export const AppErrorSchema = z.object({
  name: z.string().default('AppError'),
  message: z.string().min(1),
  code: ErrorCodeSchema,
  context: z.record(z.any()).optional(),
  timestamp: z.date(),
  sessionId: z.string().optional(),
  stack: z.string().optional(),
});

// =============================================================================
// Audio Worklet Schemas
// =============================================================================

export const AudioWorkletMessageTypeSchema = z.enum(['audio-data', 'vad-result', 'error', 'config']);

export const AudioWorkletMessageSchema = z.object({
  type: AudioWorkletMessageTypeSchema,
  data: z.any(),
  timestamp: z.number().positive(),
});

export const VADResultSchema = z.object({
  isVoice: z.boolean(),
  energy: z.number().nonnegative(),
  timestamp: z.number().positive(),
});

// =============================================================================
// Type Exports - Consistent với Original Interface Names  
// =============================================================================

export type TAudioConfig = z.infer<typeof AudioConfigSchema>;
export type TAudioChunk = z.infer<typeof AudioChunkSchema>;
export type TWordSegment = z.infer<typeof WordSegmentSchema>;
export type TTranscriptionResult = z.infer<typeof TranscriptionResultSchema>;

export type TDetectionLabel = z.infer<typeof DetectionLabelSchema>;
export type TDetectionSeverity = z.infer<typeof DetectionSeveritySchema>;
export type TDetectionResult = z.infer<typeof DetectionResultSchema>;
export type TModerationConfig = z.infer<typeof ModerationConfigSchema>;

export type TSessionStatus = z.infer<typeof SessionStatusSchema>;
export type TSessionMetadata = z.infer<typeof SessionMetadataSchema>;
export type TSession = z.infer<typeof SessionSchema>;

export type TNotificationType = z.infer<typeof NotificationTypeSchema>;
export type TNotificationAction = z.infer<typeof NotificationActionSchema>;
export type TNotification = z.infer<typeof NotificationSchema>;
export type TUserSettings = z.infer<typeof UserSettingsSchema>;
export type TAppState = z.infer<typeof AppStateSchema>;

export type TApiResponseData<T = any> = z.infer<ReturnType<typeof ApiResponseSchema>> & {
  data?: T;
};
export type TStreamingResponse = z.infer<typeof StreamingResponseSchema>;
export type TSocketEvent = z.infer<typeof SocketEventSchema>;
export type TSocketMessageData<T = any> = z.infer<ReturnType<typeof SocketMessageSchema>> & {
  data: T;
};

export type TBaseComponentProps = z.infer<typeof BaseComponentPropsSchema>;
export type TAudioVisualizerProps = z.infer<typeof AudioVisualizerPropsSchema>;
export type TTranscriptionDisplayProps = z.infer<typeof TranscriptionDisplayPropsSchema>;
export type TDetectionAlertProps = z.infer<typeof DetectionAlertPropsSchema>;

export type TErrorCode = z.infer<typeof ErrorCodeSchema>;
export type TAppError = z.infer<typeof AppErrorSchema>;

export type TAudioWorkletMessageType = z.infer<typeof AudioWorkletMessageTypeSchema>;
export type TAudioWorkletMessage = z.infer<typeof AudioWorkletMessageSchema>;
export type TVADResult = z.infer<typeof VADResultSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate app state and return safe defaults on error
 */
export function validateAppState(data: unknown): TAppState {
  const result = AppStateSchema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  // Return safe defaults nếu validation fails
  console.warn('App state validation failed, using defaults:', result.error.issues);
  
  return {
    currentSession: null,
    isRecording: false,
    isProcessing: false,
    theme: 'light',
    sidebarOpen: true,
    notifications: [],
    audioLevel: 0,
    vadActive: false,
    settings: {
      audioConfig: {
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        chunkSize: 4096,
        vadThreshold: 0.5,
      },
      moderationConfig: {
        blockThreshold: 0.8,
        warnThreshold: 0.5,
        enableRealTime: true,
        hysteresisWindow: 3,
      },
      notifications: {
        realTimeAlerts: true,
        soundEnabled: true,
        desktopNotifications: false,
      },
      display: {
        theme: 'system',
        compactMode: false,
        showConfidenceScores: true,
      },
      privacy: {
        storeTranscriptions: true,
        anonymousMode: false,
        dataRetention: 30,
      },
    },
  };
}

/**
 * Create validated notification object
 */
export function createNotification(
  type: TNotificationType,
  title: string,
  message: string,
  options?: Partial<TNotification>
): TNotification {
  return {
    id: options?.id || `notification-${Date.now()}`,
    type,
    title,
    message,
    timestamp: new Date(),
    autoClose: options?.autoClose,
    actions: options?.actions,
  };
}

/**
 * Validate detection severity and return appropriate UI styling
 */
export function getDetectionUIConfig(detection: TDetectionResult): {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
} {
  const configs = {
    low: {
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: '⚠️',
    },
    medium: {
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: '🚨',
    },
    high: {
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: '🚫',
    },
  };
  
  return configs[detection.severity];
}

// =============================================================================
// Constants for UI
// =============================================================================

export const UI_CONSTANTS = {
  AUDIO: {
    MIN_SAMPLE_RATE: 8000,
    MAX_SAMPLE_RATE: 48000,
    DEFAULT_SAMPLE_RATE: 16000,
    MIN_CHUNK_SIZE: 1024,
    MAX_CHUNK_SIZE: 8192,
    DEFAULT_CHUNK_SIZE: 4096,
  },
  
  MODERATION: {
    MIN_THRESHOLD: 0.1,
    MAX_THRESHOLD: 1.0,
    DEFAULT_WARN_THRESHOLD: 0.5,
    DEFAULT_BLOCK_THRESHOLD: 0.8,
  },
  
  SESSION: {
    MAX_DURATION_MS: 3600000, // 1 hour
    MAX_TRANSCRIPTIONS: 1000,
    MAX_DETECTIONS: 500,
  },
  
  NOTIFICATIONS: {
    DEFAULT_AUTO_CLOSE: 5000, // 5 seconds
    MAX_NOTIFICATIONS: 10,
  },
} as const;