import { Injectable } from '@nestjs/common';
import { OvertimeRepository } from './repositories/overtime.repository';
import { OvertimeCalculation, OvertimeWarning, OvertimeReport } from './interfaces';

@Injectable()
export class OvertimeService {
  private readonly WEEKLY_OVERTIME_THRESHOLD = 40;

  constructor(private readonly overtimeRepository: OvertimeRepository) {}

  /**
   * Calculate regular and overtime hours for a staff member in a date range
   * Requirements: 9.1, 9.2, 9.3
   */
  async calculateHours(
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OvertimeCalculation> {
    const shifts = await this.overtimeRepository.findShiftsInRange(staffId, startDate, endDate);

    let totalHours = 0;
    for (const shift of shifts) {
      const durationMs = shift.endTime.getTime() - shift.startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      totalHours += durationHours;
    }

    const regularHours = Math.min(totalHours, this.WEEKLY_OVERTIME_THRESHOLD);
    const overtimeHours = Math.max(0, totalHours - this.WEEKLY_OVERTIME_THRESHOLD);

    return {
      staffId,
      regularHours,
      overtimeHours,
      totalHours,
      weekStart: startDate,
      weekEnd: endDate,
    };
  }

  /**
   * Check if a new shift assignment would trigger overtime warning
   * Requirements: 9.5
   */
  async checkOvertimeWarning(
    staffId: string,
    newShiftStart: Date,
    newShiftEnd: Date
  ): Promise<OvertimeWarning> {
    // Calculate rolling 7-day window from new shift start
    const windowStart = new Date(newShiftStart);
    windowStart.setDate(windowStart.getDate() - 7);

    const windowEnd = new Date(newShiftStart);
    windowEnd.setDate(windowEnd.getDate() + 7);

    // Get current hours in the window
    const shifts = await this.overtimeRepository.findShiftsInRange(staffId, windowStart, windowEnd);

    let currentHours = 0;
    for (const shift of shifts) {
      const durationMs = shift.endTime.getTime() - shift.startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      currentHours += durationHours;
    }

    // Calculate new shift hours
    const newShiftDurationMs = newShiftEnd.getTime() - newShiftStart.getTime();
    const newShiftHours = newShiftDurationMs / (1000 * 60 * 60);

    const projectedHours = currentHours + newShiftHours;
    const overtimeAmount = Math.max(0, projectedHours - this.WEEKLY_OVERTIME_THRESHOLD);

    const hasWarning = projectedHours > this.WEEKLY_OVERTIME_THRESHOLD;

    return {
      hasWarning,
      currentHours,
      projectedHours,
      overtimeAmount,
      message: hasWarning
        ? `This assignment would result in ${overtimeAmount.toFixed(2)} hours of overtime`
        : undefined,
    };
  }

  /**
   * Generate overtime report for all staff in a location for a week
   * Requirements: 9.4
   */
  async getOvertimeReport(locationId: string, weekStart: Date): Promise<OvertimeReport> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Find all staff with shifts in this location during the week
    const staffIds = await this.overtimeRepository.findStaffWithShiftsInLocation(
      locationId,
      weekStart,
      weekEnd
    );

    const staffOvertimeData = [];

    for (const staffId of staffIds) {
      const calculation = await this.calculateHours(staffId, weekStart, weekEnd);
      const user = await this.overtimeRepository.findUserById(staffId);

      staffOvertimeData.push({
        staffId,
        staffName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        regularHours: calculation.regularHours,
        overtimeHours: calculation.overtimeHours,
        totalHours: calculation.totalHours,
      });
    }

    return {
      locationId,
      weekStart,
      weekEnd,
      staffOvertimeData,
    };
  }
}
