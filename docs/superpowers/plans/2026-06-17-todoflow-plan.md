# TodoFlow v1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个桌面待办提醒工具，Electron 浮窗 + Node.js 服务端，四象限视图，支持循环任务和团队分配。

**Architecture:** Electron + React 客户端通过 HTTP REST 和 Socket.io 连接 Node.js 服务端，PostgreSQL 存储数据。客户端为纯在线模式。

**Tech Stack:** TypeScript, Electron, React, Tailwind CSS, shadcn/ui, Node.js, Express, Prisma ORM, PostgreSQL, Socket.io, JWT, bcrypt, node-cron

---

## 文件结构

```
todoflow/
├── shared/
│   └── types.ts                    — 前后端共享类型定义
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma           — 数据库 schema
│   └── src/
│       ├── index.ts                — 入口
│       ├── config.ts               — 环境变量配置
│       ├── middleware/
│       │   ├── auth.ts             — JWT 验证中间件
│       │   └── errorHandler.ts     — 全局错误处理
│       ├── routes/
│       │   ├── auth.ts             — /api/auth/*
│       │   ├── tasks.ts            — /api/tasks/*
│       │   ├── teams.ts            — /api/teams/*
│       │   ├── users.ts            — /api/users/*
│       │   └── notifications.ts    — /api/notifications/*
│       ├── services/
│       │   ├── auth.ts             — 登录/注册逻辑
│       │   ├── tasks.ts            — 任务 CRUD + 循环 + 紧急度
│       │   ├── teams.ts            — 团队逻辑
│       │   ├── notifications.ts    — 通知逻辑
│       │   └── reminder.ts         — 提醒定时调度
│       └── socket/
│           └── index.ts            — Socket.io 事件处理
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts              — Vite 构建配置
│   ├── tailwind.config.js          — Tailwind 配置
│   ├── postcss.config.js
│   ├── index.html                  — Vite 入口 HTML
│   ├── electron/
│   │   ├── main.ts                 — Electron 主进程
│   │   └── preload.ts              — 预加载脚本
│   └── src/
│       ├── main.tsx                — React 入口
│       ├── App.tsx                  — 根组件
│       ├── index.css               — 全局样式
│       ├── api/
│       │   ├── client.ts           — HTTP 请求封装
│       │   └── socket.ts           — Socket.io 客户端
│       ├── hooks/
│       │   ├── useAuth.ts          — 认证状态 hook
│       │   ├── useTasks.ts         — 任务数据 hook
│       │   └── useTeams.ts         — 团队数据 hook
│       ├── components/
│       │   ├── FloatWindow.tsx     — 主浮窗容器
│       │   ├── QuadrantView.tsx    — 四象限视图
│       │   ├── TaskItem.tsx        — 任务条目
│       │   ├── TaskForm.tsx        — 添加/编辑任务表单
│       │   ├── SubtaskList.tsx     — 子任务列表
│       │   ├── LoginForm.tsx       — 登录/注册表单
│       │   └── TeamTabs.tsx        — 团队切换标签
│       ├── types/
│       │   └── index.ts           — 前端类型定义
│       └── utils/
│           └── urgency.ts         — 紧急度计算（客户端显示用）
└── README.md
```

---

## Phase 1: 项目脚手架

### Task 1: 初始化项目结构

**Files:**
- Create: `shared/types.ts`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `README.md`

- [ ] **Step 1: Create shared types**

```typescript
// shared/types.ts
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export type TaskStatus = 'pending' | 'done';
export type Importance = 'high' | 'medium' | 'low';
export type Urgency = 'high' | 'medium' | 'low';

export type RecurrenceType = 'none' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval?: number;
  startTime?: string;
  dueTime?: string;
  weekdaysOnly?: boolean;
  days?: number[];
  day?: number;
  due?: 'quarter_end' | 'quarter_start';
  startOffsetDays?: number;
  visibleAfter?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  importance: Importance;
  urgency: Urgency;
  parentId?: string;
  startAt?: string;
  dueAt?: string;
  remindAt?: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  assigneeId?: string;
  assignee?: User;
  creatorId: string;
  creator?: User;
  teamId?: string;
  subtasks?: Task[];
  createdAt: string;
  updatedAt: string;
  // 计算字段
  effectiveUrgency?: Urgency;
  isOverdue?: boolean;
}

export interface Team {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  memberCount?: number;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  user?: User;
  joinedAt: string;
}

export type NotificationType = 'reminder' | 'assigned' | 'completed';

export interface Notification {
  id: string;
  userId: string;
  taskId: string;
  task?: Task;
  type: NotificationType;
  readAt?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
```

- [ ] **Step 2: Create server package.json**

```json
// server/package.json
{
  "name": "todoflow-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "node-cron": "^3.0.3",
    "socket.io": "^4.8.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.0.0",
    "@types/node-cron": "^3.0.11",
    "prisma": "^6.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: Create server tsconfig**

```json
// server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "paths": {
      "@shared/*": ["../shared/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create server .env.example**

```
// server/.env.example
DATABASE_URL="postgresql://postgres:password@localhost:5432/todoflow"
JWT_SECRET="change-me-to-a-random-string"
PORT=3001
CLIENT_URL="http://localhost:5173"
```

- [ ] **Step 5: Create client package.json**

```json
// client/package.json
{
  "name": "todoflow-client",
  "version": "1.0.0",
  "private": true,
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "vite build && electron-builder"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "lucide-react": "^0.460.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "socket.io-client": "^4.8.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "concurrently": "^9.0.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "wait-on": "^8.0.0"
  }
}
```

- [ ] **Step 6: Create client vite config**

```typescript
// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
  },
});
```

- [ ] **Step 7: Install dependencies**

Run:
```bash
cd server && npm install
```
```bash
cd client && npm install
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: initialize project structure"
```

---

## Phase 2: 数据库 & 认证

### Task 2: 创建 Prisma Schema 并初始化数据库

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/config.ts`
- Create: `server/src/index.ts` (骨架)

- [ ] **Step 1: Write Prisma schema**

```prisma
// server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  displayName  String   @map("display_name")
  avatarUrl    String?  @map("avatar_url")
  createdAt    DateTime @default(now()) @map("created_at")

  createdTasks     Task[]          @relation("TaskCreator")
  assignedTasks    Task[]          @relation("TaskAssignee")
  notifications    Notification[]
  teamMemberships  TeamMember[]

  @@map("users")
}

