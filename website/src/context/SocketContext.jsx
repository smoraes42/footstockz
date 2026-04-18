import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

/**
 * Opens a socket connection ONLY when the user is authenticated.
 * Closes and cleans up the connection when the user logs out.
 * This prevents unnecessary WebSocket connections on public pages (login, register, etc.)
 */
export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        // Only open a socket when a user is authenticated
        if (!user) {
            // If a socket already exists (e.g. after logout), close it
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
                setSocket(null);
                setConnected(false);
            }
            return;
        }

        const rawUrl = import.meta.env.VITE_API_URL || window.location.origin;
        
        // Parse the URL to handle cases where it might include a path (like /api)
        // Socket.io-client interprets paths in the URL as namespaces, 
        // but we want the default namespace ('/') with a specific connection path.
        let socketOrigin = rawUrl;
        let socketPath = '/socket.io'; // Default Socket.io path

        try {
            const url = new URL(rawUrl);
            socketOrigin = url.origin;
            if (url.pathname !== '/') {
                // If VITE_API_URL is "https://domain.com/api", 
                // then path should be "/api/socket.io"
                socketPath = `${url.pathname.replace(/\/$/, '')}/socket.io`;
            }
        } catch (e) {
            // Fallback for relative URLs or invalid URLs
            if (rawUrl.startsWith('/')) {
                socketPath = `${rawUrl.replace(/\/$/, '')}/socket.io`;
                socketOrigin = window.location.origin;
            }
        }

        const newSocket = io(socketOrigin, {
            path: socketPath,
            withCredentials: true,
            transports: ['websocket']
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to server');
            setConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('[Socket] Disconnected from server');
            setConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.warn('[Socket] Connection error:', err.message);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            newSocket.close();
            socketRef.current = null;
            setConnected(false);
        };
    }, [user]); // Re-run when auth state changes

    const subscribeToPlayer = (playerId) => {
        if (socketRef.current && connected) {
            socketRef.current.emit('subscribe', playerId);
        }
    };

    const unsubscribeFromPlayer = (playerId) => {
        if (socketRef.current && connected) {
            socketRef.current.emit('unsubscribe', playerId);
        }
    };

    const subscribeToUser = (userId) => {
        if (socketRef.current && connected) {
            socketRef.current.emit('subscribe_user', userId);
        }
    };

    const unsubscribeFromUser = (userId) => {
        if (socketRef.current && connected) {
            socketRef.current.emit('unsubscribe_user', userId);
        }
    };

    const value = {
        socket,
        connected,
        subscribeToPlayer,
        unsubscribeFromPlayer,
        subscribeToUser,
        unsubscribeFromUser
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
