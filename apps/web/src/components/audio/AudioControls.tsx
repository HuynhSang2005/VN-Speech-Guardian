/**
 * Audio Controls Component - VN Speech Guardian
 * 
 * Advanced audio control interface với real-time visualization
 * và comprehensive monitoring features
 * 
 * Features:
 * - Start/Stop recording với visual feedback
 * - Real-time waveform visualization
 * - VAD status indicators
 * - Performance metrics display
 * - Error handling và recovery
 * 
 * @author VN Speech Guardian Team
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, 
  MicOff, 
  Activity, 
  AlertTriangle, 
  BarChart3,
  Cpu,
  Zap,
} from 'lucide-react';
import { useAudioWorklet } from '@/hooks/useAudioWorklet';
import type { AudioChunk, AudioPerformanceMetrics, AudioWorkletError } from '@/types/audio';

interface AudioControlsProps {
  /** Callback khi có audio chunk mới */
  onAudioChunk?: (chunk: AudioChunk) => void;
  
  /** Callback khi có error */
  onError?: (error: AudioWorkletError) => void;
  
  /** Auto-start recording khi component mount */
  autoStart?: boolean;
  
  /** Enable advanced monitoring features */
  enableAdvancedMonitoring?: boolean;
  
  /** Custom styling classes */
  className?: string;
}

interface VisualizationData {
  waveform: Float32Array;
  spectrum: Float32Array;
  vadConfidence: number;
  signalLevel: number;
  isSpeechActive: boolean;
}

