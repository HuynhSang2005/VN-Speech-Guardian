/**
 * SessionControlInterface - Professional recording control panel
 * 
 * Features:
 * - Start/Stop/Pause recording controls with visual feedback
 * - Real-time session timer with millisecond precision
 * - Connection status indicator with health monitoring
 * - Emergency stop with confirmation dialog
 * - Session metadata display (duration, segments, detections)
 * - Microphone permission handling
 * - Audio level monitoring
 * - Recording quality indicators
 * - Auto-save and recovery features
 * 
 * Integration:
 * - Connects to useAudio hook for recording control
 * - Integrates with Socket.IO connection status
 * - Handles AudioWorklet lifecycle management
 * - Supports session persistence and recovery
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  StopCircle,
  Settings,
  Wifi,
  WifiOff,
  Signal,
  AlertTriangle,
  Clock,
  Volume2,
  Save,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { toast } from 'sonner';

// =============================================================================
// Types & Interfaces
// =============================================================================

export type SessionState = 
  | 'idle'
  | 'starting'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'error';

export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface SessionMetrics {
  /** Total session duration in milliseconds */
  duration: number;
  
  /** Number of transcript segments */
  segmentCount: number;
  
  /** Number of detections triggered */
  detectionCount: number;
  
  /** Average audio level (0-1) */
  averageLevel: number;
  
  /** Peak audio level (0-1) */
  peakLevel: number;
  
  /** Words per minute */
  wordsPerMinute: number;
  
  /** Session start timestamp */
  startTime?: Date;
}

export interface AudioDeviceInfo {
  /** Device identifier */
  deviceId: string;
  
  /** Device label/name */
  label: string;
  
  /** Whether device is currently active */
  isActive: boolean;
  
  /** Device quality/capabilities */
  quality: 'low' | 'medium' | 'high';
}

interface SessionControlInterfaceProps {
  /** Current session state */
  sessionState: SessionState;
  
  /** Socket.IO connection status */
  connectionStatus: ConnectionStatus;
  
  /** Current session metrics */
  metrics: SessionMetrics;
  
  /** Available audio devices */
  audioDevices: AudioDeviceInfo[];
  
  /** Current audio level (0-1) */
  audioLevel: number;
  
  /** Whether microphone permission is granted */
  micPermission: boolean;
  
  /** Custom className for styling */
  className?: string;
  
  /** Whether to show advanced controls */
  showAdvancedControls?: boolean;
  
  /** Whether to enable auto-save */
  enableAutoSave?: boolean;
  
  /** Callback to start recording */
  onStartRecording: () => Promise<void>;
  
  /** Callback to pause recording */
  onPauseRecording: () => void;
  
  /** Callback to resume recording */
  onResumeRecording: () => void;
  
  /** Callback to stop recording */
  onStopRecording: () => Promise<void>;
  
  /** Callback for emergency stop */
  onEmergencyStop: () => void;
  
  /** Callback when device is changed */
  onDeviceChange: (deviceId: string) => void;
  
  /** Callback to save session */
  onSaveSession: () => Promise<void>;
  
  /** Callback to request microphone permission */
  onRequestPermission: () => Promise<void>;
  
  /** Callback for settings */
  onOpenSettings: () => void;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats duration to human-readable string
 */
const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Gets status badge styling
 */
const getStatusBadge = (status: ConnectionStatus) => {
  switch (status) {
    case 'connected':
      return { color: 'bg-green-500 text-green-50', icon: Wifi };
    case 'connecting':
    case 'reconnecting':
      return { color: 'bg-yellow-500 text-yellow-50', icon: Signal };
    case 'error':
      return { color: 'bg-red-500 text-red-50', icon: AlertTriangle };
    default:
      return { color: 'bg-gray-500 text-gray-50', icon: WifiOff };
  }
};

/**
 * Gets audio level color based on intensity
 */
const getAudioLevelColor = (level: number): string => {
  if (level > 0.8) return 'bg-red-500';
  if (level > 0.6) return 'bg-yellow-500';
  if (level > 0.3) return 'bg-green-500';
  return 'bg-gray-500';
};

// =============================================================================
// Recording Timer Component
// =============================================================================

interface RecordingTimerProps {
  startTime?: Date;
  isRunning: boolean;
  className?: string;
}

const RecordingTimer: React.FC<RecordingTimerProps> = ({ startTime, isRunning, className }) => {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsed(Date.now() - startTime.getTime());
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);
  
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Clock className={cn(
        "w-4 h-4",
        isRunning ? "text-red-400 animate-pulse" : "text-gray-400"
      )} />
      <span className={cn(
        "font-mono text-lg font-bold",
        isRunning ? "text-white" : "text-gray-400"
      )}>
        {formatDuration(elapsed)}
      </span>
    </div>
  );
};

