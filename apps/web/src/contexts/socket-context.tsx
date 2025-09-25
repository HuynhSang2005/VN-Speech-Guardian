/**
 * Socket.IO React Context Provider
 * VN Speech Guardian - Centralized Real-time Communication Context
 * 
 * Features:
 * - Centralized socket management across the application
 * - Connection state sharing between components
 * - Namespace-based organization for different features
 * - Performance optimized with React 19 patterns
 * - Error boundary integration
 * - Development debugging tools
 */

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  useMemo,
  type ReactNode
} from 'react';
import { useSocket, useAudioStream, useTranscriptEvents, useDetectionAlerts } from '../hooks/use-socket';
import { toast } from 'sonner';
import type {
  SocketConnectionState,
  SocketErrorInfo,
  UseSocketReturn,
  ConnectionHealthMetrics,
  FinalTranscriptData,
  DetectionAlertData,
} from '../types/socket';

// ==================== CONTEXT TYPES ====================

/**
 * Socket context value interface
 */
export interface SocketContextValue {
  // Main Socket Connection
  socket: UseSocketReturn;
  
  // Audio Streaming
  audio: {
    streamChunk: (audioData: ArrayBuffer, sessionId: string, sequence: number) => void;
    startSession: (sessionId: string) => void;
    stopSession: (sessionId: string) => void;
    isStreaming: boolean;
  };
  
  // Transcript Management
  transcript: {
    partialText: string;
    finalTranscripts: FinalTranscriptData[];
    clearTranscripts: () => void;
    getTranscriptForSession: (sessionId: string) => FinalTranscriptData[];
  };
  
  // Detection Alerts
  detection: {
    alerts: DetectionAlertData[];
    recentAlerts: DetectionAlertData[];
    clearAlerts: () => void;
    getAlertsForSession: (sessionId: string) => DetectionAlertData[];
    alertStats: {
      total: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  
  // Connection Status
  connection: {
    state: SocketConnectionState;
    isConnected: boolean;
    isConnecting: boolean;
    error: SocketErrorInfo | null;
    metrics: ConnectionHealthMetrics;
    retry: () => void;
    clearError: () => void;
  };
  
  // Development Tools
  debug: {
    isEnabled: boolean;
    logs: DebugLog[];
    clearLogs: () => void;
    enableLogging: (enabled: boolean) => void;
  };
}

/**
 * Debug log entry
 */
interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'connection' | 'audio' | 'transcript' | 'detection' | 'event' | 'system';
  message: string;
  data?: any;
}

/**
 * Socket provider props
 */
export interface SocketProviderProps {
  children: ReactNode;
  
  // Configuration
  url?: string;
  namespace?: string;
  autoConnect?: boolean;
  debugMode?: boolean;
  
  // Event Handlers
  onConnectionChange?: (state: SocketConnectionState) => void;
  onError?: (error: SocketErrorInfo) => void;
  onAudioStreamStart?: (sessionId: string) => void;
  onAudioStreamStop?: (sessionId: string) => void;
  onTranscriptReceived?: (transcript: FinalTranscriptData) => void;
  onDetectionAlert?: (alert: DetectionAlertData) => void;
}

// ==================== CONTEXT CREATION ====================

const SocketContext = createContext<SocketContextValue | null>(null);

/**
 * Hook to access socket context
 * @throws Error if used outside SocketProvider
 */
export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error(
      'useSocketContext must be used within a SocketProvider. ' +
      'Make sure to wrap your component tree with <SocketProvider>.'
    );
  }
  
  return context;
}

/**
 * Hook to access only connection status (lightweight)
 */
export function useConnectionStatus() {
  const { connection } = useSocketContext();
  return connection;
}

/**
 * Hook to access only audio streaming functionality
 */
export function useAudioContext() {
  const { audio } = useSocketContext();
  return audio;
}

/**
 * Hook to access only transcript functionality
 */
export function useTranscriptContext() {
  const { transcript } = useSocketContext();
  return transcript;
}

/**
 * Hook to access only detection functionality
 */
export function useDetectionContext() {
  const { detection } = useSocketContext();
  return detection;
}

// ==================== PROVIDER COMPONENT ====================

/**
 * Socket.IO Context Provider Component
 */
