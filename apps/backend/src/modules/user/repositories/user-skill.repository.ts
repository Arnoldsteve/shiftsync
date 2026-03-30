import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserSkill, Prisma } from '@prisma/client';

@Injectable()
export class UserSkillRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserSkillCreateInput): Promise<UserSkill> {
    return this.prisma.userSkill.create({
      data,
      include: {
        skill: true,
      },
    });
  }

  async findByUserAndSkill(userId: string, skillId: string): Promise<UserSkill | null> {
    return this.prisma.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId,
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<UserSkill[]> {
    return this.prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: true,
      },
    });
  }

  async exists(userId: string, skillId: string): Promise<boolean> {
    const count = await this.prisma.userSkill.count({
      where: {
        userId,
        skillId,
      },
    });
    return count > 0;
  }
}
