import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Shift, Assignment } from '@prisma/client';

@Injectable()
export class OvertimeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find shifts for a staff member in a date range
   * Requirements: 9.1, 9.2
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
   * Find all staff with assignments in a location for a date range
   * Requirements: 9.4
   */
  async findStaffWithShiftsInLocation(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        shift: {
          locationId,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      select: {
        staffId: true,
      },
      distinct: ['staffId'],
    });

    return assignments.map((a) => a.staffId);
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });
  }
}
