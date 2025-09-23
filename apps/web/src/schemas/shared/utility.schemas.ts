/**
 * Shared utility schemas - Error types, common enums, helper types
 * VN Speech Guardian Frontend
 */

import { z } from 'zod';

// =============================================================================
// Error Types
// =============================================================================

export const AppErrorSchema = z.object({
  name: z.string().default('AppError'),
  code: z.string(),
  message: z.string(),
  context: z.record(z.unknown()).optional(),
  timestamp: z.date().default(() => new Date()),
  sessionId: z.string().optional(),
  stack: z.string().optional()
});

export type TAppError = z.infer<typeof AppErrorSchema> & Error;

// Detection Labels (legacy compatibility với existing code)
export const LegacyDetectionLabelSchema = z.enum([
  'SAFE',
  'OFFENSIVE', 
  'HATE_SPEECH',
  'TOXIC',
  'SPAM',
  'INAPPROPRIATE'
]);

export type TDetectionLabel = z.infer<typeof LegacyDetectionLabelSchema>;

// Error Codes enum
export const ErrorCodeSchema = z.enum([
  'AUDIO_PERMISSION_DENIED',
  'AUDIO_DEVICE_ERROR',
  'WEBSOCKET_CONNECTION_FAILED',
  'API_REQUEST_FAILED',
  'SESSION_EXPIRED', 
  'INVALID_AUDIO_FORMAT',
  'PROCESSING_TIMEOUT',
  'QUOTA_EXCEEDED'
]);

export type TErrorCode = z.infer<typeof ErrorCodeSchema>;

// =============================================================================
// Audio Types (legacy compatibility)
// =============================================================================

export const AudioConfigSchema = z.object({
  sampleRate: z.number().default(16000),
  channels: z.number().default(1),
  bitDepth: z.number().default(16),
  chunkSize: z.number().default(1024),
  vadThreshold: z.number().min(0).max(1).default(0.5)
});

export type TAudioConfig = z.infer<typeof AudioConfigSchema>;

// =============================================================================  
// Utility Functions
// =============================================================================

/**
 * Map detection type from API to legacy label
 */
export function mapDetectionTypeToLabel(apiType: 'CLEAN' | 'OFFENSIVE' | 'HATE' | 'TOXIC' | 'SPAM'): TDetectionLabel {
  const mapping = {
    'CLEAN': 'SAFE' as const,
    'OFFENSIVE': 'OFFENSIVE' as const,  
    'HATE': 'HATE_SPEECH' as const,
    'TOXIC': 'TOXIC' as const,
    'SPAM': 'SPAM' as const
  };
  
  return mapping[apiType] || 'SAFE';
}

/**
 * Create app error với validation
 */
export function createAppError(
  code: TErrorCode,
  message?: string,
  context?: Record<string, unknown>
): TAppError {
  return AppErrorSchema.parse({
    code,
    message: message || `Error: ${code}`,
    context,
    timestamp: new Date()
  });
}