model Task {
  id             String    @id @default(uuid())
  title          String
  description    String?
  status         String    @default("pending")
  importance     String    @default("medium")
  urgency        String    @default("medium")
  parentId       String?   @map("parent_id")
  startAt        DateTime? @map("start_at")
  dueAt          DateTime? @map("due_at")
  remindAt       String?   @map("remind_at")
  isRecurring    Boolean   @default(false) @map("is_recurring")
  recurrenceRule Json?     @map("recurrence_rule")
  assigneeId     String?   @map("assignee_id")
  creatorId      String    @map("creator_id")
  teamId         String?   @map("team_id")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  parent    Task?    @relation("Subtasks", fields: [parentId], references: [id])
  subtasks  Task[]   @relation("Subtasks")
  assignee  User?    @relation("TaskAssignee", fields: [assigneeId], references: [id])
  creator   User     @relation("TaskCreator", fields: [creatorId], references: [id])
  team      Team?    @relation(fields: [teamId], references: [id])

  @@index([creatorId])
  @@index([assigneeId])
  @@index([teamId])
  @@index([parentId])
  @@index([status])
  @@map("tasks")
}

model Team {
  id        String   @id @default(uuid())
  name      String
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")

  members TeamMember[]
  tasks   Task[]

  @@map("teams")
}

model TeamMember {
  teamId   String   @map("team_id")
  userId   String   @map("user_id")
  role     String   @default("member")
  joinedAt DateTime @default(now()) @map("joined_at")

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([teamId, userId])
  @@map("team_members")
}

model Notification {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  taskId    String    @map("task_id")
  type      String
  readAt    DateTime? @map("read_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("notifications")
}
```

- [ ] **Step 2: Write config**

```typescript
// server/src/config.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/todoflow',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtExpiresIn: '7d',
};
```

- [ ] **Step 3: Write server entry skeleton**

```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const server = createServer(app);

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());

// Routes will be added in later tasks
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export { app, server };
```

- [ ] **Step 4: Run database migration**

```bash
cd server && npx prisma migrate dev --name init
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add prisma schema and server skeleton"
```

### Task 3: 实现认证服务

**Files:**
- Create: `server/src/services/auth.ts`
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/routes/auth.ts`

- [ ] **Step 1: Write auth service**

```typescript
// server/src/services/auth.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const prisma = new PrismaClient();

export class AuthService {
  async register(email: string, password: string, displayName: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, '邮箱已被注册');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
      select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
    });

    const token = this.generateToken(user.id);
    return { token, user };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, '邮箱或密码错误');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, '邮箱或密码错误');
    }

    const token = this.generateToken(user.id);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
    });
    if (!user) throw new AppError(404, '用户不存在');
    return user;
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  }
}

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const authService = new AuthService();
```

- [ ] **Step 2: Write JWT middleware**

```typescript
// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
}
```

- [ ] **Step 3: Write error handler**

```typescript
// server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/auth';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: '服务器内部错误' });
}
```

- [ ] **Step 4: Write auth routes**

```typescript
// server/src/routes/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }
    const result = await authService.register(email, password, displayName);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.userId!);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 5: Mount routes in index.ts**

In `server/src/index.ts`, add after `app.use(express.json())`:
```typescript
import authRoutes from './routes/auth';
app.use('/api/auth', authRoutes);
```

- [ ] **Step 6: Test with curl**

```bash
# Start server
cd server && npm run dev

# In another terminal:
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","displayName":"测试"}'

# Expect: {"token":"...","user":{"id":"...","email":"test@test.com",...}}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement auth service with JWT"
```

---

## Phase 3: 任务 API

### Task 4: 实现任务服务 (CRUD + 查询)

**Files:**
- Create: `server/src/services/tasks.ts`
- Create: `server/src/routes/tasks.ts`

- [ ] **Step 1: Write task service**

```typescript
// server/src/services/tasks.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from './auth';

const prisma = new PrismaClient();

const TASK_INCLUDE = {
  assignee: {
    select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
  },
  creator: {
    select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
  },
  subtasks: {
    include: {
      assignee: {
        select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
      },
    },
  },
} as const;

export class TaskService {
  async list(userId: string, filters: { teamId?: string; quadrant?: string; status?: string }) {
    const where: Prisma.TaskWhereInput = {
      parentId: null, // only top-level tasks
      OR: [
        { creatorId: userId },
        { assigneeId: userId },
        ...(filters.teamId ? [{ teamId: filters.teamId }] : []),
      ],
      ...(filters.status ? { status: filters.status } : {}),
    };

    const tasks = await prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
    });

    return tasks.map(t => this.applyUrgencyUpgrade(t));
  }

  async create(data: {
    title: string;
    description?: string;
    importance: string;
    urgency: string;
    startAt?: string;
    dueAt?: string;
    remindAt?: string;
    isRecurring: boolean;
    recurrenceRule?: any;
    assigneeId?: string;
    teamId?: string;
    creatorId: string;
    subtasks?: Array<{ title: string; assigneeId?: string }>;
  }) {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        importance: data.importance,
        urgency: data.urgency,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        remindAt: data.remindAt,
        isRecurring: data.isRecurring,
        recurrenceRule: data.recurrenceRule || Prisma.JsonNull,
        assigneeId: data.assigneeId,
        teamId: data.teamId,
        creatorId: data.creatorId,
        subtasks: data.subtasks?.length
          ? {
              create: data.subtasks.map(st => ({
                title: st.title,
                assigneeId: st.assigneeId || data.assigneeId,
                creatorId: data.creatorId,
                importance: data.importance,
                urgency: data.urgency,
                teamId: data.teamId,
              })),
            }
          : undefined,
      },
      include: TASK_INCLUDE,
    });

    return this.applyUrgencyUpgrade(task);
  }

  async update(id: string, userId: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    importance: string;
    urgency: string;
    startAt: string;
    dueAt: string;
    remindAt: string;
    isRecurring: boolean;
    recurrenceRule: any;
    assigneeId: string;
    teamId: string;
  }>) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError(404, '任务不存在');

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      },
      include: TASK_INCLUDE,
    });

    return this.applyUrgencyUpgrade(updated);
  }

  async remove(id: string) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError(404, '任务不存在');

    await prisma.task.deleteMany({ where: { parentId: id } });
    await prisma.task.delete({ where: { id } });
  }

  async toggleComplete(id: string) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError(404, '任务不存在');

    const newStatus = task.status === 'done' ? 'pending' : 'done';
    return prisma.task.update({
      where: { id },
      data: { status: newStatus },
      include: TASK_INCLUDE,
    });
  }

  // 智能紧急度升级
  private applyUrgencyUpgrade(task: any): any {
    if (!task.dueAt || task.status === 'done') return task;

    const now = new Date();
    const dueAt = new Date(task.dueAt);
    const hoursUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    let effectiveUrgency = task.urgency;
    let isOverdue = false;

    if (hoursUntilDue < 0) {
      effectiveUrgency = 'high';
      isOverdue = true;
    } else if (hoursUntilDue <= 24) {
      // 距截止 ≤ 1 天，紧急度升一级
      if (task.urgency === 'medium') effectiveUrgency = 'high';
      if (task.urgency === 'low') effectiveUrgency = 'medium';
    }

    return { ...task, effectiveUrgency, isOverdue };
  }
}

