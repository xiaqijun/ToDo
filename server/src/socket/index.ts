import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();
let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

export function setupSocket(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: config.clientUrl, credentials: true },
  });

  // Key-based auth middleware
  io.use(async (socket, next) => {
    const key = socket.handshake.auth.key;
    if (!key) return next(new Error('未提供密钥'));

    try {
      const user = await prisma.user.findUnique({
        where: { key },
        select: { id: true },
      });
      if (!user) return next(new Error('密钥无效'));
      (socket as any).userId = user.id;
      next();
    } catch {
      next(new Error('认证失败'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    console.log(`User connected: ${userId}`);

    socket.join(`user:${userId}`);

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
