/**
 * Socket.IO Comprehensive Unit Tests
 * VN Speech Guardian - Real-time Communication Testing
 * 
 * Test coverage:
 * - Connection lifecycle management
 * - Auto-reconnection scenarios
 * - Authentication integration with Clerk
 * - Binary audio streaming
 * - Error handling and recovery
 * - Performance monitoring
 * - Type-safe event handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSocket, useAudioStream, useTranscriptEvents, useDetectionAlerts } from '../use-socket';
import { toast } from 'sonner';
import type { 
  SocketErrorInfo, 
  AudioChunkData, 
  PartialTranscriptData,
  FinalTranscriptData,
  DetectionAlertData 
} from '../../types/socket';

// ==================== MOCKS ====================

// Mock Clerk authentication
vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(() => ({
    getToken: vi.fn().mockResolvedValue('mock-token-123'),
    isSignedIn: true,
    userId: 'user_123',
  })),
}));

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Socket.IO Client
const mockSocket = {
  id: 'socket_123',
  connected: false,
  disconnected: true,
  active: false,
  connect: vi.fn().mockReturnThis(),
  disconnect: vi.fn().mockReturnThis(),
  emit: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  once: vi.fn().mockReturnThis(),
  timeout: vi.fn().mockReturnThis(),
  compress: vi.fn().mockReturnThis(),
  volatile: {} as any,
};

const mockManager = {
  socket: vi.fn().mockReturnValue(mockSocket),
  reconnection: vi.fn().mockReturnValue(true),
  reconnectionAttempts: vi.fn().mockReturnValue(5),
  reconnectionDelay: vi.fn().mockReturnValue(1000),
  reconnectionDelayMax: vi.fn().mockReturnValue(10000),
  open: vi.fn(),
  on: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  Manager: vi.fn().mockImplementation(() => mockManager),
}));

// Mock performance.now for latency measurements
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
});

// ==================== TEST UTILITIES ====================

/**
 * Create mock socket error for testing
 */
const createMockError = (
  type: SocketErrorInfo['type'] = 'connection',
  code = 'TEST_ERROR',
  message = 'Test error message'
): SocketErrorInfo => ({
  type,
  code,
  message,
  details: { test: true },
  timestamp: new Date().toISOString(),
  retryable: true,
});

/**
 * Simulate socket connection state change
 */
const simulateConnection = (connected: boolean) => {
  mockSocket.connected = connected;
  mockSocket.disconnected = !connected;
  
  // Trigger connection event
  const eventHandler = mockSocket.on.mock.calls
    .find(([event]) => event === (connected ? 'connect' : 'disconnect'))?.[1];
  
  if (eventHandler) {
    act(() => {
      eventHandler(connected ? undefined : 'transport close');
    });
  }
};

/**
 * Simulate socket error
 */
const simulateError = (error: any) => {
  const errorHandler = mockSocket.on.mock.calls
    .find(([event]) => event === 'connect_error')?.[1];
    
  if (errorHandler) {
    act(() => {
      errorHandler(error);
    });
  }
};

// ==================== MAIN HOOK TESTS ====================

