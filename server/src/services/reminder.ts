import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { getIO } from '../socket';

const prisma = new PrismaClient();

export function startReminderScheduler() {
  // Check every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    const tasks = await prisma.task.findMany({
      where: {
        status: 'pending',
        dueAt: { not: null },
      },
      include: {
        assignee: { select: { id: true } },
        creator: { select: { id: true } },
      },
    });

    for (const task of tasks) {
      const dueAt = new Date(task.dueAt!);
      const minutesUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60);

      // Task due or almost due (within 15 minutes, not more than 60 min past)
      if (minutesUntilDue <= 15 && minutesUntilDue > -60) {
        const targetUserId = task.assigneeId || task.creatorId;

        // Avoid duplicate reminders within 15 min
        const existing = await prisma.notification.findFirst({
          where: {
            taskId: task.id,
            type: 'reminder',
            readAt: null,
            createdAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) },
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              taskId: task.id,
              type: 'reminder',
            },
          });

          const io = getIO();
          if (io) {
            io.to(`user:${targetUserId}`).emit('task:reminder', {
              taskId: task.id,
              title: task.title,
              dueAt: task.dueAt,
              isOverdue: minutesUntilDue < 0,
            });
          }
        }
      }
    }
  });

  console.log('Reminder scheduler started');
}
