import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Shift, Assignment } from '@prisma/client';

@Injectable()
export class ConflictRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find overlapping assignments for a staff member
   * Requirements: 5.1, 5.2, 5.3, 17.3
   *
   * @param staffId - Staff member ID
   * @param startTime - New shift start time (UTC)
   * @param endTime - New shift end time (UTC)
   * @param excludeShiftId - Optional shift ID to exclude (for swap scenarios)
   * @returns Array of assignments with their shifts
   */
  async findOverlappingAssignments(
    staffId: string,
    startTime: Date,
    endTime: Date,
    excludeShiftId?: string
  ): Promise<Array<Assignment & { shift: Shift }>> {
    const newStartUTC = new Date(startTime);
    const newEndUTC = new Date(endTime);

    return this.prisma.assignment.findMany({
      where: {
        staffId,
        shift: {
          id: excludeShiftId ? { not: excludeShiftId } : undefined,
          OR: [
            {
              // New shift starts during existing shift
              AND: [{ startTime: { lte: newStartUTC } }, { endTime: { gt: newStartUTC } }],
            },
            {
              // New shift ends during existing shift
              AND: [{ startTime: { lt: newEndUTC } }, { endTime: { gte: newEndUTC } }],
            },
            {
              // New shift completely contains existing shift
              AND: [{ startTime: { gte: newStartUTC } }, { endTime: { lte: newEndUTC } }],
            },
            {
              // Existing shift completely contains new shift
              AND: [{ startTime: { lte: newStartUTC } }, { endTime: { gte: newEndUTC } }],
            },
          ],
        },
      },
      include: {
        shift: {
          include: {
            location: true,
          },
        },
      },
    });
  }
}
