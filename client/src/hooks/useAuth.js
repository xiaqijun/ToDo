import { useState, useEffect } from 'react';
import client from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';
export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            client.get('/users/me')
                .then(res => { setUser(res.data.data); connectSocket(token); })
                .catch(() => { localStorage.removeItem('token'); })
                .finally(() => setLoading(false));
        }
        else {
            setLoading(false);
        }
    }, []);
    const login = async (email, password) => {
        const res = await client.post('/auth/login', { email, password });
        const { token, user: u } = res.data;
        localStorage.setItem('token', token);
        setUser(u);
        connectSocket(token);
        return u;
    };
    const register = async (email, password, displayName) => {
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
