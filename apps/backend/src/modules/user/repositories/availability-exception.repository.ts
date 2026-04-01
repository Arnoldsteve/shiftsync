import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository for AvailabilityException operations
 * Follows Repository Pattern for data access abstraction
 * Requirement 31: One-off availability exceptions
 */
@Injectable()
export class AvailabilityExceptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new availability exception
   */
  async create(data: Prisma.AvailabilityExceptionCreateInput) {
    return this.prisma.availabilityException.create({ data });
  }

  /**
   * Find all availability exceptions for a user
   */
  async findByUserId(userId: string) {
    return this.prisma.availabilityException.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Find availability exceptions for a specific date
   */
  async findByUserIdAndDate(userId: string, date: Date) {
    // Normalize date to start of day for comparison
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.availabilityException.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }

  /**
   * Find availability exceptions within a date range
   */
  async findByUserIdAndDateRange(userId: string, startDate: Date, endDate: Date) {
    return this.prisma.availabilityException.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Delete an availability exception by ID
   */
  async delete(id: string) {
    return this.prisma.availabilityException.delete({
      where: { id },
    });
  }

  /**
   * Delete all availability exceptions for a user
   */
  async deleteByUserId(userId: string) {
    return this.prisma.availabilityException.deleteMany({
      where: { userId },
    });
  }

  /**
   * Check if an availability exception exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.availabilityException.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Find availability exception by ID
   */
  async findById(id: string) {
    return this.prisma.availabilityException.findUnique({
      where: { id },
    });
  }
}
