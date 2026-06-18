import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import taskRoutes from './routes/tasks';
import teamRoutes from './routes/teams';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import downloadRoutes from './routes/download';
import { errorHandler } from './middleware/errorHandler';
import { setupSocket } from './socket';
import { startReminderScheduler } from './services/reminder';
import { generateKey } from './utils/keyGen';

const prisma = new PrismaClient();
const app = express();
const server = createServer(app);
setupSocket(server);

const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'file://',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o) || o.startsWith(origin))) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/download', downloadRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

// First-run admin bootstrap
prisma.user.count().then(count => {
  if (count === 0) {
    const key = generateKey();
    prisma.user.create({
      data: { displayName: 'Admin', key, role: 'admin' },
    }).then(() => {
      console.log('======== 初始管理员密钥 ========');
      console.log(`  Key: ${key}`);
      console.log('  请妥善保管，此密钥不会再次显示');
      console.log('================================');
    });
  }
});

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

startReminderScheduler();

export { app, server };
