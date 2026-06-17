import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import authRoutes from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const server = createServer(app);

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export { app, server };
