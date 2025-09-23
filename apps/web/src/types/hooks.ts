/**
 * Hook-specific TypeScript interfaces và types
 * VN Speech Guardian - Pure TypeScript definitions for React hooks
 * 
 * @description Chứa tất cả interface definitions cho hooks, không bao gồm runtime validation
 */

import type { 
  TMediaPermissionState,
  THookError,
  TAudioAnalysisResult
} from '@/schemas';
import type { Socket } from 'socket.io-client';

// =============================================================================
// Generic Hook Patterns
// =============================================================================

/**
 * Generic async hook state pattern
 * Sử dụng cho các hooks có async operations
 */
export interface AsyncHookState<T> {
  data: T | null;
  loading: boolean;
  error: THookError | null;
}

// =============================================================================
// Audio Hook Interfaces
// =============================================================================

/**
 * Return type cho useAudio hook
 * Audio stream management và voice activity detection
 */
export interface UseAudioReturn {
  // Stream control
  stream: MediaStream | null;
  isRecording: boolean;
  isSupported: boolean;
  
  // Analysis data
  analysisResult: TAudioAnalysisResult | null;
  audioLevel: number;
  
  // Controls
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  
  // State
  error: THookError | null;
  loading: boolean;
}

// =============================================================================
// Media Permissions Hook Interfaces
// =============================================================================

/**
 * Media permissions state structure
 */
export interface MediaPermissions {
  microphone: TMediaPermissionState;
  camera: TMediaPermissionState;
}

/**
 * Return type cho useMediaPermissions hook
 */
export interface UseMediaPermissionsReturn {
  permissions: MediaPermissions;
  isLoading: boolean;
  error: THookError | null;
  
  // Request functions
  requestMicrophone: () => Promise<TMediaPermissionState>;
  requestCamera: () => Promise<TMediaPermissionState>;
}

// =============================================================================
// WebSocket Hook Interfaces
// =============================================================================

/**
 * Return type cho useWebSocket hook
 */
export interface UseWebSocketReturn {
  // Connection state
  socket: Socket | null;
  readyState: WebSocketReadyState;
  isConnected: boolean;
  
  // Data
  lastMessage: any;
  
  // Controls
  connect: () => void;
  disconnect: () => void;
  send: (event: string, data?: any) => void;
  
  // Error state
  error: THookError | null;
}

// =============================================================================
// Local Storage Hook Interfaces
// =============================================================================

/**
 * Return type cho useLocalStorage hook
 */
export interface UseLocalStorageReturn<T> {
  value: T | null;
  setValue: (value: T | ((prev: T | null) => T)) => void;
  removeValue: () => void;
  loading: boolean;
  error: THookError | null;
}

// =============================================================================
// Detection History Hook Interfaces
// =============================================================================

/**
 * Options cho useDetectionHistory hook
 */
export interface UseDetectionHistoryOptions {
  maxEntries?: number;
  autoCleanup?: boolean;
  persistToStorage?: boolean;
}

/**
 * Return type cho useDetectionHistory hook
 */
export interface UseDetectionHistoryReturn {
  history: DetectionHistoryEntry[];
  addEntry: (entry: Omit<DetectionHistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  getByType: (type: string) => DetectionHistoryEntry[];
  getRecent: (count: number) => DetectionHistoryEntry[];
  loading: boolean;
  error: THookError | null;
}

// =============================================================================
// Re-export common types for convenience
// =============================================================================

export type WebSocketReadyState = 
  | typeof WebSocket.CONNECTING 
  | typeof WebSocket.OPEN 
  | typeof WebSocket.CLOSING 
  | typeof WebSocket.CLOSED;

// Detection history entry type (should match schema but as interface)
export interface DetectionHistoryEntry {
  id: string;
  timestamp: Date;
  type: 'CLEAN' | 'OFFENSIVE' | 'HATE' | 'TOXIC' | 'SPAM';
  confidence: number;
  text: string;
  sessionId?: string;
}