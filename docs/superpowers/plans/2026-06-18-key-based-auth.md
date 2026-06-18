# Key-Based Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace email/password + JWT auth with admin-managed API keys.

**Architecture:** Database stores a unique random `key` per user. Server middleware looks up the key in the DB on every request (no JWT/bcrypt). Admin users (role="admin") manage users via Web UI. Client stores the key in localStorage, sends as `Authorization: Bearer <key>`.

**Tech Stack:** Prisma, Express, React + Tailwind, crypto.randomBytes

**Key decisions:**
- Key format: `td_` + 48 hex chars (24 bytes from `crypto.randomBytes`)
- Key storage: localStorage key `'authKey'` (was `'token'`)
- First-run: auto-create admin if User table empty, print key to stdout
- File organization: extract AppError to own file; admin routes as separate router

---

### Task 1: Extract AppError from auth service

**Why first:** `services/auth.ts` will be deleted later but AppError is used across the codebase. Extract it now so the deletion is clean.

**Files:**
- Create: `server/src/middleware/AppError.ts`
- Modify: `server/src/middleware/errorHandler.ts:2` (update import)
- Modify: `server/src/services/tasks.ts:2` (update import)
- Modify: `server/src/services/teams.ts:2` (update import)

- [ ] **Step 1: Create `server/src/middleware/AppError.ts`**

```typescript
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}
```

- [ ] **Step 2: Update `server/src/middleware/errorHandler.ts` import**

Change line 2 from:
```typescript
import { AppError } from '../services/auth';
```
to:
```typescript
import { AppError } from './AppError';
```

- [ ] **Step 3: Update `server/src/services/tasks.ts` import**

Change line 2 from:
```typescript
import { AppError } from './auth';
```
to:
```typescript
import { AppError } from '../middleware/AppError';
```

- [ ] **Step 4: Update `server/src/services/teams.ts` import**

Change line 2 from:
```typescript
import { AppError } from './auth';
```
to:
```typescript
import { AppError } from '../middleware/AppError';
```

- [ ] **Step 5: Verify type check**

Run: `cd server && npx tsc --noEmit`
Expected: No errors (other than those fixed in subsequent tasks).

---

### Task 2: Database migration

**Files:**
- Modify: `server/prisma/schema.prisma` — User model

- [ ] **Step 1: Update User model in schema.prisma**

Replace lines 10-24 (the User model) with:

```prisma
model User {
  id          String   @id @default(uuid())
  key         String   @unique
  role        String   @default("user")
  displayName String   @map("display_name")
  avatarUrl   String?  @map("avatar_url")
  createdAt   DateTime @default(now()) @map("created_at")

  createdTasks     Task[]          @relation("TaskCreator")
  assignedTasks    Task[]          @relation("TaskAssignee")
  notifications    Notification[]
  teamMemberships  TeamMember[]

  @@map("users")
}
```

- [ ] **Step 2: Create and apply migration**

Run: `cd server && npx prisma migrate dev --name remove_email_add_key_role`
Expected: Migration created successfully. (This will drop all existing users — confirm if prompted.)

- [ ] **Step 3: Regenerate Prisma client**

Run: `cd server && npx prisma generate`
Expected: Success, no errors.

---

### Task 3: Server config — remove JWT, add key settings

**Files:**
- Modify: `server/src/config.ts`

- [ ] **Step 1: Replace config.ts**

Replace the entire file content:

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/todoflow',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
```

---

### Task 4: New key-auth middleware

**Files:**
- Create: `server/src/middleware/keyAuth.ts`

- [ ] **Step 1: Create keyAuth middleware**

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function keyAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供密钥' });
  }

  const key = header.slice(7);
  prisma.user.findUnique({ where: { key }, select: { id: true, role: true } })
    .then(user => {
      if (!user) return res.status(401).json({ error: '密钥无效' });
      req.userId = user.id;
      req.userRole = user.role;
      next();
    })
    .catch(() => res.status(500).json({ error: '服务器内部错误' }));
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}
```

- [ ] **Step 2: Verify type check**

Run: `cd server && npx tsc --noEmit`
Expected: No new errors from this file.

---

