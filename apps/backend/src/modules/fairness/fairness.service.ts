import { Injectable } from '@nestjs/common';
import { FairnessRepository } from './repositories/fairness.repository';
import {
  HourDistribution,
  PremiumShiftDistribution,
  FairnessReport,
  DesiredHoursAnalysis,
  DesiredHoursComparison,
} from './interfaces';

@Injectable()
export class FairnessService {
  constructor(private readonly fairnessRepository: FairnessRepository) {}

  /**
   * Calculate hour distribution for all staff in a location
   * Requirements: 13.1, 13.2, 13.3
   */
  async calculateHourDistribution(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HourDistribution> {
    // Find all staff with shifts in this location
    const staffIds = await this.fairnessRepository.findStaffWithShiftsInLocation(
      locationId,
      startDate,
      endDate
    );

    const staffHoursData: Array<{
      staffId: string;
      staffName: string;
      totalHours: number;
      isOutlier: boolean;
    }> = [];

    // Calculate total hours for each staff member
    for (const staffId of staffIds) {
      const shifts = await this.fairnessRepository.findShiftsInRange(staffId, startDate, endDate);

      let totalHours = 0;
      for (const shift of shifts) {
        const durationMs = shift.endTime.getTime() - shift.startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        totalHours += durationHours;
      }

      const user = await this.fairnessRepository.findUserById(staffId);

      staffHoursData.push({
        staffId,
        staffName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        totalHours,
        isOutlier: false, // Will be calculated after statistics
      });
    }

    // Calculate statistics
    const hours = staffHoursData.map((s) => s.totalHours);
    const mean = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;

    const variance =
      hours.length > 0
        ? hours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hours.length
        : 0;
    const standardDeviation = Math.sqrt(variance);

    const min = hours.length > 0 ? Math.min(...hours) : 0;
    const max = hours.length > 0 ? Math.max(...hours) : 0;

    // Identify outliers (hours > 1 standard deviation from mean)
    const outlierThreshold = mean + standardDeviation;
    for (const staffData of staffHoursData) {
      staffData.isOutlier = staffData.totalHours > outlierThreshold;
    }

    return {
      locationId,
      startDate,
      endDate,
      staffHours: staffHoursData,
      statistics: {
        mean,
        standardDeviation,
        min,
        max,
      },
    };
  }

  /**
   * Calculate premium shift distribution for all staff in a location
   * Requirements: 14.1, 14.2, 14.3, 14.4
   */
  async calculatePremiumShiftDistribution(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PremiumShiftDistribution> {
    // Get premium shift criteria for this location
    const premiumCriteria = await this.fairnessRepository.findPremiumShiftCriteria(locationId);

    // Find all staff with shifts in this location
    const staffIds = await this.fairnessRepository.findStaffWithShiftsInLocation(
      locationId,
      startDate,
      endDate
    );

    const staffPremiumShiftsData: Array<{
      staffId: string;
      staffName: string;
      totalShifts: number;
      premiumShifts: number;
      premiumPercentage: number;
      isOutlier: boolean;
    }> = [];

    // Calculate premium shifts for each staff member
    for (const staffId of staffIds) {
      const shifts = await this.fairnessRepository.findShiftsInRange(staffId, startDate, endDate);

      let premiumShiftCount = 0;

      for (const shift of shifts) {
        if (this.isPremiumShift(shift, premiumCriteria)) {
          premiumShiftCount++;
        }
      }

      const totalShifts = shifts.length;
      const premiumPercentage = totalShifts > 0 ? (premiumShiftCount / totalShifts) * 100 : 0;

      const user = await this.fairnessRepository.findUserById(staffId);

      staffPremiumShiftsData.push({
        staffId,
        staffName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        totalShifts,
        premiumShifts: premiumShiftCount,
        premiumPercentage,
        isOutlier: false, // Will be calculated after statistics
      });
    }

    // Calculate statistics
    const premiumCounts = staffPremiumShiftsData.map((s) => s.premiumShifts);
    const premiumPercentages = staffPremiumShiftsData.map((s) => s.premiumPercentage);

    const meanPremiumCount =
      premiumCounts.length > 0
        ? premiumCounts.reduce((a, b) => a + b, 0) / premiumCounts.length
        : 0;

    const meanPremiumPercentage =
      premiumPercentages.length > 0
        ? premiumPercentages.reduce((a, b) => a + b, 0) / premiumPercentages.length
        : 0;

    const variance =
      premiumCounts.length > 0
        ? premiumCounts.reduce((sum, c) => sum + Math.pow(c - meanPremiumCount, 2), 0) /
          premiumCounts.length
        : 0;
    const standardDeviation = Math.sqrt(variance);

    // Identify outliers (premium shifts > 1 standard deviation from mean)
    const outlierThreshold = meanPremiumCount + standardDeviation;
    for (const staffData of staffPremiumShiftsData) {
      staffData.isOutlier = staffData.premiumShifts > outlierThreshold;
    }

    return {
      locationId,
      startDate,
      endDate,
      staffPremiumShifts: staffPremiumShiftsData,
      statistics: {
        meanPremiumCount,
        meanPremiumPercentage,
        standardDeviation,
      },
    };
  }

  /**
   * Compare actual scheduled hours to desired hours for each staff user
   * Requirements: 41.2, 41.3, 41.4
   */
  async compareActualToDesiredHours(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DesiredHoursAnalysis> {
    // Find all staff with shifts in this location
    const staffIds = await this.fairnessRepository.findStaffWithShiftsInLocation(
      locationId,
      startDate,
      endDate
    );

    const comparisons: DesiredHoursComparison[] = [];

    // Calculate the number of weeks in the date range for weekly hours comparison
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationWeeks = durationMs / (1000 * 60 * 60 * 24 * 7);

    // Calculate actual vs desired hours for each staff member
    for (const staffId of staffIds) {
      const shifts = await this.fairnessRepository.findShiftsInRange(staffId, startDate, endDate);

      // Calculate actual hours
      let actualHours = 0;
      for (const shift of shifts) {
        const durationMs = shift.endTime.getTime() - shift.startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        actualHours += durationHours;
      }

      // Get user with desired hours
      const user = await this.fairnessRepository.findUserWithDesiredHours(staffId);

      const staffName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
      const desiredWeeklyHours = user?.desiredWeeklyHours ?? null;

      let comparison: DesiredHoursComparison;

      if (desiredWeeklyHours === null) {
        // Staff has not set desired hours
        comparison = {
          staffId,
          staffName,
          actualHours,
          desiredHours: null,
          difference: null,
          percentageDifference: null,
          status: 'no-preference',
        };
      } else {
        // Calculate expected hours based on desired weekly hours and date range
        const expectedHours = desiredWeeklyHours * durationWeeks;
        const difference = actualHours - expectedHours;
        const percentageDifference = expectedHours > 0 ? (difference / expectedHours) * 100 : 0;

        // Determine status based on thresholds
        // "Significantly" means: >20% deviation OR >5 hours absolute difference
        const isSignificantlyDifferent =
          Math.abs(percentageDifference) > 20 || Math.abs(difference) > 5;

        let status: DesiredHoursComparison['status'];
        if (!isSignificantlyDifferent) {
          status = 'on-target';
        } else if (difference < 0) {
          status = 'under-scheduled';
        } else {
          status = 'over-scheduled';
        }

        comparison = {
          staffId,
          staffName,
          actualHours,
          desiredHours: expectedHours,
          difference,
          percentageDifference,
          status,
        };
      }

      comparisons.push(comparison);
    }

    // Categorize comparisons
    const underScheduled = comparisons.filter((c) => c.status === 'under-scheduled');
    const overScheduled = comparisons.filter((c) => c.status === 'over-scheduled');
    const onTarget = comparisons.filter((c) => c.status === 'on-target');
    const noPreference = comparisons.filter((c) => c.status === 'no-preference');

    return {
      locationId,
      startDate,
      endDate,
      comparisons,
      underScheduled,
      overScheduled,
      onTarget,
      noPreference,
    };
  }

  /**
   * Generate comprehensive fairness report
   * Requirements: 13.4, 13.5, 41.5
   */
  async generateFairnessReport(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FairnessReport> {
    const hourDistribution = await this.calculateHourDistribution(locationId, startDate, endDate);

    const premiumShiftDistribution = await this.calculatePremiumShiftDistribution(
      locationId,
      startDate,
      endDate
    );

    const desiredHoursAnalysis = await this.compareActualToDesiredHours(
      locationId,
      startDate,
      endDate
    );

    return {
      locationId,
      startDate,
      endDate,
      hourDistribution,
      premiumShiftDistribution,
      desiredHoursAnalysis,
      generatedAt: new Date(),
    };
  }

  /**
   * Check if a shift is premium based on criteria
   * Requirements: 14.1
   */
  private isPremiumShift(
    shift: { startTime: Date; endTime: Date },
    criteria: Array<{ criteriaType: string; criteriaValue: string }>
  ): boolean {
    for (const criterion of criteria) {
      try {
        const criteriaData = JSON.parse(criterion.criteriaValue);

        switch (criterion.criteriaType) {
          case 'DAY_OF_WEEK': {
            // criteriaData: { days: [0, 6] } for weekends (Sunday=0, Saturday=6)
            const dayOfWeek = shift.startTime.getDay();
            if (criteriaData.days && criteriaData.days.includes(dayOfWeek)) {
              return true;
            }
            break;
          }

          case 'TIME_OF_DAY': {
            // criteriaData: { startHour: 18, endHour: 6 } for night shifts
            const hour = shift.startTime.getHours();
            if (criteriaData.startHour !== undefined && criteriaData.endHour !== undefined) {
              // Handle overnight time ranges (e.g., 18:00 to 6:00)
              if (criteriaData.startHour > criteriaData.endHour) {
                if (hour >= criteriaData.startHour || hour < criteriaData.endHour) {
                  return true;
                }
              } else {
                if (hour >= criteriaData.startHour && hour < criteriaData.endHour) {
                  return true;
                }
              }
            }
            break;
          }

          case 'HOLIDAY': {
            // criteriaData: { dates: ["2024-12-25", "2024-01-01"] }
            const shiftDate = shift.startTime.toISOString().split('T')[0];
            if (criteriaData.dates && criteriaData.dates.includes(shiftDate)) {
              return true;
            }
            break;
          }
        }
      } catch (error) {
        // Invalid JSON in criteriaValue, skip this criterion
        continue;
      }
    }

    return false;
  }
}
