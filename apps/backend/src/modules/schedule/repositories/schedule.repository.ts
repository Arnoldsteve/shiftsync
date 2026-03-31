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
   */
  async findShiftsByLocation(
    locationId: string | string[] | undefined,
    startDate: Date,
    endDate: Date,
    skip?: number,
    take?: number
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
      where.locationId = Array.isArray(locationId) 
        ? { in: locationId } 
        : locationId;
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
          startTime: startDate ? { gte: startDate } : undefined,
          endTime: endDate ? { lte: endDate } : undefined,
        },
      },
      include: {
        shift: {
          include: {
            location: true // Ensure location data is available for staff view too
          }
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
}