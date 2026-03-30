import { Injectable, Logger } from '@nestjs/common';
import { ComplianceRepository } from '../repositories/compliance.repository';
import { ValidationResult } from '../interfaces';

@Injectable()
export class ConsecutiveDaysValidationService {
  private readonly logger = new Logger(ConsecutiveDaysValidationService.name);

  constructor(private readonly complianceRepository: ComplianceRepository) {}

  /**
   * Validate consecutive days limit
   * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
   */
  async validate(
    locationId: string,
    staffId: string,
    newShiftStart: Date,
    staffTimezone: string
  ): Promise<ValidationResult> {
    try {
      const config = await this.complianceRepository.getLocationConfig(locationId);

      if (!config || !config.consecutiveDaysEnabled || !config.consecutiveDaysLimit) {
        return {
          isValid: true,
          validationType: 'CONSECUTIVE_DAYS',
          message: 'Consecutive days limit not configured for location',
        };
      }

      const consecutiveDaysLimit = config.consecutiveDaysLimit;
      const windowStart = new Date(newShiftStart.getTime() - 30 * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(newShiftStart.getTime() + 30 * 24 * 60 * 60 * 1000);

      const shifts = await this.complianceRepository.findShiftsInRange(
        staffId,
        windowStart,
        windowEnd
      );

      const shiftDays = new Set<string>();
      const newShiftDay = this.getCalendarDay(newShiftStart, staffTimezone);
      shiftDays.add(newShiftDay);

      for (const shift of shifts) {
        const shiftDay = this.getCalendarDay(shift.startTime, staffTimezone);
        shiftDays.add(shiftDay);
      }

      const sortedDays = Array.from(shiftDays).sort();
      let maxConsecutiveDays = 1;
      let currentConsecutiveDays = 1;

      for (let i = 1; i < sortedDays.length; i++) {
        const prevDate = new Date(sortedDays[i - 1]);
        const currDate = new Date(sortedDays[i]);
        const dayDiff = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff === 1) {
          currentConsecutiveDays++;
          maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
        } else {
          currentConsecutiveDays = 1;
        }
      }

      if (maxConsecutiveDays > consecutiveDaysLimit) {
        return {
          isValid: false,
          validationType: 'CONSECUTIVE_DAYS',
          message: `Consecutive days limit exceeded. Limit: ${consecutiveDaysLimit} days, Found: ${maxConsecutiveDays} days`,
          details: {
            currentValue: maxConsecutiveDays,
            limitValue: consecutiveDaysLimit,
            timezone: staffTimezone,
          },
        };
      }

      return {
        isValid: true,
        validationType: 'CONSECUTIVE_DAYS',
        message: 'Consecutive days validation passed',
      };
    } catch (error) {
      this.logger.error(`Error validating consecutive days for staff ${staffId}:`, error);
      throw error;
    }
  }

  private getCalendarDay(date: Date, timezone: string): string {
    const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const year = dateInTimezone.getFullYear();
    const month = String(dateInTimezone.getMonth() + 1).padStart(2, '0');
    const day = String(dateInTimezone.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
