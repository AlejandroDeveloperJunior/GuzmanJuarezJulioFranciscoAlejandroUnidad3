import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from './api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'PATIENT';
  mfaEnabled: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  csrfToken: string | null;
  loading: boolean;
  setSession: (user: AuthUser, token: string, csrfToken: string) => void;
  refreshCsrf: () => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mc_token'));
  const [csrfToken, setCsrfToken] = useState<string | null>(() => localStorage.getItem('mc_csrf'));
  const [loading, setLoading] = useState(true);

  const refreshCsrf = async () => {
    const res = await apiFetch<{ csrfToken: string }>('/api/v1/auth/csrf-token');
    setCsrfToken(res.csrfToken);
    localStorage.setItem('mc_csrf', res.csrfToken);
    return res.csrfToken;
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (!csrfToken) {
          await refreshCsrf();
        }
        if (token) {
          const me = await apiFetch<AuthUser>('/api/v1/auth/me', { token });
          setUser(me);
        }
      } catch {
        setToken(null);
        setUser(null);
        localStorage.removeItem('mc_token');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  const setSession = (nextUser: AuthUser, nextToken: string, nextCsrf: string) => {
    setUser(nextUser);
    setToken(nextToken);
    setCsrfToken(nextCsrf);
    localStorage.setItem('mc_token', nextToken);
    localStorage.setItem('mc_csrf', nextCsrf);
  };

  const logout = async () => {
    try {
      if (token) {
        await apiFetch('/api/v1/auth/logout', {
          method: 'POST',
          token,
          csrfToken,
        });
      }
    } catch {
      // ignore if token already expired
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('mc_token');
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, csrfToken, loading, setSession, refreshCsrf, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