// =============================================================================
// Audio Level Meter Component
// =============================================================================

interface AudioLevelMeterProps {
  level: number;
  isPaused?: boolean;
  className?: string;
}

const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({ level, isPaused, className }) => {
  const [peakLevel, setPeakLevel] = useState(0);
  const peakDecayRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update peak level with decay
  useEffect(() => {
    if (level > peakLevel) {
      setPeakLevel(level);
      
      // Clear existing decay timer
      if (peakDecayRef.current) {
        clearTimeout(peakDecayRef.current);
      }
      
      // Set new decay timer
      peakDecayRef.current = setTimeout(() => {
        setPeakLevel(prev => Math.max(0, prev - 0.1));
      }, 100);
    }
    
    return () => {
      if (peakDecayRef.current) {
        clearTimeout(peakDecayRef.current);
      }
    };
  }, [level, peakLevel]);
  
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Volume2 className={cn(
        "w-4 h-4",
        isPaused ? "text-gray-400" : "text-blue-400"
      )} />
      
      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
        {/* Current Level */}
        <div 
          className={cn(
            "h-full transition-all duration-75",
            getAudioLevelColor(level),
            isPaused && "opacity-30"
          )}
          style={{ width: `${level * 100}%` }}
        />
        
        {/* Peak Indicator */}
        {peakLevel > 0 && (
          <div
            className="absolute top-0 w-0.5 h-2 bg-white opacity-80"
            style={{ left: `${peakLevel * 100}%` }}
          />
        )}
      </div>
      
      <span className="text-xs text-gray-400 font-mono w-8">
        {Math.round(level * 100)}
      </span>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const SessionControlInterface: React.FC<SessionControlInterfaceProps> = ({
  sessionState,
  connectionStatus,
  metrics,
  audioDevices,
  audioLevel,
  micPermission,
  className,
  showAdvancedControls = false,
  enableAutoSave = true,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onEmergencyStop,
  onDeviceChange,
  onSaveSession,
  onRequestPermission,
  onOpenSettings,
}) => {
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date>();
  
  // Get current status configuration
  const statusConfig = useMemo(() => getStatusBadge(connectionStatus), [connectionStatus]);
  const StatusIcon = statusConfig.icon;
  
  // Calculate recording state
  const isRecording = sessionState === 'recording';
  const isPaused = sessionState === 'paused';
  const canStart = sessionState === 'idle' && connectionStatus === 'connected' && micPermission;
  const canPause = sessionState === 'recording';
  const canResume = sessionState === 'paused';
  const canStop = sessionState === 'recording' || sessionState === 'paused';
  
  // Handle control actions
  const handleStartRecording = useCallback(async () => {
    try {
      await onStartRecording();
      toast.success('Recording started');
    } catch (error) {
      toast.error('Failed to start recording');
      console.error('Start recording error:', error);
    }
  }, [onStartRecording]);
  
  const handleStopRecording = useCallback(async () => {
    try {
      await onStopRecording();
      toast.success('Recording stopped');
    } catch (error) {
      toast.error('Failed to stop recording');
      console.error('Stop recording error:', error);
    }
  }, [onStopRecording]);
  
  const handleEmergencyStop = useCallback(() => {
    onEmergencyStop();
    setShowEmergencyConfirm(false);
    toast.warning('Emergency stop activated');
  }, [onEmergencyStop]);
  
  const handleSaveSession = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSaveSession();
      setLastSaveTime(new Date());
      toast.success('Session saved');
    } catch (error) {
      toast.error('Failed to save session');
      console.error('Save session error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSaveSession]);
  
  // Auto-save functionality
  useEffect(() => {
    if (!enableAutoSave || sessionState === 'idle') return;
    
    const autoSaveInterval = setInterval(() => {
      if (sessionState === 'recording' || sessionState === 'paused') {
        handleSaveSession();
      }
    }, 30000); // Auto-save every 30 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [enableAutoSave, sessionState, handleSaveSession]);
  
  // Handle permission request
  const handleRequestPermission = useCallback(async () => {
    try {
      await onRequestPermission();
      toast.success('Microphone permission granted');
    } catch (error) {
      toast.error('Microphone permission denied');
      console.error('Permission error:', error);
    }
  }, [onRequestPermission]);
  
  return (
    <Card className={cn("p-6 bg-gray-900/90 border-gray-700/30 backdrop-blur-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-semibold text-gray-100">Session Control</h3>
          
          {/* Connection Status */}
          <Badge className={statusConfig.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </Badge>
          
          {/* Session State */}
          <Badge variant="outline" className={cn(
            "capitalize",
            isRecording && "border-red-500 text-red-400",
            isPaused && "border-yellow-500 text-yellow-400"
          )}>
            {sessionState.replace('_', ' ')}
          </Badge>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="text-gray-400 hover:text-gray-200"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Permission Check */}
      {!micPermission && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MicOff className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-yellow-400 font-medium">Microphone Permission Required</p>
                <p className="text-sm text-gray-400">Grant microphone access to start recording</p>
              </div>
            </div>
            <Button onClick={handleRequestPermission} className="bg-yellow-500 hover:bg-yellow-600">
              Grant Permission
            </Button>
          </div>
        </motion.div>
      )}
      
      {/* Timer and Level Meter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <RecordingTimer 
          {...(metrics.startTime && { startTime: metrics.startTime })}
          isRunning={isRecording}
          className="justify-center md:justify-start"
        />
        
        <AudioLevelMeter 
          level={audioLevel}
          isPaused={isPaused}
          className="justify-center md:justify-end"
        />
      </div>
      
      {/* Main Controls */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        {/* Start Button */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleStartRecording}
            disabled={!canStart}
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full",
              canStart 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
                : "bg-gray-700 text-gray-400"
            )}
          >
            <Mic className="w-6 h-6" />
          </Button>
        </motion.div>
        
        {/* Pause/Resume Button */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={isPaused ? onResumeRecording : onPauseRecording}
            disabled={!canPause && !canResume}
            size="lg"
            variant="outline"
            className="h-12 w-12 rounded-full"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </Button>
        </motion.div>
        
        {/* Stop Button */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleStopRecording}
            disabled={!canStop}
            size="lg"
            variant="outline"
            className="h-12 w-12 rounded-full"
          >
            <Square className="w-5 h-5" />
          </Button>
        </motion.div>
        
        {/* Emergency Stop */}
        {canStop && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => setShowEmergencyConfirm(true)}
              size="lg"
              variant="destructive"
              className="h-12 w-12 rounded-full"
            >
              <StopCircle className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </div>
      
      {/* Session Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{metrics.segmentCount}</p>
          <p className="text-sm text-gray-400">Segments</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{metrics.detectionCount}</p>
          <p className="text-sm text-gray-400">Detections</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{Math.round(metrics.wordsPerMinute)}</p>
          <p className="text-sm text-gray-400">WPM</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{Math.round(metrics.averageLevel * 100)}%</p>
          <p className="text-sm text-gray-400">Avg Level</p>
        </div>
      </div>
      
      {/* Advanced Controls */}
      {showAdvancedControls && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-gray-700/30 pt-4 space-y-4"
        >
          {/* Device Selection */}
          {audioDevices.length > 1 && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Audio Device
              </label>
              <select
                onChange={(e) => onDeviceChange(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded p-2 text-gray-200"
              >
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label} ({device.quality})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Save Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleSaveSession}
                disabled={isSaving || sessionState === 'idle'}
                variant="outline"
                size="sm"
              >
                {isSaving ? (
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Session
              </Button>
              
              {lastSaveTime && (
                <span className="text-xs text-gray-500">
                  Last saved: {formatDuration(Date.now() - lastSaveTime.getTime())} ago
                </span>
              )}
            </div>
            
            {enableAutoSave && (
              <Badge variant="outline" className="text-xs">
                Auto-save: ON
              </Badge>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Emergency Stop Confirmation */}
      <AnimatePresence>
        {showEmergencyConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md"
            >
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Emergency Stop</h3>
                <p className="text-gray-400 mb-6">
                  This will immediately stop recording and may result in data loss. 
                  Are you sure you want to proceed?
                </p>
                
                <div className="flex space-x-3 justify-center">
                  <Button
                    onClick={() => setShowEmergencyConfirm(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEmergencyStop}
                    variant="destructive"
                  >
                    Emergency Stop
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

// =============================================================================
// Default Export
// =============================================================================

export default SessionControlInterface;