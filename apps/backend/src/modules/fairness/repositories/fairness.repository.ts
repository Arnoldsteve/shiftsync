import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Shift, Assignment } from '@prisma/client';

@Injectable()
export class FairnessRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all staff with assignments in a location for a date range
   * Requirements: 13.1
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
   * Find shifts for a staff member in a date range
   * Requirements: 13.1
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
   * Find all shifts in a location for a date range
   * Requirements: 14.1
   */
  async findShiftsInLocation(locationId: string, startDate: Date, endDate: Date): Promise<Shift[]> {
    return this.prisma.shift.findMany({
      where: {
        locationId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  /**
   * Find premium shift criteria for a location
   * Requirements: 14.1
   */
  async findPremiumShiftCriteria(locationId: string) {
    const config = await this.prisma.locationConfig.findUnique({
      where: { locationId },
      include: {
        premiumShiftCriteria: true,
      },
    });

    return config?.premiumShiftCriteria || [];
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
