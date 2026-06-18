import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/AppError';

const prisma = new PrismaClient();

export class TeamService {
  async list(userId: string) {
    return prisma.team.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { members: true } } },
    });
  }

  async create(name: string, createdBy: string) {
    const team = await prisma.team.create({
      data: {
        name,
        createdBy,
        members: { create: { userId: createdBy, role: 'owner' } },
      },
    });
    return team;
  }

  async getMembers(teamId: string) {
    return prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async addMember(teamId: string, userId: string, role: string = 'member') {
    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing) throw new AppError(409, '该用户已在团队中');
    return prisma.teamMember.create({ data: { teamId, userId, role } });
  }

  async updateMemberRole(teamId: string, userId: string, role: string) {
    return prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: { role },
    });
  }

  async removeMember(teamId: string, userId: string) {
    return prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });
  }
}

export const teamService = new TeamService();
