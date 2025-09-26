/**
 * Hook-specific schemas - For React hooks validation
 * VN Speech Guardian Frontend
 */

import { z } from 'zod';

// =============================================================================
// WebSocket Hook Types
// =============================================================================

export const WebSocketReadyStateSchema = z.union([
  z.literal(WebSocket.CONNECTING),
  z.literal(WebSocket.OPEN), 
  z.literal(WebSocket.CLOSING),
  z.literal(WebSocket.CLOSED)
]);

export type WebSocketReadyState = z.infer<typeof WebSocketReadyStateSchema>;

export const WebSocketHookOptionsSchema = z.object({
  reconnectAttempts: z.number().default(3),
  reconnectInterval: z.number().default(1000),
  protocols: z.union([z.string(), z.array(z.string())]).optional(),
  onOpen: z.function().optional(),
  onClose: z.function().optional(),
  onError: z.function().optional(),
  onMessage: z.function().optional()
});

// TypeScript interface with proper callback types
export interface WebSocketHookCallbacks {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: ErrorEvent) => void;
  onMessage?: (event: MessageEvent) => void;
}

export type TWebSocketHookOptions = z.infer<typeof WebSocketHookOptionsSchema>;

// =============================================================================
// Audio Processing Hook Types  
// =============================================================================

export const AudioProcessingConfigSchema = z.object({
  sampleRate: z.number().default(16000),
  channelCount: z.number().default(1),
  bufferSize: z.number().default(1024),
  autoGainControl: z.boolean().default(true),
  echoCancellation: z.boolean().default(true),
  noiseSuppression: z.boolean().default(true)
});

export type TAudioProcessingConfig = z.infer<typeof AudioProcessingConfigSchema>;

export const AudioStreamDataSchema = z.object({
  data: z.instanceof(Float32Array),
  sampleRate: z.number(),
  channelCount: z.number(),
  timestamp: z.number()
});

export type TAudioStreamData = z.infer<typeof AudioStreamDataSchema>;

export const AudioAnalysisResultSchema = z.object({
  volume: z.number(),
  frequency: z.array(z.number()),
  isVoiceDetected: z.boolean()
});

export type TAudioAnalysisResult = z.infer<typeof AudioAnalysisResultSchema>;

// =============================================================================
// Error Types for Hooks
// =============================================================================

export const HookErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  code: z.string().optional(),
  timestamp: z.date().default(() => new Date())
});

export type THookError = z.infer<typeof HookErrorSchema>;

// =============================================================================
// Debounce Hook Types
// =============================================================================

export const DebounceOptionsSchema = z.object({
  leading: z.boolean().default(false),
  trailing: z.boolean().default(true),
  maxWait: z.number().optional()
});

export type TDebounceOptions = z.infer<typeof DebounceOptionsSchema>;

// =============================================================================
// Local Storage Hook Types
// =============================================================================

export const LocalStorageOptionsSchema = z.object({
  serializer: z.object({
    read: z.function(),
    write: z.function()
  }).default({
    read: (value: string) => JSON.parse(value),
    write: (value: any) => JSON.stringify(value)
  }),
  syncAcrossTabs: z.boolean().default(false)
});

export type TLocalStorageOptions = z.infer<typeof LocalStorageOptionsSchema>;

// =============================================================================
// Media Permissions Hook Types
// =============================================================================

export const MediaPermissionStateSchema = z.enum(['granted', 'denied', 'prompt']);

export type TMediaPermissionState = z.infer<typeof MediaPermissionStateSchema>;

export const MediaConstraintsSchema = z.object({
  video: z.union([z.boolean(), z.record(z.string(), z.unknown())]).default(false),
  audio: z.union([z.boolean(), z.record(z.string(), z.unknown())]).default(true)
});

export type TMediaConstraints = z.infer<typeof MediaConstraintsSchema>;

// =============================================================================
// Detection History Hook Types
// =============================================================================

export const DetectionHistoryEntrySchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  type: z.enum(['CLEAN', 'OFFENSIVE', 'HATE', 'TOXIC', 'SPAM']),
  confidence: z.number().min(0).max(1),
  text: z.string(),
  sessionId: z.string().optional()
});

export type TDetectionHistoryEntry = z.infer<typeof DetectionHistoryEntrySchema>;

export const DetectionHistoryOptionsSchema = z.object({
  maxEntries: z.number().default(1000),
  autoCleanup: z.boolean().default(true),
  persistToStorage: z.boolean().default(false)
});

export type TDetectionHistoryOptions = z.infer<typeof DetectionHistoryOptionsSchema>;