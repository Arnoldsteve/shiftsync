import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { AuditService } from '../../audit/audit.service';
import { CacheService } from '../../cache/cache.service';
import { ConflictService } from '../../conflict/conflict.service';
import { ComplianceService } from '../../compliance/compliance.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { NotificationService } from '../../notification/notification.service';
import { DropRequestRepository } from '../../swap/repositories/drop-request.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { Assignment, DropStatus } from '@prisma/client';

/**
 * Shift Pickup Service
 * Handles staff self-service shift pickup
 * Requirements: 34.1, 34.2, 34.3, 34.4, 34.5
 */
@Injectable()
export class ShiftPickupService {
  private readonly logger = new Logger(ShiftPickupService.name);

  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly conflictService: ConflictService,
    private readonly complianceService: ComplianceService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationService: NotificationService,
    private readonly dropRequestRepository: DropRequestRepository,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Get available shifts for staff pickup
   * Requirements: 34.1, 34.2
   */
  async getAvailableShifts(staffId: string): Promise<any[]> {
    try {
      // Get staff details with skills and certifications
      const staff: any = await this.userRepository.findById(staffId);
      if (!staff) {
        throw new NotFoundException('Staff user not found');
      }

      // Get staff skill IDs
      const staffSkillIds = staff.skills?.map((s: any) => s.skillId) || [];

      // Get staff certified location IDs
      const staffCertifiedLocationIds = staff.certifications?.map((c: any) => c.locationId) || [];

      // Get shift offers for this user from notifications
      const notifications = await this.scheduleRepository.findNotificationsByUserAndType(
        staffId,
        'SHIFT_OFFER'
      );
      const offeredShiftIds = new Set(
        notifications
          .filter((n: any) => !n.isRead && n.metadata?.shiftId)
          .map((n: any) => n.metadata.shiftId)
      );

      // Get unassigned shifts
      const unassignedShifts = await this.scheduleRepository.findUnassignedShifts(
        staffCertifiedLocationIds,
        new Date() // Only future shifts
      );

      // Requirement 42.5: Filter out fully covered shifts (where filled >= required headcount)
      const availableUnassignedShifts = unassignedShifts.filter((shift) => {
        const filledHeadcount = shift.assignments.length;
        return filledHeadcount < shift.requiredHeadcount;
      });

      // Get drop requests
      const dropRequests: any[] =
        await this.dropRequestRepository.findAvailableDropRequests(staffCertifiedLocationIds);

      // Filter unassigned shifts by staff qualifications
      const qualifiedUnassignedShifts = availableUnassignedShifts.filter((shift) => {
        const requiredSkillIds = shift.skills.map((s) => s.skillId);
        return requiredSkillIds.every((skillId) => staffSkillIds.includes(skillId));
      });

      // Filter drop requests by staff qualifications
      const qualifiedDropRequests = dropRequests.filter((dropRequest: any) => {
        const shift = dropRequest.shift;
        const requiredSkillIds = shift.skills?.map((s: any) => s.skillId) || [];
        return requiredSkillIds.every((skillId: string) => staffSkillIds.includes(skillId));
      });

      // Combine and format results
      const availableShifts = [
        ...qualifiedUnassignedShifts.map((shift) => ({
          id: shift.id,
          locationId: shift.locationId,
          locationName: (shift as any).location?.name || 'Unknown Location',
          startTime: shift.startTime.toISOString(),
          endTime: shift.endTime.toISOString(),
          timezone: (shift as any).location?.timezone || 'UTC',
          requiredSkills: shift.skills.map((s) => s.skill.name),
          type: 'unassigned',
          dropRequestId: null,
          offeredToUser: offeredShiftIds.has(shift.id),
        })),
        ...qualifiedDropRequests.map((dropRequest: any) => ({
          id: dropRequest.shift.id,
          locationId: dropRequest.shift.locationId,
          locationName: dropRequest.shift.location?.name || 'Unknown Location',
          startTime: dropRequest.shift.startTime.toISOString(),
          endTime: dropRequest.shift.endTime.toISOString(),
          timezone: dropRequest.shift.location?.timezone || 'UTC',
          requiredSkills: dropRequest.shift.skills?.map((s: any) => s.skill.name) || [],
          type: 'drop_request',
          dropRequestId: dropRequest.id,
          expiresAt: dropRequest.expiresAt.toISOString(),
          offeredToUser: offeredShiftIds.has(dropRequest.shift.id),
        })),
      ];

      // Sort by offeredToUser first, then by start time
      availableShifts.sort((a, b) => {
        if (a.offeredToUser && !b.offeredToUser) return -1;
        if (!a.offeredToUser && b.offeredToUser) return 1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

      return availableShifts;
    } catch (error) {
      this.logger.error(`Error getting available shifts for staff ${staffId}:`, error);
      throw error;
    }
  }

  /**
   * Pick up an available shift
   * Requirements: 34.3, 34.4, 34.5
   */
  async pickupShift(shiftId: string, staffId: string): Promise<Assignment> {
    try {
      // Get shift details
      const shift = await this.scheduleRepository.findShiftById(shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      // Check if shift is already assigned
      const existingAssignment = shift.assignments.find((a) => a.shiftId === shiftId);
      if (existingAssignment) {
        throw new BadRequestException('Shift is already assigned');
      }

      // Requirement 42.2: Check if headcount would be exceeded
      const filledHeadcount = shift.assignments.length;
      if (filledHeadcount >= shift.requiredHeadcount) {
        throw new BadRequestException(
          `Shift headcount limit reached (${shift.requiredHeadcount}/${shift.requiredHeadcount})`
        );
      }

      // Check if this specific staff member is already assigned to this shift
      const staffAlreadyAssigned = shift.assignments.find((a) => a.staffId === staffId);
      if (staffAlreadyAssigned) {
        throw new BadRequestException('You are already assigned to this shift');
      }

      // Get staff details with skills and certifications
      const staff: any = await this.userRepository.findById(staffId);
      if (!staff) {
        throw new NotFoundException('Staff user not found');
      }

      // Verify staff has required skills
      const requiredSkillIds = shift.skills.map((s) => s.skillId);
      const staffSkillIds = staff.skills?.map((s: any) => s.skillId) || [];
      const hasAllSkills = requiredSkillIds.every((skillId) => staffSkillIds.includes(skillId));

      if (!hasAllSkills) {
        throw new BadRequestException('Staff does not have all required skills for this shift');
      }

      // Verify staff has location certification
      const hasCertification = staff.certifications?.some(
        (c: any) => c.locationId === shift.locationId
      );
      if (!hasCertification) {
        throw new BadRequestException('Staff is not certified for this location');
      }

      // Check for conflicts (overlap)
      const conflictResult = await this.conflictService.checkOverlap(
        staffId,
        shift.startTime,
        shift.endTime
      );
      if (conflictResult.hasConflict) {
        throw new BadRequestException(
          `Schedule conflict: You are already working at ${conflictResult.conflictingShifts[0].locationId} during this time`
        );
      }

      // Validate compliance constraints
      const location = await this.scheduleRepository.findLocationById(shift.locationId);
      const tz = location?.timezone || 'UTC';
      const compliance = await this.complianceService.validateAll(
        shift.locationId,
        staffId,
        shift.startTime,
        shift.endTime,
        tz
      );

      const failure = compliance.find((r) => !r.isValid);
      if (failure) {
        throw new BadRequestException(`Compliance violation: ${failure.message}`);
      }

      // Create assignment
      const assignment = await this.scheduleRepository.createAssignment({
        shift: { connect: { id: shiftId } },
        staff: { connect: { id: staffId } },
        assignedBy: staffId, // Self-assigned
        version: 1,
      });

      // Check if this was a drop request and update it
      const dropRequest = await this.dropRequestRepository.findByShiftId(shiftId);
      if (dropRequest) {
        await this.dropRequestRepository.updateStatus(
          dropRequest.id,
          DropStatus.CLAIMED,
          staffId,
          new Date()
        );

        // Log drop request claim
        await this.auditService.logSwapAction('CLAIM_DROP', dropRequest.id, staffId, {
          previousState: {
            status: DropStatus.PENDING,
          },
          newState: {
            status: DropStatus.CLAIMED,
            claimedBy: staffId,
          },
        });

        // Emit real-time event
        this.realtimeGateway.emitDropClaimed(shift.locationId, dropRequest.id, staffId);
      }

      // Log assignment
      await this.auditService.logAssignmentChange('CREATE', assignment.id, staffId, {
        newState: { shiftId, staffId, assignedBy: staffId, type: 'pickup' },
      });

      // Check if this shift was offered to the user and notify managers
      const shiftOfferNotification = await this.scheduleRepository.findNotificationsByUserAndType(
        staffId,
        'SHIFT_OFFER'
      );
      const wasOffered = shiftOfferNotification.some((n: any) => n.metadata?.shiftId === shiftId);

      if (wasOffered) {
        // Find managers for this location and notify them
        const managers = await this.userRepository.findManagersByLocation(shift.locationId);
        const staffName = `${staff.firstName} ${staff.lastName}`;
        const locationName = (shift as any).location?.name || 'Unknown Location';
        const shiftTime = `${shift.startTime.toLocaleString()} - ${shift.endTime.toLocaleTimeString()}`;

        for (const manager of managers) {
          await this.notificationService.createNotification(
            manager.id,
            'SHIFT_OFFER_ACCEPTED',
            'Shift Offer Accepted',
            `${staffName} has accepted the offer for ${locationName} on ${shiftTime}.`,
            {
              shiftId,
              staffId,
              staffName,
              locationName,
              startTime: shift.startTime,
              endTime: shift.endTime,
            }
          );
        }
      }

      // Invalidate cache
      await this.cacheService.invalidateSchedule(shift.locationId);

      // Emit real-time event
      this.realtimeGateway.emitAssignmentChanged(shift.locationId, staffId, assignment);

      this.logger.log(`Staff ${staffId} picked up shift ${shiftId}`);

      return assignment;
    } catch (error) {
      this.logger.error(`Error picking up shift ${shiftId} for staff ${staffId}:`, error);
      throw error;
    }
  }
}