### Task 5: New auth routes (connect + me)

**Files:**
- Modify: `server/src/routes/auth.ts` — complete rewrite

- [ ] **Step 1: Rewrite auth routes**

Replace the entire file:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { keyAuthMiddleware, AuthRequest } from '../middleware/keyAuth';

const prisma = new PrismaClient();
const router = Router();

// Connect with key — public endpoint
router.post('/connect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: '请提供密钥' });

    const user = await prisma.user.findUnique({
      where: { key },
      select: { id: true, displayName: true, role: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return res.status(401).json({ error: '密钥无效' });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// Get current user — requires auth
router.get('/me', keyAuthMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, displayName: true, role: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
```

**Note:** Deletes the old `/register` and `/login` endpoints entirely. The `/api/auth` prefix is already wired in `index.ts` line 40.

---

### Task 6: Admin routes

**Files:**
- Create: `server/src/routes/admin.ts`
- Create: `server/src/utils/keyGen.ts`

- [ ] **Step 1: Create key generation utility**

Create `server/src/utils/keyGen.ts`:

```typescript
import crypto from 'crypto';

export function generateKey(): string {
  return 'td_' + crypto.randomBytes(24).toString('hex');
}
```

- [ ] **Step 2: Create admin routes**

Create `server/src/routes/admin.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { keyAuthMiddleware, requireAdmin, AuthRequest } from '../middleware/keyAuth';
import { generateKey } from '../utils/keyGen';

const prisma = new PrismaClient();
const router = Router();

// All admin routes require auth + admin role
router.use(keyAuthMiddleware);
router.use(requireAdmin);

// List all users (keys masked)
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, displayName: true, role: true, key: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const masked = users.map(u => ({
      id: u.id,
      displayName: u.displayName,
      role: u.role,
      keyMasked: u.key.slice(0, 6) + '...' + u.key.slice(-4),
      createdAt: u.createdAt,
    }));
    res.json({ data: masked });
  } catch (err) {
    next(err);
  }
});

// Create user — returns full key once
router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, role } = req.body;
    if (!displayName) return res.status(400).json({ error: '请提供 displayName' });

    const key = generateKey();
    const user = await prisma.user.create({
      data: { displayName, key, role: role || 'user' },
      select: { id: true, displayName: true, role: true, createdAt: true },
    });

    res.status(201).json({ user, key });
  } catch (err) {
    next(err);
  }
});

// Regenerate key
router.post('/users/:id/regenerate-key', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const key = generateKey();
    await prisma.user.update({ where: { id: req.params.id }, data: { key } });
    res.json({ key });
  } catch (err) {
    next(err);
  }
});

// Update user
router.put('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, role } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { ...(displayName && { displayName }), ...(role && { role }) },
      select: { id: true, displayName: true, role: true, createdAt: true },
    });
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

// Delete user (cannot delete self)
router.delete('/users/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: '不能删除自己' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
```

---

### Task 7: Wire up server — update index.ts and add admin bootstrap

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Update imports and route wiring**

Replace the file:

```typescript
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
```

---

### Task 8: Update socket auth — replace JWT with key lookup

**Files:**
- Modify: `server/src/socket/index.ts`

- [ ] **Step 1: Rewrite socket auth middleware**

Replace the entire file:

```typescript
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
```

---

### Task 9: Update users route — remove email references

**Files:**
- Modify: `server/src/routes/users.ts`

- [ ] **Step 1: Update import and select clauses**

Replace the entire file:

```typescript
import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { keyAuthMiddleware, AuthRequest } from '../middleware/keyAuth';

const prisma = new PrismaClient();
const router = Router();
router.use(keyAuthMiddleware);

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, displayName: true, role: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ data: user });
  } catch (err) { next(err); }
});

router.get('/search', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.json({ data: [] });
    const users = await prisma.user.findMany({
      where: {
        displayName: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, displayName: true, avatarUrl: true },
      take: 10,
    });
    res.json({ data: users });
  } catch (err) { next(err); }
});

