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
        shift: true,
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
        shift: true,
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
}
