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
