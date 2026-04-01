import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CoverageGapRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find staff with required skills and location certification
   * Senior Refactor:
   * 1. Changed 'every' to 'some' so multi-skilled staff aren't filtered out.
   * 2. Included assignments and availabilities to allow for high-performance constraint checking.
   */
  async findStaffWithSkillsAndCertification(locationId: string, requiredSkillIds: string[]) {
    return this.prisma.user.findMany({
      where: {
        role: 'STAFF',
        // FIX: Changed 'every' to 'some'
        // Logic: Return user if AT LEAST ONE of their skills matches the shift requirements
        skills: {
          some: {
            skillId: {
              in: requiredSkillIds,
            },
          },
        },
        // Logic: User must be certified for this specific location
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
        certifications: {
          include: {
            location: true,
          },
        },
        // Performance: Fetching these now so the Service doesn't have to query again in a loop
        availabilityWindows: true,
        availabilityExceptions: true,
        assignments: {
          include: {
            shift: true,
          },
        },
      },
    });
  }

  /**
   * Find all staff assignments in a date range for hour-tracking
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
   * Find shift by ID with location and skill details
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
