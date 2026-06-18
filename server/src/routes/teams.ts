import { Router, Response, NextFunction } from 'express';
import { teamService } from '../services/teams';
import { keyAuthMiddleware, AuthRequest } from '../middleware/keyAuth';

const router = Router();
router.use(keyAuthMiddleware);

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
