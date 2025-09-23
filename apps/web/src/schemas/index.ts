/**
 * Main schemas index - Central export point cho tất cả Zod schemas
 * VN Speech Guardian Frontend
 */

// Re-export Zod core utilities
export { z, ZodError, type ZodSchema } from 'zod';

// Core validation utilities
export * from '../lib/validation';

// Shared utility schemas
export * from './shared/utility.schemas';

// API schemas (explicit exports để resolve ApiResponseSchema conflict)
export {
  UserSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  ClerkUserSchema,
  transformClerkUser,
  type TUser,
  type TRegisterRequest,
  type TLoginRequest,  
  type TClerkUser
} from './api/auth.schemas';

export {
  SessionSchema,
  CreateSessionRequestSchema,
  SessionResponseSchema,
  TranscriptSchema,
  DetectionSchema,
  ListSessionsQuerySchema,
  UpdateSessionRequestSchema,
  GetTranscriptsQuerySchema,
  GetDetectionsQuerySchema,
  AudioChunkDataSchema,
  TranscriptPartialEventSchema,
  TranscriptFinalEventSchema,
  DetectionEventSchema,
  SessionStatusEventSchema,
  WebSocketErrorEventSchema,
  type TSession,
  type TCreateSessionRequest,
  type TSessionResponse,
  type TTranscript,
  type TDetection,
  type TListSessionsQuery,
  type TUpdateSessionRequest,
  type TGetTranscriptsQuery,
  type TGetDetectionsQuery,
  type TAudioChunkData,
  type TTranscriptPartialEvent,
  type TTranscriptFinalEvent,
  type TDetectionEvent,
  type TSessionStatusEvent,
  type TWebSocketErrorEvent
} from './api/sessions.schemas';

// UI schemas
export {
  AppStateSchema,
  NotificationSchema,
  AudioConfigSchema,
  validateAppState,
  createNotification,
  type TAppState,
  type TNotification,
  type TAudioConfig
} from './ui/app-state.schemas';

// Form schemas
export * from './forms/form-validation.schemas';

// Hook schemas
export * from './hooks/hook-types.schemas';

// Generated OpenAPI types (type-only export)
export type * from './generated/api-types';