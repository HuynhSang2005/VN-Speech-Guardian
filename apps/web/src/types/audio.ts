/**
 * Định nghĩa TypeScript cho AudioWorklet - VN Speech Guardian
 * Hỗ trợ type-safe audio processing với VAD detection và resampling
 */

// =============================================================================
// AudioWorklet Message Types
// =============================================================================

/**
 * Các loại command gửi từ main thread → AudioWorklet
 */
export type AudioWorkletCommandType = 
  | 'configure'
  | 'start-processing'
  | 'stop-processing'
  | 'update-settings'
  | 'get-metrics'
  | 'reset-buffers';

/**
 * Các loại message gửi từ AudioWorklet → main thread
 */
export type AudioWorkletResponseType = 
  | 'audio-chunk'
  | 'vad-result'
  | 'performance-metrics'
  | 'error'
  | 'status-update'
  | 'buffer-warning';

/**
 * Base message structure cho tất cả AudioWorklet communications
 */
interface BaseAudioWorkletMessage {
  id: string; // Unique message ID cho tracking
  timestamp: number; // High-precision timestamp (performance.now())
}

/**
 * Command messages gửi tới AudioWorklet
 */
export interface AudioWorkletCommand extends BaseAudioWorkletMessage {
  type: AudioWorkletCommandType;
  data?: unknown;
}

/**
 * Response messages từ AudioWorklet
 */
export interface AudioWorkletResponse extends BaseAudioWorkletMessage {
  type: AudioWorkletResponseType;
  data: unknown;
}

// =============================================================================
// Configuration & Settings
// =============================================================================

/**
 * Cấu hình AudioWorklet processor
 */
export interface AudioProcessorConfig {
  // Sample rate settings
  inputSampleRate: number; // Native browser sample rate (thường 48kHz)
  outputSampleRate: number; // Target sample rate cho AI processing (16kHz)
  
  // Buffer settings
  frameSize: number; // Audio frame size (samples per process call)
  chunkSize: number; // Output chunk size for streaming (ms)
  bufferSize: number; // Internal circular buffer size
  
  // VAD settings
  vadEnabled: boolean;
  vadSensitivity: 'low' | 'medium' | 'high' | 'custom';
  
  // Performance settings
  enablePerformanceMonitoring: boolean;
  maxProcessingTime: number; // Maximum processing time per frame (ms)
  
  // Debug settings
  debug: boolean;
  enableLogging: boolean;
}

/**
 * VAD detection thresholds - Vietnamese optimized
 */
export interface VADThresholds {
  energyThreshold: number; // Energy-based detection threshold
  frequencyThreshold: number; // Frequency analysis threshold (Hz)
  spectralFlatnessThreshold: number; // Spectral flatness threshold
  pitchThreshold: number; // Pitch detection threshold cho Vietnamese tones
  
  // Hysteresis để tránh nhấp nháy
  speechToSilenceFrames: number; // Frames cần để chuyển từ speech → silence
  silenceToSpeechFrames: number; // Frames cần để chuyển từ silence → speech
}

/**
 * Update settings command data
 */
export interface UpdateSettingsData {
  vadSensitivity?: 'low' | 'medium' | 'high' | 'custom';
  customThresholds?: Partial<VADThresholds>;
  chunkSize?: number;
  enablePerformanceMonitoring?: boolean;
  debug?: boolean;
}

// =============================================================================
// Audio Data Types
// =============================================================================

/**
 * Processed audio chunk ready for transmission
 */
export interface AudioChunk {
  // Audio data
  pcmData: Float32Array; // PCM 16-bit samples (resampled to 16kHz)
  originalSampleRate: number; // Original input sample rate
  outputSampleRate: number; // Resampled output rate
  
  // Chunk metadata
  sequence: number; // Sequence number cho ordering
  startTime: number; // Start time trong session (ms)
  duration: number; // Chunk duration (ms)
  
  // VAD results
  vadResult: VADResult;
  
  // Quality metrics
  signalLevel: number; // RMS signal level (0-1)
  clipCount: number; // Number of clipped samples
  
  // Processing info
  processingTime: number; // Time taken to process this chunk (ms)
}

/**
 * VAD detection result
 */
export interface VADResult {
  // Detection results
  isSpeech: boolean; // Final VAD decision
  confidence: number; // Confidence score (0-1)
  
  // Analysis breakdown
  energyDetection: boolean; // Energy-based detection
  frequencyDetection: boolean; // Frequency-based detection
  spectralFlatnessDetection: boolean; // Spectral flatness detection
  pitchDetection: boolean; // Pitch detection cho Vietnamese
  