export const taskService = new TaskService();
```

- [ ] **Step 2: Write task routes**

```typescript
// server/src/routes/tasks.ts
import { Router, Response, NextFunction } from 'express';
import { taskService } from '../services/tasks';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId, quadrant, status } = req.query;
    const tasks = await taskService.list(req.userId!, {
      teamId: teamId as string,
      quadrant: quadrant as string,
      status: status as string,
    });
    res.json({ data: tasks });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.create({ ...req.body, creatorId: req.userId! });
    res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.update(req.params.id, req.userId!, req.body);
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await taskService.remove(req.params.id);
    res.json({ data: null });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/complete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.toggleComplete(req.params.id);
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 3: Mount task routes**

In `server/src/index.ts`:
```typescript
import taskRoutes from './routes/tasks';
app.use('/api/tasks', taskRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement task CRUD with urgency upgrade"
```

### Task 5: 实现提醒调度器

**Files:**
- Create: `server/src/services/reminder.ts`

- [ ] **Step 1: Write reminder scheduler**

```typescript
// server/src/services/reminder.ts
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { getIO } from '../socket';

const prisma = new PrismaClient();

export function startReminderScheduler() {
  // 每分钟检查一次
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    // 查找需要提醒的任务
    const tasks = await prisma.task.findMany({
      where: {
        status: 'pending',
        dueAt: { not: null },
      },
      include: {
        assignee: { select: { id: true } },
        creator: { select: { id: true } },
      },
    });

    for (const task of tasks) {
      const dueAt = new Date(task.dueAt!);
      const minutesUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60);

      // 任务到期或即将到期（15分钟内）
      if (minutesUntilDue <= 15 && minutesUntilDue > -60) {
        const targetUserId = task.assigneeId || task.creatorId;

        // 检查是否已有未读提醒（避免重复发送）
        const existing = await prisma.notification.findFirst({
          where: {
            taskId: task.id,
            type: 'reminder',
            readAt: null,
            createdAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) },
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              taskId: task.id,
              type: 'reminder',
            },
          });

          // 通过 Socket.io 推送提醒
          const io = getIO();
          if (io) {
            io.to(`user:${targetUserId}`).emit('task:reminder', {
              taskId: task.id,
              title: task.title,
              dueAt: task.dueAt,
              isOverdue: minutesUntilDue < 0,
            });
          }
        }
      }
    }
  });

  console.log('Reminder scheduler started');
}
```

- [ ] **Step 2: Start scheduler in index.ts**

```typescript
// Add to server/src/index.ts after server.listen()
import { startReminderScheduler } from './services/reminder';
startReminderScheduler();
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add reminder scheduler with cron"
```

---

## Phase 4: 团队 & 通知

### Task 6: 实现团队 API

**Files:**
- Create: `server/src/services/teams.ts`
- Create: `server/src/routes/teams.ts`

- [ ] **Step 1: Write team service**

```typescript
// server/src/services/teams.ts
import { PrismaClient } from '@prisma/client';
import { AppError } from './auth';

const prisma = new PrismaClient();

export class TeamService {
  async list(userId: string) {
    return prisma.team.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { members: true } } },
    });
  }

  async create(name: string, createdBy: string) {
    const team = await prisma.team.create({
      data: {
        name,
        createdBy,
        members: { create: { userId: createdBy, role: 'owner' } },
      },
    });
    return team;
  }

  async getMembers(teamId: string) {
    return prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async addMember(teamId: string, userId: string, role: string = 'member') {
    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing) throw new AppError(409, '该用户已在团队中');
    return prisma.teamMember.create({ data: { teamId, userId, role } });
  }

  async updateMemberRole(teamId: string, userId: string, role: string) {
    return prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: { role },
    });
  }

  async removeMember(teamId: string, userId: string) {
    return prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });
  }
}

export const teamService = new TeamService();
```

- [ ] **Step 2: Write team routes**

