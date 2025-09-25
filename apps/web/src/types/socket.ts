/**
 * Socket.IO TypeScript Event Definitions
 * VN Speech Guardian - Real-time Communication Types
 * 
 * Defines type-safe interfaces for all Socket.IO events between client and server
 * Supports binary audio streaming, transcript events, detection alerts
 */

// ==================== CORE SOCKET TYPES ====================

/**
 * Connection states for real-time Socket.IO connection
 */
export type SocketConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Socket.IO error information with enhanced context
 */
export interface SocketErrorInfo {
  type: 'connection' | 'authentication' | 'transport' | 'server' | 'network';
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  retryable: boolean;
}

/**
 * Socket connection health metrics
 */
export interface ConnectionHealthMetrics {
  latency: number; // ms
  packetsLost: number;
  reconnectAttempts: number;
  uptime: number; // ms
  lastSeen: string;
}

// ==================== AUDIO STREAMING TYPES ====================

/**
 * Binary audio chunk data for real-time streaming
 * Optimized for PCM 16-bit 16kHz mono format
 */
export interface AudioChunkData {
  sessionId: string;
  sequence: number;
  timestamp: number; // Client-side timestamp
  chunk: ArrayBuffer; // PCM data
  sampleRate: number; // Should be 16000
  channels: number; // Should be 1 (mono)
  final?: boolean; // End of stream marker
}

/**
 * Audio streaming configuration
 */
export interface AudioStreamConfig {
  sessionId: string;
  format: 'pcm16' | 'webm' | 'wav';
  sampleRate: number;
  channels: number;
  bitDepth: number;
  chunkSize: number; // bytes
  maxDuration?: number; // ms
}

/**
 * Audio streaming status updates
 */
export interface AudioStreamStatus {
  sessionId: string;
  state: 'idle' | 'streaming' | 'paused' | 'stopped' | 'error';
  chunksReceived: number;
  totalSize: number; // bytes
  duration: number; // ms
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  lastChunk: number;
}

// ==================== TRANSCRIPT TYPES ====================

/**
 * Partial transcript for real-time display
 */
export interface PartialTranscriptData {
  sessionId: string;
  text: string;
  confidence: number; // 0-1
  timestamp: number;
  segmentId?: string;
  language: string;
}

/**
 * Final transcript segment with complete data
 */
export interface FinalTranscriptData {
  id: string;
  sessionId: string;
  segmentIndex: number;
  text: string;
  confidence: number;
  startMs: number;
  endMs: number;
  words?: TranscriptWord[];
  language: string;
  timestamp: string;
}

/**
 * Individual word in transcript with timing
 */
export interface TranscriptWord {
  word: string;
  confidence: number;
  startMs: number;
  endMs: number;
  speaker?: string;
}

// ==================== DETECTION TYPES ====================

/**
 * Real-time detection alert for harmful content
 */
export interface DetectionAlertData {
  id: string;
  sessionId: string;
  transcriptId?: string;
  type: 'CLEAN' | 'OFFENSIVE' | 'HATE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number; // 0-1
  snippet: string;
  context: string;
  startMs: number;
  endMs: number;
  timestamp: string;
  recommendedAction: 'LOG' | 'WARN' | 'BLOCK';
  metadata?: {
    model: string;
    version: string;
    processingTime: number;
  };
}

/**
 * Detection configuration for session
 */
export interface DetectionConfig {
  sessionId: string;
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  categories: ('OFFENSIVE' | 'HATE')[];
  realTimeAlerts: boolean;
  blockThreshold: number; // 0-1
  warnThreshold: number; // 0-1
}

// ==================== SESSION TYPES ====================

/**
 * Session status and metadata updates
 */
export interface SessionStatusData {
  sessionId: string;
  status: 'created' | 'active' | 'paused' | 'completed' | 'error' | 'terminated';
  userId: string;
  startedAt: string;
  endedAt?: string;
  duration?: number; // ms
  statistics: {
    totalTranscripts: number;
    totalDetections: number;
    audioProcessed: number; // bytes
    avgConfidence: number;
  };
  metadata?: {
    device?: string;
    language: string;
    clientVersion: string;
  };
}

/**
 * Session control commands
 */
export interface SessionControlData {
  sessionId: string;
  action: 'start' | 'pause' | 'resume' | 'stop' | 'terminate';
  timestamp: number;
  reason?: string;
}

// ==================== CLIENT TO SERVER EVENTS ====================

/**
 * Events that client sends to server
 */
export interface ClientToServerEvents {
  // Session Management
  'session:start': (config: AudioStreamConfig) => void;
  'session:stop': (sessionId: string) => void;
  'session:pause': (sessionId: string) => void;
  'session:resume': (sessionId: string) => void;
  
  // Audio Streaming
  'audio:chunk': (data: AudioChunkData) => void;
  'audio:config': (config: AudioStreamConfig) => void;
  'audio:end': (sessionId: string) => void;
  
  // Real-time Communication
  'heartbeat': () => void;
  'ping': (timestamp: number) => void;
  
  // Client Status
  'client:status': (status: { 
    online: boolean; 
    timestamp: number; 
    capabilities: string[] 
  }) => void;
  
  // Error Reporting
  'error:report': (error: SocketErrorInfo) => void;
}

// ==================== SERVER TO CLIENT EVENTS ====================

/**
 * Events that server sends to client
 */
export interface ServerToClientEvents {
  // Transcript Events
  'transcript:partial': (data: PartialTranscriptData) => void;
  'transcript:final': (data: FinalTranscriptData) => void;
  'transcript:error': (error: { sessionId: string; message: string }) => void;
  