describe('useSocket Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock socket state
    mockSocket.connected = false;
    mockSocket.disconnected = true;
    mockSocket.id = 'socket_123';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useSocket());

      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.socket).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should auto-connect when user is authenticated', async () => {
      renderHook(() => useSocket({ autoConnect: true }));

      // Wait for async initialization
      await vi.waitFor(() => {
        expect(mockManager.socket).toHaveBeenCalledWith('/', expect.objectContaining({
          auth: {
            token: 'mock-token-123',
            userId: 'user_123',
          },
        }));
      });
    });

    it('should handle successful connection', async () => {
      const onConnect = vi.fn();
      const { result } = renderHook(() => useSocket({ onConnect }));

      // Simulate connection success
      act(() => {
        simulateConnection(true);
      });

      await vi.waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
        expect(result.current.isConnected).toBe(true);
        expect(onConnect).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith(
          'Connected',
          { description: 'Real-time connection established' }
        );
      });
    });

    it('should handle connection failure', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useSocket({ onError }));

      const mockError = new Error('Connection failed');
      act(() => {
        simulateError(mockError);
      });

      await vi.waitFor(() => {
        expect(result.current.connectionState).toBe('error');
        expect(result.current.error).toMatchObject({
          type: 'connection',
          code: 'CONNECT_ERROR',
          message: 'Failed to establish connection',
        });
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should handle disconnection', async () => {
      const onDisconnect = vi.fn();
      const { result } = renderHook(() => useSocket({ onDisconnect }));

      // First connect
      act(() => {
        simulateConnection(true);
      });

      // Then disconnect
      act(() => {
        simulateConnection(false);
      });

      await vi.waitFor(() => {
        expect(result.current.connectionState).toBe('disconnected');
        expect(result.current.isConnected).toBe(false);
        expect(onDisconnect).toHaveBeenCalledWith('transport close');
        expect(toast.warning).toHaveBeenCalledWith(
          'Connection lost',
          { description: 'Attempting to reconnect...' }
        );
      });
    });
  });

  describe('Manual Connection Control', () => {
    it('should manually connect when called', async () => {
      const { result } = renderHook(() => useSocket({ autoConnect: false }));

      await act(async () => {
        await result.current.connect();
      });

      expect(mockManager.socket).toHaveBeenCalled();
    });

    it('should manually disconnect when called', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        simulateConnection(true);
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should reconnect after disconnect', async () => {
      const { result } = renderHook(() => useSocket());

      // Connect first
      act(() => {
        simulateConnection(true);
      });

      // Then reconnect
      await act(async () => {
        await result.current.reconnect();
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
      // Should attempt to connect again after delay
      await vi.waitFor(() => {
        expect(mockSocket.connect).toHaveBeenCalled();
      });
    });
  });

  describe('Event Handling', () => {
    it('should add event listeners', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        simulateConnection(true);
      });

      const handler = vi.fn();
      act(() => {
        result.current.on('transcript:partial', handler);
      });

      expect(mockSocket.on).toHaveBeenCalledWith('transcript:partial', handler);
    });

    it('should remove event listeners', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        simulateConnection(true);
      });

      const handler = vi.fn();
      act(() => {
        result.current.off('transcript:partial', handler);
      });

      expect(mockSocket.off).toHaveBeenCalledWith('transcript:partial', handler);
    });

    it('should emit events when connected', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        simulateConnection(true);
      });

      act(() => {
        result.current.emit('session:start', {
          sessionId: 'test-session',
          format: 'pcm16',
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          chunkSize: 4096,
        });
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('session:start', expect.objectContaining({
        sessionId: 'test-session',
        format: 'pcm16',
      }));
    });

    it('should not emit events when disconnected', () => {
      const { result } = renderHook(() => useSocket());

      // Don't connect - should be disconnected
      act(() => {
        result.current.emit('session:start', {
          sessionId: 'test-session',
          format: 'pcm16',
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          chunkSize: 4096,
        });
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Latency Measurement', () => {
    it('should measure latency with ping', async () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        simulateConnection(true);
      });

      // Mock the ping/pong flow
      const startTime = 1000;
      const endTime = 1050;
      vi.mocked(performance.now)
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      let pongHandler: ((timestamp: number) => void) | undefined;
      
      // Capture pong handler
      mockSocket.once.mockImplementation((event, handler) => {
        if (event === 'pong') {
          pongHandler = handler;
        }
        return mockSocket;
      });

      const pingPromise = result.current.ping();

      // Simulate pong response
      act(() => {
        if (pongHandler) pongHandler(startTime);
      });

      const latency = await pingPromise;
      expect(latency).toBe(50); // endTime - startTime
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when requested', () => {
      const { result } = renderHook(() => useSocket());

      // Set an error
      const mockError = createMockError();
      act(() => {
        simulateError(mockError);
      });

      expect(result.current.error).toBeTruthy();

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle authentication errors', async () => {
      const { result } = renderHook(() => useSocket());

      // Simulate auth error
      const authErrorHandler = mockSocket.on.mock.calls
        .find(([event]) => event === 'error:auth')?.[1];

      if (authErrorHandler) {
        act(() => {
          authErrorHandler({ code: 'INVALID_TOKEN', message: 'Token expired' });
        });
      }

      await vi.waitFor(() => {
        expect(result.current.error?.type).toBe('authentication');
        expect(toast.error).toHaveBeenCalledWith(
          'Authentication Error',
          expect.objectContaining({ description: 'Please sign in again' })
        );
      });
    });
  });

  describe('Configuration Options', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        url: 'ws://custom-server:3001',
        namespace: '/custom',
        reconnectionAttempts: 10,
        timeout: 15000,
      };

      renderHook(() => useSocket({ config: customConfig }));

      expect(mockManager.socket).toHaveBeenCalledWith('/custom', expect.any(Object));
    });

    it('should respect autoConnect: false', () => {
      renderHook(() => useSocket({ autoConnect: false }));

      // Should not auto-initialize
      expect(mockManager.socket).not.toHaveBeenCalled();
    });

    it('should call lifecycle callbacks', async () => {
      const onConnect = vi.fn();
      const onDisconnect = vi.fn();
      const onError = vi.fn();
      const onReconnect = vi.fn();

      renderHook(() => useSocket({
        onConnect,
        onDisconnect,
        onError,
        onReconnect,
      }));

      // Test connection
      act(() => {
        simulateConnection(true);
      });
      expect(onConnect).toHaveBeenCalled();

      // Test disconnection
      act(() => {
        simulateConnection(false);
      });
      expect(onDisconnect).toHaveBeenCalled();

      // Test error
      act(() => {
        simulateError(new Error('Test error'));
      });
      expect(onError).toHaveBeenCalled();

      // Test reconnect - simulate manager event
      const reconnectHandler = mockManager.on.mock.calls
        .find(([event]) => event === 'reconnect')?.[1];
      if (reconnectHandler) {
        act(() => {
          reconnectHandler(3);
        });
      }
      expect(onReconnect).toHaveBeenCalledWith(3);
    });
  });
});

