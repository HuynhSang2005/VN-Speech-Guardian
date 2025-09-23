/**
 * Sessions API schemas cho VN Speech Guardian Frontend
 * Mirror backend sessions.model.ts và related schemas để maintain consistency
 */

import { z } from 'zod';

// =============================================================================
// Base Session Schema - Mirror Backend SessionSchema
// =============================================================================

export const SessionSchema = z.object({
  id: z.string().uuid('Invalid session ID'),
  userId: z.string().uuid('Invalid user ID'),
  device: z.string().max(100, 'Device name too long').optional(),
  lang: z.enum(['vi', 'en', 'auto']).default('vi'),
  startedAt: z.string().datetime('Invalid start date'),
  endedAt: z.string().datetime('Invalid end date').nullable().optional(),
});

// =============================================================================
// Transcript Schema - Mirror Backend TranscriptSchema
// =============================================================================

export const TranscriptSchema = z.object({
  id: z.string().uuid('Invalid transcript ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  segIdx: z.number().int().nonnegative('Invalid segment index'),
  text: z.string().min(1, 'Transcript text cannot be empty'),
  startMs: z.number().nonnegative('Invalid start time'),
  endMs: z.number().nonnegative('Invalid end time'),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1').optional(),
  speakerId: z.string().optional(), // Speaker diarization
}).superRefine(({ startMs, endMs }, ctx) => {
  if (endMs <= startMs) {
    ctx.addIssue({
      code: 'custom',
      message: 'End time must be greater than start time',
      path: ['endMs'],
    });
  }
});

// =============================================================================
// Detection Schema - Speech Content Moderation
// =============================================================================

export const DetectionSchema = z.object({
  id: z.string().uuid('Invalid detection ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  transcriptId: z.string().uuid('Invalid transcript ID').optional(),
  type: z.enum(['CLEAN', 'OFFENSIVE', 'HATE', 'TOXIC', 'SPAM']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
  snippet: z.string().min(1, 'Detection snippet cannot be empty'),
  context: z.string().optional(), // Surrounding text context
  startMs: z.number().nonnegative('Invalid start time'),
  endMs: z.number().nonnegative('Invalid end time'),
  modelVersion: z.string().optional(), // AI model version used
  reviewedBy: z.string().uuid().optional(), // Manual review by moderator
  reviewedAt: z.string().datetime().optional(),
  reviewStatus: z.enum(['PENDING', 'CONFIRMED', 'DISPUTED', 'FALSE_POSITIVE']).default('PENDING'),
  recommendedAction: z.enum(['LOG', 'WARN', 'BLOCK', 'ESCALATE']),
  createdAt: z.string().datetime(),
}).superRefine(({ startMs, endMs }, ctx) => {
  if (endMs <= startMs) {
    ctx.addIssue({
      code: 'custom',
      message: 'End time must be greater than start time',
      path: ['endMs'],
    });
  }
});

// =============================================================================
// API Request Schemas
// =============================================================================

// Create Session Request - Mirror backend CreateSessionSchema
export const CreateSessionRequestSchema = SessionSchema.pick({
  device: true,
  lang: true,
}).extend({
  name: z.string().min(1, 'Session name is required').max(100, 'Session name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

// List Sessions Query Schema - Mirror backend ListSessionsQuerySchema
export const ListSessionsQuerySchema = z.object({
  page: z.coerce.number().int().positive('Page must be positive').default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Limit must be between 1 and 100').default(20),
  userId: z.string().uuid().optional(),
  lang: z.enum(['vi', 'en', 'auto']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  hasDetections: z.coerce.boolean().optional(), // Filter sessions with/without detections
  sortBy: z.enum(['startedAt', 'endedAt', 'duration', 'detectionCount']).default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).superRefine(({ dateFrom, dateTo }, ctx) => {
  if (dateFrom && dateTo && new Date(dateFrom) >= new Date(dateTo)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Date from must be before date to',
      path: ['dateTo'],
    });
  }
});

// Update Session Request
export const UpdateSessionRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  endedAt: z.string().datetime().optional(),
}).strict();

// Get Transcripts Query
export const GetTranscriptsQuerySchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  includeEmpty: z.coerce.boolean().default(false), // Include empty transcript segments
});

// Get Detections Query  
export const GetDetectionsQuerySchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  type: z.enum(['CLEAN', 'OFFENSIVE', 'HATE', 'TOXIC', 'SPAM']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  reviewStatus: z.enum(['PENDING', 'CONFIRMED', 'DISPUTED', 'FALSE_POSITIVE']).optional(),
  confidenceMin: z.number().min(0).max(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// =============================================================================
// API Response Schemas
// =============================================================================

// Standard API Response wrapper
const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema,
  meta: z.object({
    timestamp: z.string().datetime(),
    requestId: z.string().uuid().optional(),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(), 
      total: z.number().int().nonnegative(),
      pages: z.number().int().nonnegative(),
    }).optional(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
});

// Enhanced Session Response với computed fields
export const SessionResponseSchema = SessionSchema.extend({
  name: z.string().optional(),
  description: z.string().optional(),
  // Computed fields from backend
  duration: z.number().nonnegative().optional(), // Duration in seconds
  transcriptCount: z.number().int().nonnegative().default(0),
  detectionCount: z.number().int().nonnegative().default(0),
  toxicityScore: z.number().min(0).max(1).optional(), // Average toxicity score
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ERROR']).default('ACTIVE'),
  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Session List Response
export const SessionListResponseSchema = ApiResponseSchema(z.array(SessionResponseSchema));

// Single Session Response
export const SessionDetailResponseSchema = ApiResponseSchema(SessionResponseSchema);

// Transcript List Response
export const TranscriptListResponseSchema = ApiResponseSchema(z.array(TranscriptSchema));

// Detection List Response
export const DetectionListResponseSchema = ApiResponseSchema(z.array(DetectionSchema));

// Create Session Response
export const CreateSessionResponseSchema = ApiResponseSchema(SessionResponseSchema);

// =============================================================================
// Real-time Event Schemas (WebSocket)
// =============================================================================

// Audio Chunk Data từ client
export const AudioChunkDataSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  chunk: z.instanceof(ArrayBuffer),
  sequence: z.number().int().nonnegative('Invalid sequence number'),
  timestamp: z.number().positive('Invalid timestamp'),
  final: z.boolean().default(false), // End of stream marker
  sampleRate: z.number().positive().default(16000),
  channels: z.number().int().positive().default(1),
});

// Real-time transcript events từ server
export const TranscriptPartialEventSchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  timestamp: z.number().positive(),
  isPartial: z.boolean().default(true),
});

export const TranscriptFinalEventSchema = TranscriptPartialEventSchema.extend({
  isPartial: z.literal(false),
  transcript: TranscriptSchema, // Full transcript object
});

// Real-time detection events từ server
export const DetectionEventSchema = z.object({
  sessionId: z.string().uuid(),
  detection: DetectionSchema,
  timestamp: z.number().positive(),
  action: z.enum(['CREATED', 'UPDATED', 'REVIEWED']),
});

// Session status events
export const SessionStatusEventSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ERROR']),
  progress: z.number().min(0).max(100).optional(), // Processing progress
  message: z.string().optional(), // Status message
  timestamp: z.number().positive(),
});

