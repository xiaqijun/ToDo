import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/auth';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error('[ERROR] Unhandled:', err.message);
  console.error('[ERROR] Stack:', err.stack?.split('\n').slice(0, 3).join('\n'));
  // Also log Prisma errors in detail
  if ((err as any).code) console.error('[ERROR] Code:', (err as any).code);
  if ((err as any).meta) console.error('[ERROR] Meta:', JSON.stringify((err as any).meta));
  return res.status(500).json({ error: '服务器内部错误' });
}
