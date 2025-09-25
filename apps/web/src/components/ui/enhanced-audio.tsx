/**
 * Enhanced Audio Components - P29 Enhanced Component Library
 * 
 * Specialized audio components for Speech Guardian:
 * - AudioVisualizer với real-time waveform display
 * - RecordingControls với state management và permissions
 * - TranscriptPanel với streaming text updates
 * - AudioPlayer với session playback và seeking
 * 
 * Based on: Web Audio API + Canvas/SVG visualization + React 19 patterns
 * Usage: /live recording interface, /sessions playback, dashboard analytics
 * Dependencies: Web Audio API, Canvas API, React 19 hooks, Framer Motion
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Play, 
  Pause, 
  Square, 
  AlertTriangle,
  Activity 
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AudioVisualizer - Real-time circular waveform display
 * Usage: Main recording interface, live audio monitoring
 */
interface AudioVisualizerProps {
  isActive?: boolean;
  audioStream?: MediaStream;
  sensitivity?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circular' | 'linear' | 'bars';
  color?: string;
  backgroundColor?: string;
  className?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive = false,
  audioStream,
  sensitivity = 1,
  size = 'lg',
  variant = 'circular',
  color = '#10B981',
  backgroundColor = '#1F2937',
  className,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const animationRef = React.useRef<number | null>(null);
  const dataArrayRef = React.useRef<Uint8Array | null>(null);

  // Size configurations
  const sizeConfig = {
    sm: { width: 120, height: 120, radius: 40 },
    md: { width: 200, height: 200, radius: 70 },
    lg: { width: 300, height: 300, radius: 100 },
    xl: { width: 400, height: 400, radius: 150 },
  };

  const config = sizeConfig[size];

  // Initialize audio analyzer
  React.useEffect(() => {
    if (!audioStream || !isActive) {
      // Cleanup previous analyzer
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
      return;
    }

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      analyserRef.current = analyser;
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      startVisualization();
    } catch (error) {
      console.error('Audio visualizer initialization failed:', error);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioStream, isActive]);

  // Visualization animation loop
  const startVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current || !dataArrayRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      if (dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      }
      
