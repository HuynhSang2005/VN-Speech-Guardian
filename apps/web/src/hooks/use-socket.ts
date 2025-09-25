/**
 * useSocket - Comprehensive Socket.IO React Hook
 * VN Speech Guardian - Real-time Communication Hook
 * 
 * Features:
 * - Manager/Socket architecture for connection pooling
 * - Auto-reconnection with exponential backoff
 * - Binary audio streaming support
 * - Type-safe event handling
 * - Clerk JWT authentication integration
 * - Performance monitoring and health checks
 * - React 19 compatibility with concurrent features
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Manager } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import type {
  SocketConfig,
  SocketConnectionState,
  SocketErrorInfo,
  UseSocketReturn,
  UseSocketOptions,
  ClientToServerEvents,
  ServerToClientEvents,
  Socket,
  ConnectionHealthMetrics,
} from '../types/socket';

// ==================== SOCKET STORE ====================

/**
 * Socket connection store for external state management
 */
class SocketStore {
  private socket: Socket | null = null;
  // private manager: Manager | null = null; // Currently unused
  private connectionState: SocketConnectionState = 'disconnected';
  private error: SocketErrorInfo | null = null;
  private metrics: ConnectionHealthMetrics = {
    latency: 0,
    packetsLost: 0,
    reconnectAttempts: 0,
    uptime: 0,
    lastSeen: new Date().toISOString(),
  };
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => ({
    socket: this.socket,
    connectionState: this.connectionState,
    error: this.error,
    metrics: this.metrics,
    isConnected: this.connectionState === 'connected',
    isConnecting: this.connectionState === 'connecting',
  });

  private notify = () => {
    this.listeners.forEach(listener => listener());
  };

  setSocket = (socket: Socket | null) => {
    this.socket = socket;
    this.notify();
  };

  setConnectionState = (state: SocketConnectionState) => {
    this.connectionState = state;
    this.notify();
  };

  setError = (error: SocketErrorInfo | null) => {
    this.error = error;
    this.notify();
  };

  updateMetrics = (updates: Partial<ConnectionHealthMetrics>) => {
    this.metrics = { ...this.metrics, ...updates };
    this.notify();
  };

  clearError = () => {
    this.setError(null);
  };

  cleanup = () => {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    // this.manager = null; // Currently unused
    this.setSocket(null);
    this.setConnectionState('disconnected');
    this.setError(null);
  };
}

// Global socket store instance
const socketStore = new SocketStore();

// ==================== DEFAULT CONFIGURATION ====================

const DEFAULT_CONFIG: SocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  namespace: '/audio',
  
  // Connection
  autoConnect: true,
  timeout: 10000,
  forceNew: false,
  
  // Reconnection
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  
  // Transport
  transports: ['websocket', 'polling'],
  upgrade: true,
  
  // Auth (will be set dynamically)
  auth: {
    token: '',
    userId: '',
  },
  
  // Performance
  compression: true,
  heartbeatInterval: 5000,
  maxReconnectAttempts: 10,
  connectionHealthCheck: true,
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create Socket.IO error with enhanced context
 */
const createSocketError = (
  type: SocketErrorInfo['type'],
  code: string,
  message: string,
  details?: Record<string, unknown>
): SocketErrorInfo => ({
  type,
  code,
  message,
  details: details || {},
  timestamp: new Date().toISOString(),
  retryable: ['connection', 'network', 'transport'].includes(type),
});

/**
 * Measure connection latency
 */
const measureLatency = (socket: Socket): Promise<number> => {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    socket.emit('ping', startTime);
    socket.once('pong', () => {
      const latency = performance.now() - startTime;
      resolve(latency);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => resolve(5000), 5000);
  });
};

// ==================== MAIN HOOK IMPLEMENTATION ====================

/**
 * useSocket - Main Socket.IO hook with comprehensive features
 */