export default router;
```

---

### Task 10: Update tasks service — remove email from select

**Files:**
- Modify: `server/src/services/tasks.ts`

- [ ] **Step 1: Update TASK_INCLUDE select clauses**

Replace lines 7-21 (TASK_INCLUDE constant) with:

```typescript
const TASK_INCLUDE = {
  assignee: {
    select: { id: true, displayName: true, avatarUrl: true, createdAt: true },
  },
  creator: {
    select: { id: true, displayName: true, avatarUrl: true, createdAt: true },
  },
  subtasks: {
    include: {
      assignee: {
        select: { id: true, displayName: true, avatarUrl: true, createdAt: true },
      },
    },
  },
} as const;
```

---

### Task 11: Update teams service — remove email from select

**Files:**
- Modify: `server/src/services/teams.ts`

- [ ] **Step 1: Update getMembers user select**

Change line 29 from:
```typescript
        user: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
```
to:
```typescript
        user: { select: { id: true, displayName: true, avatarUrl: true } },
```

---

### Task 12: Delete old auth service

**Files:**
- Delete: `server/src/services/auth.ts`
- Delete: `server/src/middleware/auth.ts`

- [ ] **Step 1: Delete old files**

Run:
```bash
rm server/src/services/auth.ts
rm server/src/middleware/auth.ts
```

- [ ] **Step 2: Verify full server type check**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

---

### Task 13: Update shared types

**Files:**
- Modify: `shared/types.ts`
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: Update shared User type**

In `shared/types.ts`, replace lines 1-7 (User interface) with:

```typescript
export interface User {
  id: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
}
```

Also remove `AuthResponse` (lines 86-89):
```typescript
// DELETE these lines:
export interface AuthResponse {
  token: string;
  user: User;
}
```

- [ ] **Step 2: Update client User type**

In `client/src/types/index.ts`, replace lines 1-6 (User interface) with:

```typescript
export interface User {
  id: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
}
```

---

### Task 14: Update client API client — change token key name

**Files:**
- Modify: `client/src/api/client.ts`

- [ ] **Step 1: Change localStorage key from 'token' to 'authKey'**

Replace the file:

```typescript
import axios from 'axios';

function getApiBase(): string {
  const stored = localStorage.getItem('serverUrl');
  if (stored) return stored;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return 'http://localhost:3001';
}

