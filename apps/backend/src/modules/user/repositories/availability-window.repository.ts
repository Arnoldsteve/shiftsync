import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository for AvailabilityWindow operations
 * Follows Repository Pattern for data access abstraction
 * Requirement 31: Staff availability windows
 */
@Injectable()
export class AvailabilityWindowRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new availability window
   */
  async create(data: Prisma.AvailabilityWindowCreateInput) {
    return this.prisma.availabilityWindow.create({ data });
  }

  /**
   * Find all availability windows for a user
   */
  async findByUserId(userId: string) {
    return this.prisma.availabilityWindow.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Find availability windows for a specific day of week
   */
  async findByUserIdAndDay(userId: string, dayOfWeek: number) {
    return this.prisma.availabilityWindow.findMany({
      where: { userId, dayOfWeek },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Delete an availability window by ID
   */
  async delete(id: string) {
    return this.prisma.availabilityWindow.delete({
      where: { id },
    });
  }

  /**
   * Delete all availability windows for a user
   */
  async deleteByUserId(userId: string) {
    return this.prisma.availabilityWindow.deleteMany({
      where: { userId },
    });
  }

  /**
   * Check if an availability window exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.availabilityWindow.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Find availability window by ID
   */
  async findById(id: string) {
    return this.prisma.availabilityWindow.findUnique({
      where: { id },
    });
  }
}
