import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { AuditService } from '../../audit/audit.service';
import { CacheService } from '../../cache/cache.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { ConfigService } from '../../config/config.service';

/**
 * Schedule Publishing Service
 * Handles schedule publishing and unpublishing
 * Requirements: 32.1, 32.2, 32.3, 32.4, 32.5
 */
@Injectable()
export class SchedulePublishingService {
  private readonly logger = new Logger(SchedulePublishingService.name);

  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly configService: ConfigService
  ) {}

  /**
   * Publish schedule for a week
   * Requirements: 32.1, 32.5
   */
  async publishSchedule(
    locationId: string,
    weekStartDate: Date,
    managerId: string,
    managerLocationIds?: string[]
  ): Promise<{ publishedCount: number }> {
    try {
      // PBAC: Check if manager is authorized for this location
      if (managerLocationIds && !managerLocationIds.includes(locationId)) {
        throw new ForbiddenException(
          'Manager not authorized to publish schedules for this location'
        );
      }

      // Calculate week end (7 days from start)
      const weekEnd = new Date(weekStartDate);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Publish all shifts in the week
      const publishedCount = await this.scheduleRepository.publishShifts(
        locationId,
        weekStartDate,
        weekEnd
      );

      // Audit log
      await this.auditService.logShiftChange('UPDATE', `schedule-${locationId}`, managerId, {
        newState: {
          action: 'publish',
          locationId,
          weekStartDate: weekStartDate.toISOString(),
          publishedCount,
        },
      });

      // Invalidate cache
      await this.cacheService.invalidateSchedule(locationId);

      // Emit real-time event
      this.realtimeGateway.emitSchedulePublished(locationId, weekStartDate, publishedCount);

      // TODO: Integrate with Notification Service when implemented (Task 20a)
      // await this.notificationService.notifySchedulePublished(locationId, weekStartDate);

      this.logger.log(`Published ${publishedCount} shifts for location ${locationId}`);

      return { publishedCount };
    } catch (error) {
      this.logger.error(`Error publishing schedule:`, error);
      throw error;
    }
  }

  /**
   * Unpublish schedule for a week with cutoff enforcement
   * Requirements: 32.4
   */
  async unpublishSchedule(
    locationId: string,
    weekStartDate: Date,
    managerId: string,
    managerLocationIds?: string[]
  ): Promise<{ unpublishedCount: number }> {
    try {
      // PBAC: Check if manager is authorized for this location
      if (managerLocationIds && !managerLocationIds.includes(locationId)) {
        throw new ForbiddenException(
          'Manager not authorized to unpublish schedules for this location'
        );
      }

      // Get location config for cutoff hours (Requirement 32.4)
      const locationConfig = await this.configService.getLocationConfig(locationId);
      const cutoffHours = locationConfig.schedulePublishCutoffHours || 48;

      // Check cutoff time (default 48 hours before week start)
      const cutoffTime = new Date(weekStartDate);
      cutoffTime.setHours(cutoffTime.getHours() - cutoffHours);

      const now = new Date();
      if (now >= cutoffTime) {
        throw new BadRequestException(
          `Cannot unpublish schedule within ${cutoffHours} hours of week start`
        );
      }

      // Calculate week end
      const weekEnd = new Date(weekStartDate);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Unpublish all shifts in the week
      const unpublishedCount = await this.scheduleRepository.unpublishShifts(
        locationId,
        weekStartDate,
        weekEnd
      );

      // Audit log
      await this.auditService.logShiftChange('UPDATE', `schedule-${locationId}`, managerId, {
        newState: {
          action: 'unpublish',
          locationId,
          weekStartDate: weekStartDate.toISOString(),
          unpublishedCount,
        },
      });

      // Invalidate cache
      await this.cacheService.invalidateSchedule(locationId);

      this.logger.log(`Unpublished ${unpublishedCount} shifts for location ${locationId}`);

      return { unpublishedCount };
    } catch (error) {
      this.logger.error(`Error unpublishing schedule:`, error);
      throw error;
    }
  }
}
