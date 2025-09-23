/**
 * Hook để xử lý Socket.io WebSocket connection với auto-reconnect
 * Modern React 19 patterns với proper cleanup
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { 
  WebSocketReadyState, 
  TWebSocketHookOptions,
  THookError 
} from '@/schemas';
import type { UseWebSocketReturn } from '@/types/hooks';

export function useWebSocket(
  url: string,
  options: Partial<TWebSocketHookOptions> = {}
): UseWebSocketReturn {
  const [readyState, setReadyState] = useState<WebSocketReadyState>(WebSocket.CLOSED);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<THookError | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isManuallyClosedRef = useRef<boolean>(false);

  // Default options
  const {
    reconnectAttempts = 3,
    reconnectInterval = 1000,
    protocols,
    onOpen,
    onClose,
    onError,
    onMessage
  } = options;

  const isConnected = readyState === WebSocket.OPEN;

  // Clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Handle reconnection logic
  const attemptReconnect = useCallback(() => {
    if (
      isManuallyClosedRef.current || 
      reconnectAttemptsRef.current >= reconnectAttempts
    ) {
      return;
    }

    clearReconnectTimeout();
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      console.log(`WebSocket reconnect attempt ${reconnectAttemptsRef.current}/${reconnectAttempts}`);
      
      if (socketRef.current) {
        socketRef.current.connect();
      }
    }, reconnectInterval * Math.pow(2, reconnectAttemptsRef.current)); // Exponential backoff

  }, [reconnectAttempts, reconnectInterval, clearReconnectTimeout]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return; // Already connected
    }

    isManuallyClosedRef.current = false;
    setError(null);
    setReadyState(WebSocket.CONNECTING);

    try {
      // Create socket với proper configuration
      const socketOptions: any = {
        autoConnect: false,
        reconnection: false, // Handle reconnection manually  
        timeout: 5000,
        forceNew: true
      };

      // Add protocols if provided
      if (protocols) {
        socketOptions.protocols = Array.isArray(protocols) ? protocols : [protocols];
      }

      const socket = io(url, socketOptions);

      socketRef.current = socket;

      // Setup event handlers
      socket.on('connect', () => {
        setReadyState(WebSocket.OPEN);
        setError(null);
        reconnectAttemptsRef.current = 0;
        clearReconnectTimeout();
        
        onOpen?.(new Event('connect'));
      });

      socket.on('disconnect', (reason) => {
        setReadyState(WebSocket.CLOSED);
        
        const closeEvent = new CloseEvent('close', {
          reason,
          wasClean: reason === 'io client disconnect'
        });
        
        onClose?.(closeEvent);

        // Auto-reconnect if not manually closed
        if (!isManuallyClosedRef.current && reason === 'io server disconnect') {
          attemptReconnect();
        }
      });

      socket.on('connect_error', (err) => {
        const socketError: THookError = {
          name: 'SocketError',
          message: err.message || 'Connection failed',
          code: 'CONNECTION_ERROR',
          timestamp: new Date()
        };
        
        setError(socketError);
        setReadyState(WebSocket.CLOSED);
        
        onError?.(new ErrorEvent('error', { error: err }));

        // Attempt reconnect on connection error
        if (!isManuallyClosedRef.current) {
          attemptReconnect();
        }
      });

      // General message handler
      socket.onAny((eventName, ...args) => {
        const messageData = {
          event: eventName,
          data: args.length === 1 ? args[0] : args,
          timestamp: Date.now()
        };

        setLastMessage(messageData);

        const messageEvent = new MessageEvent('message', {
          data: messageData
        });
        
        onMessage?.(messageEvent);
      });

      // Connect the socket
      socket.connect();

    } catch (err) {
      const initError: THookError = {
        name: 'InitError',
        message: err instanceof Error ? err.message : 'Failed to initialize WebSocket',
        code: 'INIT_ERROR', 
        timestamp: new Date()
      };
      
      setError(initError);
      setReadyState(WebSocket.CLOSED);
    }
  }, [url, protocols, onOpen, onClose, onError, onMessage, attemptReconnect, clearReconnectTimeout]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    clearReconnectTimeout();
    reconnectAttemptsRef.current = 0;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.removeAllListeners();
      socketRef.current = null;
    }

    setReadyState(WebSocket.CLOSED);
    setError(null);
  }, [clearReconnectTimeout]);

  // Send message through WebSocket
  const send = useCallback((event: string, data?: any) => {
    if (!socketRef.current?.connected) {
      const sendError: THookError = {
        name: 'SendError',
        message: 'WebSocket is not connected',
        code: 'NOT_CONNECTED',
        timestamp: new Date()
      };
      setError(sendError);
      return;
    }

    try {
      socketRef.current.emit(event, data);
    } catch (err) {
      const sendError: THookError = {
        name: 'SendError',
        message: err instanceof Error ? err.message : 'Failed to send message',
        code: 'SEND_ERROR',
        timestamp: new Date()
      };
      setError(sendError);
    }
  }, []);

  // Auto-connect on mount if URL is provided
  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url]); // Only reconnect when URL changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket: socketRef.current,
    readyState,
    isConnected,
    lastMessage,
    connect,
    disconnect,
    send,
    error
  };
}

export default useWebSocket;