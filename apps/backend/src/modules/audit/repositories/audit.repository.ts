import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditQueryFilters } from '../interfaces';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data });
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async query(filters: AuditQueryFilters): Promise<AuditLog[]> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    return this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }
}
