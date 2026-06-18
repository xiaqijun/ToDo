import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import teamRoutes from './routes/teams';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import downloadRoutes from './routes/download';
import { errorHandler } from './middleware/errorHandler';
import { setupSocket } from './socket';
import { startReminderScheduler } from './services/reminder';

const app = express();
const server = createServer(app);
setupSocket(server);

// Allow localhost origins (dev) + configured client URL
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'file://',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Electron, mobile apps)
    if (!origin) return callback(null, true);
    // Check if origin is allowed (exact or starts with file://)
    if (allowedOrigins.some(o => origin.startsWith(o) || o.startsWith(origin))) {
      return callback(null, true);
    }
    callback(null, true); // Be permissive for personal server
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/download', downloadRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

startReminderScheduler();

export { app, server };
