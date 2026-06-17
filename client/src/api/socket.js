import { io } from 'socket.io-client';
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
let socket = null;
export function connectSocket(token) {
    if (socket?.connected)
        return socket;
    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => console.log('Socket disconnected'));
    return socket;
}
export function getSocket() {
    return socket;
}
export function disconnectSocket() {
    socket?.disconnect();
    socket = null;
}