export function AudioControls({
  onAudioChunk,
  onError,
  autoStart = false,
  enableAdvancedMonitoring = false,
  className = '',
}: AudioControlsProps) {
  // Audio worklet hook
  const {
    state,
    initialize,
    startProcessing,
    stopProcessing,
    cleanup,
    isSupported,
  } = useAudioWorklet({
    inputConfig: {
      sampleRate: 48000,
      channelCount: 1,
      latencyHint: 'interactive',
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
    },
    processingConfig: {
      outputSampleRate: 16000,
      chunkSize: 400, // 400ms chunks
      vadEnabled: true,
      vadSensitivity: 'medium',
      enablePerformanceMonitoring: enableAdvancedMonitoring,
      debug: false,
      enableLogging: true,
    },
    onAudioChunk: (chunk) => {
      updateVisualization(chunk);
      onAudioChunk?.(chunk);
    },
    onError: (error) => {
      console.error('[AudioControls] Audio error:', error);
      onError?.(error);
    },
    onStatusChange: (status, details) => {
      console.log('[AudioControls] Status change:', status, details);
    },
    onPerformanceUpdate: (metrics) => {
      setPerformanceMetrics(metrics);
    },
    autoStart,
    enablePerformanceMonitoring: enableAdvancedMonitoring,
    maxRetries: 3,
  });

  // Local state
  const [isRecording, setIsRecording] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<AudioPerformanceMetrics | null>(null);
  const [visualizationData, setVisualizationData] = useState<VisualizationData>({
    waveform: new Float32Array(128),
    spectrum: new Float32Array(64),
    vadConfidence: 0,
    signalLevel: 0,
    isSpeechActive: false,
  });

  // Canvas refs for visualization
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);

  // Browser support check
  const browserSupported = isSupported();

  // Update visualization data từ audio chunk
  const updateVisualization = useCallback((chunk: AudioChunk) => {
    const waveform = chunk.pcmData.slice(0, 128);
    const spectrum = new Float32Array(64); // Placeholder - would need FFT in real implementation
    
    setVisualizationData({
      waveform,
      spectrum,
      vadConfidence: chunk.vadResult.confidence,
      signalLevel: chunk.signalLevel,
      isSpeechActive: chunk.vadResult.isSpeech,
    });
  }, []);

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const waveform = visualizationData.waveform;
    
    // Clear canvas
    ctx.fillStyle = '#1f2937'; // Dark background
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    ctx.strokeStyle = visualizationData.isSpeechActive ? '#10b981' : '#6b7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const sliceWidth = width / waveform.length;
    let x = 0;
    
    for (let i = 0; i < waveform.length; i++) {
      const sample = waveform[i];
      if (sample !== undefined) {
        const v = sample * 0.5; // Scale amplitude
        const y = (v * height / 2) + (height / 2);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
    
    // Draw center line
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [visualizationData]);

  // Draw spectrum analyzer
  const drawSpectrum = useCallback(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const spectrum = visualizationData.spectrum;
    
    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);
    
    // Draw spectrum bars
    const barWidth = width / spectrum.length;
    
    for (let i = 0; i < spectrum.length; i++) {
      const value = spectrum[i];
      if (value !== undefined) {
        const barHeight = value * height;
        const x = i * barWidth;
        const y = height - barHeight;
        
        // Color based on frequency range
        const hue = (i / spectrum.length) * 240; // Blue to red
        ctx.fillStyle = `hsl(${hue}, 70%, ${visualizationData.isSpeechActive ? '60%' : '40%'})`;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }
    }
  }, [visualizationData]);

  // Animation loop cho visualization
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      drawWaveform();
      drawSpectrum();
      animationId = requestAnimationFrame(animate);
    };
    
    if (isRecording) {
      animate();
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isRecording, drawWaveform, drawSpectrum]);

  // Handle record toggle
  const handleRecordToggle = useCallback(async () => {
    try {
      if (!isRecording) {
        // Start recording
        if (!state.isInitialized) {
          await initialize();
        }
        await startProcessing();
        setIsRecording(true);
      } else {
        // Stop recording
        stopProcessing();
        setIsRecording(false);
      }
    } catch (error) {
      console.error('[AudioControls] Failed to toggle recording:', error);
      setIsRecording(false);
    }
  }, [isRecording, state.isInitialized, initialize, startProcessing, stopProcessing]);

  // Get status color based on processing state
  const getStatusColor = (): string => {
    switch (state.processingState) {
      case 'running': return 'bg-green-500';
      case 'initializing': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status text
  const getStatusText = (): string => {
    switch (state.processingState) {
      case 'running': return 'Recording Active';
      case 'initializing': return 'Initializing...';
      case 'error': return 'Error Occurred';
      case 'idle': return 'Ready';
      default: return 'Unknown';
    }
  };

  // Format processing time
  const formatProcessingTime = (time: number): string => {
    return `${time.toFixed(1)}ms`;
  };

  // Format signal level
  const formatSignalLevel = (level: number): string => {
    return `${(level * 100).toFixed(1)}%`;
  };

  // Auto-start if configured
  useEffect(() => {
    if (autoStart && browserSupported && !isRecording) {
      handleRecordToggle().catch(console.error);
    }
  }, [autoStart, browserSupported, isRecording, handleRecordToggle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (!browserSupported) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              AudioWorklet không được hỗ trợ trong trình duyệt này. 
              Vui lòng sử dụng Chrome, Firefox, hoặc Edge phiên bản mới nhất.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Controls Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Audio Controls
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <span className="text-sm font-normal text-muted-foreground">
                {getStatusText()}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Record Button */}
          <div className="flex items-center justify-center">
            <Button
              onClick={handleRecordToggle}
              disabled={state.processingState === 'initializing'}
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className="min-w-32"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Start
                </>
              )}
            </Button>
          </div>

          {/* VAD Status */}
          {isRecording && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Voice Activity:</span>
              <Badge variant={visualizationData.isSpeechActive ? "default" : "secondary"}>
                {visualizationData.isSpeechActive ? "Speaking" : "Silent"}
              </Badge>
            </div>
          )}

          {/* Signal Level */}
          {isRecording && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Signal Level:</span>
                <span className="font-mono">
                  {formatSignalLevel(visualizationData.signalLevel)}
                </span>
              </div>
              <Progress 
                value={Math.min(visualizationData.signalLevel * 100, 100)} 
                className="h-2"
              />
            </div>
          )}

          {/* VAD Confidence */}
          {isRecording && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>VAD Confidence:</span>
                <span className="font-mono">
                  {(visualizationData.vadConfidence * 100).toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={visualizationData.vadConfidence * 100} 
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waveform Visualization */}
      {isRecording && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Waveform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <canvas
              ref={waveformCanvasRef}
              width={400}
              height={100}
              className="w-full h-20 bg-gray-900 rounded"
            />
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {enableAdvancedMonitoring && performanceMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Avg Processing:</span>
                <div className="font-mono">
                  {formatProcessingTime(performanceMetrics.averageProcessingTime)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Processing Load:</span>
                <div className="font-mono">
                  {(performanceMetrics.processingLoad * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Frames Processed:</span>
                <div className="font-mono">
                  {performanceMetrics.totalFramesProcessed.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Dropped Frames:</span>
                <div className="font-mono text-red-500">
                  {performanceMetrics.droppedFrames}
                </div>
              </div>
            </div>
            
            {performanceMetrics.processingLoad > 0.8 && (
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  High processing load detected. Consider reducing audio quality.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {state.lastError && (
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-semibold">{state.lastError.type}</div>
                  <div>{state.lastError.message}</div>
                  {state.lastError.suggestedRecovery && (
                    <div className="text-sm opacity-90">
                      Suggestion: {state.lastError.suggestedRecovery}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}