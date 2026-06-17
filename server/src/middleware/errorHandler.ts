import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/auth';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: '服务器内部错误' });
}
