import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('mediledger_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshUser = async () => {
    const currentToken = localStorage.getItem('mediledger_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(currentToken);
      } else {
        localStorage.removeItem('mediledger_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to refresh user', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const currentToken = localStorage.getItem('mediledger_token');
    if (!currentToken) {
      setIsLoading(false);
    } else {
      refreshUser();
    }
  }, []);

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const currentToken = localStorage.getItem('mediledger_token') || token;
    const headers = new Headers(options.headers || {});
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, {
      ...options,
      headers
    });

    if (res.status === 401) {
      // Session expired
      localStorage.removeItem('mediledger_token');
      setToken(null);
      setUser(null);
    }

    return res;
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('mediledger_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (userData: any) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('mediledger_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      if (token) {
        await authFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('mediledger_token');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        authFetch,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
