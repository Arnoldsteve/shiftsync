import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CoverageGapRepository } from '../repositories/coverage-gap.repository';
import { CalloutRepository } from '../repositories/callout.repository';
import { ComplianceService } from '../../compliance/compliance.service';
import { ConflictService } from '../../conflict/conflict.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { AvailableStaff } from '../interfaces';

@Injectable()
export class CoverageGapService {
  private readonly logger = new Logger(CoverageGapService.name);

  constructor(
    private readonly coverageGapRepository: CoverageGapRepository,
    private readonly calloutRepository: CalloutRepository,
    private readonly complianceService: ComplianceService,
    private readonly conflictService: ConflictService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  /**
   * Find available staff for an uncovered shift
   * Requirements: 23.1, 23.2, 23.3
   */
  async findAvailableStaff(shiftId: string): Promise<AvailableStaff[]> {
    try {
      const shift = await this.coverageGapRepository.findShiftById(shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      // Get required skills for the shift
      const requiredSkillIds = shift.skills.map((s) => s.skillId);

      // Find staff with required skills and location certification
      const qualifiedStaff = await this.coverageGapRepository.findStaffWithSkillsAndCertification(
        shift.locationId,
        requiredSkillIds
      );

      const availableStaff: AvailableStaff[] = [];

      // Filter out staff who would violate scheduling constraints
      for (const staff of qualifiedStaff) {
        // Check for conflicts
        const hasConflict = await this.conflictService.hasOverlap(
          staff.id,
          shift.startTime,
          shift.endTime
        );

        if (hasConflict) {
          continue;
        }

        // Check compliance constraints
        const location = shift.location;
        const staffTimezone = location?.timezone || 'UTC';

        const complianceResults = await this.complianceService.validateAll(
          shift.locationId,
          staff.id,
          shift.startTime,
          shift.endTime,
          staffTimezone
        );

        const hasViolation = complianceResults.some((result) => !result.isValid);
        if (hasViolation) {
          continue;
        }

        // Calculate current hours for ranking
        const weekStart = new Date(shift.startTime);
        weekStart.setDate(weekStart.getDate() - 7);
        const weekEnd = new Date(shift.startTime);

        const assignments = await this.coverageGapRepository.findStaffAssignmentsInRange(
          staff.id,
          weekStart,
          weekEnd
        );

        let currentHours = 0;
        for (const assignment of assignments) {
          const durationMs =
            assignment.shift.endTime.getTime() - assignment.shift.startTime.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          currentHours += durationHours;
        }

        availableStaff.push({
          staffId: staff.id,
          staffName: `${staff.firstName} ${staff.lastName}`,
          currentHours,
          skills: staff.skills.map((s) => s.skill.name),
          certifications: staff.certifications.map((c) => c.locationId),
        });
      }

      // Rank by current hours (ascending - staff with fewer hours first)
      availableStaff.sort((a, b) => a.currentHours - b.currentHours);

      return availableStaff;
    } catch (error) {
      this.logger.error(`Error finding available staff for shift ${shiftId}:`, error);
      throw error;
    }
  }

  /**
   * Send shift offer to specific staff
   * Requirements: 23.4, 23.5
   */
  async sendShiftOffer(shiftId: string, staffId: string): Promise<void> {
    try {
      const shift = await this.coverageGapRepository.findShiftById(shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      // TODO: Implement actual notification mechanism (email, SMS, push notification)
      this.logger.log(`Would send shift offer for shift ${shiftId} to staff ${staffId}`);

      // Emit real-time event to staff
      this.realtimeGateway.server.to(`staff:${staffId}`).emit('shift:offer', {
        shiftId,
        shift: {
          id: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime,
          locationId: shift.locationId,
        },
      });
    } catch (error) {
      this.logger.error(`Error sending shift offer:`, error);
      throw error;
    }
  }

  /**
   * Notify managers and available staff about coverage gap
   * Requirements: 23.4
   */
  async notifyCoverageGap(shiftId: string): Promise<void> {
    try {
      const shift = await this.coverageGapRepository.findShiftById(shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      const availableStaff = await this.findAvailableStaff(shiftId);

      // Notify managers
      const managers = await this.calloutRepository.findManagersForLocation(shift.locationId);
      for (const manager of managers) {
        this.logger.log(
          `Would notify manager ${manager.email} about coverage gap for shift ${shiftId} with ${availableStaff.length} available staff`
        );
        // TODO: Send actual notification with shift details and available staff list
      }

      // Notify available staff
      for (const staff of availableStaff) {
        this.logger.log(`Would notify staff ${staff.staffName} about available shift ${shiftId}`);
        // TODO: Send actual notification
      }
    } catch (error) {
      this.logger.error(`Error notifying coverage gap:`, error);
      throw error;
    }
  }
}
