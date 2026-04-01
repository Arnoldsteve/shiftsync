import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CoverageGapRepository } from '../repositories/coverage-gap.repository';
import { CalloutRepository } from '../repositories/callout.repository';
import { ComplianceService } from '../../compliance/compliance.service';
import { ConflictService } from '../../conflict/conflict.service';
import { NotificationService } from '../../notification/notification.service';
import { AvailableStaff } from '../interfaces/available-staff.interface';
import { differenceInHours, startOfWeek, endOfWeek } from 'date-fns';

@Injectable()
export class CoverageGapService {
  private readonly logger = new Logger(CoverageGapService.name);

  constructor(
    private readonly coverageGapRepository: CoverageGapRepository,
    private readonly calloutRepository: CalloutRepository,
    private readonly complianceService: ComplianceService,
    private readonly conflictService: ConflictService,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * Find available staff for an uncovered shift
   * Senior Refactor: Implements Hard Block vs Soft Warning logic.
   * Requirements: 2.7 (Rule Explanation), 23.1 (Skills/Certs), 23.2 (Ranking)
   */
  async findAvailableStaff(shiftId: string): Promise<AvailableStaff[]> {
    try {
      const shift = await this.coverageGapRepository.findShiftById(shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      const requiredSkillIds = shift.skills.map((s) => s.skillId);
      const shiftTz = shift.location?.timezone || 'UTC';

      // 1. Fetch Qualified Pool (Repository uses 'some' instead of 'every')
      const qualifiedStaff = await this.coverageGapRepository.findStaffWithSkillsAndCertification(
        shift.locationId,
        requiredSkillIds
      );

      const availableStaff: AvailableStaff[] = [];

      for (const staff of qualifiedStaff) {
        const violations: string[] = [];

        // --- 1. HARD BLOCK: Double Booking (Overlap) ---
        const hasOverlap = await this.conflictService.hasOverlap(
          staff.id,
          shift.startTime,
          shift.endTime
        );

        if (hasOverlap) {
          // Add violation message instead of skipping
          violations.push('Double-booked with another shift during this time');
        }

        // --- 2. COMPLIANCE ENGINE: Collect all violations ---
        const complianceResults = await this.complianceService.validateAll(
          shift.locationId,
          staff.id,
          shift.startTime,
          shift.endTime,
          shiftTz
        );

        // Collect all compliance violations (both hard blocks and soft warnings)
        // We include all staff in the list and show managers WHY they may be ineligible
        complianceResults
          .filter((r) => !r.isValid)
          .forEach((r) => {
            if (r.message) {
              violations.push(r.message);
            }
          });

        // --- 3. RANKING LOGIC: Weekly Hours (Requirement 23.2) ---
        // We calculate hours for the specific payroll week (Mon-Sun) containing the shift
        const weekStart = startOfWeek(shift.startTime, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(shift.startTime, { weekStartsOn: 1 });

        const assignments = await this.coverageGapRepository.findStaffAssignmentsInRange(
          staff.id,
          weekStart,
          weekEnd
        );

        let currentHours = 0;
        for (const assignment of assignments) {
          const duration = differenceInHours(assignment.shift.endTime, assignment.shift.startTime);
          currentHours += duration;
        }

        // 4. Build AvailableStaff object with annotations
        availableStaff.push({
          staffId: staff.id,
          staffName: `${staff.firstName} ${staff.lastName}`,
          currentHours,
          skills: staff.skills.map((s) => s.skill.name),
          certifications: staff.certifications.map((c) => c.location?.name || 'Unknown Location'),
          // We pass the violations to the UI to fulfill Requirement 2.7
          constraintViolations: violations.length > 0 ? violations : undefined,
        });
      }

      // 5. Final Ranking: Ascending order of current hours
      // Policy: Give the work to the person with the fewest hours this week first.
      availableStaff.sort((a, b) => a.currentHours - b.currentHours);

      return availableStaff;
    } catch (error) {
      this.logger.error(`Error finding available staff for shift ${shiftId}:`, error);
      throw error;
    }
  }

  /**
   * Send shift offer to specific staff
   * Requirements: 23.4, 23.5, 7.1 (Notifications)
   */
  async sendShiftOffer(shiftId: string, staffId: string): Promise<void> {
    try {
      const shift = await this.coverageGapRepository.findShiftById(shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      this.logger.log(`Dispatching Shift Offer: Shift[${shiftId}] to Staff[${staffId}]`);

      // 1. Persist the notification in the DB
      await this.notificationService.createNotification(
        staffId,
        'SHIFT_OFFER',
        'New Shift Available',
        `A shift is available at ${shift.location.name}. Would you like to pick it up?`,
        {
          shiftId,
          locationName: shift.location.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
        }
      );

      // Note: Real-time event is emitted by NotificationService.createNotification
      // via RealtimeGateway.emitNotification to room staff:${staffId}

      // 3. Log the action for Audit Trail
      this.logger.log(`Offer notification sent successfully to staff:${staffId}`);
    } catch (error) {
      this.logger.error(`Error sending shift offer:`, error);
      throw error;
    }
  }

  /**
   * Notify managers and available staff about coverage gap
   * Triggered when a callout is reported.
   */
  async notifyCoverageGap(shiftId: string): Promise<void> {
    try {
      const shift = await this.coverageGapRepository.findShiftById(shiftId);
      if (!shift) return;

      const availableStaff = await this.findAvailableStaff(shiftId);

      // Notify Managers: "Shift is uncovered, here are X potential candidates"
      const managers = await this.calloutRepository.findManagersForLocation(shift.locationId);
      for (const manager of managers) {
        // Persist notification to DB and emit real-time event
        await this.notificationService.createNotification(
          manager.id,
          'COVERAGE_GAP',
          'Coverage Gap Alert',
          `URGENT: Shift at ${shift.location.name} is uncovered. ${availableStaff.length} staff members are eligible.`,
          { shiftId }
        );
      }

      // Notify Top 3 Available Staff: "A shift just opened up!"
      availableStaff.slice(0, 3).forEach((staff) => {
        this.sendShiftOffer(shiftId, staff.staffId);
      });
    } catch (error) {
      this.logger.error(`Error notifying coverage gap:`, error);
    }
  }
}