```typescript
// server/src/routes/teams.ts
import { Router, Response, NextFunction } from 'express';
import { teamService } from '../services/teams';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teams = await teamService.list(req.userId!);
    res.json({ data: teams });
  } catch (err) { next(err); }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '团队名称不能为空' });
    const team = await teamService.create(name, req.userId!);
    res.status(201).json({ data: team });
  } catch (err) { next(err); }
});

router.get('/:id/members', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const members = await teamService.getMembers(req.params.id);
    res.json({ data: members });
  } catch (err) { next(err); }
});

router.post('/:id/members', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.body;
    const member = await teamService.addMember(req.params.id, userId, role);
    res.status(201).json({ data: member });
  } catch (err) { next(err); }
});

router.patch('/:id/members/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await teamService.updateMemberRole(req.params.id, req.params.userId, req.body.role);
    res.json({ data: member });
  } catch (err) { next(err); }
});

router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await teamService.removeMember(req.params.id, req.params.userId);
    res.json({ data: null });
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 3: Mount in index.ts**

```typescript
import teamRoutes from './routes/teams';
app.use('/api/teams', teamRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement team API"
```

### Task 7: 实现通知 API 和用户搜索

**Files:**
- Create: `server/src/services/notifications.ts`
- Create: `server/src/routes/notifications.ts`
- Create: `server/src/routes/users.ts`

- [ ] **Step 1: Write notification service**

```typescript
// server/src/services/notifications.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  async list(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}

export const notificationService = new NotificationService();
```

- [ ] **Step 2: Write notification routes**

```typescript
// server/src/routes/notifications.ts
import { Router, Response, NextFunction } from 'express';
import { notificationService } from '../services/notifications';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationService.list(req.userId!);
    res.json({ data: notifications });
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.markRead(req.params.id);
    res.json({ data: notification });
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 3: Write user search route**

```typescript
// server/src/routes/users.ts
import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();
router.use(authMiddleware);

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
    });
    res.json({ data: user });
  } catch (err) { next(err); }
});

router.get('/search', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, displayName: true, avatarUrl: true },
      take: 10,
    });
    res.json({ data: users });
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 4: Mount in index.ts**

```typescript
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement notifications and user search API"
```

---

## Phase 5: 实时通信

### Task 8: 实现 Socket.io

**Files:**
- Create: `server/src/socket/index.ts`

- [ ] **Step 1: Write socket handler**

```typescript
// server/src/socket/index.ts
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

  // 认证中间件
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

    // 加入个人房间
    socket.join(`user:${userId}`);

    // 加入团队房间
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

- [ ] **Step 2: Wire up socket in index.ts**

Replace the existing `server.listen` block in `server/src/index.ts`:
```typescript
import { setupSocket } from './socket';

const server = createServer(app);
setupSocket(server);

// ... routes ...

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  startReminderScheduler();
});
```

- [ ] **Step 3: Emit events from task service**

Add to `server/src/services/tasks.ts` after create/update/delete operations:
```typescript
// At top of file:
import { getIO } from '../socket';

// Inside TaskService, add a helper:
private emitTaskEvent(event: string, task: any, teamId?: string) {
  const io = getIO();
  if (!io) return;

  const payload = { type: event, task: this.applyUrgencyUpgrade(task) };

  // Notify task participants
  const users = new Set<string>();
  if (task.creatorId) users.add(task.creatorId);
  if (task.assigneeId) users.add(task.assigneeId);
  if (task.subtasks) {
    task.subtasks.forEach((st: any) => {
      if (st.assigneeId) users.add(st.assigneeId);
    });
  }

  users.forEach(uid => io.to(`user:${uid}`).emit('task:updated', payload));

  // Notify team
  const targetTeamId = teamId || task.teamId;
  if (targetTeamId) {
    io.to(`team:${targetTeamId}`).emit('task:updated', payload);
  }
}
```

Add `this.emitTaskEvent('created', task, data.teamId);` in `create()`, `this.emitTaskEvent('updated', updated, data.teamId);` in `update()`, and `this.emitTaskEvent('deleted', { id }, undefined);` in `remove()`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement socket.io real-time communication"
```

---

## Phase 6: 客户端搭建

### Task 9: 搭建 Electron + React 骨架

**Files:**
- Create: `client/electron/main.ts`
- Create: `client/electron/preload.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/index.css`
- Create: `client/postcss.config.js`
- Create: `client/tailwind.config.js`

- [ ] **Step 1: Write Electron main process**

```typescript
// client/electron/main.ts
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 340,
    height: 520,
    x: 0,  // will be positioned in show()
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Position in top-right
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow.setPosition(width - 350, 10);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray() {
  // Create a simple 16x16 tray icon
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示/隐藏', click: () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow?.show();
      }
    }},
    { type: 'separator' },
    { label: '退出', click: () => {
      isQuitting = true;
      app.quit();
    }},
  ]);

  tray.setToolTip('TodoFlow');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
}

// IPC: show native notification
ipcMain.on('show-notification', (_event, data: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: data.title,
      body: data.body,
      silent: false,
    });
    notification.on('click', () => {
      mainWindow?.show();
    });
    notification.show();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

- [ ] **Step 2: Write preload script**

```typescript
// client/electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  hideWindow: () => ipcRenderer.send('hide-window'),
});
```

- [ ] **Step 3: Create index.html**

```html
<!-- client/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TodoFlow</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: Write React entry**

```tsx
// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Write App shell**

```tsx
// client/src/App.tsx
import { useState, useEffect } from 'react';
import FloatWindow from './components/FloatWindow';
import LoginForm from './components/LoginForm';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117] text-[#8b949e] text-sm">
        加载中...
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <FloatWindow />;
}
```

- [ ] **Step 6: Write global CSS**

```css
/* client/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: transparent;
  overflow: hidden;
}

/* Allow dragging the frameless window */
.drag-region {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: #484f58; }

/* Quadrant collapse animation */
.quad-tasks {
  overflow: hidden;
  transition: max-height 0.2s ease;
}
```

- [ ] **Step 7: Create postcss and tailwind config**

```javascript
// client/postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

```javascript
// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { primary: '#0d1117', secondary: '#161b22', tertiary: '#1c2128', input: '#21262d' },
        border: { DEFAULT: '#30363d', subtle: '#21262d' },
        text: { primary: '#c9d1d9', secondary: '#8b949e', muted: '#484f58' },
        accent: { red: '#f85149', yellow: '#d29922', blue: '#58a6ff', green: '#238636', purple: '#cba6f7' },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 8: Install client dependencies and test**

```bash
cd client && npm install
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold electron + react client"
```

---

## Phase 7: 客户端 UI 组件

### Task 10: 实现 API 客户端和 Auth Hook

**Files:**
- Create: `client/src/api/client.ts`
- Create: `client/src/api/socket.ts`
- Create: `client/src/hooks/useAuth.ts`
- Create: `client/src/types/index.ts`
- Create: `client/src/utils/urgency.ts`

- [ ] **Step 1: Write API client**

