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
        skills: {
          include: {
            skill: true,
          },
        },
        assignments: true,
      },
    });
  }

  async findShiftsByLocation(
    locationId: string,
    startDate: Date,
    endDate: Date,
    skip?: number,
    take?: number
  ): Promise<ShiftWithDetails[]> {
    return this.prisma.shift.findMany({
      where: {
        locationId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
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
}
