import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all locations
   * Requirements: 21.1
   */
  async findAllLocations() {
    return this.prisma.location.findMany({
      select: {
        id: true,
        name: true,
        timezone: true,
      },
    });
  }

  /**
   * Find shifts for a location in a time range
   * Requirements: 21.1, 21.2
   */
  async findShiftsByLocationAndTimeRange(locationId: string, startTime: Date, endTime: Date) {
    return this.prisma.shift.findMany({
      where: {
        locationId,
        startTime: {
          gte: startTime,
          lte: endTime,
        },
      },
      include: {
        assignments: {
          include: {
            staff: true,
          },
        },
        callouts: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  /**
   * Count available staff for a location
   * Requirements: 21.3
   */
  async countAvailableStaffForLocation(locationId: string) {
    return this.prisma.user.count({
      where: {
        role: 'STAFF',
        certifications: {
          some: {
            locationId,
          },
        },
      },
    });
  }

  /**
   * Find upcoming shifts across all locations
   * Requirements: 21.4
   */
  async findUpcomingShifts(startTime: Date, endTime: Date) {
    return this.prisma.shift.findMany({
      where: {
        startTime: {
          gte: startTime,
          lte: endTime,
        },
      },
      include: {
        location: true,
        assignments: {
          include: {
            staff: true,
          },
        },
        callouts: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }
}