export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { getToken, isSignedIn, userId } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const managerRef = useRef<Manager | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectStartTimeRef = useRef<number>(0);
  
  // Subscribe to external socket store
  const storeState = useSyncExternalStore(
    socketStore.subscribe,
    socketStore.getSnapshot,
    socketStore.getSnapshot
  );

  const { socket, connectionState, error, metrics, isConnected, isConnecting } = storeState;

  // ==================== CONNECTION MANAGEMENT ====================

  /**
   * Initialize Socket.IO Manager and Socket
   */
  const initializeSocket = useCallback(async (): Promise<void> => {
    try {
      if (!isSignedIn || !userId) {
        throw new Error('User must be authenticated to connect');
      }

      // Get fresh auth token
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      // Merge configuration
      const config: SocketConfig = {
        ...DEFAULT_CONFIG,
        ...options.config,
        auth: {
          token,
          userId,
        },
      };

      // Create Manager if not exists
      if (!managerRef.current) {
        managerRef.current = new Manager(config.url, {
          autoConnect: config.autoConnect,
          timeout: config.timeout,
          forceNew: config.forceNew,
          reconnection: config.reconnection,
          reconnectionAttempts: config.reconnectionAttempts,
          reconnectionDelay: config.reconnectionDelay,
          reconnectionDelayMax: config.reconnectionDelayMax,
          transports: config.transports,
          upgrade: config.upgrade,
        });

        // Setup Manager event handlers
        setupManagerEvents(managerRef.current);
      }

      // Create Socket for namespace
      const newSocket = managerRef.current.socket(config.namespace || '/', {
        auth: config.auth,
      }) as Socket;

      // Setup Socket event handlers
      setupSocketEvents(newSocket);

      // Store socket in external store
      socketStore.setSocket(newSocket);
      setIsInitialized(true);

      console.log('🔌 Socket initialized:', {
        namespace: config.namespace,
        userId: userId,
        url: config.url,
      });
    } catch (error) {
      const socketError = createSocketError(
        'connection',
        'INIT_FAILED',
        `Socket initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
      socketStore.setError(socketError);
      socketStore.setConnectionState('error');
      console.error('❌ Socket initialization failed:', error);
    }
  }, [isSignedIn, userId, getToken, options.config]);

  /**
   * Setup Manager event handlers
   */
  const setupManagerEvents = useCallback((manager: Manager) => {
    manager.on('error', (error) => {
      const socketError = createSocketError(
        'connection',
        'MANAGER_ERROR',
        'Manager connection error',
        { originalError: error }
      );
      socketStore.setError(socketError);
      options.onError?.(socketError);
      
      console.error('🔌 Manager error:', error);
    });

    manager.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      socketStore.updateMetrics({ reconnectAttempts: attemptNumber });
      options.onReconnect?.(attemptNumber);
      
      toast.success('Connection restored', {
        description: `Reconnected after ${attemptNumber} attempt${attemptNumber > 1 ? 's' : ''}`,
      });
    });

    manager.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      socketStore.setConnectionState('connecting');
      socketStore.updateMetrics({ reconnectAttempts: attemptNumber });
    });

    manager.on('reconnect_error', (error) => {
      console.error('❌ Reconnection failed:', error);
      
      const socketError = createSocketError(
        'connection',
        'RECONNECT_FAILED',
        'Reconnection attempt failed',
        { originalError: error }
      );
      socketStore.setError(socketError);
    });

    manager.on('reconnect_failed', () => {
      console.error('💀 All reconnection attempts failed');
      
      const socketError = createSocketError(
        'connection',
        'RECONNECT_EXHAUSTED',
        'All reconnection attempts failed',
        { maxAttempts: manager.reconnectionAttempts() }
      );
      socketStore.setError(socketError);
      socketStore.setConnectionState('error');
      
      toast.error('Connection failed', {
        description: 'Unable to restore connection. Please refresh the page.',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
    });
  }, [options.onError, options.onReconnect]);

  /**
   * Setup Socket event handlers
   */
  const setupSocketEvents = useCallback((socket: Socket) => {
    // Connection events
    socket.on('connect', () => {
      const uptime = performance.now() - connectStartTimeRef.current;
      console.log('✅ Socket connected:', socket.id);
      
      socketStore.setConnectionState('connected');
      socketStore.setError(null);
      socketStore.updateMetrics({
        uptime,
        lastSeen: new Date().toISOString(),
      });
      
      options.onConnect?.();
      startHeartbeat();
      
      toast.success('Connected', {
        description: 'Real-time connection established',
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      socketStore.setConnectionState('disconnected');
      
      stopHeartbeat();
      options.onDisconnect?.(reason);
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect - don't auto-reconnect
        const socketError = createSocketError(
          'server',
          'SERVER_DISCONNECT',
          'Server disconnected the client',
          { reason }
        );
        socketStore.setError(socketError);
        
        toast.error('Disconnected by server', {
          description: 'The server disconnected your session.',
        });
      } else if (reason === 'io client disconnect') {
        // Client initiated disconnect - normal
        console.log('👋 Client disconnected normally');
      } else {
        // Network or transport error - will auto-reconnect
        toast.warning('Connection lost', {
          description: 'Attempting to reconnect...',
        });
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      
      const socketError = createSocketError(
        'connection',
        'CONNECT_ERROR',
        'Failed to establish connection',
        { originalError: error }
      );
      socketStore.setError(socketError);
      socketStore.setConnectionState('error');
      
      options.onError?.(socketError);
    });

    // Heartbeat responses
    socket.on('heartbeat:ack', () => {
      socketStore.updateMetrics({ lastSeen: new Date().toISOString() });
    });

    socket.on('pong', (timestamp: number) => {
      const latency = performance.now() - timestamp;
      socketStore.updateMetrics({ latency });
    });

    // System events
    socket.on('system:maintenance', (message: string) => {
      toast.info('System maintenance', {
        description: message,
      });
    });

    socket.on('system:notification', (notification) => {
      const toastType = notification.type === 'error' ? 'error' : 
                       notification.type === 'warning' ? 'warning' : 'info';
      
      toast[toastType](notification.message);
    });

    // Error events
    socket.on('error', (errorData: SocketErrorInfo) => {
      console.error('🔥 Socket error event:', errorData);
      socketStore.setError(errorData);
      
      toast.error('Socket Error', {
        description: errorData.message,
      });
    });

    socket.on('error:auth', (authError) => {
      console.error('🔒 Authentication error:', authError);
      
      const socketError = createSocketError(
        'authentication',
        authError.code || 'AUTH_ERROR',
        authError.message || 'Authentication failed'
      );
      socketStore.setError(socketError);
      
      toast.error('Authentication Error', {
        description: 'Please sign in again',
        action: {
          label: 'Sign In',
          onClick: () => window.location.href = '/login',
        },
      });
    });
  }, [options.onConnect, options.onDisconnect, options.onError]);

  // ==================== HEARTBEAT MANAGEMENT ====================

  /**
   * Start heartbeat monitoring
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socket?.connected) {
        socket.emit('heartbeat');
        
        // Measure latency periodically
        measureLatency(socket).then(latency => {
          socketStore.updateMetrics({ latency });
        });
      }
    }, DEFAULT_CONFIG.heartbeatInterval);
  }, [socket]);

  /**
   * Stop heartbeat monitoring
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // ==================== PUBLIC API ====================

  /**
   * Connect to Socket.IO server
   */
  const connect = useCallback(async (): Promise<void> => {
    if (connectionState === 'connecting' || connectionState === 'connected') {
      return;
    }

    socketStore.setConnectionState('connecting');
    socketStore.setError(null);
    connectStartTimeRef.current = performance.now();

    if (!isInitialized) {
      await initializeSocket();
    } else if (socket) {
      socket.connect();
    }
  }, [connectionState, isInitialized, initializeSocket, socket]);

  /**
   * Disconnect from Socket.IO server
   */
  const disconnect = useCallback((): void => {
    if (socket?.connected) {
      socket.disconnect();
    }
    stopHeartbeat();
    socketStore.setConnectionState('disconnected');
    
    console.log('👋 Manual disconnect');
  }, [socket, stopHeartbeat]);

  /**
   * Reconnect to Socket.IO server
   */
  const reconnect = useCallback(async (): Promise<void> => {
    disconnect();
    
    // Wait a moment before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await connect();
  }, [disconnect, connect]);

  /**
   * Add event listener with type safety
   */
  const on = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ): void => {
    if (socket) {
      socket.on(event, handler);
    }
  }, [socket]);

  /**
   * Remove event listener with type safety
   */
  const off = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K]
  ): void => {
    if (socket) {
      socket.off(event, handler);
    }
  }, [socket]);

  /**
   * Emit event with type safety
   */
  const emit = useCallback(<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): void => {
    if (socket?.connected) {
      socket.emit(event, ...args);
    } else {
      console.warn(`Cannot emit '${event}': socket not connected`);
    }
  }, [socket]);

  /**
   * Ping server and measure latency
   */
  const ping = useCallback(async (): Promise<number> => {
    if (!socket?.connected) {
      throw new Error('Socket not connected');
    }
    
    return measureLatency(socket);
  }, [socket]);

  /**
   * Get current connection metrics
   */
  const getConnectionMetrics = useCallback((): ConnectionHealthMetrics => {
    return { ...metrics };
  }, [metrics]);

  /**
   * Clear current error
   */
  const clearError = useCallback((): void => {
    socketStore.clearError();
  }, []);

  // ==================== LIFECYCLE EFFECTS ====================

  /**
   * Initialize socket on mount and auth changes
   */
  useEffect(() => {
    if (isSignedIn && userId && options.autoConnect !== false) {
      initializeSocket();
    }
    
    // Cleanup on auth changes
    return () => {
      if (!isSignedIn) {
        socketStore.cleanup();
        setIsInitialized(false);
      }
    };
  }, [isSignedIn, userId, initializeSocket, options.autoConnect]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Don't cleanup socket store here - let it persist across component unmounts
      // Only cleanup when user signs out (handled in auth effect above)
    };
  }, [stopHeartbeat]);

  /**
   * Handle dependency changes
   */
  useEffect(() => {
    if (options.dependencies && socket) {
      // Optionally reconnect when dependencies change
      console.log('🔄 Socket dependencies changed');
    }
  }, [options.dependencies, socket]);

  // ==================== RETURN API ====================

  return {
    socket,
    connectionState,
    isConnected,
    isConnecting,
    error,
    
    // Connection Management
    connect,
    disconnect,
    reconnect,
    
    // Event Handlers
    on,
    off,
    emit,
    
    // Utilities
    ping,
    getConnectionMetrics,
    clearError,
  };
}

// ==================== ADDITIONAL HOOKS ====================

/**
 * Hook for audio streaming specific functionality
 */
export function useAudioStream() {
  const socket = useSocket({
    namespace: '/audio',
    config: {
      compression: false, // Disable compression for audio data
      transports: ['websocket'], // Only WebSocket for binary data
    },
  });

  const streamAudioChunk = useCallback((chunk: ArrayBuffer, sessionId: string, sequence: number) => {
    if (socket.isConnected) {
      socket.emit('audio:chunk', {
        sessionId,
        sequence,
        timestamp: performance.now(),
        chunk,
        sampleRate: 16000,
        channels: 1,
      });
    }
  }, [socket]);

  const startAudioSession = useCallback((sessionId: string) => {
    if (socket.isConnected) {
      socket.emit('session:start', {
        sessionId,
        format: 'pcm16',
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        chunkSize: 4096,
      });
    }
  }, [socket]);

  const stopAudioSession = useCallback((sessionId: string) => {
    if (socket.isConnected) {
      socket.emit('session:stop', sessionId);
    }
  }, [socket]);

  return {
    ...socket,
    streamAudioChunk,
    startAudioSession,
    stopAudioSession,
  };
}

/**
 * Hook for transcript events
 */
export function useTranscriptEvents() {
  const socket = useSocket();
  const [partialTranscript, setPartialTranscript] = useState<string>('');
  const [finalTranscripts, setFinalTranscripts] = useState<any[]>([]);

  useEffect(() => {
    if (!socket.socket) return;

    const handlePartialTranscript = (data: any) => {
      setPartialTranscript(data.text);
    };

    const handleFinalTranscript = (data: any) => {
      setFinalTranscripts(prev => [...prev, data]);
      setPartialTranscript(''); // Clear partial when final arrives
    };

    socket.on('transcript:partial', handlePartialTranscript);
    socket.on('transcript:final', handleFinalTranscript);

    return () => {
      socket.off('transcript:partial', handlePartialTranscript);
      socket.off('transcript:final', handleFinalTranscript);
    };
  }, [socket]);

  return {
    ...socket,
    partialTranscript,
    finalTranscripts,
    clearTranscripts: () => {
      setPartialTranscript('');
      setFinalTranscripts([]);
    },
  };
}

/**
 * Hook for detection alerts
 */
export function useDetectionAlerts() {
  const socket = useSocket();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!socket.socket) return;

    const handleDetectionAlert = (alert: any) => {
      setAlerts(prev => [alert, ...prev].slice(0, 100)); // Keep last 100 alerts
      
      // Show toast for high severity alerts
      if (alert.severity === 'HIGH') {
        toast.error('Harmful content detected', {
          description: `${alert.type}: ${alert.snippet.substring(0, 50)}...`,
        });
      }
    };

    socket.on('detection:alert', handleDetectionAlert);

    return () => {
      socket.off('detection:alert', handleDetectionAlert);
    };
  }, [socket]);

  return {
    ...socket,
    alerts,
    clearAlerts: () => setAlerts([]),
  };
}

export default useSocket;