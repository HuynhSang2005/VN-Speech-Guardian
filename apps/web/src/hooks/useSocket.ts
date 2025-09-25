/**
 * Socket.IO Hook for Real-time Communication
 * Manages WebSocket connection to NestJS Gateway
 */

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

interface SocketState {
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
}

interface UseSocketReturn {
  socket: Socket | null;  
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
}

export function useSocket(): UseSocketReturn {
  const { getToken, isSignedIn } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketState, setSocketState] = useState<SocketState>({
    isConnected: false,
    connectionError: null,
    reconnectAttempts: 0,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;

  const connect = async () => {
    if (!isSignedIn) {
      setSocketState(prev => ({ 
        ...prev, 
        connectionError: 'User not authenticated' 
      }));
      return;
    }

    try {
      const token = await getToken();
      
      const socketInstance = io('/audio', {
        auth: { 
          token: token 
        },
        transports: ['websocket'],
        timeout: 10000,
        forceNew: true,
      });

      // Connection event handlers
      socketInstance.on('connect', () => {
        console.log('✅ Socket connected');
        setSocketState({
          isConnected: true,
          connectionError: null,
          reconnectAttempts: 0,
        });
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setSocketState(prev => ({
          ...prev,
          isConnected: false,
          connectionError: `Disconnected: ${reason}`,
        }));

        // Auto-reconnect logic
        if (reason === 'io server disconnect') {
          handleReconnect();
        }
      });

      socketInstance.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        setSocketState(prev => ({
          ...prev,
          isConnected: false,
          connectionError: error.message,
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));

        handleReconnect();
      });

      setSocket(socketInstance);
    } catch (error) {
      console.error('Failed to create socket connection:', error);
      setSocketState(prev => ({ 
        ...prev, 
        connectionError: 'Failed to initialize connection' 
      }));
    }
  };

  const handleReconnect = () => {
    if (socketState.reconnectAttempts >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, socketState.reconnectAttempts), 30000);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`🔄 Attempting to reconnect... (${socketState.reconnectAttempts + 1}/${maxReconnectAttempts})`);
      connect();
    }, delay);
  };

  const reconnect = () => {
    if (socket) {
      socket.disconnect();
    }
    setSocketState({
      isConnected: false,
      connectionError: null,
      reconnectAttempts: 0,
    });
    connect();
  };

  // Initialize connection when authenticated
  useEffect(() => {
    if (isSignedIn) {
      connect();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isSignedIn]);

  return {
    socket,
    isConnected: socketState.isConnected,
    connectionError: socketState.connectionError,
    reconnect,
  };
}