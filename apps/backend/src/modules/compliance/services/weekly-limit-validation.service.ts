import { Injectable, Logger } from '@nestjs/common';
import { ComplianceRepository } from '../repositories/compliance.repository';
import { ValidationResult } from '../interfaces';

@Injectable()
export class WeeklyLimitValidationService {
  private readonly logger = new Logger(WeeklyLimitValidationService.name);
  private readonly DEFAULT_WEEKLY_LIMIT_HOURS = 40;

  constructor(private readonly complianceRepository: ComplianceRepository) {}

  /**
   * Validate weekly hour limit
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   */
  async validate(
    locationId: string,
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<ValidationResult> {
    try {
      const config = await this.complianceRepository.getLocationConfig(locationId);
      const weeklyLimitEnabled = config?.weeklyLimitEnabled ?? true;
      const weeklyLimit = config?.weeklyLimitHours ?? this.DEFAULT_WEEKLY_LIMIT_HOURS;

      if (!weeklyLimitEnabled) {
        return {
          isValid: true,
          validationType: 'WEEKLY_LIMIT',
          message: 'Weekly limit not enabled for location',
        };
      }

      const windowStart = new Date(newShiftStart);
      const windowEnd = new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000);

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

      if (totalHours > weeklyLimit) {
        return {
          isValid: false,
          validationType: 'WEEKLY_LIMIT',
          message: `Weekly hour limit exceeded. Limit: ${weeklyLimit} hours, Total: ${totalHours.toFixed(2)} hours`,
          details: {
            currentValue: totalHours,
            limitValue: weeklyLimit,
            windowStart,
            windowEnd,
          },
        };
      }

      return {
        isValid: true,
        validationType: 'WEEKLY_LIMIT',
        message: 'Weekly limit validation passed',
      };
    } catch (error) {
      this.logger.error(`Error validating weekly limit for staff ${staffId}:`, error);
      throw error;
    }
  }
}
