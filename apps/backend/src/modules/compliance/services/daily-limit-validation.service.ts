import { Injectable, Logger } from '@nestjs/common';
import { ComplianceRepository } from '../repositories/compliance.repository';
import { ValidationResult } from '../interfaces';

@Injectable()
export class DailyLimitValidationService {
  private readonly logger = new Logger(DailyLimitValidationService.name);

  constructor(private readonly complianceRepository: ComplianceRepository) {}

  /**
   * Validate daily hour limit
   * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
   */
  async validate(
    locationId: string,
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<ValidationResult> {
    try {
      const config = await this.complianceRepository.getLocationConfig(locationId);

      if (!config || !config.dailyLimitEnabled || !config.dailyLimitHours) {
        return {
          isValid: true,
          validationType: 'DAILY_LIMIT',
          message: 'Daily limit not configured for location',
        };
      }

      const dailyLimit = config.dailyLimitHours;
      const windowStart = new Date(newShiftStart);
      const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

      const shiftsInWindow = await this.complianceRepository.findShiftsInRange(
        staffId,
        windowStart,
        windowEnd
      );

      const newShiftHours =
        (new Date(newShiftEnd).getTime() - new Date(newShiftStart).getTime()) / (1000 * 60 * 60);

      let totalHours = newShiftHours;

      for (const shift of shiftsInWindow) {
        const shiftStart = new Date(shift.startTime);
        const shiftEnd = new Date(shift.endTime);
        const shiftHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
        totalHours += shiftHours;
      }

      if (totalHours > dailyLimit) {
        return {
          isValid: false,
          validationType: 'DAILY_LIMIT',
          message: `Daily hour limit exceeded. Limit: ${dailyLimit} hours, Total: ${totalHours.toFixed(2)} hours`,
          details: {
            currentValue: totalHours,
            limitValue: dailyLimit,
            windowStart,
            windowEnd,
          },
        };
      }

      return {
        isValid: true,
        validationType: 'DAILY_LIMIT',
        message: 'Daily limit validation passed',
      };
    } catch (error) {
      this.logger.error(`Error validating daily limit for staff ${staffId}:`, error);
      throw error;
    }
  }
}
