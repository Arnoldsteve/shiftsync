import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Shift, Assignment } from '@prisma/client';

@Injectable()
export class ComplianceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find adjacent shifts for a staff member
   * Requirements: 6.1, 6.2, 6.3, 6.4
   *
   * @param staffId - Staff member ID
   * @param newShiftStart - New shift start time (UTC)
   * @param newShiftEnd - New shift end time (UTC)
   * @returns Object with previous and next shifts
   */
  async findAdjacentShifts(
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<{
    previousShift: (Shift & { assignment: Assignment }) | null;
    nextShift: (Shift & { assignment: Assignment }) | null;
  }> {
    // Find the most recent shift that ends before the new shift starts
    const previousAssignment = await this.prisma.assignment.findFirst({
      where: {
        staffId,
        shift: {
          endTime: {
            lte: newShiftStart,
          },
        },
      },
      include: {
        shift: true,
      },
      orderBy: {
        shift: {
          endTime: 'desc',
        },
      },
    });

    // Find the next shift that starts after the new shift ends
    const nextAssignment = await this.prisma.assignment.findFirst({
      where: {
        staffId,
        shift: {
          startTime: {
            gte: newShiftEnd,
          },
        },
      },
      include: {
        shift: true,
      },
      orderBy: {
        shift: {
          startTime: 'asc',
        },
      },
    });

    return {
      previousShift: previousAssignment
        ? { ...previousAssignment.shift, assignment: previousAssignment }
        : null,
      nextShift: nextAssignment ? { ...nextAssignment.shift, assignment: nextAssignment } : null,
    };
  }

  /**
   * Find shifts for a staff member in a date range
   * Requirements: 10.1, 10.2, 10.3, 11.1, 11.2, 11.3
   *
   * @param staffId - Staff member ID
   * @param startDate - Start of date range (UTC)
   * @param endDate - End of date range (UTC)
   * @returns Array of shifts with assignments
   */
  async findShiftsInRange(
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<Shift & { assignment: Assignment }>> {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        staffId,
        shift: {
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        shift: true,
      },
      orderBy: {
        shift: {
          startTime: 'asc',
        },
      },
    });

    return assignments.map((assignment) => ({
      ...assignment.shift,
      assignment,
    }));
  }

  /**
   * Get location configuration
   * Requirements: 10.1, 11.1, 12.1
   *
   * @param locationId - Location ID
   * @returns Location configuration or null
   */
  async getLocationConfig(locationId: string) {
    return this.prisma.locationConfig.findUnique({
      where: { locationId },
    });
  }
}
