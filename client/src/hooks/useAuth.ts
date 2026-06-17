import { useState, useEffect } from 'react';
import client from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      client.get('/users/me')
        .then(res => { setUser(res.data.data); connectSocket(token); })
        .catch(() => { localStorage.removeItem('token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await client.post('/auth/login', { email, password });
    const { token, user: u } = res.data;
    localStorage.setItem('token', token);
    setUser(u);
    connectSocket(token);
    return u;
  };

  const register = async (email: string, password: string, displayName: string) => {
    const res = await client.post('/auth/register', { email, password, displayName });
    const { token, user: u } = res.data;
    localStorage.setItem('token', token);
    setUser(u);
    connectSocket(token);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    disconnectSocket();
  };

  return { user, loading, login, register, logout };
}
