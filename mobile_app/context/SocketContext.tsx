import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../constants/Config';
import { useAuth } from '../components/AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  subscribeToPlayer: (playerId: string) => void;
  unsubscribeFromPlayer: (playerId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

/**
 * Opens a socket connection ONLY when the user is authenticated.
 * Closes and cleans up the connection when the user logs out.
 */
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only open socket when a user is authenticated
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const newSocket = io(API_URL, {
      transports: ['websocket'],
      auth: { token: user.token }, // pass JWT for authenticated socket connections
    });

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]); // Reconnect/disconnect when auth state changes

  const subscribeToPlayer = (playerId: string) => {
    if (socketRef.current && connected) socketRef.current.emit('subscribe', playerId);
  };

  const unsubscribeFromPlayer = (playerId: string) => {
    if (socketRef.current && connected) socketRef.current.emit('unsubscribe', playerId);
  };

  return (
    <SocketContext.Provider value={{ socket, connected, subscribeToPlayer, unsubscribeFromPlayer }}>
      {children}
    </SocketContext.Provider>
  );
};
