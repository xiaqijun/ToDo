import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';

const app = express();
const server = createServer(app);

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export { app, server };
