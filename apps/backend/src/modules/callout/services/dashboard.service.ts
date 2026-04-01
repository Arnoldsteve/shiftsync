import { Injectable, Logger } from '@nestjs/common';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { LocationCoverage, UpcomingShift } from '../interfaces';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  /**
   * Get current coverage for all locations
   * Requirements: 21.1, 21.2, 21.3
   */
  async getCurrentCoverage(): Promise<LocationCoverage[]> {
    try {
      const locations = await this.dashboardRepository.findAllLocations();
      const coverageData: LocationCoverage[] = [];

      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      for (const location of locations) {
        // Get all shifts for today
        const shifts = await this.dashboardRepository.findShiftsByLocationAndTimeRange(
          location.id,
          now,
          endOfDay
        );

        // A shift is uncovered if:
        // 1. It has no assignments, OR
        // 2. It has a callout (staff called out)
        const uncoveredShifts = shifts.filter(
          (shift) => shift.assignments.length === 0 || shift.callouts.length > 0
        );

        const availableStaffCount = await this.dashboardRepository.countAvailableStaffForLocation(
          location.id
        );

        coverageData.push({
          locationId: location.id,
          locationName: location.name,
          totalShifts: shifts.length,
          coveredShifts: shifts.length - uncoveredShifts.length,
          uncoveredShifts: uncoveredShifts.length,
          availableStaffCount,
          uncoveredShiftDetails: uncoveredShifts.map((shift) => ({
            shiftId: shift.id,
            startTime: shift.startTime,
            endTime: shift.endTime,
            requiredSkills: shift.skills.map((s) => s.skill.name),
          })),
        });
      }

      return coverageData;
    } catch (error) {
      this.logger.error(`Error getting current coverage:`, error);
      throw error;
    }
  }

  /**
   * Get upcoming shifts for next 24 hours across all locations
   * Requirements: 21.4
   */
  async getUpcomingShifts(): Promise<UpcomingShift[]> {
    try {
      const now = new Date();
      const next24Hours = new Date(now);
      next24Hours.setHours(next24Hours.getHours() + 24);

      const shifts = await this.dashboardRepository.findUpcomingShifts(now, next24Hours);

      return shifts.map((shift) => {
        const assignment = shift.assignments[0];
        const hasCallout = shift.callouts.length > 0;
        const isCovered = shift.assignments.length > 0 && !hasCallout;

        return {
          shiftId: shift.id,
          locationId: shift.locationId,
          locationName: shift.location.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          isCovered,
          assignedStaff: assignment
            ? {
                staffId: assignment.staffId,
                staffName: `${assignment.staff.firstName} ${assignment.staff.lastName}`,
              }
            : undefined,
          hasCallout,
          requiredSkills: shift.skills.map((s) => s.skill.name),
        };
      });
    } catch (error) {
      this.logger.error(`Error getting upcoming shifts:`, error);
      throw error;
    }
  }

  /**
   * Update dashboard data after callout reporting
   * Requirements: 21.5
   */
  async updateDashboardData(locationId: string): Promise<void> {
    try {
      // Emit real-time event to update dashboard
      const coverage = await this.getCurrentCoverage();
      const locationCoverage = coverage.find((c) => c.locationId === locationId);

      if (locationCoverage) {
        this.realtimeGateway.server.to(`location:${locationId}`).emit('dashboard:update', {
          type: 'coverage',
          data: locationCoverage,
        });
      }

      // Also update upcoming shifts
      const upcomingShifts = await this.getUpcomingShifts();
      const locationUpcomingShifts = upcomingShifts.filter((s) => s.locationId === locationId);

      this.realtimeGateway.server.to(`location:${locationId}`).emit('dashboard:update', {
        type: 'upcoming',
        data: locationUpcomingShifts,
      });

      this.logger.log(`Dashboard data updated for location ${locationId}`);
    } catch (error) {
      this.logger.error(`Error updating dashboard data:`, error);
      throw error;
    }
  }
}
