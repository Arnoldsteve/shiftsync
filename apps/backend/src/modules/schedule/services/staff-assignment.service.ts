import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { AuditService } from '../../audit/audit.service';
import { ConflictService } from '../../conflict/conflict.service';
import { ComplianceService } from '../../compliance/compliance.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { Assignment } from '@prisma/client';

/**
 * Staff Assignment Service
 * Handles staff assignment and unassignment with validation
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 26.1, 26.2, 26.3
 */
@Injectable()
export class StaffAssignmentService {
  private readonly logger = new Logger(StaffAssignmentService.name);

  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly auditService: AuditService,
    private readonly conflictService: ConflictService,
    private readonly complianceService: ComplianceService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  /**
   * Assign staff to a shift with Conflict & Compliance checks
   * Requirements: 42.2 - Allow multiple assignments up to required headcount
   * Requirements: 39.1, 39.2, 39.3, 39.4, 39.5 - Graduated compliance validation
   */
  async assignStaff(
    shiftId: string,
    staffId: string,
    assignedBy: string,
    overrideReason?: string
  ): Promise<Assignment> {
    try {
      const shift = await this.scheduleRepository.findShiftById(shiftId);
      if (!shift) throw new NotFoundException('Shift not found');

      // Requirement 42.2: Check if headcount would be exceeded
      const filledHeadcount = shift.assignments.length;
      if (filledHeadcount >= shift.requiredHeadcount) {
        throw new BadRequestException(
          `Shift headcount limit reached (${shift.requiredHeadcount}/${shift.requiredHeadcount})`
        );
      }

      // Check if this specific staff member is already assigned to this shift
      const existingAssignment = shift.assignments.find((a) => a.staffId === staffId);
      if (existingAssignment) {
        throw new BadRequestException('Staff member is already assigned to this shift');
      }

      // Double-booking check
      const conflictResult = await this.conflictService.checkOverlap(
        staffId,
        shift.startTime,
        shift.endTime
      );
      if (conflictResult.hasConflict) {
        const conflictingShift = conflictResult.conflictingShifts[0];
        const locationName = (conflictingShift as any).location?.name || 'Unknown Location';
        const conflictStart = new Date(conflictingShift.startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
        const conflictEnd = new Date(conflictingShift.endTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
        throw new BadRequestException(
          `Schedule Conflict: User is already working at ${locationName} from ${conflictStart} - ${conflictEnd}`
        );
      }

      // Labor Compliance with Graduated Validation (Requirements 39.1-39.5)
      const location = await this.scheduleRepository.findLocationById(shift.locationId);
      const tz = location?.timezone || 'UTC';
      const graduatedResult = await this.complianceService.validateWithGraduation(
        shift.locationId,
        staffId,
        shift.startTime,
        shift.endTime,
        tz,
        overrideReason
      );

      // If there are hard errors, reject the assignment with graduated validation details
      if (graduatedResult.errors.length > 0) {
        const error: any = new BadRequestException('Compliance validation failed');
        error.response = {
          ...error.response,
          errors: graduatedResult.errors,
          warnings: graduatedResult.warnings,
          requiresOverride: graduatedResult.requiresOverride,
        };
        throw error;
      }

      const assignment = await this.scheduleRepository.createAssignment({
        shift: { connect: { id: shiftId } },
        staff: { connect: { id: staffId } },
        assignedBy,
        version: 1,
      });

      await this.auditService.logAssignmentChange('CREATE', assignment.id, assignedBy, {
        newState: { shiftId, staffId, assignedBy, overrideReason },
      });

      this.realtimeGateway.emitAssignmentChanged(shift.locationId, staffId, assignment);
      return assignment;
    } catch (error) {
      this.logger.error(`Error assigning staff:`, error);
      throw error;
    }
  }

  async unassignStaff(shiftId: string, unassignedBy: string): Promise<void> {
    try {
      const assignment = await this.scheduleRepository.findAssignmentByShift(shiftId);
      if (!assignment) throw new NotFoundException('Assignment not found');

      await this.scheduleRepository.deleteAssignment(assignment.id);

      await this.auditService.logAssignmentChange('DELETE', assignment.id, unassignedBy, {
        previousState: { shiftId, staffId: assignment.staffId },
      });

      this.realtimeGateway.emitAssignmentChanged(assignment.shiftId, assignment.staffId, {
        action: 'unassigned',
      });
    } catch (error) {
      this.logger.error(`Error unassigning staff:`, error);
      throw error;
    }
  }
}