const client = axios.create({
  baseURL: `${getApiBase()}/api`,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const key = localStorage.getItem('authKey');
  if (key) config.headers.Authorization = `Bearer ${key}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('authKey');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export function setServerUrl(url: string) {
  localStorage.setItem('serverUrl', url);
  client.defaults.baseURL = `${url}/api`;
}

export function getServerUrl(): string {
  return client.defaults.baseURL?.replace('/api', '') || 'http://localhost:3001';
}

export default client;
```

---

### Task 15: Update client socket — change auth payload

**Files:**
- Modify: `client/src/api/socket.ts`

- [ ] **Step 1: Change auth from token to key**

Replace the file:

```typescript
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function connectSocket(key: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { key },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

---

### Task 16: Update useAuth hook — replace login/register with connect

**Files:**
- Modify: `client/src/hooks/useAuth.ts`

- [ ] **Step 1: Rewrite useAuth**

Replace the entire file:

```typescript
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
```

---

### Task 17: Create KeyLogin component

**Files:**
- Create: `client/src/components/KeyLogin.tsx`
- Modify: `client/src/App.tsx` — import change

- [ ] **Step 1: Create KeyLogin component**

Create `client/src/components/KeyLogin.tsx`:

```typescript
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getServerUrl, setServerUrl } from '../api/client';

export default function KeyLogin() {
  const { connect } = useAuth();
  const [key, setKey] = useState('');
  const [server, setServer] = useState(getServerUrl());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setServerUrl(server);
    try {
      await connect(key.trim());
    } catch (err: any) {
      setError(err.response?.data?.error || '连接失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-bg-primary">
      <div className="w-80 p-6 bg-bg-secondary border border-border rounded-xl">
        <h1 className="text-lg font-bold text-text-primary mb-4">📋 TodoFlow</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text" value={server} onChange={e => setServer(e.target.value)}
            placeholder="服务器地址 (例: http://IP:3001)"
            className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
          />
          <input
            type="password" value={key} onChange={e => setKey(e.target.value)}
            placeholder="请输入密钥" required
            className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
          />
          {error && <p className="text-accent-red text-xs mb-2">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2 bg-accent-green text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? '连接中...' : '连接'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx import**

Change line 3 from:
```typescript
import LoginForm from './components/LoginForm';
```
to:
```typescript
import KeyLogin from './components/KeyLogin';
```

And change line 16 from:
```typescript
  if (!user) return <LoginForm />;
```
to:
```typescript
  if (!user) return <KeyLogin />;
```

- [ ] **Step 3: Delete old LoginForm**

Run:
```bash
rm client/src/components/LoginForm.tsx
```

---

### Task 18: Update FloatWindow — add admin button and user display

**Files:**
- Modify: `client/src/components/FloatWindow.tsx`

- [ ] **Step 1: Add admin gear icon and show displayName**

Replace lines 1-2 (imports):
```typescript
import { useState, useCallback } from 'react';
import { Task, QuadrantKey } from '../types';
import { useAuth } from '../hooks/useAuth';
```
(stay the same — just make sure `useAuth` provides `user`)

Replace lines 17-18 (destructure) from:
```typescript
  const { logout } = useAuth();
```
to:
```typescript
  const { user, logout } = useAuth();
```

Replace lines 39-48 (the header) with:

```typescript
  return (
    <div className="h-screen bg-bg-secondary text-text-primary flex flex-col overflow-hidden drag-region">
      {/* Header — draggable area */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border-subtle drag-region">
        <span className="font-semibold text-xs">📋 TodoFlow</span>
        <TeamTabs />
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] text-text-muted">{user?.displayName}</span>
          <button onClick={logout} className="text-text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded hover:bg-bg-tertiary transition-colors">
            退出
          </button>
        </div>
      </div>
```

---

### Task 19: Create AdminPanel component

**Files:**
- Create: `client/src/components/AdminPanel.tsx`
- Modify: `client/src/components/FloatWindow.tsx` — wire it in

- [ ] **Step 1: Create AdminPanel component**

Create `client/src/components/AdminPanel.tsx`:

```typescript
import { useState, useEffect } from 'react';
import client from '../api/client';

interface AdminUser {
  id: string;
  displayName: string;
  role: string;
  keyMasked: string;
  createdAt: string;
}

interface NewKey {
  label: string;
  key: string;
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const [error, setError] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    client.get('/admin/users')
      .then(res => setUsers(res.data.data))
      .catch(() => setError('加载用户列表失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await client.post('/admin/users', { displayName: newName, role: newRole });
      setNewKey({ label: newName, key: res.data.key });
      setNewName('');
      setShowCreate(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败');
    }
  };

  const handleRegenerateKey = async (id: string, name: string) => {
    if (!confirm(`确定要为 ${name} 重新生成密钥？旧密钥将立即失效。`)) return;
    try {
      const res = await client.post(`/admin/users/${id}/regenerate-key`);
      setNewKey({ label: name, key: res.data.key });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除用户 ${name}？此操作不可撤销。`)) return;
    try {
      await client.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || '删除失败');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-drag">
      <div className="bg-bg-secondary border border-border rounded-xl w-[480px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">用户管理</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg leading-none">&times;</button>
        </div>

        {/* New key display */}
        {newKey && (
          <div className="mx-4 mt-3 p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg">
            <p className="text-xs text-text-secondary mb-1">{newKey.label} 的密钥（仅此一次显示，请复制）：</p>
            <code className="text-xs text-accent-green break-all select-all">{newKey.key}</code>
            <button onClick={() => setNewKey(null)} className="text-xs text-text-muted mt-1 block hover:underline">关闭</button>
          </div>
        )}

        {error && <p className="mx-4 mt-2 text-xs text-accent-red">{error}</p>}

        {/* Toolbar */}
        <div className="px-4 py-2">
          <button onClick={() => setShowCreate(!showCreate)}
            className="text-xs px-3 py-1.5 bg-accent-blue text-white rounded hover:opacity-90">
            + 创建用户
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="mx-4 mb-2 p-3 bg-bg-primary rounded-lg border border-border-subtle">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="显示名称" required
              className="w-full mb-2 px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-text-primary outline-none focus:border-accent-blue" />
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              className="w-full mb-2 px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-text-primary outline-none">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="text-xs px-3 py-1.5 bg-accent-green text-white rounded hover:opacity-90">创建</button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="text-xs px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded hover:bg-bg-input">取消</button>
            </div>
          </form>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <p className="text-xs text-text-muted text-center py-8">加载中...</p>
          ) : users.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">暂无用户</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-subtle">
                  <th className="text-left py-2 font-medium">名称</th>
                  <th className="text-left py-2 font-medium">角色</th>
                  <th className="text-left py-2 font-medium">密钥</th>
                  <th className="text-right py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border-subtle">
                    <td className="py-2 text-text-primary">{u.displayName}</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${u.role === 'admin' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-bg-tertiary text-text-muted'}`}>
                        {u.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-text-muted">{u.keyMasked}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => handleRegenerateKey(u.id, u.displayName)}
                        className="text-accent-blue hover:underline mr-2">重置密钥</button>
                      <button onClick={() => handleDelete(u.id, u.displayName)}
                        className="text-accent-red hover:underline">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire AdminPanel into FloatWindow**

In `FloatWindow.tsx`, add import at top (after existing imports):
```typescript
import AdminPanel from './AdminPanel';
```

Add state after `const [showForm, setShowForm] = useState(false);`:
```typescript
  const [showAdmin, setShowAdmin] = useState(false);
```

Add gear icon inside the right-side group in the header, before the displayName span. Change the `<div className="flex items-center gap-1 ml-auto">` block to:
```typescript
        <div className="flex items-center gap-1 ml-auto">
          {user?.role === 'admin' && (
            <button onClick={() => setShowAdmin(true)}
              className="text-text-muted hover:text-text-primary text-xs px-1 py-0.5 rounded hover:bg-bg-tertiary transition-colors"
              title="用户管理">
              ⚙️
            </button>
          )}
          <span className="text-[10px] text-text-muted">{user?.displayName}</span>
          <button onClick={logout} className="text-text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded hover:bg-bg-tertiary transition-colors">
            退出
          </button>
        </div>
```

Add modal render before the closing `</div>` of the outermost div (after the add bar section, just before the final `</div>`):
```typescript
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
```

---

### Task 20: Verify everything compiles

- [ ] **Step 1: Server type check**

Run: `cd server && npx tsc --noEmit`
Expected: Zero TypeScript errors.

- [ ] **Step 2: Client type check**

Run: `cd client && npx tsc --noEmit`
Expected: Zero TypeScript errors.

- [ ] **Step 3: Start server and test connect endpoint**

```bash
cd server && npm run dev
```

Check console for admin key, then test:
```bash
curl -X POST http://localhost:3001/api/auth/connect \
  -H "Content-Type: application/json" \
  -d '{"key": "<admin-key-from-console>"}'
```
Expected: `{"user":{"id":"...","displayName":"Admin","role":"admin",...}}`

- [ ] **Step 4: Test admin list users endpoint**

```bash
curl http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer <admin-key>"
```
Expected: `{"data":[{...}]}`

- [ ] **Step 5: Test client dev server**

Run: `cd client && npm run dev`
Expected: KeyLogin screen shown. Enter valid admin key → app loads with gear icon visible.

---

### Task 21: Cleanup and commit

- [ ] **Step 1: Remove unused npm packages**

Uninstall bcrypt and jsonwebtoken from server since they're no longer used.

Run: `cd server && npm uninstall bcrypt jsonwebtoken && npm uninstall @types/bcrypt @types/jsonwebtoken`
Expected: Packages removed.

- [ ] **Step 2: Verify everything still compiles after package removal**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: replace email/password auth with admin-managed API keys

- Remove email, passwordHash from User; add key, role fields
- Replace JWT middleware with database key lookup
- Add admin user management routes and Web UI
- Replace LoginForm with KeyLogin component
- Auto-create admin user on first run
- Remove bcrypt and jsonwebtoken dependencies

Co-Authored-By: Claude <noreply@anthropic.com>"
```
