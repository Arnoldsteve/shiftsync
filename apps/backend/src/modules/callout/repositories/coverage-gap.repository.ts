import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CoverageGapRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find staff with required skills and location certification
   * Requirements: 23.1
   */
  async findStaffWithSkillsAndCertification(locationId: string, requiredSkillIds: string[]) {
    return this.prisma.user.findMany({
      where: {
        role: 'STAFF',
        skills: {
          every: {
            skillId: {
              in: requiredSkillIds,
            },
          },
        },
        certifications: {
          some: {
            locationId,
          },
        },
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        certifications: true,
      },
    });
  }

  /**
   * Find all staff assignments in a date range
   */
  async findStaffAssignmentsInRange(staffId: string, startDate: Date, endDate: Date) {
    return this.prisma.assignment.findMany({
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
    });
  }

  /**
   * Find shift by ID with details
   */
  async findShiftById(shiftId: string) {
    return this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        location: true,
        skills: {
          include: {
            skill: true,
          },
        },
        assignments: {
          include: {
            staff: true,
          },
        },
      },
    });
  }
}
