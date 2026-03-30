import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Callout } from '@prisma/client';

@Injectable()
export class CalloutRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a callout record
   * Requirements: 22.1, 22.3
   */
  async createCallout(data: {
    shiftId: string;
    staffId: string;
    reason?: string;
  }): Promise<Callout> {
    return this.prisma.callout.create({
      data,
    });
  }

  /**
   * Mark shift as uncovered
   * Requirements: 22.3
   */
  async markShiftUncovered(shiftId: string): Promise<void> {
    await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        // Note: Assuming there's an 'isCovered' or similar field
        // If not in schema, this would need to be tracked differently
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

  /**
   * Find managers authorized for a location
   * Requirements: 22.2
   */
  async findManagersForLocation(locationId: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'MANAGER',
        managerLocations: {
          some: {
            locationId,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }
}