export function SocketProvider({
  children,
  url,
  namespace = '/audio',
  autoConnect = true,
  debugMode = process.env.NODE_ENV === 'development',
  onConnectionChange,
  onError,
  onAudioStreamStart,
  onAudioStreamStop,
  onTranscriptReceived,
  onDetectionAlert,
}: SocketProviderProps) {
  
  // ==================== STATE MANAGEMENT ====================
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [debugEnabled, setDebugEnabled] = useState(debugMode);
  
  // ==================== SOCKET HOOKS ====================
  
  // Main socket connection
  const socket = useSocket({
    config: {
      url: url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
      namespace,
    },
    autoConnect,
    onConnect: () => {
      addDebugLog('info', 'connection', 'Socket connected');
      onConnectionChange?.('connected');
    },
    onDisconnect: (reason) => {
      addDebugLog('warn', 'connection', 'Socket disconnected', { reason });
      onConnectionChange?.('disconnected');
      setIsStreaming(false);
    },
    onError: (error) => {
      addDebugLog('error', 'connection', 'Socket error', error);
      onError?.(error);
    },
    onReconnect: (attempts) => {
      addDebugLog('info', 'connection', `Reconnected after ${attempts} attempts`);
    },
  });
  
  // Audio streaming functionality
  const audioStream = useAudioStream();
  
  // Transcript events
  const transcriptEvents = useTranscriptEvents();
  
  // Detection alerts
  const detectionAlerts = useDetectionAlerts();
  
  // ==================== DEBUG LOGGING ====================
  
  const addDebugLog = useCallback((
    level: DebugLog['level'],
    category: DebugLog['category'],
    message: string,
    data?: any
  ) => {
    if (!debugEnabled) return;
    
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };
    
    setDebugLogs(prev => [log, ...prev].slice(0, 1000)); // Keep last 1000 logs
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const logFn = console[level] || console.log;
      logFn(`[SocketIO:${category}] ${message}`, data || '');
    }
  }, [debugEnabled]);
  
  // ==================== AUDIO MANAGEMENT ====================
  
  const streamAudioChunk = useCallback((
    audioData: ArrayBuffer, 
    sessionId: string, 
    sequence: number
  ) => {
    if (!socket.isConnected) {
      addDebugLog('warn', 'audio', 'Cannot stream audio - not connected');
      return;
    }
    
    audioStream.streamAudioChunk(audioData, sessionId, sequence);
    addDebugLog('debug', 'audio', `Streamed audio chunk ${sequence}`, {
      sessionId,
      size: audioData.byteLength,
    });
  }, [socket.isConnected, audioStream, addDebugLog]);
  
  const startAudioSession = useCallback((sessionId: string) => {
    if (!socket.isConnected) {
      addDebugLog('error', 'audio', 'Cannot start session - not connected');
      toast.error('Audio streaming not available', {
        description: 'Please check your connection',
      });
      return;
    }
    
    audioStream.startAudioSession(sessionId);
    setIsStreaming(true);
    addDebugLog('info', 'audio', 'Audio session started', { sessionId });
    onAudioStreamStart?.(sessionId);
    
    toast.success('Audio streaming started', {
      description: `Session ${sessionId.substring(0, 8)}... is now active`,
    });
  }, [socket.isConnected, audioStream, addDebugLog, onAudioStreamStart]);
  
  const stopAudioSession = useCallback((sessionId: string) => {
    audioStream.stopAudioSession(sessionId);
    setIsStreaming(false);
    addDebugLog('info', 'audio', 'Audio session stopped', { sessionId });
    onAudioStreamStop?.(sessionId);
    
    toast.info('Audio streaming stopped', {
      description: `Session ${sessionId.substring(0, 8)}... ended`,
    });
  }, [audioStream, addDebugLog, onAudioStreamStop]);
  
  // ==================== TRANSCRIPT MANAGEMENT ====================
  
  const getTranscriptForSession = useCallback((sessionId: string) => {
    return transcriptEvents.finalTranscripts.filter(t => t.sessionId === sessionId);
  }, [transcriptEvents.finalTranscripts]);
  
  const clearTranscripts = useCallback(() => {
    transcriptEvents.clearTranscripts();
    addDebugLog('info', 'transcript', 'Transcripts cleared');
  }, [transcriptEvents, addDebugLog]);
  
  // ==================== DETECTION MANAGEMENT ====================
  
  const getAlertsForSession = useCallback((sessionId: string) => {
    return detectionAlerts.alerts.filter(alert => alert.sessionId === sessionId);
  }, [detectionAlerts.alerts]);
  
  const recentAlerts = useMemo(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return detectionAlerts.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > oneHourAgo
    );
  }, [detectionAlerts.alerts]);
  
  const alertStats = useMemo(() => {
    const stats = { total: 0, high: 0, medium: 0, low: 0 };
    
    detectionAlerts.alerts.forEach(alert => {
      stats.total++;
      stats[alert.severity.toLowerCase() as keyof typeof stats]++;
    });
    
    return stats;
  }, [detectionAlerts.alerts]);
  
  const clearDetectionAlerts = useCallback(() => {
    detectionAlerts.clearAlerts();
    addDebugLog('info', 'detection', 'Detection alerts cleared');
  }, [detectionAlerts, addDebugLog]);
  
  // ==================== EVENT HANDLERS ====================
  
  // Monitor transcript events
  useEffect(() => {
    const latestTranscript = transcriptEvents.finalTranscripts[0];
    if (latestTranscript) {
      addDebugLog('info', 'transcript', 'New transcript received', {
        sessionId: latestTranscript.sessionId,
        text: latestTranscript.text.substring(0, 50) + '...',
      });
      onTranscriptReceived?.(latestTranscript);
    }
  }, [transcriptEvents.finalTranscripts, addDebugLog, onTranscriptReceived]);
  
  // Monitor detection alerts
  useEffect(() => {
    const latestAlert = detectionAlerts.alerts[0];
    if (latestAlert) {
      addDebugLog('warn', 'detection', 'New detection alert', {
        type: latestAlert.type,
        severity: latestAlert.severity,
        sessionId: latestAlert.sessionId,
      });
      onDetectionAlert?.(latestAlert);
    }
  }, [detectionAlerts.alerts, addDebugLog, onDetectionAlert]);
  
  // ==================== CONNECTION UTILITIES ====================
  
  const retryConnection = useCallback(async () => {
    addDebugLog('info', 'connection', 'Manual retry requested');
    try {
      await socket.reconnect();
    } catch (error) {
      addDebugLog('error', 'connection', 'Manual retry failed', error);
    }
  }, [socket, addDebugLog]);
  
  const clearConnectionError = useCallback(() => {
    socket.clearError();
    addDebugLog('info', 'connection', 'Connection error cleared');
  }, [socket, addDebugLog]);
  
  // ==================== DEBUG UTILITIES ====================
  
  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);
  
  const enableDebugLogging = useCallback((enabled: boolean) => {
    setDebugEnabled(enabled);
    addDebugLog('info', 'system', `Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }, [addDebugLog]);
  
  // ==================== CONTEXT VALUE ====================
  
  const contextValue: SocketContextValue = useMemo(() => ({
    // Main Socket
    socket,
    
    // Audio Streaming
    audio: {
      streamChunk: streamAudioChunk,
      startSession: startAudioSession,
      stopSession: stopAudioSession,
      isStreaming,
    },
    
    // Transcript Management
    transcript: {
      partialText: transcriptEvents.partialTranscript,
      finalTranscripts: transcriptEvents.finalTranscripts,
      clearTranscripts,
      getTranscriptForSession,
    },
    
    // Detection Alerts
    detection: {
      alerts: detectionAlerts.alerts,
      recentAlerts,
      clearAlerts: clearDetectionAlerts,
      getAlertsForSession,
      alertStats,
    },
    
    // Connection Status
    connection: {
      state: socket.connectionState,
      isConnected: socket.isConnected,
      isConnecting: socket.isConnecting,
      error: socket.error,
      metrics: socket.getConnectionMetrics(),
      retry: retryConnection,
      clearError: clearConnectionError,
    },
    
    // Debug Tools
    debug: {
      isEnabled: debugEnabled,
      logs: debugLogs,
      clearLogs: clearDebugLogs,
      enableLogging: enableDebugLogging,
    },
  }), [
    socket,
    streamAudioChunk,
    startAudioSession,
    stopAudioSession,
    isStreaming,
    transcriptEvents.partialTranscript,
    transcriptEvents.finalTranscripts,
    clearTranscripts,
    getTranscriptForSession,
    detectionAlerts.alerts,
    recentAlerts,
    clearDetectionAlerts,
    getAlertsForSession,
    alertStats,
    retryConnection,
    clearConnectionError,
    debugEnabled,
    debugLogs,
    clearDebugLogs,
    enableDebugLogging,
  ]);
  
  // ==================== LIFECYCLE MANAGEMENT ====================
  
  useEffect(() => {
    addDebugLog('info', 'connection', 'SocketProvider initialized', {
      url: url || 'default',
      namespace,
      autoConnect,
    });
    
    return () => {
      addDebugLog('info', 'connection', 'SocketProvider cleanup');
    };
  }, [url, namespace, autoConnect, addDebugLog]);
  
  // ==================== RENDER ====================
  
  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// ==================== UTILITY COMPONENTS ====================

/**
 * Connection status indicator component
 */
export function ConnectionStatusIndicator({ 
  className = "",
  showText = true 
}: { 
  className?: string;
  showText?: boolean;
}) {
  const { connection } = useSocketContext();
  
  const getStatusColor = () => {
    switch (connection.state) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'disconnected': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getStatusText = () => {
    switch (connection.state) {
      case 'connected': return `Connected (${Math.round(connection.metrics.latency)}ms)`;
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
      {showText && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {getStatusText()}
        </span>
      )}
    </div>
  );
}

/**
 * Debug panel component (development only)
 */
export function SocketDebugPanel() {
  const { debug, connection } = useSocketContext();
  
  if (!debug.isEnabled || process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-black text-green-400 text-xs font-mono p-4 rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-green-300 font-bold">Socket.IO Debug</span>
        <div className="flex space-x-2">
          <button
            onClick={debug.clearLogs}
            className="text-yellow-400 hover:text-yellow-300"
          >
            Clear
          </button>
          <button
            onClick={() => debug.enableLogging(false)}
            className="text-red-400 hover:text-red-300"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="mb-2 text-blue-400">
        State: {connection.state} | Latency: {Math.round(connection.metrics.latency)}ms
      </div>
      
      <div className="overflow-y-auto max-h-60 space-y-1">
        {debug.logs.map((log, index) => (
          <div key={index} className={`
            ${log.level === 'error' ? 'text-red-400' :
              log.level === 'warn' ? 'text-yellow-400' :
              log.level === 'info' ? 'text-blue-400' :
              'text-gray-400'}
          `}>
            [{new Date(log.timestamp).toLocaleTimeString()}] 
            [{log.category}] {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SocketProvider;