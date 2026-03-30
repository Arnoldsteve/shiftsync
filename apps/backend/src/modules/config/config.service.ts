import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigRepository } from './repositories/config.repository';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { LocationConfig, PremiumShiftCriteria } from '@prisma/client';
import { LocationConfigUpdate, PremiumShiftCriteriaData } from './interfaces';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Get location configuration
   * Requirements: 27.1
   */
  async getLocationConfig(locationId: string): Promise<LocationConfig> {
    try {
      // Check cache first
      const cacheKey = `config:location:${locationId}`;
      const cached = await this.cacheService.get<LocationConfig>(cacheKey);
      if (cached) {
        return cached;
      }

      let config = await this.configRepository.findByLocationId(locationId);

      // Create default config if not exists
      if (!config) {
        config = await this.configRepository.create(locationId, {
          dailyLimitEnabled: false,
          weeklyLimitEnabled: true,
          weeklyLimitHours: 40,
          consecutiveDaysEnabled: false,
        });
      }

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, config, 3600);

      return config;
    } catch (error) {
      this.logger.error(`Error getting location config for ${locationId}:`, error);
      throw error;
    }
  }

  /**
   * Update location configuration
   * Requirements: 27.2, 27.4, 27.5
   */
  async updateLocationConfig(
    locationId: string,
    updates: LocationConfigUpdate,
    updatedBy: string
  ): Promise<LocationConfig> {
    try {
      // Validate configuration values
      this.validateConfigUpdate(updates);

      const existingConfig = await this.configRepository.findByLocationId(locationId);

      let updatedConfig: LocationConfig;

      if (existingConfig) {
        updatedConfig = await this.configRepository.update(locationId, updates);
      } else {
        updatedConfig = await this.configRepository.create(locationId, updates);
      }

      // Log configuration change
      await this.auditService.logUserChange('UPDATE', locationId, updatedBy, {
        previousState: existingConfig || {},
        newState: updatedConfig,
      });

      // Invalidate cache
      const cacheKey = `config:location:${locationId}`;
      await this.cacheService.delete(cacheKey);

      this.logger.log(`Location config updated for ${locationId} by ${updatedBy}`);

      return updatedConfig;
    } catch (error) {
      this.logger.error(`Error updating location config for ${locationId}:`, error);
      throw error;
    }
  }

  /**
   * Add premium shift criteria
   * Requirements: 27.3, 27.4, 27.5
   */
  async addPremiumShiftCriteria(
    locationId: string,
    criteria: PremiumShiftCriteriaData,
    addedBy: string
  ): Promise<PremiumShiftCriteria> {
    try {
      // Validate criteria
      this.validatePremiumShiftCriteria(criteria);

      const config = await this.getLocationConfig(locationId);

      const newCriteria = await this.configRepository.addPremiumShiftCriteria(config.id, criteria);

      // Log configuration change
      await this.auditService.logUserChange('UPDATE', locationId, addedBy, {
        previousState: {
          premiumShiftCriteriaCount: (config as any).premiumShiftCriteria?.length || 0,
        },
        newState: {
          premiumShiftCriteriaCount: ((config as any).premiumShiftCriteria?.length || 0) + 1,
        },
      });

      // Invalidate cache
      const cacheKey = `config:location:${locationId}`;
      await this.cacheService.delete(cacheKey);

      this.logger.log(`Premium shift criteria added for ${locationId} by ${addedBy}`);

      return newCriteria;
    } catch (error) {
      this.logger.error(`Error adding premium shift criteria for ${locationId}:`, error);
      throw error;
    }
  }

  /**
   * Remove premium shift criteria
   * Requirements: 27.3, 27.5
   */
  async removePremiumShiftCriteria(
    locationId: string,
    criteriaId: string,
    removedBy: string
  ): Promise<void> {
    try {
      await this.configRepository.removePremiumShiftCriteria(criteriaId);

      // Log configuration change
      await this.auditService.logUserChange('UPDATE', locationId, removedBy, {
        previousState: { removedCriteriaId: criteriaId },
        newState: { action: 'removed' },
      });

      // Invalidate cache
      const cacheKey = `config:location:${locationId}`;
      await this.cacheService.delete(cacheKey);

      this.logger.log(`Premium shift criteria removed for ${locationId} by ${removedBy}`);
    } catch (error) {
      this.logger.error(`Error removing premium shift criteria:`, error);
      throw error;
    }
  }

  /**
   * Update location timezone
   * Requirements: 27.3, 27.5
   */
  async updateLocationTimezone(
    locationId: string,
    timezone: string,
    updatedBy: string
  ): Promise<void> {
    try {
      const location = await this.configRepository.findLocationById(locationId);
      if (!location) {
        throw new NotFoundException('Location not found');
      }

      await this.configRepository.updateLocationTimezone(locationId, timezone);

      // Log configuration change
      await this.auditService.logUserChange('UPDATE', locationId, updatedBy, {
        previousState: { timezone: location.timezone },
        newState: { timezone },
      });

      // Invalidate cache
      const cacheKey = `config:location:${locationId}`;
      await this.cacheService.delete(cacheKey);

      this.logger.log(`Location timezone updated for ${locationId} by ${updatedBy}`);
    } catch (error) {
      this.logger.error(`Error updating location timezone:`, error);
      throw error;
    }
  }

  /**
   * Validate configuration update
   * Requirements: 27.4
   */
  private validateConfigUpdate(updates: LocationConfigUpdate): void {
    if (updates.dailyLimitHours !== undefined) {
      if (updates.dailyLimitHours < 0 || updates.dailyLimitHours > 24) {
        throw new BadRequestException('Daily limit hours must be between 0 and 24');
      }
    }

    if (updates.weeklyLimitHours !== undefined) {
      if (updates.weeklyLimitHours < 0 || updates.weeklyLimitHours > 168) {
        throw new BadRequestException('Weekly limit hours must be between 0 and 168');
      }
    }

    if (updates.consecutiveDaysLimit !== undefined) {
      if (updates.consecutiveDaysLimit < 1 || updates.consecutiveDaysLimit > 14) {
        throw new BadRequestException('Consecutive days limit must be between 1 and 14');
      }
    }

    // Validate enabled flags match with values
    if (updates.dailyLimitEnabled && !updates.dailyLimitHours) {
      throw new BadRequestException(
        'Daily limit hours must be specified when daily limit is enabled'
      );
    }

    if (updates.consecutiveDaysEnabled && !updates.consecutiveDaysLimit) {
      throw new BadRequestException(
        'Consecutive days limit must be specified when consecutive days limit is enabled'
      );
    }
  }

  /**
   * Validate premium shift criteria
   * Requirements: 27.4
   */
  private validatePremiumShiftCriteria(criteria: PremiumShiftCriteriaData): void {
    try {
      const criteriaData = JSON.parse(criteria.criteriaValue);

      switch (criteria.criteriaType) {
        case 'DAY_OF_WEEK':
          if (!criteriaData.days || !Array.isArray(criteriaData.days)) {
            throw new BadRequestException('DAY_OF_WEEK criteria must have days array');
          }
          if (criteriaData.days.some((d: number) => d < 0 || d > 6)) {
            throw new BadRequestException('Day values must be between 0 and 6');
          }
          break;

        case 'TIME_OF_DAY':
          if (criteriaData.startHour === undefined || criteriaData.endHour === undefined) {
            throw new BadRequestException('TIME_OF_DAY criteria must have startHour and endHour');
          }
          if (
            criteriaData.startHour < 0 ||
            criteriaData.startHour > 23 ||
            criteriaData.endHour < 0 ||
            criteriaData.endHour > 23
          ) {
            throw new BadRequestException('Hour values must be between 0 and 23');
          }
          break;

        case 'HOLIDAY':
          if (!criteriaData.dates || !Array.isArray(criteriaData.dates)) {
            throw new BadRequestException('HOLIDAY criteria must have dates array');
          }
          break;

        default:
          throw new BadRequestException('Invalid criteria type');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid criteria value JSON');
    }
  }
}
