import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  async list(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}

export const notificationService = new NotificationService();
