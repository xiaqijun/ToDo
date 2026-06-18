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
