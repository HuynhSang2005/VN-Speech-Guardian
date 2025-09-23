/**
 * Global type definitions cho VN Speech Guardian Frontend
 * Central export of all TypeScript types and interfaces
 */

// =============================================================================
// Central Type Exports - Follow enterprise patterns
// =============================================================================

import type { ReactNode } from 'react'

// Export all type categories
export * from './hooks'
export * from './components'
export * from './utils'

// Remove unused router import and module declaration since we don't have router defined

// =============================================================================
// Audio Processing Types - Speech-to-Text Core
// =============================================================================

export interface IAudioConfig {
  sampleRate: number      // 16000 Hz cho speech recognition  
  channels: number        // 1 (mono) cho optimal processing
  bitDepth: number        // 16-bit PCM
  chunkSize: number       // Buffer size in samples
  vadThreshold: number    // Voice Activity Detection threshold (0-1)
}

export interface IAudioChunk {
  data: Float32Array      // PCM audio data
  timestamp: number       // Unix timestamp in milliseconds
  sequenceNumber: number  // Chunk ordering
  isFinal?: boolean       // Last chunk indicator
}

export interface ITranscriptionResult {
  id: string
  text: string
  confidence: number      // 0-1 confidence score
  startTime: number      // Start time in ms
  endTime: number        // End time in ms  
  words?: IWordSegment[]
  language: 'vi' | 'en'  // Supported languages
}

export interface IWordSegment {
  word: string
  start: number          // Word start time in ms
  end: number            // Word end time in ms
  confidence: number     // Word-level confidence
}

// =============================================================================
// Content Moderation Types - Harmful Content Detection  
// =============================================================================

export type TDetectionLabel = 
  | 'SAFE'               // Content an toàn
  | 'OFFENSIVE'          // Ngôn từ xúc phạm
  | 'HATE_SPEECH'        // Lời nói thù hận
  | 'TOXIC'              // Nội dung độc hại
  | 'SPAM'               // Nội dung spam
  | 'INAPPROPRIATE'      // Không phù hợp

export interface IDetectionResult {
  id: string
  sessionId: string
  label: TDetectionLabel
  score: number          // Confidence score 0-1
  snippet: string        // Text fragment được detect
  startMs: number        // Start time in audio stream
  endMs: number          // End time in audio stream
  timestamp: Date        // Detection timestamp
  severity: 'low' | 'medium' | 'high'
}

export interface IModerationConfig {
  blockThreshold: number    // Score threshold để block (0.8)
  warnThreshold: number     // Score threshold để warn (0.5) 
  enableRealTime: boolean   // Real-time processing
  hysteresisWindow: number  // Samples for decision smoothing
}

// =============================================================================
// Session Management Types
// =============================================================================

export interface ISession {
  id: string
  userId?: string        // Clerk user ID nếu authenticated
  startTime: Date
  endTime?: Date
  status: 'active' | 'paused' | 'completed' | 'error'
  audioConfig: IAudioConfig
  moderationConfig: IModerationConfig
  transcriptions: ITranscriptionResult[]
  detections: IDetectionResult[]
  metadata: ISessionMetadata
}

export interface ISessionMetadata {
  userAgent: string
  ipAddress?: string
  duration: number       // Total session duration in ms
  audioProcessed: number // Total audio processed in ms
  detectionCount: Record<TDetectionLabel, number>
  averageConfidence: number
}

// =============================================================================
// UI State Types - Zustand Stores
// =============================================================================

export interface IAppState {
  // Session state
  currentSession: ISession | null
  isRecording: boolean
  isProcessing: boolean
  
  // UI state  
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  notifications: INotification[]
  
  // Audio state
  audioLevel: number     // Current microphone level 0-100
  vadActive: boolean     // Voice Activity Detection
  
  // Settings
  settings: IUserSettings
}

export interface INotification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: Date
  autoClose?: number     // Auto-close delay in ms
  actions?: INotificationAction[]
}