```typescript
// client/src/api/client.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const client = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: attach token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: handle 401
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export default client;
```

- [ ] **Step 2: Write socket client**

```typescript
// client/src/api/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));

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

- [ ] **Step 3: Write useAuth hook**

```typescript
// client/src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import client from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      client.get('/users/me')
        .then(res => {
          setUser(res.data.data);
          connectSocket(token);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await client.post('/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    connectSocket(token);
    return user;
  };

  const register = async (email: string, password: string, displayName: string) => {
    const res = await client.post('/auth/register', { email, password, displayName });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    connectSocket(token);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    disconnectSocket();
  };

  return { user, loading, login, register, logout };
}
```

- [ ] **Step 4: Write types**

```typescript
// client/src/types/index.ts
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export type TaskStatus = 'pending' | 'done';
export type Importance = 'high' | 'medium' | 'low';
export type Urgency = 'high' | 'medium' | 'low';
export type RecurrenceType = 'none' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval?: number;
  startTime?: string;
  dueTime?: string;
  weekdaysOnly?: boolean;
  days?: number[];
  day?: number;
  due?: string;
  startOffsetDays?: number;
  visibleAfter?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  importance: Importance;
  urgency: Urgency;
  effectiveUrgency?: Urgency;
  isOverdue?: boolean;
  parentId?: string;
  startAt?: string;
  dueAt?: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  assigneeId?: string;
  assignee?: User;
  creatorId: string;
  creator?: User;
  teamId?: string;
  subtasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  createdBy: string;
  _count?: { members: number };
}

export type QuadrantKey = 'q1' | 'q2' | 'q3' | 'q4';
```

- [ ] **Step 5: Write urgency utility**

```typescript
// client/src/utils/urgency.ts
import { Task, QuadrantKey } from '../types';

export function getQuadrant(urgency: string, importance: string): QuadrantKey {
  if (urgency === 'high' && importance === 'high') return 'q1';
  if (urgency !== 'high' && importance === 'high') return 'q2';
  if (urgency === 'high' && importance !== 'high') return 'q3';
  return 'q4';
}

export function getEffectiveQuadrant(task: Task): QuadrantKey {
  const u = task.effectiveUrgency || task.urgency;
  return getQuadrant(u, task.importance);
}

export const QUADRANT_CONFIG: Record<QuadrantKey, { label: string; color: string; dot: string }> = {
  q1: { label: '马上做', color: '#f85149', dot: '🔴' },
  q2: { label: '计划做', color: '#d29922', dot: '🟡' },
  q3: { label: '委派', color: '#58a6ff', dot: '🔵' },
  q4: { label: '暂缓', color: '#484f58', dot: '⚫' },
};
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: implement API client, auth hook, and utility functions"
```

### Task 11: 实现登录表单和 useTasks hook

**Files:**
- Create: `client/src/components/LoginForm.tsx`
- Create: `client/src/hooks/useTasks.ts`

- [ ] **Step 1: Write LoginForm**

```tsx
// client/src/components/LoginForm.tsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginForm() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-bg-primary">
      <div className="w-72 p-6 bg-bg-secondary border border-border rounded-xl">
        <h1 className="text-lg font-bold text-text-primary mb-4">📋 TodoFlow</h1>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="昵称" required
              className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
            />
          )}
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="邮箱" required
            className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="密码（至少6位）" required minLength={6}
            className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
          />
          {error && <p className="text-accent-red text-xs mb-2">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2 bg-accent-green text-white rounded-md text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : isLogin ? '登录' : '注册'}
          </button>
        </form>
        <p className="text-text-secondary text-xs text-center mt-3">
          {isLogin ? '没有账号？' : '已有账号？'}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-accent-blue ml-1 hover:underline">
            {isLogin ? '注册' : '登录'}
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write useTasks hook**

```typescript
// client/src/hooks/useTasks.ts
import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { getSocket } from '../api/socket';
import { Task, QuadrantKey } from '../types';
import { getEffectiveQuadrant } from '../utils/urgency';

export function useTasks(teamId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const params = teamId ? { teamId } : {};
      const res = await client.get('/tasks', { params });
      setTasks(res.data.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTaskUpdate = (data: any) => {
      if (data.type === 'deleted') {
        setTasks(prev => prev.filter(t => t.id !== data.task.id));
      } else if (data.type === 'created') {
        setTasks(prev => [data.task, ...prev]);
      } else if (data.type === 'updated') {
        setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
      }
    };

    socket.on('task:updated', handleTaskUpdate);
    return () => { socket.off('task:updated', handleTaskUpdate); };
  }, []);

  const createTask = async (data: Partial<Task>) => {
    const res = await client.post('/tasks', data);
    setTasks(prev => [res.data.data, ...prev]);
    return res.data.data;
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    const res = await client.put(`/tasks/${id}`, data);
    setTasks(prev => prev.map(t => t.id === id ? res.data.data : t));
    return res.data.data;
  };

  const deleteTask = async (id: string) => {
    await client.delete(`/tasks/${id}`);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleComplete = async (id: string) => {
    const res = await client.patch(`/tasks/${id}/complete`);
    setTasks(prev => prev.map(t => t.id === id ? res.data.data : t));
    return res.data.data;
  };

  const getQuadrantTasks = (quadrant: QuadrantKey) => {
    return tasks
      .filter(t => t.status === 'pending' && !t.parentId)
      .filter(t => getEffectiveQuadrant(t) === quadrant)
      .sort((a, b) => {
        // 超期的排最前
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        // 然后按截止时间
        if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        return 0;
      });
  };

  return { tasks, loading, fetchTasks, createTask, updateTask, deleteTask, toggleComplete, getQuadrantTasks };
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement login form and useTasks hook"
```

### Task 12: 实现 TaskItem 和 QuadrantView 组件

**Files:**
- Create: `client/src/components/TaskItem.tsx`
- Create: `client/src/components/QuadrantView.tsx`

- [ ] **Step 1: Write TaskItem**