  // Metrics for debugging
  energyLevel: number; // Current energy level
  dominantFrequency: number; // Dominant frequency (Hz)
  spectralFlatness: number; // Spectral flatness measure
  fundamentalFrequency: number; // F0 estimate (Hz)
  
  // Temporal information
  speechFrameCount: number; // Consecutive speech frames
  silenceFrameCount: number; // Consecutive silence frames
}

// =============================================================================
// Performance & Monitoring
// =============================================================================

/**
 * Real-time performance metrics
 */
export interface AudioPerformanceMetrics {
  // Processing performance
  averageProcessingTime: number; // Average ms per process() call
  maxProcessingTime: number; // Peak processing time
  processingLoad: number; // Estimated CPU usage (0-1)
  
  // Buffer health
  bufferUnderruns: number; // Count of buffer underrun events
  bufferOverruns: number; // Count of buffer overrun events
  bufferUtilization: number; // Average buffer usage (0-1)
  
  // Audio quality
  totalFramesProcessed: number; // Total frames processed
  droppedFrames: number; // Frames dropped due to overload
  averageSignalLevel: number; // Average RMS signal level
  clipRate: number; // Percentage of clipped samples
  
  // VAD performance
  vadDetectionRate: number; // Speech detection rate (0-1)
  vadAccuracy: number; // Estimated VAD accuracy (0-1)
  vadLatency: number; // VAD decision latency (ms)
  
  // Memory usage (estimates)
  estimatedMemoryUsage: number; // Estimated memory usage (bytes)
  garbageCollectionEvents: number; // Estimated GC events
  
  // Session info
  sessionDuration: number; // Total session duration (ms)
  lastUpdateTime: number; // Last metrics update timestamp
}

/**
 * Buffer warning types
 */
export type BufferWarningType = 
  | 'underrun' // Buffer is running empty
  | 'overrun' // Buffer is overflowing  
  | 'high-latency' // Processing is taking too long
  | 'memory-pressure' // Memory usage is high
  | 'cpu-overload'; // CPU usage is too high

/**
 * Buffer warning message
 */
export interface BufferWarning {
  type: BufferWarningType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  thresholdValue: number;
  recommendedAction: string;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * AudioWorklet error types
 */
export type AudioWorkletErrorType =
  | 'configuration-error' // Invalid configuration
  | 'processing-error' // Error during audio processing
  | 'buffer-error' // Buffer management error
  | 'resampling-error' // Error in resampling algorithm
  | 'vad-error' // Error in VAD processing
  | 'memory-error' // Memory allocation error
  | 'performance-error'; // Performance threshold exceeded

/**
 * AudioWorklet error details
 */
export interface AudioWorkletError {
  type: AudioWorkletErrorType;
  message: string;
  code: string; // Error code for programmatic handling
  severity: 'warning' | 'error' | 'critical';
  
  // Context information
  timestamp: number;
  processingContext?: {
    frameNumber: number;
    bufferSize: number;
    sampleRate: number;
    channelCount: number;
  };
  
  // Recovery suggestions
  recoverable: boolean;
  suggestedRecovery?: string;
  
  // Stack trace (if available in worklet context)
  stack?: string;
}

// =============================================================================
// Status & State Management
// =============================================================================

/**
 * AudioWorklet processing state
 */
export type AudioProcessingState = 
  | 'idle' // Not processing audio
  | 'initializing' // Setting up processing pipeline
  | 'running' // Actively processing audio
  | 'paused' // Processing paused (temporarily)
  | 'stopping' // Shutting down processing
  | 'error'; // Error state

/**
 * Status update message
 */
export interface AudioStatusUpdate {
  state: AudioProcessingState;
  stateChangeReason?: string;
  
  // Current processing info
  currentSampleRate: number;
  channelCount: number;
  frameSize: number;
  
  // Session statistics
  totalBytesProcessed: number;
  sessionStartTime: number;
  currentTime: number;
  
