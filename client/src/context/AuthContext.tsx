import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  displayName: string;
  discordUsername?: string;
  needsSetup?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  needsSetup: boolean;
}

interface AuthContextValue extends AuthState {
  submitName: (name: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    loading: true,
    needsSetup: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    let tkn: string | null = null;
    if (urlToken) {
      localStorage.setItem('gs_token', urlToken);
      window.history.replaceState({}, '', '/');
      tkn = urlToken;
    } else {
      tkn = localStorage.getItem('gs_token');
    }

    if (!tkn) {
      setState({ token: null, user: null, loading: false, needsSetup: false });
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${tkn}` },
      });

      if (!res.ok) {
        localStorage.removeItem('gs_token');
        setState({ token: null, user: null, loading: false, needsSetup: false });
        return;
      }

      const me: User = await res.json();

      if (me.needsSetup) {
        setState({ token: tkn, user: null, loading: false, needsSetup: true });
        return;
      }

      setState({ token: tkn, user: me, loading: false, needsSetup: false });
    } catch {
      localStorage.removeItem('gs_token');
      setState({ token: null, user: null, loading: false, needsSetup: false });
    }
  }

  const submitName = useCallback(async (name: string): Promise<string | null> => {
    if (!state.token) return 'Not authenticated';

    try {
      const res = await fetch('/api/auth/set-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({ displayName: name }),
      });
      const data = await res.json();

      if (!res.ok) {
        return data.error || 'Something went wrong';
      }

      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${state.token}` },
      });
      const user: User = await meRes.json();
      setState(s => ({ ...s, user, needsSetup: false }));
      return null;
    } catch {
      return 'Failed to set name';
    }
  }, [state.token]);

  const logout = useCallback(() => {
    const tkn = state.token;
    if (tkn) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tkn}` },
      }).catch(() => {});
    }
    localStorage.removeItem('gs_token');
    setState({ token: null, user: null, loading: false, needsSetup: false });
  }, [state.token]);

  return (
    <AuthContext.Provider value={{ ...state, submitName, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