```tsx
// client/src/components/TaskItem.tsx
import { Task } from '../types';
import { useTasks } from '../hooks/useTasks';

interface Props {
  task: Task;
  isSubtask?: boolean;
  onEdit?: (task: Task) => void;
}

export default function TaskItem({ task, isSubtask = false, onEdit }: Props) {
  const { toggleComplete } = useTasks();

  const recurrenceLabel = (task: Task): string | null => {
    if (!task.isRecurring || !task.recurrenceRule) return null;
    const r = task.recurrenceRule;
    switch (r.type) {
      case 'hourly': return '每小时';
      case 'daily': return '每天';
      case 'weekly': return `每周${r.days?.map(d => ['日','一','二','三','四','五','六'][d]).join(',') || ''}`;
      case 'monthly': return `每月${r.day || ''}号`;
      case 'quarterly': return '每季度';
      default: return null;
    }
  };

  const isDone = task.status === 'done';
  const recurLabel = recurrenceLabel(task);

  return (
    <div
      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-bg-tertiary cursor-pointer text-xs ${isDone ? 'opacity-50' : ''}`}
      onClick={() => onEdit?.(task)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }}
        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] flex-shrink-0 transition-colors ${
          isDone
            ? 'bg-accent-green border-accent-green text-white'
            : 'border-border hover:border-accent-blue'
        }`}
      >
        {isDone && '✓'}
      </button>

      <span className={`flex-1 truncate ${isDone ? 'line-through text-text-muted' : 'text-text-primary'}`}>
        {!isSubtask && task.isOverdue && <span className="text-accent-red mr-1">🔴</span>}
        {task.title}
      </span>

      <div className="flex gap-1 flex-shrink-0">
        {recurLabel && (
          <span className="text-[8px] px-1.5 py-px rounded-full bg-accent-purple/15 text-accent-purple whitespace-nowrap">
            {recurLabel}
          </span>
        )}
        {task.assignee && (
          <span className="text-[8px] px-1.5 py-px rounded-full bg-accent-blue/10 text-accent-blue whitespace-nowrap">
            @{task.assignee.displayName}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write QuadrantView**

```tsx
// client/src/components/QuadrantView.tsx
import { useState } from 'react';
import { Task, QuadrantKey } from '../types';
import { useTasks } from '../hooks/useTasks';
import { QUADRANT_CONFIG } from '../utils/urgency';
import TaskItem from './TaskItem';

interface Props {
  quadrant: QuadrantKey;
  defaultOpen?: boolean;
  onEditTask: (task: Task) => void;
}

