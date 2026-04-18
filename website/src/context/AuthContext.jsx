import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

/**
 * Provides authenticated user state globally.
 * Every page that needs the current user reads from here — no per-page getMe() calls.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const userData = await getMe();
            setUser(userData);
        } catch (error) {
            if (error.status === 401 || error.status === 403) {
                setUser(null);
            } else {
                setUser(prev => {
                    if (!prev) return null;
                    return prev;
                });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const refreshUser = () => fetchUser();

    const login = (userData) => {
        setUser(userData);
    };

    const clearUser = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser, login, clearUser }}>
            {children}
        </AuthContext.Provider>
    );
};
