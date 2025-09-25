/**
 * useAudioWorklet Hook - Main Thread Integration
 * 
 * Manages AudioWorklet lifecycle, communication, and state
 * Provides React-friendly interface for audio processing
 * 
 * Key Features:
 * - AudioWorklet setup và initialization
 * - MessagePort communication management
 * - Real-time state updates and error handling
 * - Performance monitoring and metrics
 * 
 * @author VN Speech Guardian Team
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { 
  AudioProcessorConfig,
  AudioChunk,
  AudioPerformanceMetrics,
  AudioWorkletError,
  VADThresholds,
  BufferWarning,
} from '@/types/audio';

interface AudioWorkletState {
  isInitialized: boolean;
  isProcessing: boolean;
  processingState: 'idle' | 'initializing' | 'running' | 'error';
  currentConfig: AudioProcessorConfig | null;
  lastError: AudioWorkletError | null;
  metrics: AudioPerformanceMetrics | null;
  lastChunk: AudioChunk | null;
}

interface UseAudioWorkletOptions {
  /** Audio input configuration */
  inputConfig: {
    sampleRate?: number;
    channelCount?: number;
    latencyHint?: 'interactive' | 'balanced' | 'playback';
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
  };
  
  /** Audio processing configuration */
  processingConfig: Partial<AudioProcessorConfig>;
  
  /** Event callbacks */
  onAudioChunk?: (chunk: AudioChunk) => void;
  onError?: (error: AudioWorkletError) => void;
  onStatusChange?: (status: string, details?: any) => void;
  onPerformanceUpdate?: (metrics: AudioPerformanceMetrics) => void;
  onBufferWarning?: (warning: BufferWarning) => void;
  
  /** Advanced options */
  autoStart?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableDebugLogging?: boolean;
  maxRetries?: number;
}

interface UseAudioWorkletReturn {
  // State
  state: AudioWorkletState;
  audioContext: AudioContext | null;
  mediaStream: MediaStream | null;
  
  // Control methods
  initialize: () => Promise<void>;
  startProcessing: () => Promise<void>;
  stopProcessing: () => void;
  cleanup: () => void;
  
  // Configuration methods
  updateConfig: (config: Partial<AudioProcessorConfig>) => Promise<void>;
  updateVADSettings: (settings: Partial<VADThresholds>) => Promise<void>;
  resetBuffers: () => Promise<void>;
  
  // Monitoring methods
  getMetrics: () => Promise<AudioPerformanceMetrics>;
  exportPerformanceData: () => Promise<any>;
  
  // Utility methods
  isSupported: () => boolean;
  getSupportedFeatures: () => AudioWorkletFeatures;
}

interface AudioWorkletFeatures {
  audioWorkletSupported: boolean;
  mediaDevicesSupported: boolean;
  performanceTimingSupported: boolean;
  maxSampleRate: number;
  maxChannelCount: number;
  supportedLatencyHints: string[];
}

// Default configuration
const DEFAULT_CONFIG: AudioProcessorConfig = {
  inputSampleRate: 48000,
  outputSampleRate: 16000,
  frameSize: 128,
  chunkSize: 400, // 400ms chunks
  bufferSize: 4096,
  vadEnabled: true,
  vadSensitivity: 'medium',
  enablePerformanceMonitoring: true,
  maxProcessingTime: 10, // 10ms max processing time
  debug: false,
  enableLogging: true,
};

const DEFAULT_INPUT_CONFIG = {
  sampleRate: 48000,
  channelCount: 1,
  latencyHint: 'interactive' as const,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: false,
};

/**
 * Main AudioWorklet integration hook
 */