      // Clear canvas
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (variant === 'circular') {
        drawCircularWaveform(ctx, dataArrayRef.current);
      } else if (variant === 'linear') {
        drawLinearWaveform(ctx, dataArrayRef.current);
      } else {
        drawBarsWaveform(ctx, dataArrayRef.current);
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  // Circular waveform rendering
  const drawCircularWaveform = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    const centerX = config.width / 2;
    const centerY = config.height / 2;
    const radius = config.radius;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const sliceWidth = (Math.PI * 2) / dataArray.length;
    
    for (let i = 0; i < dataArray.length; i++) {
      const angle = sliceWidth * i;
      const amplitude = ((dataArray[i] ?? 0) / 255) * sensitivity;
      const x = centerX + Math.cos(angle) * (radius + amplitude * 30);
      const y = centerY + Math.sin(angle) * (radius + amplitude * 30);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
    ctx.stroke();
    
    // Center pulse
    const avgAmplitude = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255;
    const pulseRadius = 10 + (avgAmplitude * sensitivity * 20);
    
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // Linear waveform rendering
  const drawLinearWaveform = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    const width = config.width;
    const height = config.height;
    const sliceWidth = width / dataArray.length;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const amplitude = ((dataArray[i] ?? 0) / 255) * sensitivity;
      const y = height / 2 + (amplitude - 0.5) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
  };

  // Bar visualization rendering
  const drawBarsWaveform = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    const width = config.width;
    const height = config.height;
    const barWidth = width / dataArray.length;
    
    ctx.fillStyle = color;
    
    for (let i = 0; i < dataArray.length; i++) {
      const amplitude = ((dataArray[i] ?? 0) / 255) * sensitivity;
      const barHeight = amplitude * height;
      const x = i * barWidth;
      const y = height - barHeight;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        width={config.width}
        height={config.height}
        className={cn(
          "rounded-full transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-50"
        )}
      />
      
      {/* Fallback when not active */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center"
            style={{ width: config.width, height: config.height }}
          >
            <Mic className="w-8 h-8 text-muted-foreground/50" />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * RecordingControls - State management cho audio recording
 * Usage: Recording interface, permission handling, error states
 */
interface RecordingControlsProps {
  isRecording?: boolean;
  isPaused?: boolean;
  hasPermission?: boolean;
  onStartRecording?: () => void | Promise<void>;
  onStopRecording?: () => void | Promise<void>;
  onPauseRecording?: () => void | Promise<void>;
  onResumeRecording?: () => void | Promise<void>;
  onRequestPermission?: () => void | Promise<void>;
  duration?: number;
  className?: string;
  disabled?: boolean;
  error?: string;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording = false,
  isPaused = false,
  hasPermission = false,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onRequestPermission,
  duration = 0,
  className,
  disabled = false,
  error,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  // Format duration display
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  };

  // Handle async actions với loading state
  const handleAsyncAction = async (action?: () => void | Promise<void>) => {
    if (!action || isLoading || disabled) return;
    
    setIsLoading(true);
    try {
      await action();
    } catch (error) {
      console.error('Recording action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Permission request UI
  if (!hasPermission) {
    return (
      <div className={cn("flex flex-col items-center gap-4 p-6", className)}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">Microphone Permission Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please allow microphone access to start recording
          </p>
        </div>
        
        <button
          onClick={() => handleAsyncAction(onRequestPermission)}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading && (
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}
          Request Permission
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Duration Display */}
      <div className="text-center">
        <div className="text-3xl font-mono font-bold text-foreground">
          {formatDuration(duration)}
        </div>
        {isRecording && !isPaused && (
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
            <motion.div
              className="w-2 h-2 bg-red-500 rounded-full"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />
            Recording...
          </div>
        )}
        {isPaused && (
          <div className="text-sm text-amber-600 mt-2">Paused</div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <motion.button
            onClick={() => handleAsyncAction(onStartRecording)}
            disabled={isLoading || disabled}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <motion.div
                className="w-6 h-6 border-2 border-current border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </motion.button>
        ) : (
          <div className="flex items-center gap-3">
            {/* Pause/Resume */}
            <motion.button
              onClick={() => handleAsyncAction(isPaused ? onResumeRecording : onPauseRecording)}
              disabled={isLoading || disabled}
              className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </motion.button>

            {/* Stop */}
            <motion.button
              onClick={() => handleAsyncAction(onStopRecording)}
              disabled={isLoading || disabled}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Square className="w-6 h-6" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive"
          >
            <AlertTriangle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * TranscriptPanel - Real-time transcript display với detection highlights
 * Usage: Live transcription, detection alerts, text streaming
 */
interface TranscriptItem {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  detections?: Array<{
    type: 'warning' | 'block';
    severity: number;
    snippet: string;
    startOffset: number;
    endOffset: number;
  }>;
}

interface TranscriptPanelProps {
  transcripts?: TranscriptItem[];
  isStreaming?: boolean;
  maxHeight?: number;
  showTimestamps?: boolean;
  highlightDetections?: boolean;
  onClearTranscript?: () => void;
  className?: string;
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  transcripts = [],
  isStreaming = false,
  maxHeight = 400,
  showTimestamps = true,
  highlightDetections = true,
  onClearTranscript,
  className,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new transcripts
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Highlight text với detections
  const highlightText = (text: string, detections?: TranscriptItem['detections']) => {
    if (!highlightDetections || !detections || detections.length === 0) {
      return <span>{text}</span>;
    }

    // Sort detections by start offset
    const sortedDetections = [...detections].sort((a, b) => a.startOffset - b.startOffset);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedDetections.forEach((detection, index) => {
      // Add text before detection
      if (detection.startOffset > lastIndex) {
        parts.push(text.slice(lastIndex, detection.startOffset));
      }

      // Add highlighted detection
      const detectionText = text.slice(detection.startOffset, detection.endOffset);
      const highlightClass = detection.type === 'block' 
        ? 'bg-red-200 text-red-800 px-1 rounded' 
        : 'bg-amber-200 text-amber-800 px-1 rounded';
      
      parts.push(
        <span key={`detection-${index}`} className={highlightClass} title={`${detection.type}: ${detection.severity}%`}>
          {detectionText}
        </span>
      );

      lastIndex = detection.endOffset;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return <span>{parts}</span>;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { 
      hour12: false,
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={cn("flex flex-col border rounded-lg bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Live Transcript</h3>
          {isStreaming && (
            <motion.div
              className="flex items-center gap-1 text-sm text-green-600"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Activity className="w-3 h-3" />
              Streaming
            </motion.div>
          )}
        </div>
        
        {onClearTranscript && transcripts.length > 0 && (
          <button
            onClick={onClearTranscript}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Transcript Content */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 space-y-3 overflow-y-auto"
        style={{ maxHeight }}
      >
        {transcripts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Start recording to see transcript...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {transcripts.map((transcript) => (
              <motion.div
                key={transcript.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  "p-3 rounded-lg transition-colors",
                  transcript.isFinal 
                    ? "bg-muted/50" 
                    : "bg-blue-50 border border-blue-200"
                )}
              >
                {showTimestamps && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {formatTimestamp(transcript.timestamp)}
                  </div>
                )}
                
                <div className="text-sm leading-relaxed">
                  {highlightText(transcript.text, transcript.detections)}
                </div>

                {/* Detection summary */}
                {transcript.detections && transcript.detections.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span className="text-muted-foreground">
                        {transcript.detections.length} detection(s) found
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// Exports
export {
  AudioVisualizer,
  RecordingControls,
  TranscriptPanel,
};

export type {
  AudioVisualizerProps,
  RecordingControlsProps,
  TranscriptPanelProps,
  TranscriptItem,
};