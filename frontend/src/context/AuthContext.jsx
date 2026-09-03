import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, refreshAccessToken, setAccessToken, setUnauthorizedHandler } from '../lib/apiClient.js';

const AuthContext = createContext(null);

/**
 * Admin session state. On mount, attempts a silent refresh (the httpOnly
 * cookie survives a page reload even though the in-memory access token
 * does not) so a logged-in admin doesn't get bounced to the login page on
 * every refresh.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'anonymous'

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    });
  }, []);

  useEffect(() => {
    // Route through apiClient's shared refreshAccessToken() rather than
    // firing an independent fetch here. The refresh token is single-use
    // (rotated on every call), so two refresh requests racing each other —
    // React StrictMode's dev-only double-effect-invocation, or this
    // mount-time refresh overlapping a 401-triggered one from apiClient —
    // means whichever the server processes second gets a spurious 401, even
    // though the session was perfectly valid: the request had already
    // reached the server and rotated the token before a client-side abort
    // could stop it. refreshAccessToken() de-dupes via a single shared
    // in-flight promise, so every caller in the tab converges on one actual
    // request no matter how many places ask for a refresh at once.
    let cancelled = false;
    refreshAccessToken().then((result) => {
      if (cancelled) return;
      if (result) {
        setUser(result.user);
        setStatus('authenticated');
      } else {
        setStatus('anonymous');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
