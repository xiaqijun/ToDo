import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

export function setupSocket(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: config.clientUrl, credentials: true },
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('未登录'));

    try {
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('登录已过期'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    console.log(`User connected: ${userId}`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Join/leave team rooms
    socket.on('join:team', (teamId: string) => {
      socket.join(`team:${teamId}`);
    });

    socket.on('leave:team', (teamId: string) => {
      socket.leave(`team:${teamId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
}