export function useAudioWorklet(options: UseAudioWorkletOptions): UseAudioWorkletReturn {
  // Refs for stable references
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const messageQueueRef = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map());
  const retryCountRef = useRef<number>(0);
  
  // State management
  const [state, setState] = useState<AudioWorkletState>({
    isInitialized: false,
    isProcessing: false,
    processingState: 'idle',
    currentConfig: null,
    lastError: null,
    metrics: null,
    lastChunk: null,
  });

  // Generate message ID
  const generateMessageId = useCallback(() => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Send message with promise-based response handling
  const sendWorkletMessage = useCallback(async (type: string, data?: any): Promise<any> => {
    if (!audioWorkletNodeRef.current) {
      throw new Error('AudioWorklet not initialized');
    }

    const messageId = generateMessageId();
    const message = { id: messageId, type, data, timestamp: performance.now() };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        messageQueueRef.current.delete(messageId);
        reject(new Error(`AudioWorklet message timeout: ${type}`));
      }, 5000); // 5 second timeout

      messageQueueRef.current.set(messageId, {
        resolve: (response: any) => {
          clearTimeout(timeoutId);
          resolve(response);
        },
        reject: (error: any) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });

      audioWorkletNodeRef.current!.port.postMessage(message);
    });
  }, [generateMessageId]);

  // Handle messages from worklet
  const handleWorkletMessage = useCallback((event: MessageEvent) => {
    const { id, type, data } = event.data;

    // Handle responses to sent messages
    if (id && messageQueueRef.current.has(id)) {
      const { resolve } = messageQueueRef.current.get(id)!;
      messageQueueRef.current.delete(id);
      resolve(data);
      return;
    }

    // Handle worklet-initiated messages
    switch (type) {
      case 'audio-chunk':
        const chunk = data as AudioChunk;
        setState(prev => ({ ...prev, lastChunk: chunk }));
        options.onAudioChunk?.(chunk);
        break;

      case 'status-update':
        setState(prev => ({ ...prev, processingState: data.state || prev.processingState }));
        options.onStatusChange?.(data.message, data.details);
        break;

      case 'performance-metrics':
        const metrics = data as AudioPerformanceMetrics;
        setState(prev => ({ ...prev, metrics }));
        options.onPerformanceUpdate?.(metrics);
        break;

      case 'error':
        const error = data as AudioWorkletError;
        setState(prev => ({ ...prev, lastError: error, processingState: 'error' }));
        options.onError?.(error);
        break;

      case 'buffer-warning':
        const warning = data as BufferWarning;
        options.onBufferWarning?.(warning);
        break;

      default:
        console.warn('[useAudioWorklet] Unknown message type:', type);
    }
  }, [options]);

  // Check browser support
  const isSupported = useCallback((): boolean => {
    return !!(
      window.AudioContext &&
      window.AudioWorklet &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }, []);

  // Get supported features
  const getSupportedFeatures = useCallback((): AudioWorkletFeatures => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    return {
      audioWorkletSupported: !!window.AudioWorklet,
      mediaDevicesSupported: !!navigator.mediaDevices,
      performanceTimingSupported: !!window.performance,
      maxSampleRate: context.sampleRate,
      maxChannelCount: context.destination.maxChannelCount,
      supportedLatencyHints: ['interactive', 'balanced', 'playback'],
    };
  }, []);

  // Initialize AudioWorklet
  const initialize = useCallback(async (): Promise<void> => {
    if (!isSupported()) {
      throw new Error('AudioWorklet not supported in this browser');
    }

    if (state.isInitialized) {
      return; // Already initialized
    }

    setState(prev => ({ ...prev, processingState: 'initializing' }));

    try {
      // Create AudioContext
      const context = new AudioContext({
        sampleRate: options.inputConfig.sampleRate || DEFAULT_INPUT_CONFIG.sampleRate,
        latencyHint: options.inputConfig.latencyHint || DEFAULT_INPUT_CONFIG.latencyHint,
      });

      // Resume context if suspended
      if (context.state === 'suspended') {
        await context.resume();
      }

      // Load AudioWorklet module
      await context.audioWorklet.addModule('/worklets/audio-processor.ts');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: options.inputConfig.sampleRate || DEFAULT_INPUT_CONFIG.sampleRate,
          channelCount: options.inputConfig.channelCount || DEFAULT_INPUT_CONFIG.channelCount,
          echoCancellation: options.inputConfig.echoCancellation ?? DEFAULT_INPUT_CONFIG.echoCancellation,
          noiseSuppression: options.inputConfig.noiseSuppression ?? DEFAULT_INPUT_CONFIG.noiseSuppression,
          autoGainControl: options.inputConfig.autoGainControl ?? DEFAULT_INPUT_CONFIG.autoGainControl,
        },
      });

      // Create audio nodes
      const sourceNode = context.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(context, 'audio-processor');

      // Setup message handling
      workletNode.port.onmessage = handleWorkletMessage;

      // Connect audio graph
      sourceNode.connect(workletNode);
      // Note: We don't connect to destination to avoid feedback

      // Configure the worklet
      const config: AudioProcessorConfig = {
        ...DEFAULT_CONFIG,
        ...options.processingConfig,
        inputSampleRate: context.sampleRate,
        enablePerformanceMonitoring: options.enablePerformanceMonitoring ?? DEFAULT_CONFIG.enablePerformanceMonitoring,
        debug: options.enableDebugLogging ?? DEFAULT_CONFIG.debug,
      };

      await sendWorkletMessage('configure', config);

      // Store references
      audioContextRef.current = context;
      mediaStreamRef.current = stream;
      audioWorkletNodeRef.current = workletNode;
      sourceNodeRef.current = sourceNode;

      setState(prev => ({
        ...prev,
        isInitialized: true,
        processingState: 'idle',
        currentConfig: config,
        lastError: null,
      }));

      retryCountRef.current = 0;

      // Auto-start if configured
      if (options.autoStart) {
        await startProcessing();
      }

    } catch (error) {
      const audioError: AudioWorkletError = {
        type: 'configuration-error',
        message: `Failed to initialize AudioWorklet: ${(error as Error).message}`,
        code: 'WORKLET_INIT_ERROR',
        severity: 'critical',
        timestamp: performance.now(),
        processingContext: {
          frameNumber: 0,
          bufferSize: 0,
          sampleRate: 0,
          channelCount: 0,
        },
        recoverable: true,
        suggestedRecovery: 'Check microphone permissions and browser support',
      };

      setState(prev => ({
        ...prev,
        lastError: audioError,
        processingState: 'error',
      }));

      options.onError?.(audioError);
      throw error;
    }
  }, [isSupported, state.isInitialized, options, sendWorkletMessage, handleWorkletMessage]);

  // Start audio processing
  const startProcessing = useCallback(async (): Promise<void> => {
    if (!state.isInitialized) {
      await initialize();
    }

    if (state.isProcessing) {
      return; // Already processing
    }

    try {
      await sendWorkletMessage('start-processing');
      setState(prev => ({ ...prev, isProcessing: true, processingState: 'running' }));
    } catch (error) {
      const audioError: AudioWorkletError = {
        type: 'processing-error',
        message: `Failed to start processing: ${(error as Error).message}`,
        code: 'WORKLET_START_ERROR',
        severity: 'error',
        timestamp: performance.now(),
        processingContext: {
          frameNumber: 0,
          bufferSize: state.currentConfig?.bufferSize || 0,
          sampleRate: state.currentConfig?.inputSampleRate || 0,
          channelCount: 1,
        },
        recoverable: true,
        suggestedRecovery: 'Try restarting audio processing',
      };

      setState(prev => ({ ...prev, lastError: audioError }));
      options.onError?.(audioError);
      throw error;
    }
  }, [state.isInitialized, state.isProcessing, initialize, sendWorkletMessage, options]);

  // Stop audio processing
  const stopProcessing = useCallback((): void => {
    if (!state.isProcessing) {
      return; // Already stopped
    }

    try {
      sendWorkletMessage('stop-processing').catch(console.error);
      setState(prev => ({ ...prev, isProcessing: false, processingState: 'idle' }));
    } catch (error) {
      console.error('Failed to stop processing:', error);
    }
  }, [state.isProcessing, sendWorkletMessage]);

  // Update configuration
  const updateConfig = useCallback(async (config: Partial<AudioProcessorConfig>): Promise<void> => {
    if (!state.isInitialized) {
      throw new Error('AudioWorklet not initialized');
    }

    const updatedConfig = { ...state.currentConfig!, ...config };
    await sendWorkletMessage('update-settings', config);
    setState(prev => ({ ...prev, currentConfig: updatedConfig }));
  }, [state.isInitialized, state.currentConfig, sendWorkletMessage]);

  // Update VAD settings
  const updateVADSettings = useCallback(async (settings: Partial<VADThresholds>): Promise<void> => {
    await updateConfig({ vadSensitivity: 'custom' });
    await sendWorkletMessage('update-settings', { customThresholds: settings });
  }, [updateConfig, sendWorkletMessage]);

  // Reset buffers
  const resetBuffers = useCallback(async (): Promise<void> => {
    if (!state.isInitialized) {
      throw new Error('AudioWorklet not initialized');
    }

    await sendWorkletMessage('reset-buffers');
  }, [state.isInitialized, sendWorkletMessage]);

  // Get performance metrics
  const getMetrics = useCallback(async (): Promise<AudioPerformanceMetrics> => {
    if (!state.isInitialized) {
      throw new Error('AudioWorklet not initialized');
    }

    return await sendWorkletMessage('get-metrics');
  }, [state.isInitialized, sendWorkletMessage]);

  // Export performance data
  const exportPerformanceData = useCallback(async (): Promise<any> => {
    const metrics = await getMetrics();
    const exportData = {
      timestamp: new Date().toISOString(),
      sessionDuration: metrics.sessionDuration,
      configuration: state.currentConfig,
      performance: metrics,
      browserInfo: {
        userAgent: navigator.userAgent,
        audioContext: {
          sampleRate: audioContextRef.current?.sampleRate,
          state: audioContextRef.current?.state,
          baseLatency: audioContextRef.current?.baseLatency,
          outputLatency: audioContextRef.current?.outputLatency,
        },
        supportedFeatures: getSupportedFeatures(),
      },
    };

    return exportData;
  }, [getMetrics, state.currentConfig, getSupportedFeatures]);

  // Cleanup resources
  const cleanup = useCallback((): void => {
    stopProcessing();

    // Clear message queue
    messageQueueRef.current.clear();

    // Close media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    // Clear node references
    audioWorkletNodeRef.current = null;
    sourceNodeRef.current = null;

    setState({
      isInitialized: false,
      isProcessing: false,
      processingState: 'idle',
      currentConfig: null,
      lastError: null,
      metrics: null,
      lastChunk: null,
    });
  }, [stopProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Auto-retry on errors (if configured)
  useEffect(() => {
    if (state.lastError && options.maxRetries && retryCountRef.current < options.maxRetries) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000); // Exponential backoff, max 30s
      
      const retryTimeout = setTimeout(() => {
        retryCountRef.current++;
        console.log(`[useAudioWorklet] Retrying initialization (${retryCountRef.current}/${options.maxRetries})`);
        
        cleanup();
        initialize().catch(console.error);
      }, retryDelay);

      return () => clearTimeout(retryTimeout);
    }
    // Return undefined if no cleanup needed
    return undefined;
  }, [state.lastError, options.maxRetries, cleanup, initialize]);

  return {
    // State
    state,
    audioContext: audioContextRef.current,
    mediaStream: mediaStreamRef.current,

    // Control methods
    initialize,
    startProcessing,
    stopProcessing,
    cleanup,

    // Configuration methods
    updateConfig,
    updateVADSettings,
    resetBuffers,

    // Monitoring methods
    getMetrics,
    exportPerformanceData,

    // Utility methods
    isSupported,
    getSupportedFeatures,
  };
}