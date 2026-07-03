import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useApolloClient } from '@apollo/client';
import { LOGIN, LOGOUT, ME } from '../graphql/operations';
import { tokenStore } from '../lib/token';
import type { RoleName, User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: RoleName[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await client.query({
        query: ME,
        fetchPolicy: 'network-only',
      });
      setUser(data.me);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const login = async (email: string, password: string) => {
    const { data } = await client.mutate({
      mutation: LOGIN,
      variables: { input: { email, password } },
    });
    const payload = data.login;
    tokenStore.set(payload.accessToken, payload.refreshToken);
    setUser(payload.user);
  };

  const logout = async () => {
    try {
      await client.mutate({ mutation: LOGOUT });
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    setUser(null);
    await client.clearStore();
  };

  const hasRole = (...roles: RoleName[]) =>
    !!user && roles.includes(user.role.name);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
