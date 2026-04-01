import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { ComplianceService } from '../../compliance/compliance.service';
import { ConflictService } from '../../conflict/conflict.service';
import { OvertimeService } from '../../overtime/overtime.service';
import { StaffSuggestion } from '../interfaces';

/**
 * Alternative Staff Service
 * Provides alternative staff suggestions when constraint violations occur
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5
 */
@Injectable()
export class AlternativeStaffService {
  private readonly logger = new Logger(AlternativeStaffService.name);

  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly userRepository: UserRepository,
    private readonly complianceService: ComplianceService,
    private readonly conflictService: ConflictService,
    private readonly overtimeService: OvertimeService
  ) {}

  /**
   * Get alternative staff suggestions for a shift
   * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5
   *
   * @param shiftId - The shift ID to find alternatives for
   * @param excludeStaffId - Optional staff ID to exclude from suggestions
   * @returns Array of up to 5 staff suggestions ranked by current hours (ascending)
   */
  async getAlternativeStaff(shiftId: string, excludeStaffId?: string): Promise<StaffSuggestion[]> {
    try {
      // Get shift details
      const shift = await this.scheduleRepository.findShiftById(shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      // Get location details for timezone
      const location = await this.scheduleRepository.findLocationById(shift.locationId);
      if (!location) {
        throw new NotFoundException('Location not found');
      }

      // Get required skill IDs for the shift
      const requiredSkillIds = shift.skills.map((ss) => ss.skillId);

      // Get all staff certified for this location
      const certifiedStaff = await this.userRepository.findByCertifiedLocation(shift.locationId);

      // Filter to only STAFF role users
      const staffUsers = certifiedStaff.filter((user) => user.role === 'STAFF');

      // Exclude the specified staff member if provided
      const candidateStaff = excludeStaffId
        ? staffUsers.filter((user) => user.id !== excludeStaffId)
        : staffUsers;

      // Evaluate each candidate
      const suggestions: StaffSuggestion[] = [];

      for (const staff of candidateStaff) {
        // Check if staff has all required skills
        const staffSkillIds = staff.skills.map((us) => us.skillId);
        const hasRequiredSkills = requiredSkillIds.every((reqSkillId) =>
          staffSkillIds.includes(reqSkillId)
        );

        // Check if staff has location certification (already filtered, but double-check)
        const hasLocationCertification = staff.certifications.some(
          (cert) => cert.locationId === shift.locationId
        );

        // Check availability
        const availabilityResult = await this.complianceService.validateAvailability(
          staff.id,
          shift.startTime,
          shift.endTime,
          location.timezone
        );
        const isAvailable = availabilityResult.isValid;

        // Check if staff would pass all scheduling constraints
        let passesConstraints = false;
        if (hasRequiredSkills && hasLocationCertification && isAvailable) {
          // Check for conflicts (double-booking)
          const conflictResult = await this.conflictService.checkOverlap(
            staff.id,
            shift.startTime,
            shift.endTime
          );

          if (!conflictResult.hasConflict) {
            // Check all compliance rules
            const complianceResults = await this.complianceService.validateAll(
              shift.locationId,
              staff.id,
              shift.startTime,
              shift.endTime,
              location.timezone
            );

            // All compliance checks must pass
            passesConstraints = complianceResults.every((result) => result.isValid);
          }
        }

        // Only include staff who meet ALL requirements
        if (hasRequiredSkills && hasLocationCertification && isAvailable && passesConstraints) {
          // Get current hour totals for ranking
          const currentHours = await this.getCurrentHours(staff.id, shift.startTime);

          suggestions.push({
            staffId: staff.id,
            staffName: `${staff.firstName} ${staff.lastName}`,
            currentHours,
            isAvailable,
            hasRequiredSkills,
            hasLocationCertification,
            passesConstraints,
          });
        }
      }

      // Sort by current hours (ascending - staff with fewer hours first)
      suggestions.sort((a, b) => a.currentHours - b.currentHours);

      // Return top 5 suggestions
      return suggestions.slice(0, 5);
    } catch (error) {
      this.logger.error(`Error getting alternative staff:`, error);
      throw error;
    }
  }

  /**
   * Get current hour totals for a staff member
   * Uses a rolling 7-day window from the shift start date
   *
   * @param staffId - The staff member ID
   * @param shiftStart - The shift start date to calculate from
   * @returns Total hours worked in the 7-day window
   */
  private async getCurrentHours(staffId: string, shiftStart: Date): Promise<number> {
    // Calculate rolling 7-day window ending at shift start
    const windowEnd = new Date(shiftStart);
    const windowStart = new Date(shiftStart);
    windowStart.setDate(windowStart.getDate() - 7);

    const calculation = await this.overtimeService.calculateHours(staffId, windowStart, windowEnd);

    return calculation.totalHours;
  }
}
