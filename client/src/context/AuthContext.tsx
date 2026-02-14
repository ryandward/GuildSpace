import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { GuildProvider } from './GuildContext';
import { queryClient } from '../lib/queryClient';

export interface User {
  id: string;
  username: string;
  displayName: string;
  discordUsername?: string;
  needsSetup?: boolean;
  isOfficer?: boolean;
  isAdmin?: boolean;
  isOwner?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  needsSetup: boolean;
  isDemo: boolean;
}

interface AuthContextValue extends AuthState {
  submitName: (name: string) => Promise<string | null>;
  logout: () => void;
  enterDemo: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const DEMO_USER: User = {
  id: 'demo',
  username: 'demo',
  displayName: 'Demo Visitor',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    loading: true,
    needsSetup: false,
    isDemo: false,
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
      setState({ token: null, user: null, loading: false, needsSetup: false, isDemo: false });
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${tkn}` },
      });

      if (!res.ok) {
        localStorage.removeItem('gs_token');
        setState({ token: null, user: null, loading: false, needsSetup: false, isDemo: false });
        return;
      }

      const me: User = await res.json();

      if (me.needsSetup) {
        setState({ token: tkn, user: null, loading: false, needsSetup: true, isDemo: false });
        return;
      }

      setState({ token: tkn, user: me, loading: false, needsSetup: false, isDemo: false });
    } catch {
      localStorage.removeItem('gs_token');
      setState({ token: null, user: null, loading: false, needsSetup: false, isDemo: false });
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
    if (tkn && tkn !== 'demo') {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tkn}` },
      }).catch(() => {});
    }
    localStorage.removeItem('gs_token');
    queryClient.clear();
    setState({ token: null, user: null, loading: false, needsSetup: false, isDemo: false });
  }, [state.token]);

  const enterDemo = useCallback(() => {
    queryClient.clear();
    setState({
      token: 'demo',
      user: DEMO_USER,
      loading: false,
      needsSetup: false,
      isDemo: true,
    });
  }, []);

  const guildValue = state.isDemo
    ? { guildId: 'demo', guildName: 'Demo Guild', isDemo: true }
    : { guildId: '838976035575562293', guildName: 'Ex Astra', isDemo: false };

  return (
    <AuthContext.Provider value={{ ...state, submitName, logout, enterDemo }}>
      <GuildProvider value={guildValue}>
        {children}
      </GuildProvider>
    </AuthContext.Provider>
  );
}
