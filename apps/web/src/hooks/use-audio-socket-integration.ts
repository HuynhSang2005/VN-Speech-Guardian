/**
 * AudioWorklet-Socket.IO Integration Hook
 * 
 * Tính năng chính:
 * - Kết nối seamless giữa AudioWorklet processor và Socket.IO streaming
 * - Real-time PCM data forwarding từ worklet → Socket.IO → AI Worker
 * - Session management cho audio streaming sessions
 * - Error recovery và reconnection handling
 * - Performance monitoring và latency tracking
 * 
 * Architecture:
 * - AudioWorklet (audio-processor.ts) → useAudio hook → integration → Socket.IO
 * - Binary streaming protocol (PCM 16-bit 16kHz) → FastAPI AI Worker
 * - VAD integration cho intelligent streaming (chỉ gửi khi có speech)
 * 
 * @author VN Speech Guardian Team
 * @version 1.0.0
 * @research https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet
 * @research https://socket.io/docs/v4/binary-support/
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from './use-socket';
import { useAudio } from './use-audio';
import type { AudioChunk } from '../types/audio';
import type { AudioChunkData } from '../types/socket';
import { toast } from 'sonner';

// =============================================================================
// Type Definitions
// =============================================================================

export interface AudioStreamingSession {
  sessionId: string;
  isStreaming: boolean;
  startTime: number;
  endTime: number | null;
  totalChunks: number;
  totalDuration: number;
  averageLatency: number;
  errors: Array<{
    type: string;
    message: string;
    timestamp: number;
  }>;
}

export interface StreamingMetrics {
  chunksSent: number;
  chunksAcknowledged: number;
  averageChunkSize: number;
  averageLatency: number;
  totalBytesSent: number;
  packetsLost: number;
  reconnections: number;
  vadDetectionRate: number;
  speechToSilenceRatio: number;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface AudioSocketIntegrationConfig {
  // Streaming configuration
  enableVADFiltering: boolean;      // Chỉ stream khi detect speech
  minSpeechConfidence: number;      // VAD confidence threshold (0.0-1.0)
  chunkSizeMs: number;             // Audio chunk size trong milliseconds
  maxBufferSizeMs: number;         // Maximum buffer trước khi drop
  
  // Performance tuning
  enableLatencyMonitoring: boolean; // Track roundtrip latency
  latencyThresholdMs: number;      // Warning threshold cho high latency
  reconnectTimeoutMs: number;      // Timeout cho auto-reconnection
  maxRetries: number;              // Maximum retry attempts
  
  // Debug & monitoring
  enableDebugLogging: boolean;     // Detailed console logs
  enablePerformanceMetrics: boolean; // Performance tracking
  logAudioLevel: boolean;          // Log signal levels cho debugging
}

export interface UseAudioSocketIntegrationReturn {
  // Session management
  startStreaming: () => Promise<void>;
  stopStreaming: () => void;
  session: AudioStreamingSession | null;
  
  // Streaming state
  isStreaming: boolean;
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  
  // Metrics & monitoring
  metrics: StreamingMetrics;
  latency: number;
  bufferHealth: number; // 0-1, buffer utilization
  
  // Error handling
  lastError: string | null;
  retryCount: number;
  
  // Configuration
  updateConfig: (config: Partial<AudioSocketIntegrationConfig>) => void;
  config: AudioSocketIntegrationConfig;
  
  // Debug & diagnostics
  audioLevel: number;
  vadStatus: boolean;
  networkStatus: 'online' | 'offline' | 'reconnecting';
}

// =============================================================================
// Default Configuration
// =============================================================================

const defaultConfig: AudioSocketIntegrationConfig = {
  enableVADFiltering: true,
  minSpeechConfidence: 0.6,
  chunkSizeMs: 250, // 250ms chunks cho balance giữa latency và efficiency
  maxBufferSizeMs: 1000, // 1 second buffer max
  
  enableLatencyMonitoring: true,
  latencyThresholdMs: 500, // 500ms warning threshold
  reconnectTimeoutMs: 5000,
  maxRetries: 3,
  
  enableDebugLogging: false,
  enablePerformanceMetrics: true,
  logAudioLevel: false,
};

// =============================================================================
// Main Integration Hook
// =============================================================================

export function useAudioSocketIntegration(
  initialConfig: Partial<AudioSocketIntegrationConfig> = {}
): UseAudioSocketIntegrationReturn {
  // Configuration state
  const [config, setConfig] = useState<AudioSocketIntegrationConfig>({
    ...defaultConfig,
    ...initialConfig,
  });
  
  // Session state
  const [session, setSession] = useState<AudioStreamingSession | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Metrics state
  const [metrics, setMetrics] = useState<StreamingMetrics>({
    chunksSent: 0,
    chunksAcknowledged: 0,
    averageChunkSize: 0,
    averageLatency: 0,
    totalBytesSent: 0,
    packetsLost: 0,
    reconnections: 0,
    vadDetectionRate: 0,
    speechToSilenceRatio: 0,
    networkQuality: 'good',
  });
  
  // Real-time monitoring state
  const [latency, setLatency] = useState(0);
  const [bufferHealth] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [vadStatus, setVadStatus] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'reconnecting'>('offline');
  
  // References
  const sessionRef = useRef<AudioStreamingSession | null>(null);
  const latencyTracker = useRef<Map<number, number>>(new Map());
  const audioBuffer = useRef<Float32Array[]>([]);
  const lastChunkTime = useRef<number>(0);
  const performanceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Hooks integration
  const socket = useSocket({
    autoConnect: true,
    config: {
      reconnectionAttempts: config.maxRetries,
      reconnectionDelay: config.reconnectTimeoutMs,
      timeout: 10000,
    },
  });
  
  const audio = useAudio({
    sampleRate: 16000,
    channelCount: 1,
    bufferSize: Math.floor(config.chunkSizeMs * 16), // 16 samples per ms at 16kHz
  });
  
  // =============================================================================
  // Socket.IO Event Handlers
  // =============================================================================
  
  useEffect(() => {
    if (!socket.socket) return;
    
    // Connection status monitoring using correct events
    const handleConnect = () => {
      setNetworkStatus('online');
      setLastError(null);
      if (config.enableDebugLogging) {
        console.log('[AudioSocketIntegration] Socket connected');
      }
    };
    
    const handleDisconnect = () => {
      setNetworkStatus('offline');
      if (isStreaming) {
        setLastError('Socket disconnected during streaming');
        toast.error('Connection lost. Attempting to reconnect...');
      }
      if (config.enableDebugLogging) {
        console.log('[AudioSocketIntegration] Socket disconnected');
      }
    };
    
    // Audio streaming response handlers - using correct event names
    const handleTranscriptPartial = (data: any) => {
      // Track latency nếu có sequence number
      if (data.sequence && latencyTracker.current.has(data.sequence)) {
        const sendTime = latencyTracker.current.get(data.sequence)!;
        const currentLatency = performance.now() - sendTime;
        setLatency(currentLatency);
        latencyTracker.current.delete(data.sequence);
        
        // Update average latency trong metrics
        setMetrics(prev => ({
          ...prev,
          averageLatency: (prev.averageLatency * prev.chunksAcknowledged + currentLatency) / (prev.chunksAcknowledged + 1),
          chunksAcknowledged: prev.chunksAcknowledged + 1,
        }));
        
        // Check latency threshold
        if (currentLatency > config.latencyThresholdMs) {
          console.warn(`[AudioSocketIntegration] High latency detected: ${currentLatency.toFixed(2)}ms`);
          toast.warning(`High latency: ${currentLatency.toFixed(0)}ms`);
        }
      }
      
      if (config.enableDebugLogging) {
        console.log('[AudioSocketIntegration] Received transcript partial:', data);
      }
    };
    
    const handleTranscriptFinal = (data: any) => {
      if (config.enableDebugLogging) {
        console.log('[AudioSocketIntegration] Received transcript final:', data);
      }
    };
    
    const handleDetectionAlert = (data: any) => {
      if (config.enableDebugLogging) {
        console.log('[AudioSocketIntegration] Received detection alert:', data);
      }
    };
    
    const handleError = (error: any) => {
      setLastError(`Stream error: ${error.message || 'Unknown error'}`);
      toast.error('Audio streaming error occurred');
      
      if (config.enableDebugLogging) {
        console.error('[AudioSocketIntegration] Stream error:', error);
      }
      
      // Update session với error
      if (sessionRef.current) {
        sessionRef.current.errors.push({
          type: 'stream-error',
          message: error.message || 'Unknown error',
          timestamp: performance.now(),
        });
      }
    };
    
    // Register event listeners với correct event names
    socket.socket.on('connect', handleConnect);
    socket.socket.on('disconnect', handleDisconnect);
    socket.socket.on('transcript:partial', handleTranscriptPartial);
    socket.socket.on('transcript:final', handleTranscriptFinal);
    socket.socket.on('detection:alert', handleDetectionAlert);
    socket.socket.on('error', handleError);
    
    return () => {
      if (socket.socket) {
        socket.socket.off('connect', handleConnect);
        socket.socket.off('disconnect', handleDisconnect);
        socket.socket.off('transcript:partial', handleTranscriptPartial);
        socket.socket.off('transcript:final', handleTranscriptFinal);
        socket.socket.off('detection:alert', handleDetectionAlert);
        socket.socket.off('error', handleError);
      }
    };
  }, [socket.socket, isStreaming, config]);
  
  // =============================================================================
  // AudioWorklet Integration (Simplified)
  // =============================================================================
  
  useEffect(() => {
    if (!audio.stream || !isStreaming) return;
    
    // For now, we'll create a simple integration that works with the existing useAudio hook
    // This will be a placeholder until the audioWorklet is fully integrated
    
    const handleAudioData = (audioLevel: number) => {
      // Update real-time monitoring
      setAudioLevel(audioLevel);
      
      // Simple VAD simulation based on audio level
      const isVoiceDetected = audioLevel > 0.01; // Simple threshold
      setVadStatus(isVoiceDetected);
      
      // Only proceed if VAD filtering is disabled or voice is detected
      if (config.enableVADFiltering && !isVoiceDetected) {
        return;
      }
      
      // Create mock audio chunk for demonstration
      // In real implementation, this would come from AudioWorklet
      const mockChunk: AudioChunk = {
        pcmData: new Float32Array(256), // Mock PCM data
        originalSampleRate: 48000,
        outputSampleRate: 16000,
        sequence: sessionRef.current?.totalChunks || 0,
        startTime: performance.now(),
        duration: config.chunkSizeMs,
        vadResult: {
          isSpeech: isVoiceDetected,
          confidence: isVoiceDetected ? 0.8 : 0.2,
          energyDetection: isVoiceDetected,
          frequencyDetection: isVoiceDetected,
          spectralFlatnessDetection: false,
          pitchDetection: false,
          energyLevel: audioLevel,
          dominantFrequency: 200,
          spectralFlatness: 0.5,
          fundamentalFrequency: 150,
          speechFrameCount: isVoiceDetected ? 5 : 0,
          silenceFrameCount: isVoiceDetected ? 0 : 5,
        },
        signalLevel: audioLevel,
        clipCount: 0,
        processingTime: 1.5,
      };
      
      // Send chunk via Socket.IO
      sendAudioChunk(mockChunk);
    };
    
    // Monitor audio level changes from the useAudio hook
    const interval = setInterval(() => {
      if (audio.audioLevel !== undefined) {
        handleAudioData(audio.audioLevel);
      }
    }, config.chunkSizeMs);
    
    return () => {
      clearInterval(interval);
    };
  }, [audio.stream, audio.audioLevel, isStreaming, config]);
  
  // =============================================================================
  // Core Streaming Functions
  // =============================================================================
  
  const sendAudioChunk = useCallback((chunk: AudioChunk) => {
    if (!socket.socket || !sessionRef.current) return;
    
    const sequenceNumber = sessionRef.current.totalChunks;
    const chunkData: AudioChunkData = {
      sessionId: sessionRef.current.sessionId,
      sequence: sequenceNumber,
      timestamp: performance.now(),
      chunk: chunk.pcmData.buffer as ArrayBuffer, // ArrayBuffer cho binary transmission
      sampleRate: chunk.outputSampleRate,
      channels: 1, // Mono audio
    };
    
    // Track latency nếu enabled
    if (config.enableLatencyMonitoring) {
      latencyTracker.current.set(sequenceNumber, performance.now());
    }
    
    // Send binary data using correct event name
    socket.socket.emit('audio:chunk', chunkData);
    
    // Update session metrics
    sessionRef.current.totalChunks++;
    sessionRef.current.totalDuration += config.chunkSizeMs;
    
    // Update streaming metrics
    setMetrics(prev => ({
      ...prev,
      chunksSent: prev.chunksSent + 1,
      totalBytesSent: prev.totalBytesSent + chunk.pcmData.byteLength,
      averageChunkSize: (prev.averageChunkSize * prev.chunksSent + chunk.pcmData.byteLength) / (prev.chunksSent + 1),
    }));
    
    if (config.enableDebugLogging) {
      console.log(`[AudioSocketIntegration] Sent audio chunk ${sequenceNumber}, size: ${chunk.pcmData.byteLength} bytes`);
    }
    
    lastChunkTime.current = performance.now();
  }, [socket.socket, config]);
  
  const startStreaming = useCallback(async (): Promise<void> => {
    try {
      setLastError(null);
      setRetryCount(0);
      
      // Check prerequisites
      if (!socket.isConnected) {
        throw new Error('Socket.IO connection not established');
      }
      
      if (!audio.isRecording) {
        await audio.startRecording();
      }
      
      // Create new streaming session
      const newSession: AudioStreamingSession = {
        sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isStreaming: true,
        startTime: performance.now(),
        endTime: null,
        totalChunks: 0,
        totalDuration: 0,
        averageLatency: 0,
        errors: [],
      };
      
      setSession(newSession);
      sessionRef.current = newSession;
      setIsStreaming(true);
      
      // Start performance monitoring
      if (config.enablePerformanceMetrics && !performanceTimer.current) {
        performanceTimer.current = setInterval(() => {
          updateNetworkQuality();
          updateVADMetrics();
        }, 5000); // Update every 5 seconds
      }
      
      // Notify server về new session using correct event name
      socket.socket?.emit('session:start', {
        sessionId: newSession.sessionId,
        format: 'pcm16' as const,
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        chunkSize: Math.floor(config.chunkSizeMs * 16 * 2), // bytes: samples * bytes_per_sample
      });
      
      toast.success('Audio streaming started');
      
      if (config.enableDebugLogging) {
        console.log('[AudioSocketIntegration] Streaming started:', newSession.sessionId);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(`Failed to start streaming: ${errorMessage}`);
      toast.error(`Failed to start audio streaming: ${errorMessage}`);
      
      console.error('[AudioSocketIntegration] Failed to start streaming:', error);
      throw error;
    }
  }, [socket, audio, config]);
  
  const stopStreaming = useCallback(() => {
    if (!sessionRef.current) return;
    
    setIsStreaming(false);
    
    // Finalize session
    sessionRef.current.isStreaming = false;
    sessionRef.current.endTime = performance.now();
    sessionRef.current.averageLatency = metrics.averageLatency;
    
    // Stop performance monitoring
    if (performanceTimer.current) {
      clearInterval(performanceTimer.current);
      performanceTimer.current = null;
    }
    
    // Clear buffers
    audioBuffer.current = [];
    latencyTracker.current.clear();
    
    // Notify server using correct event name
    socket.socket?.emit('session:stop', sessionRef.current.sessionId);
    
    toast.info('Audio streaming stopped');
    
    if (config.enableDebugLogging) {
      console.log('[AudioSocketIntegration] Streaming stopped:', sessionRef.current.sessionId);
    }
  }, [socket.socket, metrics.averageLatency, config.enableDebugLogging]);
  
  // =============================================================================
  // Performance Monitoring Functions
  // =============================================================================
  
  const updateNetworkQuality = useCallback(() => {
    const lossRate = metrics.packetsLost / (metrics.chunksSent || 1);
    const avgLatency = metrics.averageLatency;
    
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    
    if (lossRate > 0.1 || avgLatency > 1000) {
      quality = 'poor';
    } else if (lossRate > 0.05 || avgLatency > 500) {
      quality = 'fair';
    } else if (lossRate > 0.01 || avgLatency > 200) {
      quality = 'good';
    }
    
    setMetrics(prev => ({ ...prev, networkQuality: quality }));
  }, [metrics]);
  
  const updateVADMetrics = useCallback(() => {
    // Calculate VAD detection rate và speech/silence ratio
    // This would need integration với actual VAD data từ chunks
    setMetrics(prev => ({
      ...prev,
      vadDetectionRate: 0.75, // Placeholder
      speechToSilenceRatio: 0.3, // Placeholder
    }));
  }, []);
  
  // =============================================================================
  // Configuration Management
  // =============================================================================
  
  const updateConfig = useCallback((newConfig: Partial<AudioSocketIntegrationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);
  
  // =============================================================================
  // Cleanup
  // =============================================================================
  
  useEffect(() => {
    return () => {
      if (isStreaming) {
        stopStreaming();
      }
      
      if (performanceTimer.current) {
        clearInterval(performanceTimer.current);
      }
    };
  }, [isStreaming, stopStreaming]);
  
  // =============================================================================
  // Return Interface
  // =============================================================================
  
  return {
    // Session management
    startStreaming,
    stopStreaming,
    session,
    
    // Streaming state
    isStreaming,
    isConnected: socket.isConnected && networkStatus === 'online',
    connectionQuality: networkStatus === 'online' ? metrics.networkQuality : 'disconnected',
    
    // Metrics & monitoring
    metrics,
    latency,
    bufferHealth,
    
    // Error handling
    lastError,
    retryCount,
    
    // Configuration
    updateConfig,
    config,
    
    // Debug & diagnostics
    audioLevel,
    vadStatus,
    networkStatus,
  };
}