import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LocationConfig, PremiumShiftCriteria } from '@prisma/client';
import { LocationConfigUpdate, PremiumShiftCriteriaData } from '../interfaces';

@Injectable()
export class ConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find location config by location ID
   * Requirements: 27.1
   */
  async findByLocationId(locationId: string): Promise<LocationConfig | null> {
    return this.prisma.locationConfig.findUnique({
      where: { locationId },
      include: {
        premiumShiftCriteria: true,
      },
    });
  }

  /**
   * Create location config
   * Requirements: 27.1
   */
  async create(locationId: string, data: LocationConfigUpdate): Promise<LocationConfig> {
    return this.prisma.locationConfig.create({
      data: {
        location: {
          connect: { id: locationId },
        },
        ...data,
      },
      include: {
        premiumShiftCriteria: true,
      },
    });
  }

  /**
   * Update location config
   * Requirements: 27.2
   */
  async update(locationId: string, data: LocationConfigUpdate): Promise<LocationConfig> {
    return this.prisma.locationConfig.update({
      where: { locationId },
      data,
      include: {
        premiumShiftCriteria: true,
      },
    });
  }

  /**
   * Add premium shift criteria
   * Requirements: 27.3
   */
  async addPremiumShiftCriteria(
    configId: string,
    criteria: PremiumShiftCriteriaData
  ): Promise<PremiumShiftCriteria> {
    return this.prisma.premiumShiftCriteria.create({
      data: {
        config: {
          connect: { id: configId },
        },
        criteriaType: criteria.criteriaType,
        criteriaValue: criteria.criteriaValue,
      },
    });
  }

  /**
   * Remove premium shift criteria
   * Requirements: 27.3
   */
  async removePremiumShiftCriteria(criteriaId: string): Promise<void> {
    await this.prisma.premiumShiftCriteria.delete({
      where: { id: criteriaId },
    });
  }

  /**
   * Find location by ID
   */
  async findLocationById(locationId: string) {
    return this.prisma.location.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        name: true,
        timezone: true,
      },
    });
  }

  /**
   * Update location timezone
   * Requirements: 27.3
   */
  async updateLocationTimezone(locationId: string, timezone: string) {
    return this.prisma.location.update({
      where: { id: locationId },
      data: { timezone },
    });
  }
}