// WebSocket Error events
export const WebSocketErrorEventSchema = z.object({
  sessionId: z.string().uuid().optional(),
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  timestamp: z.number().positive(),
});

// =============================================================================
// Type Exports - Consistent với Backend Naming
// =============================================================================

export type TSession = z.infer<typeof SessionSchema>;
export type TTranscript = z.infer<typeof TranscriptSchema>;
export type TDetection = z.infer<typeof DetectionSchema>;

// Request Types
export type TCreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type TListSessionsQuery = z.infer<typeof ListSessionsQuerySchema>;
export type TUpdateSessionRequest = z.infer<typeof UpdateSessionRequestSchema>;
export type TGetTranscriptsQuery = z.infer<typeof GetTranscriptsQuerySchema>;
export type TGetDetectionsQuery = z.infer<typeof GetDetectionsQuerySchema>;

// Response Types
export type TSessionResponse = z.infer<typeof SessionResponseSchema>;
export type TSessionListResponse = z.infer<typeof SessionListResponseSchema>;
export type TSessionDetailResponse = z.infer<typeof SessionDetailResponseSchema>;
export type TTranscriptListResponse = z.infer<typeof TranscriptListResponseSchema>;
export type TDetectionListResponse = z.infer<typeof DetectionListResponseSchema>;
export type TCreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

// Real-time Event Types
export type TAudioChunkData = z.infer<typeof AudioChunkDataSchema>;
export type TTranscriptPartialEvent = z.infer<typeof TranscriptPartialEventSchema>;
export type TTranscriptFinalEvent = z.infer<typeof TranscriptFinalEventSchema>;
export type TDetectionEvent = z.infer<typeof DetectionEventSchema>;
export type TSessionStatusEvent = z.infer<typeof SessionStatusEventSchema>;
export type TWebSocketErrorEvent = z.infer<typeof WebSocketErrorEventSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if session is active và ready for audio processing
 */
export function isSessionActive(session: TSession | TSessionResponse): boolean {
  if ('status' in session) {
    return session.status === 'ACTIVE';
  }
  // For base session schema, check if not ended
  return !session.endedAt;
}

/**
 * Calculate session duration in seconds
 */
export function calculateSessionDuration(session: TSession | TSessionResponse): number {
  const startTime = new Date(session.startedAt).getTime();
  const endTime = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  return Math.floor((endTime - startTime) / 1000);
}

/**
 * Get session status based on timestamps
 */
export function getSessionStatus(session: TSession): 'ACTIVE' | 'COMPLETED' {
  return session.endedAt ? 'COMPLETED' : 'ACTIVE';
}

/**
 * Determine detection severity color for UI
 */
export function getDetectionSeverityColor(severity: TDetection['severity']): string {
  const colors = {
    LOW: 'text-yellow-600',
    MEDIUM: 'text-orange-600', 
    HIGH: 'text-red-600',
    CRITICAL: 'text-red-800',
  };
  return colors[severity];
}

/**
 * Format detection type for display
 */
export function formatDetectionType(type: TDetection['type']): string {
  const labels = {
    CLEAN: 'Safe Content',
    OFFENSIVE: 'Offensive Language',
    HATE: 'Hate Speech',
    TOXIC: 'Toxic Content',
    SPAM: 'Spam Content',
  };
  return labels[type];
}

// =============================================================================
// Constants
// =============================================================================

export const SESSION_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ERROR: 'ERROR',
} as const;

export const DETECTION_TYPES = {
  CLEAN: 'CLEAN',
  OFFENSIVE: 'OFFENSIVE',
  HATE: 'HATE',
  TOXIC: 'TOXIC',
  SPAM: 'SPAM',
} as const;

export const DETECTION_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const SUPPORTED_LANGUAGES = {
  vi: 'Tiếng Việt',
  en: 'English',
  auto: 'Auto Detect',
} as const;

export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  CHUNK_SIZE: 4096,
  MAX_DURATION: 3600, // 1 hour in seconds
} as const;