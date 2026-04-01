import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SwapRequest, Prisma, SwapStatus } from '@prisma/client';
import { SwapRequestWithDetails } from '../interfaces';

@Injectable()
export class SwapRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSwapRequest(data: Prisma.SwapRequestCreateInput): Promise<SwapRequest> {
    return this.prisma.swapRequest.create({ data });
  }

  async findSwapRequestById(id: string): Promise<SwapRequestWithDetails | null> {
    return this.prisma.swapRequest.findUnique({
      where: { id },
      include: {
        requestor: true,
        targetStaff: true,
        shift: true,
      },
    });
  }

  async updateSwapRequestStatus(
    id: string,
    status: SwapStatus,
    reviewedBy?: string,
    rejectionReason?: string
  ): Promise<SwapRequest> {
    return this.prisma.swapRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy,
        rejectionReason,
        reviewedAt: new Date(),
      },
    });
  }

  async findPendingSwaps(locationId?: string): Promise<SwapRequestWithDetails[]> {
    return this.prisma.swapRequest.findMany({
      where: {
        status: 'PENDING',
        shift: locationId ? { locationId } : undefined,
      },
      include: {
        requestor: true,
        targetStaff: true,
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
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findSwapsByStaff(staffId: string): Promise<SwapRequestWithDetails[]> {
    return this.prisma.swapRequest.findMany({
      where: {
        OR: [{ requestorId: staffId }, { targetStaffId: staffId }],
      },
      include: {
        requestor: true,
        targetStaff: true,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAssignmentByShiftAndStaff(shiftId: string, staffId: string) {
    return this.prisma.assignment.findFirst({
      where: {
        shiftId,
        staffId,
      },
    });
  }

  async countPendingByRequestor(requestorId: string): Promise<number> {
    return this.prisma.swapRequest.count({
      where: {
        requestorId,
        status: SwapStatus.PENDING,
      },
    });
  }

  /**
   * Find all pending swap requests for a shift
   * Requirements: 36.1
   */
  async findPendingSwapsByShift(shiftId: string): Promise<SwapRequestWithDetails[]> {
    return this.prisma.swapRequest.findMany({
      where: {
        shiftId,
        status: SwapStatus.PENDING,
      },
      include: {
        requestor: true,
        targetStaff: true,
        shift: true,
      },
    });
  }

  /**
   * Cancel multiple swap requests
   * Requirements: 36.1, 36.2
   */
  async cancelSwapRequests(swapRequestIds: string[]): Promise<number> {
    const result = await this.prisma.swapRequest.updateMany({
      where: {
        id: { in: swapRequestIds },
        status: SwapStatus.PENDING,
      },
      data: {
        status: SwapStatus.CANCELLED,
        reviewedAt: new Date(),
      },
    });

    return result.count;
  }
}