  // Detection Events
  'detection:alert': (data: DetectionAlertData) => void;
  'detection:config': (config: DetectionConfig) => void;
  'detection:batch': (alerts: DetectionAlertData[]) => void;
  
  // Session Events
  'session:status': (data: SessionStatusData) => void;
  'session:created': (sessionId: string) => void;
  'session:error': (error: { sessionId: string; message: string }) => void;
  
  // Audio Processing Events
  'audio:status': (status: AudioStreamStatus) => void;
  'audio:quality': (quality: {
    sessionId: string;
    level: 'poor' | 'fair' | 'good' | 'excellent';
    issues?: string[];
  }) => void;
  
  // System Events
  'heartbeat:ack': () => void;
  'pong': (timestamp: number) => void;
  'system:maintenance': (message: string) => void;
  'system:notification': (notification: {
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }) => void;
  
  // Connection Events
  'connection:health': (metrics: ConnectionHealthMetrics) => void;
  'connection:quality': (quality: {
    level: 'poor' | 'fair' | 'good' | 'excellent';
    latency: number;
    stability: number;
  }) => void;
  
  // Error Events
  'error': (error: SocketErrorInfo) => void;
  'error:auth': (error: { message: string; code: string }) => void;
  'error:quota': (error: { limit: number; used: number }) => void;
}

// ==================== SOCKET.IO CONFIGURATION TYPES ====================

/**
 * Socket.IO client configuration with VN Speech Guardian optimizations
 */
export interface SocketConfig {
  url: string;
  namespace?: string;
  
  // Connection Options
  autoConnect: boolean;
  timeout: number;
  forceNew: boolean;
  
  // Reconnection Strategy
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  
  // Transport Options
  transports: ('polling' | 'websocket')[];
  upgrade: boolean;
  
  // Authentication
  auth: {
    token: string;
    userId: string;
  };
  
  // Binary Support
  compression: boolean;
  
  // Custom Options
  heartbeatInterval: number;
  maxReconnectAttempts: number;
  connectionHealthCheck: boolean;
}

/**
 * Enhanced Socket.IO Manager configuration
 */
export interface SocketManagerConfig extends SocketConfig {
  // Connection Pooling
  maxConnections: number;
  connectionTimeout: number;
  
  // Performance
  binaryType: 'arraybuffer' | 'blob';
  enableBinaryFragmentation: boolean;
  maxPayloadSize: number;
  
  // Monitoring
  enableMetrics: boolean;
  metricsInterval: number;
  
  // Development
  debug: boolean;
  enableDevtools: boolean;
}

// ==================== REACT HOOK TYPES ====================

/**
 * Return type for useSocket hook
 */
export interface UseSocketReturn {
  socket: Socket | null;
  connectionState: SocketConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  error: SocketErrorInfo | null;
  
  // Connection Management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  
  // Event Handlers
  on: <K extends keyof ServerToClientEvents>(
    event: K, 
    handler: ServerToClientEvents[K]
  ) => void;
  off: <K extends keyof ServerToClientEvents>(
    event: K, 
    handler?: ServerToClientEvents[K]
  ) => void;
  emit: <K extends keyof ClientToServerEvents>(
    event: K, 
    ...args: Parameters<ClientToServerEvents[K]>
  ) => void;
  
  // Utilities
  ping: () => Promise<number>; // Returns latency in ms
  getConnectionMetrics: () => ConnectionHealthMetrics;
  clearError: () => void;
}

/**
 * Options for useSocket hook
 */
export interface UseSocketOptions {
  config?: Partial<SocketConfig>;
  autoConnect?: boolean;
  namespace?: string;
  
  // Event Handlers
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: SocketErrorInfo) => void;
  onReconnect?: (attemptNumber: number) => void;
  
  // Authentication
  getAuthToken?: () => Promise<string>;
  
  // Dependencies
  dependencies?: any[]; // For React dependency array
}

// ==================== UTILITY TYPES ====================

/**
 * Socket.IO compatible Socket interface extension
 * Includes native Socket.IO events not defined in our custom event interfaces
 */
export interface Socket {
  id: string;
  connected: boolean;
  disconnected: boolean;
  active: boolean;
  
  // Connection Methods
  connect(): Socket;
  disconnect(): Socket;
  
  // Event Methods - Custom Events
  emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): Socket;
  
  on<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ): Socket;
  
  // Native Socket.IO Events
  on(event: 'connect', handler: () => void): Socket;
  on(event: 'disconnect', handler: (reason: string) => void): Socket;
  on(event: 'connect_error', handler: (error: any) => void): Socket;
  
  off<K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K]
  ): Socket;
  
  // Native Socket.IO Events
  off(event: 'connect', handler?: () => void): Socket;
  off(event: 'disconnect', handler?: (reason: string) => void): Socket;
  off(event: 'connect_error', handler?: (error: any) => void): Socket;
  
  once<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ): Socket;
  
  // Native Socket.IO Events
  once(event: 'connect', handler: () => void): Socket;
  once(event: 'disconnect', handler: (reason: string) => void): Socket;
  once(event: 'connect_error', handler: (error: any) => void): Socket;
  
  // Utility Methods
  timeout(value: number): Socket;
  compress(compress: boolean): Socket;
  volatile: Socket;
}

/**
 * Manager interface for connection management
 */
export interface Manager {
  reconnection(): boolean;
  reconnection(value: boolean): Manager;
  reconnectionAttempts(): number;
  reconnectionAttempts(value: number): Manager;
  reconnectionDelay(): number;
  reconnectionDelay(value: number): Manager;
  reconnectionDelayMax(): number;
  reconnectionDelayMax(value: number): Manager;
  
  open(callback?: (error?: Error) => void): Manager;
  socket(nsp: string, options?: any): Socket;
}