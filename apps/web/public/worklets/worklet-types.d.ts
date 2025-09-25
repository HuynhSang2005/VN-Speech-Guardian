/**
 * AudioWorklet Global Type Definitions
 * Provides TypeScript support for AudioWorklet environment
 * 
 * Note: These types are specific to the AudioWorklet global scope
 * and are not available in the main thread context
 */

// =============================================================================
// AudioWorklet Global Interfaces
// =============================================================================

/**
 * Base class for all audio worklet processors
 * Available in AudioWorklet global scope only
 */
declare class AudioWorkletProcessor {
  /**
   * Message port for communication between worklet and main thread
   */
  readonly port: MessagePort;

  /**
   * Process audio method called by the audio system
   * @param inputs Array of input audio data (channels x samples)
   * @param outputs Array of output audio data (channels x samples) 
   * @param parameters Audio parameters passed from main thread
   * @returns boolean - true to keep processor alive, false to terminate
   */
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;

  constructor(options?: AudioWorkletNodeOptions);
}

/**
 * Global function to register an AudioWorkletProcessor
 * Available in AudioWorklet global scope only
 */
declare function registerProcessor(
  name: string,
  processorCtor: typeof AudioWorkletProcessor
): void;

/**
 * Current time in seconds from the audio context start
 * Available in AudioWorklet global scope only
 */
declare const currentTime: number;

/**
 * Sample rate of the audio context
 * Available in AudioWorklet global scope only
 */
declare const sampleRate: number;

// =============================================================================
// AudioWorklet-specific Extensions
// =============================================================================

/**
 * Extended MessagePort interface for AudioWorklet communication
 */
interface MessagePort {
  /**
   * Send structured message to main thread
   */
  postMessage(data: AudioWorkletMessage): void;
  
  /**
   * Receive messages from main thread
   */
  onmessage: ((event: MessageEvent<AudioWorkletMessage>) => void) | null;
  
  /**
   * Start message handling
   */
  start(): void;
  
  /**
   * Close message port
   */
  close(): void;
}

/**
 * Performance interface available in worklet context
 */
interface Performance {
  /**
   * High-resolution timestamp
   */
  now(): number;
}

/**
 * Console interface for worklet logging
 */
interface Console {
  log(...data: any[]): void;
  warn(...data: any[]): void;
  error(...data: any[]): void;
  info(...data: any[]): void;
}

// =============================================================================
// AudioWorklet Message Types (shared with main thread)
// =============================================================================

/**
 * Base message interface for worklet communication
 */
interface AudioWorkletMessage {
  id: string;
  type: string;
  data?: any;
  timestamp?: number;
}

/**
 * Configuration message for audio processor setup
 */
interface ConfigureMessage extends AudioWorkletMessage {
  type: 'configure';
  data: {
    inputSampleRate: number;
    outputSampleRate: number;
    frameSize: number;
    chunkSize: number;
    bufferSize: number;
    vadEnabled: boolean;
    vadSensitivity: 'low' | 'medium' | 'high' | 'custom';
    enablePerformanceMonitoring: boolean;
    maxProcessingTime: number;
    debug: boolean;
    enableLogging: boolean;
  };
}

/**
 * Control messages for worklet operation
 */
interface ControlMessage extends AudioWorkletMessage {
  type: 'start-processing' | 'stop-processing' | 'reset-buffers' | 'get-metrics';
}

/**
 * Settings update message
 */
interface UpdateSettingsMessage extends AudioWorkletMessage {
  type: 'update-settings';
  data: {
    vadSensitivity?: 'low' | 'medium' | 'high' | 'custom';
    customThresholds?: Partial<VADThresholds>;
    enableLogging?: boolean;
    maxProcessingTime?: number;
  };
}

/**
 * Audio chunk output from worklet
 */
interface AudioChunkMessage extends AudioWorkletMessage {
  type: 'audio-chunk';
  data: {
    pcmData: Float32Array;
    originalSampleRate: number;
    outputSampleRate: number;
    sequence: number;
    startTime: number;
    duration: number;
    vadResult: {
      isSpeech: boolean;
      confidence: number;
      energyDetection: boolean;
      frequencyDetection: boolean;
      spectralFlatnessDetection: boolean;
      pitchDetection: boolean;
      energyLevel: number;
      dominantFrequency: number;
      spectralFlatness: number;
      fundamentalFrequency: number;
      speechFrameCount: number;
      silenceFrameCount: number;
    };
    signalLevel: number;
    clipCount: number;
    processingTime: number;
  };
}

