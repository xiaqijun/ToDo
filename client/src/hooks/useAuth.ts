import { useState, useEffect } from 'react';
import client from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';
import { User } from '../types';

export function useAuth() {
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

  return { user, loading, connect, logout };
}
