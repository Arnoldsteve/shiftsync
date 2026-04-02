import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Shift, Assignment, Prisma, Location } from '@prisma/client';
import { ShiftWithDetails } from '../interfaces';

@Injectable()
export class ScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createShift(data: Prisma.ShiftCreateInput): Promise<Shift> {
    return this.prisma.shift.create({ data });
  }

  async findShiftById(shiftId: string): Promise<ShiftWithDetails | null> {
    return this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        location: true, // Added to ensure timezone is available
        skills: {
          include: {
            skill: true,
          },
        },
        assignments: true,
      },
    });
  }

  /**
   * Senior Refactor: findShifts
   * Now accepts locationId as string OR string[] to support "Global" view.
   * Dynamically builds the 'where' clause.
   * Added publishedOnly parameter to filter by published status (Requirement 32.3)
   */
  async findShiftsByLocation(
    locationId: string | string[] | undefined,
    startDate: Date,
    endDate: Date,
    skip?: number,
    take?: number,
    publishedOnly?: boolean
  ): Promise<ShiftWithDetails[]> {
    const where: Prisma.ShiftWhereInput = {
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    };

    // If locationId is provided (single or array), add to filter.
    // If undefined (Admin viewing all), the filter is omitted.
    if (locationId) {
      where.locationId = Array.isArray(locationId) ? { in: locationId } : locationId;
    }

    // Filter by published status for STAFF role (Requirement 32.3)
    if (publishedOnly) {
      where.isPublished = true;
    }

    return this.prisma.shift.findMany({
      where,
      include: {
        location: true, // CRITICAL: Included for per-shift timezone rendering
        skills: {
          include: {
            skill: true,
          },
        },
        assignments: true,
      },
      orderBy: {
        startTime: 'asc',
      },
      skip,
      take,
    });
  }

  async findShiftsByStaff(
    staffId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<Shift & { assignment: Assignment }>> {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        staffId,
        shift: {
          // A shift is in range if it starts before the end date AND ends after the start date
          startTime: endDate ? { lte: endDate } : undefined,
          endTime: startDate ? { gte: startDate } : undefined,
        },
      },
      include: {
        shift: {
          include: {
            location: true, // Ensure location data is available for staff view too
          },
        },
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

  async createAssignment(data: Prisma.AssignmentCreateInput): Promise<Assignment> {
    return this.prisma.assignment.create({ data });
  }

  async deleteAssignment(assignmentId: string): Promise<Assignment> {
    return this.prisma.assignment.delete({
      where: { id: assignmentId },
    });
  }

  async findAssignmentByShift(shiftId: string): Promise<Assignment | null> {
    return this.prisma.assignment.findFirst({
      where: { shiftId },
    });
  }

  async findLocationById(locationId: string): Promise<Location | null> {
    return this.prisma.location.findUnique({
      where: { id: locationId },
    });
  }

  /**
   * Update shift details
   * Requirements: 36.1
   */
  async updateShift(
    shiftId: string,
    data: {
      startTime?: Date;
      endTime?: Date;
      locationId?: string;
      requiredHeadcount?: number;
    }
  ): Promise<Shift> {
    return this.prisma.shift.update({
      where: { id: shiftId },
      data,
    });
  }

  /**
   * Optimized: Get multiple locations at once for the Global view
   */
  async findLocationsByIds(locationIds: string[]): Promise<Location[]> {
    return this.prisma.location.findMany({
      where: { id: { in: locationIds } },
    });
  }

  async findStaffById(staffId: string) {
    return this.prisma.user.findUnique({
      where: { id: staffId },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  async findStaffByIds(staffIds: string[]): Promise<Map<string, string>> {
    if (staffIds.length === 0) {
      return new Map();
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const staffMap = new Map<string, string>();
    users.forEach((user) => {
      staffMap.set(user.id, `${user.firstName} ${user.lastName}`);
    });

    return staffMap;
  }

  /**
   * Publish all shifts in a week for a location
   * Requirements: 32.1
   */
  async publishShifts(locationId: string, weekStart: Date, weekEnd: Date): Promise<number> {
    const result = await this.prisma.shift.updateMany({
      where: {
        locationId,
        startTime: {
          gte: weekStart,
          lt: weekEnd,
        },
        isPublished: false,
      },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Unpublish all shifts in a week for a location
   * Requirements: 32.4
   */
  async unpublishShifts(locationId: string, weekStart: Date, weekEnd: Date): Promise<number> {
    const result = await this.prisma.shift.updateMany({
      where: {
        locationId,
        startTime: {
          gte: weekStart,
          lt: weekEnd,
        },
        isPublished: true,
      },
      data: {
        isPublished: false,
        publishedAt: null,
      },
    });

    return result.count;
  }

  /**
   * Find shifts by published status
   * Requirements: 32.2, 32.3
   */
  async findPublishedShiftsByStaff(
    staffId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<Shift & { assignment: Assignment }>> {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        staffId,
        shift: {
          isPublished: true,
          startTime: startDate ? { gte: startDate } : undefined,
          endTime: endDate ? { lte: endDate } : undefined,
        },
      },
      include: {
        shift: {
          include: {
            location: true,
          },
        },
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
   * Find unassigned shifts (no assignments) or partially filled shifts
   * Requirements: 34.1, 42.5
   */
  async findUnassignedShifts(
    locationIds?: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<ShiftWithDetails[]> {
    const where: Prisma.ShiftWhereInput = {
      isPublished: true,
    };

    if (locationIds && locationIds.length > 0) {
      where.locationId = { in: locationIds };
    }

    if (startDate) {
      where.startTime = { gte: startDate };
    }

    if (endDate) {
      where.endTime = { lte: endDate };
    }

    // Get all published shifts and filter by headcount in the service layer
    // This allows us to check if filledHeadcount < requiredHeadcount
    return this.prisma.shift.findMany({
      where,
      include: {
        location: true,
        skills: {
          include: {
            skill: true,
          },
        },
        assignments: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  /**
   * Find currently on-duty staff
   * Requirements: 6.3
   */
  async findOnDutyStaff(locationIds?: string[]): Promise<any[]> {
    const now = new Date();

    const where: Prisma.ShiftWhereInput = {
      isPublished: true,
      startTime: { lte: now },
      endTime: { gte: now },
      assignments: {
        some: {},
      },
    };

    if (locationIds && locationIds.length > 0) {
      where.locationId = { in: locationIds };
    }

    const shifts = await this.prisma.shift.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        skills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignments: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Transform to flat list of on-duty staff
    const onDutyStaff: any[] = [];

    for (const shift of shifts) {
      for (const assignment of shift.assignments) {
        onDutyStaff.push({
          staffId: assignment.staff.id,
          staffName: `${assignment.staff.firstName} ${assignment.staff.lastName}`,
          locationId: shift.location.id,
          locationName: shift.location.name,
          shiftId: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime,
          skills: shift.skills.map((s) => s.skill.name),
        });
      }
    }

    return onDutyStaff;
  }

  /**
   * Find notifications by user and type
   * Used to check if shifts were offered to a specific user
   */
  async findNotificationsByUserAndType(userId: string, type: string): Promise<any[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        type,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
