import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DropRequest, Prisma, DropStatus } from '@prisma/client';

@Injectable()
export class DropRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DropRequestUncheckedCreateInput): Promise<DropRequest> {
    return this.prisma.dropRequest.create({ data });
  }

  async findById(id: string): Promise<DropRequest | null> {
    return this.prisma.dropRequest.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            location: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
        requestor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        claimedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findByShiftId(shiftId: string): Promise<DropRequest | null> {
    return this.prisma.dropRequest.findFirst({
      where: {
        shiftId,
        status: DropStatus.PENDING,
      },
      include: {
        shift: true,
        requestor: true,
      },
    });
  }

  async findPendingByRequestor(requestorId: string): Promise<DropRequest[]> {
    return this.prisma.dropRequest.findMany({
      where: {
        requestorId,
        status: DropStatus.PENDING,
      },
      include: {
        shift: {
          include: {
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findExpired(): Promise<DropRequest[]> {
    const now = new Date();
    return this.prisma.dropRequest.findMany({
      where: {
        status: DropStatus.PENDING,
        expiresAt: {
          lte: now,
        },
      },
      include: {
        shift: true,
        requestor: true,
      },
    });
  }

  async findAvailableDropRequests(locationIds?: string[]): Promise<DropRequest[]> {
    const where: Prisma.DropRequestWhereInput = {
      status: DropStatus.PENDING,
      expiresAt: {
        gt: new Date(),
      },
    };

    if (locationIds && locationIds.length > 0) {
      where.shift = {
        locationId: {
          in: locationIds,
        },
      };
    }

    return this.prisma.dropRequest.findMany({
      where,
      include: {
        shift: {
          include: {
            location: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
        requestor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(
    id: string,
    status: DropStatus,
    claimedBy?: string,
    claimedAt?: Date
  ): Promise<DropRequest> {
    return this.prisma.dropRequest.update({
      where: { id },
      data: {
        status,
        claimedBy,
        claimedAt,
      },
    });
  }

  async countPendingByRequestor(requestorId: string): Promise<number> {
    return this.prisma.dropRequest.count({
      where: {
        requestorId,
        status: DropStatus.PENDING,
      },
    });
  }

  async findByRequestor(requestorId: string): Promise<DropRequest[]> {
    return this.prisma.dropRequest.findMany({
      where: {
        requestorId,
      },
      include: {
        shift: {
          include: {
            location: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
        claimedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
