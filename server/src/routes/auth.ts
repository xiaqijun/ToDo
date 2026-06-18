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
