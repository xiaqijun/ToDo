import { Router, Response, NextFunction } from 'express';
import { notificationService } from '../services/notifications';
import { keyAuthMiddleware, AuthRequest } from '../middleware/keyAuth';

const router = Router();
router.use(keyAuthMiddleware);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await notificationService.list(req.userId!);
    res.json({ data: list });
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const n = await notificationService.markRead(req.params.id);
    res.json({ data: n });
  } catch (err) { next(err); }
});

export default router;
