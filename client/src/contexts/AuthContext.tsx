import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import client from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  connect: (key: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = localStorage.getItem('authKey');
    if (key) {
      client.get('/auth/me')
        .then(res => { setUser(res.data.data); connectSocket(key); })
        .catch(() => { localStorage.removeItem('authKey'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const connect = async (key: string) => {
    const res = await client.post('/auth/connect', { key });
    const { user: u } = res.data;
    localStorage.setItem('authKey', key);
    setUser(u);
    connectSocket(key);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('authKey');
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, loading, connect, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
