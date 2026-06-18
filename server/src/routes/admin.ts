import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { keyAuthMiddleware, requireAdmin, AuthRequest } from '../middleware/keyAuth';
import { generateKey } from '../utils/keyGen';
import { taskService } from '../services/tasks';
import { getDownloadStatus, triggerSync } from './download';

const prisma = new PrismaClient();
const router = Router();

// ── Public: admin login with password ──
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, password } = req.body;
    if (!displayName || !password) return res.status(400).json({ error: '请输入账号和密码' });
    const user = await prisma.user.findFirst({
      where: { displayName, role: 'admin' },
      select: { id: true, displayName: true, role: true, passwordHash: true, key: true },
    });
    if (!user || !user.passwordHash) return res.status(401).json({ error: '账号或密码错误' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: '账号或密码错误' });
    res.json({ user: { id: user.id, displayName: user.displayName, role: user.role }, key: user.key });
  } catch (err) { next(err); }
});

// ── Protected routes below ──
router.use(keyAuthMiddleware);
router.use(requireAdmin);

// ── Set/change admin password ──
router.put('/password', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: '密码至少6位' });
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: req.userId }, data: { passwordHash: hash } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Dashboard stats ──
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalTasks, pendingTasks, doneTasks, overdueTasks, totalTeams, recentTasks] =
      await Promise.all([
        prisma.user.count(),
        prisma.task.count(),
        prisma.task.count({ where: { status: 'pending' } }),
        prisma.task.count({ where: { status: 'done' } }),
        prisma.task.count({ where: { status: { not: 'done' }, dueAt: { lt: new Date() } } }),
        prisma.team.count(),
        prisma.task.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            creator: { select: { id: true, displayName: true } },
            assignee: { select: { id: true, displayName: true } },
          },
        }),
      ]);
    res.json({
      data: { totalUsers, totalTasks, pendingTasks, doneTasks, overdueTasks, totalTeams, recentTasks },
    });
  } catch (err) {
    next(err);
  }
});

// ── Tasks ──
router.get('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, teamId, status, importance, urgency, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const where: any = {};
    if (userId) where.creatorId = userId as string;
    if (teamId) where.teamId = teamId as string;
    if (status) where.status = status as string;
    if (importance) where.importance = importance as string;
    if (urgency) where.urgency = urgency as string;
    if (search) where.title = { contains: search as string, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, displayName: true } },
          assignee: { select: { id: true, displayName: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, displayName: true } },
        assignee: { select: { id: true, displayName: true } },
        subtasks: {
          include: {
            assignee: { select: { id: true, displayName: true } },
          },
        },
      },
    });
    if (!task) return res.status(404).json({ error: '任务不存在' });
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
});

router.delete('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await taskService.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Teams ──
router.get('/teams', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await prisma.team.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const creatorIds = [...new Set(teams.map(t => t.createdBy))];
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, displayName: true },
    });
    const nameMap = new Map(creators.map(c => [c.id, c.displayName]));

    const data = teams.map(t => ({
      id: t.id,
      name: t.name,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      memberCount: t._count.members,
      creatorName: nameMap.get(t.createdBy) || 'Unknown',
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.delete('/teams/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Nullify teamId on tasks in this team
    await prisma.task.updateMany({ where: { teamId: req.params.id }, data: { teamId: null } });
    // Delete team (cascade removes TeamMember records)
    await prisma.team.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── System ──
import { version } from '../../package.json';

router.get('/system', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      dbStatus = 'connected';
    } catch { /* stays disconnected */ }

    const ds = getDownloadStatus();

    res.json({
      data: {
        version,
        uptime: Math.floor(process.uptime()),
        uptimeHuman: formatUptime(process.uptime()),
        dbStatus,
        lastDownloadSync: ds.lastSync,
        downloadSyncing: ds.syncing,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/system/sync-downloads', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const started = triggerSync();
    if (!started) return res.status(409).json({ error: '正在同步中' });
    res.json({ data: { syncing: true } });
  } catch (err) {
    next(err);
  }
});

// ── Users (existing) ──
router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
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

router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, role, password } = req.body;
    if (!displayName) return res.status(400).json({ error: '请提供 displayName' });
    const key = generateKey();
    const data: any = { displayName, key, role: role || 'user' };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data,
      select: { id: true, displayName: true, role: true, createdAt: true },
    });
    res.status(201).json({ user, key });
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/regenerate-key', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const key = generateKey();
    await prisma.user.update({ where: { id: req.params.id }, data: { key } });
    res.json({ key });
  } catch (err) {
    next(err);
  }
});

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

// ── Helpers ──
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export default router;
