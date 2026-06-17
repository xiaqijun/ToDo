import { Router, Response, NextFunction } from 'express';
import { taskService } from '../services/tasks';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId, status } = req.query;
    const tasks = await taskService.list(req.userId!, {
      teamId: teamId as string,
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
    const task = await taskService.update(req.params.id, req.body);
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
