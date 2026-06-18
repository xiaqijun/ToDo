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