export default function QuadrantView({ quadrant, defaultOpen = true, onEditTask }: Props) {
  const { getQuadrantTasks } = useTasks();
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const config = QUADRANT_CONFIG[quadrant];
  const tasks = getQuadrantTasks(quadrant);

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 w-full px-1 py-1.5 hover:bg-bg-tertiary rounded text-[10px] font-semibold sticky top-0 bg-bg-secondary z-10"
      >
        <span className={`text-[8px] text-text-muted transition-transform ${collapsed ? '-rotate-90' : ''}`}>▼</span>
        <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ backgroundColor: config.color }} />
        <span style={{ color: config.color }}>{config.label}</span>
        <span className="ml-auto text-[9px] text-text-secondary">{tasks.length}</span>
      </button>

      {!collapsed && (
        <div className="overflow-hidden">
          {tasks.map(task => (
            <div key={task.id}>
              <TaskItem task={task} onEdit={onEditTask} />
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="ml-4">
                  {task.subtasks.map(st => (
                    <TaskItem key={st.id} task={st} isSubtask onEdit={onEditTask} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-[10px] text-text-muted px-1.5 py-1">暂无任务</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement TaskItem and QuadrantView components"
```

### Task 13: 实现 TaskForm 和 FloatWindow

**Files:**
- Create: `client/src/components/TaskForm.tsx`
- Create: `client/src/components/SubtaskList.tsx`
- Create: `client/src/components/FloatWindow.tsx`
- Create: `client/src/hooks/useTeams.ts`
- Create: `client/src/components/TeamTabs.tsx`

- [ ] **Step 1: Write SubtaskList**

```tsx
// client/src/components/SubtaskList.tsx
import { useState } from 'react';

interface Subtask {
  title: string;
  assigneeId: string;
}

interface Props {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

export default function SubtaskList({ subtasks, onChange }: Props) {
  const add = () => onChange([...subtasks, { title: '', assigneeId: '' }]);

  const remove = (i: number) => {
    onChange(subtasks.filter((_, idx) => idx !== i));
  };

  const update = (i: number, field: keyof Subtask, value: string) => {
    const updated = subtasks.map((st, idx) => idx === i ? { ...st, [field]: value } : st);
    onChange(updated);
  };

  return (
    <div className="mt-1">
      <label className="text-[9px] text-text-secondary uppercase">子任务</label>
      {subtasks.map((st, i) => (
        <div key={i} className="flex items-center gap-1 mt-1">
          <input
            value={st.title} onChange={e => update(i, 'title', e.target.value)}
            placeholder="名称" className="flex-1 bg-bg-input border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none focus:border-accent-blue"
          />
          <select
            value={st.assigneeId} onChange={e => update(i, 'assigneeId', e.target.value)}
            className="w-16 bg-bg-input border border-border rounded px-1 py-1 text-[10px] text-text-primary outline-none"
          >
            <option value="">自己</option>
            <option value="zhangsan">张三</option>
            <option value="lisi">李四</option>
            <option value="wangwu">王五</option>
          </select>
          <button onClick={() => remove(i)} className="text-text-muted hover:text-accent-red text-xs">✕</button>
        </div>
      ))}
      <button onClick={add} className="text-[9px] text-accent-blue mt-1 hover:underline">+ 子任务</button>
    </div>
  );
}
```

- [ ] **Step 2: Write TaskForm**

```tsx
// client/src/components/TaskForm.tsx
import { useState, useEffect } from 'react';
import { Task, RecurrenceType } from '../types';
import SubtaskList from './SubtaskList';

interface Props {
  task?: Task;
  teamId?: string;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

interface SubtaskEntry {
  title: string;
  assigneeId: string;
}

export default function TaskForm({ task, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(task?.title || '');
  const [quadrant, setQuadrant] = useState(task
    ? `${task.urgency === 'high' ? 'q' : task.importance === 'high' ? 'q' : task.urgency === 'high' ? 'q' : 'q'}`
    : 'q2');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || '');
  const [startAt, setStartAt] = useState(task?.startAt?.slice(0, 16) || new Date().toISOString().slice(0, 16));
  const [dueAt, setDueAt] = useState(task?.dueAt?.slice(0, 16) || new Date().toISOString().slice(0, 16));
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrenceRule?.type || 'none');
  const [recurVal, setRecurVal] = useState('1');
  const [weekdaysOnly, setWeekdaysOnly] = useState(task?.recurrenceRule?.weekdaysOnly || false);
  const [subtasks, setSubtasks] = useState<SubtaskEntry[]>(
    task?.subtasks?.map(st => ({ title: st.title, assigneeId: st.assigneeId || '' })) || []
  );
  const [saving, setSaving] = useState(false);

  const quadrantToUrgencyImportance = (q: string) => {
    switch (q) {
      case 'q1': return { urgency: 'high', importance: 'high' };
      case 'q2': return { urgency: 'medium', importance: 'high' };
      case 'q3': return { urgency: 'high', importance: 'medium' };
      case 'q4': return { urgency: 'low', importance: 'low' };
      default: return { urgency: 'medium', importance: 'medium' };
    }
  };

  const buildRecurrenceRule = () => {
    if (recurrence === 'none') return undefined;
    const rule: any = { type: recurrence, weekdaysOnly: weekdaysOnly || undefined };

    switch (recurrence) {
      case 'hourly': rule.interval = parseInt(recurVal) || 1; break;
      case 'daily': break;  // start/due from main form
      case 'weekly': rule.days = recurVal.split(',').map((d: string) => {
        const map: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0 };
        return map[d.trim()] ?? parseInt(d);
      }); break;
      case 'monthly': rule.day = parseInt(recurVal) || 1; break;
      case 'quarterly': rule.startOffsetDays = -(parseInt(recurVal) || 7); rule.due = 'quarter_end'; break;
    }

    return rule;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const { urgency, importance } = quadrantToUrgencyImportance(quadrant);
    try {
      await onSave({
        title: title.trim(),
        urgency,
        importance,
        assigneeId: assigneeId || undefined,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        isRecurring: recurrence !== 'none',
        recurrenceRule: buildRecurrenceRule(),
        subtasks: subtasks.filter(st => st.title.trim()).map(st => ({
          title: st.title.trim(),
          assigneeId: st.assigneeId || undefined,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  const recurParams = () => {
    const label = recurrence === 'hourly' ? '间隔' : recurrence === 'weekly' ? '星期' : recurrence === 'monthly' ? '每' : recurrence === 'quarterly' ? '提前' : '';
    const unit = recurrence === 'hourly' ? '小时' : recurrence === 'monthly' ? '号' : recurrence === 'quarterly' ? '天' : '';
    const showWeekday = recurrence === 'hourly' || recurrence === 'daily';

    return (
      <div className="text-[9px] text-text-secondary py-1">
        <span>{label}</span>
        <input
          type={recurrence === 'weekly' ? 'text' : 'number'}
          value={recurVal} onChange={e => setRecurVal(e.target.value)}
          className="w-10 mx-1 bg-bg-input border border-border rounded px-1.5 py-0.5 text-[10px] text-text-primary outline-none focus:border-accent-blue"
          min={1} max={recurrence === 'monthly' ? 31 : recurrence === 'quarterly' ? 30 : undefined}
        />
        <span>{unit}</span>
        {showWeekday && (
          <label className="ml-2 cursor-pointer">
            <input type="checkbox" checked={weekdaysOnly} onChange={e => setWeekdaysOnly(e.target.checked)}
              className="w-3 h-3 accent-accent-blue align-middle mr-1" />
            仅工作日
          </label>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mt-1.5 p-2 bg-bg-tertiary border border-border rounded-lg">
      {/* Row 1: Title */}
      <input
        type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="任务名称" autoFocus
        className="w-full bg-bg-input border border-border rounded px-2 py-1.5 text-[11px] text-text-primary placeholder-text-muted outline-none focus:border-accent-blue mb-1.5"
      />

      {/* Row 2: Quadrant + Assignee + Recurrence */}
      <div className="flex gap-1 mb-1.5">
        <select value={quadrant} onChange={e => setQuadrant(e.target.value)}
          className="flex-1 bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none">
          <option value="q1">🔴 马上做</option>
          <option value="q2">🟡 计划做</option>
          <option value="q3">🔵 委派</option>
          <option value="q4">⚫ 暂缓</option>
        </select>
        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
          className="flex-1 bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none">
          <option value="">自己</option>
          <option value="zhangsan">张三</option>
          <option value="lisi">李四</option>
          <option value="wangwu">王五</option>
        </select>
        <select value={recurrence} onChange={e => setRecurrence(e.target.value as RecurrenceType)}
          className="flex-1 bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none">
          <option value="none">不循环</option>
          <option value="hourly">每小时</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
          <option value="quarterly">每季度</option>
        </select>
      </div>

      {/* Row 3: Start/Due time */}
      <div className="flex gap-1 mb-1.5">
        <div className="flex-1">
          <label className="text-[9px] text-text-secondary uppercase block">开始时间</label>
          <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)}
            className="w-full bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none focus:border-accent-blue" />
        </div>
        <div className="flex-1">
          <label className="text-[9px] text-text-secondary uppercase block">截止时间</label>
          <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
            className="w-full bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none focus:border-accent-blue" />
        </div>
      </div>

      {/* Recurrence mini row */}
      {recurrence !== 'none' && recurParams()}

      {/* Subtasks */}
      <SubtaskList subtasks={subtasks} onChange={setSubtasks} />

      {/* Actions */}
      <div className="flex justify-end gap-1 mt-2">
        <button type="button" onClick={onCancel}
          className="px-3 py-1 bg-bg-input border border-border rounded text-[10px] text-text-primary hover:bg-border transition-colors">
          取消
        </button>
        <button type="submit" disabled={saving}
          className="px-3 py-1 bg-accent-green text-white rounded text-[10px] font-medium hover:bg-green-600 disabled:opacity-50 transition-colors">
          {task ? '保存' : '添加'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Write useTeams hook**

```typescript
// client/src/hooks/useTeams.ts
import { useState, useEffect } from 'react';
import client from '../api/client';
import { Team } from '../types';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | undefined>();

  useEffect(() => {
    client.get('/teams')
      .then(res => setTeams(res.data.data))
      .catch(err => console.error('Failed to fetch teams:', err));
  }, []);

  return { teams, activeTeamId, setActiveTeamId };
}
```

- [ ] **Step 4: Write TeamTabs**

```tsx
// client/src/components/TeamTabs.tsx
import { useTeams } from '../hooks/useTeams';

export default function TeamTabs() {
  const { teams, activeTeamId, setActiveTeamId } = useTeams();

  return (
    <div className="flex gap-px bg-bg-input rounded p-0.5">
      <button
        onClick={() => setActiveTeamId(undefined)}
        className={`px-2 py-1 rounded text-[10px] transition-colors ${!activeTeamId ? 'bg-border text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
      >
        我的
      </button>
      {teams.map(team => (
        <button
          key={team.id}
          onClick={() => setActiveTeamId(team.id)}
          className={`px-2 py-1 rounded text-[10px] transition-colors ${activeTeamId === team.id ? 'bg-border text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
        >
          {team.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write FloatWindow**

```tsx
// client/src/components/FloatWindow.tsx
import { useState, useCallback } from 'react';
import { Task, QuadrantKey } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import QuadrantView from './QuadrantView';
import TaskForm from './TaskForm';
import TeamTabs from './TeamTabs';

declare global {
  interface Window {
    electronAPI?: { showNotification: (title: string, body: string) => void; hideWindow: () => void };
  }
}

const QUADRANTS: { key: QuadrantKey; defaultOpen: boolean }[] = [
  { key: 'q1', defaultOpen: true },
  { key: 'q2', defaultOpen: true },
  { key: 'q3', defaultOpen: false },
  { key: 'q4', defaultOpen: false },
];

export default function FloatWindow() {
  const { user, logout } = useAuth();
  const { createTask, updateTask } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const handleSave = useCallback(async (data: any) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await createTask(data);
    }
    setShowForm(false);
    setEditingTask(undefined);
  }, [editingTask, createTask, updateTask]);

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  return (
    <div className="h-screen bg-bg-secondary text-text-primary flex flex-col overflow-hidden drag-region">
      {/* Header */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border-subtle no-drag">
        <span className="font-semibold text-xs">📋 TodoFlow</span>
        <TeamTabs />
        <div className="flex gap-1 ml-auto">
          <button onClick={logout} className="text-text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded hover:bg-bg-tertiary transition-colors">
            退出
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 no-drag">
        {QUADRANTS.map(q => (
          <QuadrantView key={q.key} quadrant={q.key} defaultOpen={q.defaultOpen} onEditTask={handleEdit} />
        ))}
      </div>

      {/* Add bar */}
      <div className="px-2 pb-2 border-t border-border-subtle no-drag">
        {!showForm ? (
          <div className="flex gap-1 mt-1">
            <input
              placeholder="+ 添加..."
              onFocus={() => setShowForm(true)}
              className="flex-1 bg-bg-input border border-border rounded px-2 py-1.5 text-[11px] text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
            />
          </div>
        ) : (
          <TaskForm
            task={editingTask}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingTask(undefined); }}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: implement TaskForm, FloatWindow, and team tabs"
```

---

## Phase 8: 集成 & 收尾

### Task 14: 环境变量和最终集成

- [ ] **Step 1: Create server .env**

```
# server/.env (copy from .env.example)
DATABASE_URL="postgresql://postgres:password@localhost:5432/todoflow"
JWT_SECRET="your-strong-random-secret-here"
PORT=3001
CLIENT_URL="http://localhost:5173"
```

- [ ] **Step 2: Create client .env**

```
# client/.env
VITE_API_URL=http://localhost:3001
```

- [ ] **Step 3: Verify server starts**

```bash
cd server
npm run dev
# Should print: Server running on port 3001
# Should print: Reminder scheduler started
```

- [ ] **Step 4: Test full flow manually**

1. Start PostgreSQL
2. Run `cd server && npx prisma migrate dev` then `npm run dev`
3. Run `cd client && npm run dev`
4. Open http://localhost:5173
5. Register an account
6. Create a task with hourly recurrence
7. Verify it appears in the correct quadrant

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: final integration and env config"
```

### Task 15: 添加 .gitignore 和 README

- [ ] **Step 1: Create .gitignore**

```
// .gitignore
node_modules/
dist/
dist-electron/
.env
*.log
.superpowers/
```

- [ ] **Step 2: Update README**

```markdown
## TodoFlow

桌面待办提醒工具，四象限浮窗 + 循环任务 + 团队协作。

### 技术栈

- 客户端：Electron + React + Tailwind CSS
- 服务端：Node.js + Express + Socket.io + PostgreSQL

### 快速开始

#### 1. 启动数据库
确保 PostgreSQL 运行，创建 `todoflow` 数据库。

#### 2. 启动服务端
```bash
cd server
cp .env.example .env   # 编辑 .env 配置数据库连接
npm install
npx prisma migrate dev
npm run dev
```

#### 3. 启动客户端
```bash
cd client
npm install
npm run dev            # 浏览器开发模式
npm run electron:dev   # Electron 桌面模式
```
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: add gitignore and readme"
```

---

## 自检清单

- [x] 每个 spec 需求都有对应 Task
  - 浮窗式 UI → Task 12 FloatWindow
  - 四象限视图 → Task 12 QuadrantView
  - 任务 CRUD + 子任务 → Task 4, 11, 13
  - 循环任务（每小时/每天/每周/每月/每季度）→ Task 13 TaskForm
  - 团队空间 + 任务分配 → Task 6, 12 TeamTabs
  - 服务端推送 + 提醒 → Task 5, 8
  - 智能紧急度升级 → Task 4 applyUrgencyUpgrade
  - 纯在线模式 → 客户端无持久化
- [x] 无 TBD/TODO 占位符
- [x] 类型和方法签名前后一致
- [x] 每个步骤有完整代码或命令
