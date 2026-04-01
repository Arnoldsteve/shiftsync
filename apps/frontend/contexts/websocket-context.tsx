'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribeToLocation: (locationId: string) => void;
  unsubscribeFromLocation: (locationId: string) => void;
  subscribeToStaff: (staffId: string) => void;
  unsubscribeFromStaff: (staffId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Create socket connection with JWT authentication
    // Backend gateway uses /realtime namespace
    const newSocket = io(`${WS_URL}/realtime`, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 3, // Reduced attempts
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Auto-subscribe to user's own staff room for notifications
      if (user?.id) {
        newSocket.emit('subscribe:staff', { staffId: user.id });
        console.log(`Auto-subscribed to staff:${user.id}`);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      // Suppress error logging for staff users - realtime is optional
      console.debug('WebSocket connection unavailable (optional feature)');
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  const subscribeToLocation = (locationId: string) => {
    if (socket && isConnected) {
      socket.emit('subscribe:location', locationId);
      console.log(`Subscribed to location: ${locationId}`);
    }
  };

  const unsubscribeFromLocation = (locationId: string) => {
    if (socket && isConnected) {
      socket.emit('unsubscribe:location', locationId);
      console.log(`Unsubscribed from location: ${locationId}`);
    }
  };

  const subscribeToStaff = (staffId: string) => {
    if (socket && isConnected) {
      socket.emit('subscribe:staff', staffId);
      console.log(`Subscribed to staff: ${staffId}`);
    }
  };

  const unsubscribeFromStaff = (staffId: string) => {
    if (socket && isConnected) {
      socket.emit('unsubscribe:staff', staffId);
      console.log(`Unsubscribed from staff: ${staffId}`);
    }
  };

  const value: WebSocketContextType = {
    socket,
    isConnected,
    subscribeToLocation,
    unsubscribeFromLocation,
    subscribeToStaff,
    unsubscribeFromStaff,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