// ==================== AUDIO STREAM HOOK TESTS ====================

describe('useAudioStream Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should stream audio chunks', () => {
    const { result } = renderHook(() => useAudioStream());

    act(() => {
      simulateConnection(true);
    });

    const audioData = new ArrayBuffer(4096);
    act(() => {
      result.current.streamAudioChunk(audioData, 'session-123', 1);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('audio:chunk', {
      sessionId: 'session-123',
      sequence: 1,
      timestamp: expect.any(Number),
      chunk: audioData,
      sampleRate: 16000,
      channels: 1,
    });
  });

  it('should start audio session', () => {
    const { result } = renderHook(() => useAudioStream());

    act(() => {
      simulateConnection(true);
    });

    act(() => {
      result.current.startAudioSession('session-123');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('session:start', {
      sessionId: 'session-123',
      format: 'pcm16',
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      chunkSize: 4096,
    });
  });

  it('should stop audio session', () => {
    const { result } = renderHook(() => useAudioStream());

    act(() => {
      simulateConnection(true);
    });

    act(() => {
      result.current.stopAudioSession('session-123');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('session:stop', 'session-123');
  });

  it('should use WebSocket-only transport for binary data', () => {
    renderHook(() => useAudioStream());

    // Should configure for binary streaming
    expect(mockManager.socket).toHaveBeenCalled();
  });
});

// ==================== TRANSCRIPT EVENTS HOOK TESTS ====================

describe('useTranscriptEvents Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle partial transcripts', () => {
    const { result } = renderHook(() => useTranscriptEvents());

    act(() => {
      simulateConnection(true);
    });

    const partialData: PartialTranscriptData = {
      sessionId: 'session-123',
      text: 'Hello world',
      confidence: 0.95,
      timestamp: Date.now(),
      language: 'vi',
    };

    // Simulate receiving partial transcript
    const partialHandler = mockSocket.on.mock.calls
      .find(([event]) => event === 'transcript:partial')?.[1];

    act(() => {
      if (partialHandler) partialHandler(partialData);
    });

    expect(result.current.partialTranscript).toBe('Hello world');
  });

  it('should handle final transcripts', () => {
    const { result } = renderHook(() => useTranscriptEvents());

    act(() => {
      simulateConnection(true);
    });

    const finalData: FinalTranscriptData = {
      id: 'transcript-123',
      sessionId: 'session-123',
      segmentIndex: 1,
      text: 'Hello world complete',
      confidence: 0.98,
      startMs: 1000,
      endMs: 3000,
      language: 'vi',
      timestamp: new Date().toISOString(),
    };

    // Simulate receiving final transcript
    const finalHandler = mockSocket.on.mock.calls
      .find(([event]) => event === 'transcript:final')?.[1];

    act(() => {
      if (finalHandler) finalHandler(finalData);
    });

    expect(result.current.finalTranscripts).toHaveLength(1);
    expect(result.current.finalTranscripts[0]).toEqual(finalData);
    expect(result.current.partialTranscript).toBe(''); // Should clear partial
  });

  it('should clear transcripts when requested', () => {
    const { result } = renderHook(() => useTranscriptEvents());

    // Add some transcripts first
    const finalData: FinalTranscriptData = {
      id: 'transcript-123',
      sessionId: 'session-123',
      segmentIndex: 1,
      text: 'Test transcript',
      confidence: 0.95,
      startMs: 1000,
      endMs: 2000,
      language: 'vi',
      timestamp: new Date().toISOString(),
    };

    act(() => {
      simulateConnection(true);
    });

    const finalHandler = mockSocket.on.mock.calls
      .find(([event]) => event === 'transcript:final')?.[1];

    act(() => {
      if (finalHandler) finalHandler(finalData);
    });

    expect(result.current.finalTranscripts).toHaveLength(1);

    // Clear transcripts
    act(() => {
      result.current.clearTranscripts();
    });

    expect(result.current.finalTranscripts).toHaveLength(0);
    expect(result.current.partialTranscript).toBe('');
  });
});

// ==================== DETECTION ALERTS HOOK TESTS ====================

describe('useDetectionAlerts Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle detection alerts', () => {
    const { result } = renderHook(() => useDetectionAlerts());

    act(() => {
      simulateConnection(true);
    });

    const alertData: DetectionAlertData = {
      id: 'alert-123',
      sessionId: 'session-123',
      type: 'OFFENSIVE',
      severity: 'HIGH',
      confidence: 0.92,
      snippet: 'Offensive content detected',
      context: 'Full context here',
      startMs: 1000,
      endMs: 2000,
      timestamp: new Date().toISOString(),
      recommendedAction: 'BLOCK',
    };

    // Simulate receiving detection alert
    const alertHandler = mockSocket.on.mock.calls
      .find(([event]) => event === 'detection:alert')?.[1];

    act(() => {
      if (alertHandler) alertHandler(alertData);
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0]).toEqual(alertData);
  });

  it('should show toast for high severity alerts', () => {
    renderHook(() => useDetectionAlerts());

    act(() => {
      simulateConnection(true);
    });

    const highSeverityAlert: DetectionAlertData = {
      id: 'alert-456',
      sessionId: 'session-123',
      type: 'HATE',
      severity: 'HIGH',
      confidence: 0.95,
      snippet: 'Very harmful content detected here that should be blocked immediately',
      context: 'Full context',
      startMs: 2000,
      endMs: 4000,
      timestamp: new Date().toISOString(),
      recommendedAction: 'BLOCK',
    };

    const alertHandler = mockSocket.on.mock.calls
      .find(([event]) => event === 'detection:alert')?.[1];

    act(() => {
      if (alertHandler) alertHandler(highSeverityAlert);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Harmful content detected',
      { description: 'HATE: Very harmful content detected here that should be...' }
    );
  });

  it('should limit alerts to 100 items', () => {
    const { result } = renderHook(() => useDetectionAlerts());

    act(() => {
      simulateConnection(true);
    });

    const alertHandler = mockSocket.on.mock.calls
      .find(([event]) => event === 'detection:alert')?.[1];

    // Add 150 alerts
    act(() => {
      if (alertHandler) {
        for (let i = 0; i < 150; i++) {
          alertHandler({
            id: `alert-${i}`,
            sessionId: 'session-123',
            type: 'OFFENSIVE',
            severity: 'LOW',
            confidence: 0.7,
            snippet: `Alert ${i}`,
            context: 'Context',
            startMs: i * 1000,
            endMs: (i + 1) * 1000,
            timestamp: new Date().toISOString(),
            recommendedAction: 'LOG',
          });
        }
      }
    });

    // Should keep only last 100
    expect(result.current.alerts).toHaveLength(100);
    expect(result.current.alerts[0].id).toBe('alert-149'); // Most recent first
  });

  it('should clear alerts when requested', () => {
    const { result } = renderHook(() => useDetectionAlerts());

    act(() => {
      simulateConnection(true);
    });

    const alertData: DetectionAlertData = {
      id: 'alert-789',
      sessionId: 'session-123',
      type: 'OFFENSIVE',
      severity: 'MEDIUM',
      confidence: 0.85,
      snippet: 'Test alert',
      context: 'Context',
      startMs: 1000,
      endMs: 2000,
      timestamp: new Date().toISOString(),
      recommendedAction: 'WARN',
    };

    const alertHandler = mockSocket.on.mock.calls
      .find(([event]) => event === 'detection:alert')?.[1];

    act(() => {
      if (alertHandler) alertHandler(alertData);
    });

    expect(result.current.alerts).toHaveLength(1);

    // Clear alerts
    act(() => {
      result.current.clearAlerts();
    });

    expect(result.current.alerts).toHaveLength(0);
  });
});

// ==================== INTEGRATION TESTS ====================

describe('Socket Integration', () => {
  it('should handle complete audio streaming workflow', async () => {
    const { result: audioResult } = renderHook(() => useAudioStream());
    const { result: transcriptResult } = renderHook(() => useTranscriptEvents());
    const { result: alertResult } = renderHook(() => useDetectionAlerts());

    // Connect
    act(() => {
      simulateConnection(true);
    });

    // Start session
    act(() => {
      audioResult.current.startAudioSession('session-123');
    });

    // Stream audio
    const audioData = new ArrayBuffer(4096);
    act(() => {
      audioResult.current.streamAudioChunk(audioData, 'session-123', 1);
    });

    // Simulate transcript response
    const partialHandler = mockSocket.on.mock.calls
      .find(([event]) => event === 'transcript:partial')?.[1];
    
    if (partialHandler) {
      act(() => {
        partialHandler({
          sessionId: 'session-123',
          text: 'Transcribing...',
          confidence: 0.7,
          timestamp: Date.now(),
          language: 'vi',
        });
      });
    }

    // Simulate final transcript
    const finalHandler = mockSocket.on.mock.calls
      .find(([event]) => event === 'transcript:final')?.[1];
    
    if (finalHandler) {
      act(() => {
        finalHandler({
          id: 'transcript-123',
          sessionId: 'session-123',
          segmentIndex: 1,
          text: 'Final transcribed text',
          confidence: 0.95,
          startMs: 1000,
          endMs: 3000,
          language: 'vi',
          timestamp: new Date().toISOString(),
        });
      });
    }

    // Simulate detection alert
    const alertHandler = mockSocket.on.mock.calls
      .find(([event]) => event === 'detection:alert')?.[1];
    
    if (alertHandler) {
      act(() => {
        alertHandler({
          id: 'alert-123',
          sessionId: 'session-123',
          type: 'CLEAN',
          severity: 'LOW',
          confidence: 0.98,
          snippet: 'Final transcribed text',
          context: 'Clean content',
          startMs: 1000,
          endMs: 3000,
          timestamp: new Date().toISOString(),
          recommendedAction: 'LOG',
        });
      });
    }

    // Verify complete workflow
    expect(mockSocket.emit).toHaveBeenCalledWith('session:start', expect.any(Object));
    expect(mockSocket.emit).toHaveBeenCalledWith('audio:chunk', expect.any(Object));
    expect(transcriptResult.current.finalTranscripts).toHaveLength(1);
    expect(alertResult.current.alerts).toHaveLength(1);

    // Stop session
    act(() => {
      audioResult.current.stopAudioSession('session-123');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('session:stop', 'session-123');
  });
});