  // Health indicators
  bufferHealth: 'healthy' | 'warning' | 'critical';
  processingHealth: 'healthy' | 'warning' | 'critical';
  overallHealth: 'healthy' | 'warning' | 'critical';
}

// =============================================================================
// Specific Message Types
// =============================================================================

/**
 * Configure AudioWorklet command
 */
export interface ConfigureAudioWorkletCommand extends AudioWorkletCommand {
  type: 'configure';
  data: AudioProcessorConfig;
}

/**
 * Audio chunk response
 */
export interface AudioChunkResponse extends AudioWorkletResponse {
  type: 'audio-chunk';
  data: AudioChunk;
}

/**
 * VAD result response
 */
export interface VADResponse extends AudioWorkletResponse {
  type: 'vad-result';
  data: VADResult;
}

/**
 * Performance metrics response
 */
export interface PerformanceMetricsResponse extends AudioWorkletResponse {
  type: 'performance-metrics';
  data: AudioPerformanceMetrics;
}

/**
 * Error response
 */
export interface ErrorResponse extends AudioWorkletResponse {
  type: 'error';
  data: AudioWorkletError;
}

/**
 * Status update response
 */
export interface StatusUpdateResponse extends AudioWorkletResponse {
  type: 'status-update';
  data: AudioStatusUpdate;
}

/**
 * Buffer warning response
 */
export interface BufferWarningResponse extends AudioWorkletResponse {
  type: 'buffer-warning';
  data: BufferWarning;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Union type của tất cả possible command messages
 */
export type AudioWorkletCommandMessage = 
  | ConfigureAudioWorkletCommand
  | AudioWorkletCommand;

/**
 * Union type của tất cả possible response messages
 */
export type AudioWorkletResponseMessage = 
  | AudioChunkResponse
  | VADResponse
  | PerformanceMetricsResponse
  | ErrorResponse
  | StatusUpdateResponse
  | BufferWarningResponse;

/**
 * Type guard để kiểm tra message type
 */
export function isAudioWorkletResponse(
  message: AudioWorkletResponse
): message is AudioWorkletResponseMessage {
  return ['audio-chunk', 'vad-result', 'performance-metrics', 'error', 'status-update', 'buffer-warning']
    .includes(message.type);
}

/**
 * Helper type để extract data type từ response type
 */
export type ExtractResponseData<T extends AudioWorkletResponseType> = 
  T extends 'audio-chunk' ? AudioChunk :
  T extends 'vad-result' ? VADResult :
  T extends 'performance-metrics' ? AudioPerformanceMetrics :
  T extends 'error' ? AudioWorkletError :
  T extends 'status-update' ? AudioStatusUpdate :
  T extends 'buffer-warning' ? BufferWarning :
  never;

// =============================================================================
// Default Configurations
// =============================================================================

/**
 * Default AudioProcessor configuration optimized for Vietnamese speech
 */
export const DEFAULT_AUDIO_CONFIG: AudioProcessorConfig = {
  // Sample rates
  inputSampleRate: 48000, // Will be overridden with actual browser sample rate
  outputSampleRate: 16000, // Optimal for speech recognition
  
  // Buffer settings
  frameSize: 128, // Small frame size for low latency
  chunkSize: 400, // 400ms chunks for streaming
  bufferSize: 8192, // 4096 samples buffer
  
  // VAD settings
  vadEnabled: true,
  vadSensitivity: 'medium',
  
  // Performance settings
  enablePerformanceMonitoring: true,
  maxProcessingTime: 10, // Max 10ms processing per frame
  
  // Debug settings
  debug: false,
  enableLogging: false,
};

/**
 * Default VAD thresholds optimized for Vietnamese speech
 */
export const DEFAULT_VAD_THRESHOLDS: VADThresholds = {
  // Vietnamese-optimized thresholds
  energyThreshold: 35, // Slightly lower than English (40)
  frequencyThreshold: 150, // Lower for Vietnamese tonal patterns
  spectralFlatnessThreshold: 6, // Higher tolerance for tonal variations
  pitchThreshold: 80, // Fundamental frequency threshold
  
  // Hysteresis for stability
  speechToSilenceFrames: 8, // ~80ms at 10ms frames
  silenceToSpeechFrames: 3, // ~30ms at 10ms frames
};

/**
 * VAD sensitivity presets
 */
export const VAD_SENSITIVITY_PRESETS: Record<'low' | 'medium' | 'high', Partial<VADThresholds>> = {
  low: {
    energyThreshold: 30,
    frequencyThreshold: 120,
    speechToSilenceFrames: 12, // More conservative
    silenceToSpeechFrames: 2, // More sensitive
  },
  medium: DEFAULT_VAD_THRESHOLDS,
  high: {
    energyThreshold: 45,
    frequencyThreshold: 180,
    speechToSilenceFrames: 6, // More aggressive
    silenceToSpeechFrames: 4, // Less sensitive
  },
};