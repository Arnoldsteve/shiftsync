import { Injectable } from '@nestjs/common';
import { ComplianceRepository } from '../repositories/compliance.repository';
import { GraduatedValidationResult, ValidationError, ValidationWarning } from '../interfaces';

@Injectable()
export class EnhancedComplianceValidationService {
  constructor(private readonly complianceRepository: ComplianceRepository) {}

  /**
   * Validate with graduated warnings and errors
   * Requirements: 39.1, 39.2, 39.3, 39.4, 39.5
   */
  async validateWithGraduation(
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date,
    staffTimezone: string,
    overrideReason?: string
  ): Promise<GraduatedValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let requiresOverride = false;

    // Calculate shift duration in hours
    const shiftDurationMs = newShiftEnd.getTime() - newShiftStart.getTime();
    const shiftDurationHours = shiftDurationMs / (1000 * 60 * 60);

    // Check 8-hour day (warning only)
    // Requirement 39.1: 8-hour day warning without block
    if (shiftDurationHours >= 8 && shiftDurationHours < 12) {
      const dailyHours = await this.calculateDailyHours(staffId, newShiftStart, newShiftEnd);

      if (dailyHours >= 8 && dailyHours < 12) {
        warnings.push({
          type: 'EIGHT_HOUR_DAY',
          message: `Staff will work ${dailyHours.toFixed(1)} hours in a 24-hour period. Consider workload distribution.`,
          details: { dailyHours, threshold: 8 },
        });
      }
    }

    // Check 12-hour day (hard error, block assignment)
    // Requirement 39.2: 12-hour day hard block
    if (shiftDurationHours >= 12) {
      errors.push({
        type: 'TWELVE_HOUR_DAY',
        message: `Shift duration of ${shiftDurationHours.toFixed(1)} hours exceeds 12-hour maximum. Assignment blocked.`,
        details: { shiftDurationHours, threshold: 12 },
      });
    } else {
      const dailyHours = await this.calculateDailyHours(staffId, newShiftStart, newShiftEnd);

      if (dailyHours >= 12) {
        errors.push({
          type: 'TWELVE_HOUR_DAY',
          message: `Staff would work ${dailyHours.toFixed(1)} hours in a 24-hour period, exceeding 12-hour maximum. Assignment blocked.`,
          details: { dailyHours, threshold: 12 },
        });
      }
    }

    // Check consecutive days
    const consecutiveDays = await this.calculateConsecutiveDays(
      staffId,
      newShiftStart,
      staffTimezone
    );

    // Requirement 39.3: 6 consecutive days warning
    if (consecutiveDays === 6) {
      warnings.push({
        type: 'SIX_CONSECUTIVE_DAYS',
        message: `Staff will work 6 consecutive days. Consider scheduling a rest day.`,
        details: { consecutiveDays, threshold: 6 },
      });
    }

    // Requirement 39.4: 7 consecutive days requires override
    if (consecutiveDays >= 7) {
      if (!overrideReason) {
        requiresOverride = true;
        errors.push({
          type: 'SEVEN_CONSECUTIVE_DAYS',
          message: `Staff would work 7 consecutive days. Manager override with documented reason required.`,
          details: { consecutiveDays, threshold: 7 },
        });
      } else {
        warnings.push({
          type: 'SEVEN_CONSECUTIVE_DAYS_OVERRIDE',
          message: `7 consecutive days approved with override: ${overrideReason}`,
          details: { consecutiveDays, overrideReason },
        });
      }
    }

    // Requirement 39.5: 35+ hours proximity warning
    const weeklyHours = await this.calculateWeeklyHours(staffId, newShiftStart, newShiftEnd);

    if (weeklyHours >= 35 && weeklyHours < 40) {
      warnings.push({
        type: 'OVERTIME_PROXIMITY',
        message: `Staff will work ${weeklyHours.toFixed(1)} hours in 7-day period. Approaching 40-hour overtime threshold.`,
        details: { weeklyHours, threshold: 35, overtimeThreshold: 40 },
      });
    }

    return {
      errors,
      warnings,
      requiresOverride,
      overrideReason,
    };
  }

  /**
   * Calculate total hours in a 24-hour period from shift start
   */
  private async calculateDailyHours(
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<number> {
    const windowStart = new Date(newShiftStart);
    const windowEnd = new Date(newShiftStart);
    windowEnd.setHours(windowEnd.getHours() + 24);

    const shifts = await this.complianceRepository.findShiftsByStaffAndTimeRange(
      staffId,
      windowStart,
      windowEnd
    );

    let totalHours = 0;

    // Add existing shifts
    for (const shift of shifts) {
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);
      const durationMs = shiftEnd.getTime() - shiftStart.getTime();
      totalHours += durationMs / (1000 * 60 * 60);
    }

    // Add new shift
    const newShiftDurationMs = newShiftEnd.getTime() - newShiftStart.getTime();
    totalHours += newShiftDurationMs / (1000 * 60 * 60);

    return totalHours;
  }

  /**
   * Calculate consecutive days including new shift
   */
  private async calculateConsecutiveDays(
    staffId: string,
    newShiftStart: Date,
    staffTimezone: string
  ): Promise<number> {
    // Get shifts in a 14-day window (7 days before and after)
    const windowStart = new Date(newShiftStart);
    windowStart.setDate(windowStart.getDate() - 7);
    const windowEnd = new Date(newShiftStart);
    windowEnd.setDate(windowEnd.getDate() + 7);

    const shifts = await this.complianceRepository.findShiftsByStaffAndTimeRange(
      staffId,
      windowStart,
      windowEnd
    );

    // Convert shift dates to calendar days in staff timezone
    const shiftDays = new Set<string>();
    for (const shift of shifts) {
      const shiftDate = new Date(shift.startTime).toLocaleDateString('en-US', {
        timeZone: staffTimezone,
      });
      shiftDays.add(shiftDate);
    }

    // Add new shift day
    const newShiftDay = newShiftStart.toLocaleDateString('en-US', {
      timeZone: staffTimezone,
    });
    shiftDays.add(newShiftDay);

    // Sort days and count consecutive
    const sortedDays = Array.from(shiftDays)
      .map((d) => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());

    let maxConsecutive = 1;
    let currentConsecutive = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      const prevDay = sortedDays[i - 1];
      const currentDay = sortedDays[i];
      const diffDays = Math.round(
        (currentDay.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }

    return maxConsecutive;
  }

  /**
   * Calculate total hours in 7-day rolling window
   */
  private async calculateWeeklyHours(
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<number> {
    const windowStart = new Date(newShiftStart);
    windowStart.setDate(windowStart.getDate() - 7);
    const windowEnd = new Date(newShiftStart);
    windowEnd.setDate(windowEnd.getDate() + 1);

    const shifts = await this.complianceRepository.findShiftsByStaffAndTimeRange(
      staffId,
      windowStart,
      windowEnd
    );

    let totalHours = 0;

    // Add existing shifts
    for (const shift of shifts) {
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);
      const durationMs = shiftEnd.getTime() - shiftStart.getTime();
      totalHours += durationMs / (1000 * 60 * 60);
    }

    // Add new shift
    const newShiftDurationMs = newShiftEnd.getTime() - newShiftStart.getTime();
    totalHours += newShiftDurationMs / (1000 * 60 * 60);

    return totalHours;
  }
}
