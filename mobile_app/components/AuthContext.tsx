import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { logoutUser } from '../services/api';

/** Shape of what we store and expose — only what the app actually needs. */
export type AppUser = {
  id: number;
  username: string;
  email: string;
  avatar_url?: string | null;
  is_verified?: number;
  token: string;
};

type AuthContextType = {
  user: AppUser | null;
  isLoading: boolean;
  signIn: (token: string, userInfo: Omit<AppUser, 'token'>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'userSession';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    try {
      const serialized = await SecureStore.getItemAsync(SESSION_KEY);
      if (serialized) {
        const parsed: AppUser = JSON.parse(serialized);
        // Basic sanity check — ensure the stored object is well-formed
        if (parsed && parsed.token && parsed.id) {
          setUser(parsed);
        } else {
          // Corrupt/old format — clear it
          await SecureStore.deleteItemAsync(SESSION_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Call after a successful login or registration.
   * @param token  The JWT from the server response.
   * @param userInfo  The user fields from the server response (id, username, email, etc.)
   */
  const signIn = async (token: string, userInfo: Omit<AppUser, 'token'>) => {
    const session: AppUser = { ...userInfo, token };
    setUser(session);
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  };

  const signOut = async () => {
    // Notify backend first — non-fatal if network is unavailable
    await logoutUser();
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch (e) {
      console.error('Failed to clear session:', e);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
