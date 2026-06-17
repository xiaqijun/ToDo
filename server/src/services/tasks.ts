import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from './auth';
import { getIO } from '../socket';

const prisma = new PrismaClient();

const TASK_INCLUDE = {
  assignee: {
    select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
  },
  creator: {
    select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
  },
  subtasks: {
    include: {
      assignee: {
        select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
      },
    },
  },
} as const;

export class TaskService {
  async list(userId: string, filters: { teamId?: string; status?: string }) {
    const where: Prisma.TaskWhereInput = {
      parentId: null, // only top-level tasks
      OR: [
        { creatorId: userId },
        { assigneeId: userId },
        ...(filters.teamId ? [{ teamId: filters.teamId }] : []),
      ],
      ...(filters.status ? { status: filters.status } : {}),
    };

    const tasks = await prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
    });

    return tasks.map(t => this.applyUrgencyUpgrade(t));
  }

  async create(data: {
    title: string;
    description?: string;
    importance: string;
    urgency: string;
    startAt?: string;
    dueAt?: string;
    remindAt?: string;
    isRecurring: boolean;
    recurrenceRule?: any;
    assigneeId?: string;
    teamId?: string;
    creatorId: string;
    subtasks?: Array<{ title: string; assigneeId?: string }>;
  }) {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        importance: data.importance,
        urgency: data.urgency,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        remindAt: data.remindAt ? new Date(data.remindAt) : undefined,
        isRecurring: data.isRecurring,
        recurrenceRule: data.recurrenceRule || Prisma.JsonNull,
        assigneeId: data.assigneeId,
        teamId: data.teamId,
        creatorId: data.creatorId,
        subtasks: data.subtasks?.length
          ? {
              create: data.subtasks.map(st => ({
                title: st.title,
                assigneeId: st.assigneeId || data.assigneeId,
                creatorId: data.creatorId,
                importance: data.importance,
                urgency: data.urgency,
                teamId: data.teamId,
              })),
            }
          : undefined,
      },
      include: TASK_INCLUDE,
    });

    this.emitTaskEvent('created', task, data.teamId);
    return this.applyUrgencyUpgrade(task);
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    importance: string;
    urgency: string;
    startAt: string;
    dueAt: string;
    remindAt: string;
    isRecurring: boolean;
    recurrenceRule: any;
    assigneeId: string;
    teamId: string;
  }>) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError(404, '任务不存在');

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        remindAt: data.remindAt ? new Date(data.remindAt) : undefined,
      },
      include: TASK_INCLUDE,
    });

    this.emitTaskEvent('updated', updated, data.teamId);
    return this.applyUrgencyUpgrade(updated);
  }

  async remove(id: string) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError(404, '任务不存在');

    // Delete subtasks first, then the parent
    await prisma.task.deleteMany({ where: { parentId: id } });
    await prisma.task.delete({ where: { id } });

    this.emitTaskEvent('deleted', task);
  }

  async toggleComplete(id: string) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError(404, '任务不存在');

    const newStatus = task.status === 'done' ? 'pending' : 'done';
    return prisma.task.update({
      where: { id },
      data: { status: newStatus },
      include: TASK_INCLUDE,
    });
  }

  private emitTaskEvent(action: string, task: any, teamId?: string) {
    const io = getIO();
    if (!io) return;

    const payload = { type: action, task };

    const users = new Set<string>();
    if (task.creatorId) users.add(task.creatorId);
    if (task.assigneeId) users.add(task.assigneeId);
    if (task.subtasks) {
      task.subtasks.forEach((st: any) => {
        if (st.assigneeId) users.add(st.assigneeId);
      });
    }

    users.forEach(uid => io.to(`user:${uid}`).emit('task:updated', payload));

    const targetTeamId = teamId || task.teamId;
    if (targetTeamId) {
      io.to(`team:${targetTeamId}`).emit('task:updated', payload);
    }
  }

  // Smart urgency upgrade based on due date proximity
  private applyUrgencyUpgrade(task: any): any {
    if (!task.dueAt || task.status === 'done') return task;

    const now = new Date();
    const dueAt = new Date(task.dueAt);
    const hoursUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    let effectiveUrgency = task.urgency;
    let isOverdue = false;

    if (hoursUntilDue < 0) {
      effectiveUrgency = 'high';
      isOverdue = true;
    } else if (hoursUntilDue <= 24) {
      if (task.urgency === 'medium') effectiveUrgency = 'high';
      if (task.urgency === 'low') effectiveUrgency = 'medium';
    }

    return { ...task, effectiveUrgency, isOverdue };
  }
}

export const taskService = new TaskService();