export interface INotificationAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface IUserSettings {
  audioConfig: IAudioConfig
  moderationConfig: IModerationConfig
  notifications: {
    realTimeAlerts: boolean
    soundEnabled: boolean
    desktopNotifications: boolean
  }
  display: {
    theme: 'light' | 'dark' | 'system'
    compactMode: boolean
    showConfidenceScores: boolean
  }
  privacy: {
    storeTranscriptions: boolean
    anonymousMode: boolean
    dataRetention: number  // Days
  }
}

// =============================================================================
// API Types - Backend Communication
// =============================================================================

export interface IApiResponse<TData = any> {
  success: boolean
  data?: TData
  error?: string
  timestamp: Date
  requestId: string
}

export interface IStreamingResponse {
  status: 'processing' | 'partial' | 'final' | 'error'
  sessionId: string
  transcription?: Partial<ITranscriptionResult>
  detection?: IDetectionResult
  error?: string
}

// WebSocket event types
export type TSocketEvent = 
  | 'session:start'
  | 'session:end'
  | 'audio:chunk'
  | 'transcription:partial'
  | 'transcription:final' 
  | 'detection:alert'
  | 'error'

export interface ISocketMessage<TData = any> {
  event: TSocketEvent
  sessionId: string
  data: TData
  timestamp: number
}

// =============================================================================
// Component Props Types - React Components
// =============================================================================

export interface IBaseComponentProps {
  className?: string
  children?: ReactNode
  testId?: string        // Testing identifier
}

// Audio Visualizer component
export interface IAudioVisualizerProps extends IBaseComponentProps {
  audioLevel: number
  isRecording: boolean
  isProcessing: boolean
  detectionState: TDetectionLabel
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}

// Transcription Display component  
export interface ITranscriptionDisplayProps extends IBaseComponentProps {
  transcriptions: ITranscriptionResult[]
  showConfidence?: boolean
  highlightDetections?: boolean
  maxHeight?: number
  autoScroll?: boolean
}

// Detection Alert component
export interface IDetectionAlertProps extends IBaseComponentProps {
  detection: IDetectionResult
  onDismiss?: () => void
  onBlock?: () => void
  showActions?: boolean
}

// =============================================================================  
// Error Types - Error Handling
// =============================================================================

export interface IAppError extends Error {
  code: string
  context?: Record<string, any>
  timestamp: Date
  sessionId?: string
}

export type TErrorCode =
  | 'AUDIO_PERMISSION_DENIED'
  | 'AUDIO_DEVICE_ERROR'
  | 'WEBSOCKET_CONNECTION_FAILED'
  | 'API_REQUEST_FAILED'
  | 'SESSION_EXPIRED'
  | 'INVALID_AUDIO_FORMAT'
  | 'PROCESSING_TIMEOUT'
  | 'QUOTA_EXCEEDED'

// =============================================================================
// Utility Types - Helper Types
// =============================================================================

export type TPartial<T> = {
  [P in keyof T]?: T[P]
}

export type TRequired<T, K extends keyof T> = T & {
  [P in K]-?: T[P]
}

export type TPickOptional<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: T[P]
}

export type TArrayElement<T> = T extends (infer U)[] ? U : never

// =============================================================================
// Environment Variables Types
// =============================================================================

// Extend Vite's existing ImportMetaEnv interface
declare global {
  interface ImportMetaEnv {
    readonly VITE_CLERK_PUBLISHABLE_KEY: string
    readonly VITE_API_BASE_URL: string
    readonly VITE_WS_URL: string
    readonly VITE_SENTRY_DSN?: string
    readonly VITE_GA_MEASUREMENT_ID?: string
    readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production'
  }
}

// =============================================================================
// Audio Worklet Types - Web Audio API
// =============================================================================

export interface IAudioWorkletMessage {
  type: 'audio-data' | 'vad-result' | 'error' | 'config'
  data: any
  timestamp: number
}

export interface IVADResult {
  isVoice: boolean
  energy: number
  timestamp: number
}

// Extend AudioWorkletProcessor for our custom processor
declare global {
  interface AudioWorkletGlobalScope extends WorkerGlobalScope {
    registerProcessor: (
      name: string,
      processor: new () => AudioWorkletProcessor
    ) => void
    AudioWorkletProcessor: new () => AudioWorkletProcessor
  }
}