/**
 * Status update from worklet
 */
interface StatusUpdateMessage extends AudioWorkletMessage {
  type: 'status-update';
  data: {
    state?: 'initializing' | 'idle' | 'running' | 'error';
    message: string;
    details?: any;
  };
}

/**
 * Performance metrics from worklet
 */
interface PerformanceMetricsMessage extends AudioWorkletMessage {
  type: 'performance-metrics';
  data: {
    averageProcessingTime: number;
    maxProcessingTime: number;
    processingLoad: number;
    bufferUnderruns: number;
    bufferOverruns: number;
    bufferUtilization: number;
    totalFramesProcessed: number;
    droppedFrames: number;
    averageSignalLevel: number;
    clipRate: number;
    vadDetectionRate: number;
    vadAccuracy: number;
    vadLatency: number;
    estimatedMemoryUsage: number;
    garbageCollectionEvents: number;
    sessionDuration: number;
    lastUpdateTime: number;
  };
}

/**
 * Error message from worklet
 */
interface ErrorMessage extends AudioWorkletMessage {
  type: 'error';
  data: {
    type: string;
    message: string;
    code: string;
    severity: 'low' | 'medium' | 'high' | 'critical' | 'error';
    timestamp: number;
    processingContext: {
      frameNumber: number;
      bufferSize: number;
      sampleRate: number;
      channelCount: number;
    };
    recoverable: boolean;
    suggestedRecovery: string;
  };
}

/**
 * Buffer warning from worklet
 */
interface BufferWarningMessage extends AudioWorkletMessage {
  type: 'buffer-warning';
  data: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    currentValue: number;
    thresholdValue: number;
    recommendedAction: string;
  };
}

// =============================================================================
// VAD Types (shared with main thread)
// =============================================================================

interface VADThresholds {
  energyThreshold: number;
  frequencyThreshold: number;
  spectralFlatnessThreshold: number;
  pitchThreshold: number;
  speechToSilenceFrames: number;
  silenceToSpeechFrames: number;
}

interface VADResult {
  isSpeech: boolean;
  confidence: number;
  energyDetection: boolean;
  frequencyDetection: boolean;
  spectralFlatnessDetection: boolean;
  pitchDetection: boolean;
  energyLevel: number;
  dominantFrequency: number;
  spectralFlatness: number;
  fundamentalFrequency: number;
  speechFrameCount: number;
  silenceFrameCount: number;
}

// =============================================================================
// Global Objects Available in WorkletGlobalScope
// =============================================================================

declare const performance: Performance;
declare const console: Console;

/**
 * Math object (standard JavaScript Math)
 */
declare const Math: {
  PI: number;
  E: number;
  abs(x: number): number;
  sin(x: number): number;
  cos(x: number): number;
  log(x: number): number;
  log10(x: number): number;
  log2(x: number): number;
  pow(x: number, y: number): number;
  sqrt(x: number): number;
  floor(x: number): number;
  ceil(x: number): number;
  round(x: number): number;
  min(...values: number[]): number;
  max(...values: number[]): number;
  random(): number;
};

/**
 * ArrayBuffer and TypedArray constructors
 */
declare const Float32Array: Float32ArrayConstructor;
declare const Uint16Array: Uint16ArrayConstructor;
declare const Uint8Array: Uint8ArrayConstructor;

/**
 * Basic JavaScript objects and functions
 */
declare const Date: DateConstructor;
declare const Number: NumberConstructor;
declare const String: StringConstructor;
declare const Boolean: BooleanConstructor;
declare const Object: ObjectConstructor;
declare const Array: ArrayConstructor;

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Error constructor available in worklet
 */
declare const Error: ErrorConstructor;

/**
 * Type assertion for unknown errors
 */
type WorkletError = Error & {
  message: string;
  name: string;
  stack?: string;
};

// =============================================================================
// Utility Functions for Type Safety
// =============================================================================

/**
 * Type guard to check if error is a proper Error object
 */
declare function isError(error: unknown): error is WorkletError;

// =============================================================================
// Export for module compatibility
// =============================================================================

export {};