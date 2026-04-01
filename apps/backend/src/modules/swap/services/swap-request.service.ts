import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SwapRepository } from '../repositories/swap.repository';
import { DropRequestRepository } from '../repositories/drop-request.repository';
import { AuditService } from '../../audit/audit.service';
import { CacheService } from '../../cache/cache.service';
import { ConflictService } from '../../conflict/conflict.service';
import { ComplianceService } from '../../compliance/compliance.service';
import { ConfigService } from '../../config/config.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SwapRequest } from '@prisma/client';
import { SwapRequestWithDetails } from '../interfaces';

@Injectable()
export class SwapRequestService {
  private readonly logger = new Logger(SwapRequestService.name);

  constructor(
    private readonly swapRepository: SwapRepository,
    private readonly dropRequestRepository: DropRequestRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly conflictService: ConflictService,
    private readonly complianceService: ComplianceService,
    private readonly configService: ConfigService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Create a swap request
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 35.1, 35.2, 35.3
   */
  async createSwapRequest(
    shiftId: string,
    requestorId: string,
    targetStaffId: string
  ): Promise<SwapRequest> {
    try {
      // Verify requestor is assigned to the shift
      const requestorAssignment = await this.swapRepository.findAssignmentByShiftAndStaff(
        shiftId,
        requestorId
      );

      if (!requestorAssignment) {
        throw new BadRequestException('Requestor is not assigned to this shift');
      }

      // Get shift details to verify target staff qualifications
      const shift = await this.prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      // Check pending request limit (Requirement 35.1, 35.2, 35.3)
      const pendingCount = await this.getPendingRequestCount(requestorId);
      const locationConfig = await this.configService.getLocationConfig(shift.locationId);
      const maxPendingRequests = locationConfig.maxPendingRequests;

      if (pendingCount >= maxPendingRequests) {
        throw new BadRequestException(
          `Cannot create swap request: you have reached the maximum of ${maxPendingRequests} pending requests. Please wait for existing requests to be processed.`
        );
      }

      // Verify target staff has required skills (Requirement 7.2)
      const requiredSkillIds = shift.skills.map((s) => s.skillId);
      const targetStaff = await this.prisma.user.findUnique({
        where: { id: targetStaffId },
        include: {
          skills: true,
          certifications: true,
        },
      });

      if (!targetStaff) {
        throw new NotFoundException('Target staff not found');
      }

      const targetSkillIds = targetStaff.skills.map((s) => s.skillId);
      const missingSkills = requiredSkillIds.filter((skillId) => !targetSkillIds.includes(skillId));

      if (missingSkills.length > 0) {
        const missingSkillNames = shift.skills
          .filter((s) => missingSkills.includes(s.skillId))
          .map((s) => s.skill.name);
        throw new BadRequestException(
          `Target staff does not have required skills: ${missingSkillNames.join(', ')}`
        );
      }

      // Verify target staff has location certification (Requirement 7.2)
      const hasCertification = targetStaff.certifications.some(
        (cert) => cert.locationId === shift.locationId
      );

      if (!hasCertification) {
        throw new BadRequestException('Target staff is not certified for this location');
      }

      // Create swap request with initial status "pending"
      const swapRequest = await this.swapRepository.createSwapRequest({
        shift: {
          connect: { id: shiftId },
        },
        requestor: {
          connect: { id: requestorId },
        },
        targetStaff: {
          connect: { id: targetStaffId },
        },
        status: 'PENDING',
      });

      // Log swap request creation
      await this.auditService.logSwapAction('CREATE', swapRequest.id, requestorId, {
        newState: {
          shiftId,
          requestorId,
          targetStaffId,
          status: 'PENDING',
        },
      });

      // Get manager for this location to notify them
      const managers = await this.prisma.user.findMany({
        where: {
          role: 'MANAGER',
          managerLocations: {
            some: {
              locationId: shift.locationId,
            },
          },
        },
      });

      // Notify target staff and managers
      if (managers.length > 0) {
        await this.notificationService.notifySwapRequest(
          requestorId,
          targetStaffId,
          managers[0].id,
          swapRequest.id,
          'created'
        );
      }

      // Emit real-time event
      if (shift) {
        this.realtimeGateway.emitSwapCreated(
          shift.locationId,
          requestorId,
          targetStaffId,
          swapRequest
        );
      }

      return swapRequest;
    } catch (error) {
      this.logger.error(`Error creating swap request:`, error);
      throw error;
    }
  }

  /**
   * Approve a swap request
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 26.1, 26.2, 26.3, 26.4
   */
  async approveSwap(swapRequestId: string, approverId: string): Promise<SwapRequest> {
    try {
      const swapRequest = await this.swapRepository.findSwapRequestById(swapRequestId);
      if (!swapRequest) {
        throw new NotFoundException('Swap request not found');
      }

      if (swapRequest.status !== 'PENDING') {
        throw new BadRequestException('Swap request is not pending');
      }

      const shift = swapRequest.shift;

      // Re-validate all scheduling constraints for target staff
      // Check for overlapping shifts
      const conflictResult = await this.conflictService.checkOverlap(
        swapRequest.targetStaffId,
        shift.startTime,
        shift.endTime,
        shift.id // Exclude this shift from overlap check
      );

      if (conflictResult.hasConflict) {
        throw new BadRequestException(
          `Target staff has overlapping shifts: ${conflictResult.conflictingShifts.length} conflict(s) found`
        );
      }

      // Get location for timezone
      const location = await this.prisma.location.findUnique({
        where: { id: shift.locationId },
      });
      const staffTimezone = location?.timezone || 'UTC';

      // Validate compliance rules
      const complianceResults = await this.complianceService.validateAll(
        shift.locationId,
        swapRequest.targetStaffId,
        shift.startTime,
        shift.endTime,
        staffTimezone
      );

      const failedValidation = complianceResults.find((result) => !result.isValid);
      if (failedValidation) {
        throw new BadRequestException(`Compliance validation failed: ${failedValidation.message}`);
      }

      // Use database transaction for atomic assignment update
      const result = await this.prisma.$transaction(async (tx) => {
        // Remove original assignment
        await tx.assignment.deleteMany({
          where: {
            shiftId: shift.id,
            staffId: swapRequest.requestorId,
          },
        });

        // Create new assignment for target staff
        await tx.assignment.create({
          data: {
            shiftId: shift.id,
            staffId: swapRequest.targetStaffId,
            assignedBy: approverId,
            version: 1,
          },
        });

        // Update swap request status
        const updatedSwapRequest = await tx.swapRequest.update({
          where: { id: swapRequestId },
          data: {
            status: 'APPROVED',
            reviewedBy: approverId,
            reviewedAt: new Date(),
          },
        });

        return updatedSwapRequest;
      });

      // Log swap approval
      await this.auditService.logSwapAction('APPROVE', swapRequestId, approverId, {
        previousState: {
          status: 'PENDING',
          requestorId: swapRequest.requestorId,
        },
        newState: {
          status: 'APPROVED',
          targetStaffId: swapRequest.targetStaffId,
          reviewedBy: approverId,
        },
      });

      // Invalidate cache for both staff members and schedule
      await this.cacheService.delete(`schedule:staff:${swapRequest.requestorId}`);
      await this.cacheService.delete(`schedule:staff:${swapRequest.targetStaffId}`);
      await this.cacheService.delete(`schedule:location:${shift.locationId}`);

      // Emit real-time event
      this.realtimeGateway.emitSwapUpdated(
        shift.locationId,
        swapRequest.requestorId,
        swapRequest.targetStaffId,
        result
      );

      return result;
    } catch (error) {
      this.logger.error(`Error approving swap request:`, error);
      throw error;
    }
  }

  /**
   * Reject a swap request
   * Requirements: 8.5
   */
  async rejectSwap(
    swapRequestId: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<SwapRequest> {
    try {
      const swapRequest = await this.swapRepository.findSwapRequestById(swapRequestId);
      if (!swapRequest) {
        throw new NotFoundException('Swap request not found');
      }

      if (swapRequest.status !== 'PENDING') {
        throw new BadRequestException('Swap request is not pending');
      }

      const updatedSwapRequest = await this.swapRepository.updateSwapRequestStatus(
        swapRequestId,
        'REJECTED',
        rejectedBy,
        rejectionReason
      );

      // Log swap rejection
      await this.auditService.logSwapAction('REJECT', swapRequestId, rejectedBy, {
        previousState: {
          status: 'PENDING',
        },
        newState: {
          status: 'REJECTED',
          rejectionReason,
        },
      });

      // Emit real-time event
      const shift = await this.prisma.shift.findUnique({
        where: { id: swapRequest.shiftId },
      });
      if (shift) {
        this.realtimeGateway.emitSwapUpdated(
          shift.locationId,
          swapRequest.requestorId,
          swapRequest.targetStaffId,
          updatedSwapRequest
        );
      }

      return updatedSwapRequest;
    } catch (error) {
      this.logger.error(`Error rejecting swap request:`, error);
      throw error;
    }
  }

  /**
   * Get pending swap requests
   * Requirements: 8.1
   */
  async getPendingSwaps(locationId?: string): Promise<SwapRequestWithDetails[]> {
    try {
      const swaps = await this.swapRepository.findPendingSwaps(locationId);

      // Transform to include names
      return swaps.map((swap) => ({
        ...swap,
        requestorName: `${swap.requestor.firstName} ${swap.requestor.lastName}`,
        targetStaffName: `${swap.targetStaff.firstName} ${swap.targetStaff.lastName}`,
      })) as SwapRequestWithDetails[];
    } catch (error) {
      this.logger.error(`Error getting pending swaps:`, error);
      throw error;
    }
  }

  /**
   * Get swap requests by staff
   * Requirements: 8.1
   */
  async getSwapsByStaff(staffId: string): Promise<any[]> {
    try {
      const swaps = await this.swapRepository.findSwapsByStaff(staffId);

      // For each swap, find the target staff's shift (what they would trade)
      const enrichedSwaps = await Promise.all(
        swaps.map(async (swap) => {
          // Find target staff's shift at the same time as the requested shift
          const targetShift = await this.prisma.assignment.findFirst({
            where: {
              staffId: swap.targetStaffId,
              shift: {
                startTime: {
                  gte: new Date(swap.shift.startTime.getTime() - 24 * 60 * 60 * 1000), // Within 24 hours
                  lte: new Date(swap.shift.startTime.getTime() + 24 * 60 * 60 * 1000),
                },
              },
            },
            include: {
              shift: {
                include: {
                  location: true,
                  skills: {
                    include: {
                      skill: true,
                    },
                  },
                },
              },
            },
          });

          return {
            ...swap,
            requestorName: `${swap.requestor.firstName} ${swap.requestor.lastName}`,
            targetStaffName: `${swap.targetStaff.firstName} ${swap.targetStaff.lastName}`,
            targetShift: targetShift?.shift || null,
          };
        })
      );

      return enrichedSwaps;
    } catch (error) {
      this.logger.error(`Error getting swaps for staff ${staffId}:`, error);
      throw error;
    }
  }

  /**
   * Get pending request count (swap + drop requests)
   * Requirements: 35.2
   */
  async getPendingRequestCount(staffId: string): Promise<number> {
    try {
      const swapCount = await this.swapRepository.countPendingByRequestor(staffId);
      const dropCount = await this.dropRequestRepository.countPendingByRequestor(staffId);
      return swapCount + dropCount;
    } catch (error) {
      this.logger.error(`Error getting pending request count for staff ${staffId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel all pending swap requests for a shift
   * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5
   */
  async cancelPendingSwapsForShift(shiftId: string, cancelledBy: string): Promise<number> {
    try {
      // Find all pending swap requests for this shift
      const pendingSwaps = await this.swapRepository.findPendingSwapsByShift(shiftId);

      if (pendingSwaps.length === 0) {
        return 0;
      }

      // Cancel all pending swaps
      const swapRequestIds = pendingSwaps.map((swap) => swap.id);
      const cancelledCount = await this.swapRepository.cancelSwapRequests(swapRequestIds);

      // Log each cancellation with reason "shift edited by manager"
      for (const swap of pendingSwaps) {
        await this.auditService.logSwapAction('CANCEL', swap.id, cancelledBy, {
          previousState: {
            status: 'PENDING',
          },
          newState: {
            status: 'CANCELLED',
            reason: 'shift edited by manager',
          },
        });

        // Emit real-time notification to requestor and target staff
        this.realtimeGateway.emitSwapCancelled(
          swap.shift.locationId,
          swap.requestorId,
          swap.targetStaffId,
          swap.id,
          'shift edited by manager'
        );
      }

      this.logger.log(
        `Cancelled ${cancelledCount} pending swap request(s) for shift ${shiftId} due to shift edit`
      );

      return cancelledCount;
    } catch (error) {
      this.logger.error(`Error cancelling pending swaps for shift ${shiftId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a swap request by the requestor
   * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5
   */
  async cancelSwapRequest(swapRequestId: string, requestorId: string): Promise<SwapRequest> {
    try {
      // Find the swap request
      const swapRequest = await this.swapRepository.findSwapRequestById(swapRequestId);
      if (!swapRequest) {
        throw new NotFoundException('Swap request not found');
      }

      // Validate requestor is the owner of the swap request
      if (swapRequest.requestorId !== requestorId) {
        throw new BadRequestException('You can only cancel your own swap requests');
      }

      // Validate swap request is in PENDING status
      if (swapRequest.status !== 'PENDING') {
        throw new BadRequestException(
          `Cannot cancel swap request with status: ${swapRequest.status}`
        );
      }

      // Update status to CANCELLED
      const updatedSwapRequest = await this.swapRepository.updateSwapRequestStatus(
        swapRequestId,
        'CANCELLED',
        requestorId
      );

      // Log cancellation with timestamp and requestor
      await this.auditService.logSwapAction('CANCEL', swapRequestId, requestorId, {
        previousState: {
          status: 'PENDING',
        },
        newState: {
          status: 'CANCELLED',
          reason: 'cancelled by requestor',
        },
      });

      // Emit real-time swap:cancelled event
      this.realtimeGateway.emitSwapCancelled(
        swapRequest.shift.locationId,
        swapRequest.requestorId,
        swapRequest.targetStaffId,
        swapRequestId,
        'cancelled by requestor'
      );

      this.logger.log(`Swap request ${swapRequestId} cancelled by requestor ${requestorId}`);

      // Pending count will automatically decrement (CANCELLED excluded from PENDING count)
      return updatedSwapRequest;
    } catch (error) {
      this.logger.error(`Error cancelling swap request ${swapRequestId}:`, error);
      throw error;
    }
  }

  /**
   * Accept a swap request by the target staff
   * Requirements: 7.6
   * This validates skills/certifications and queues for manager approval
   */
  async acceptSwapRequest(swapRequestId: string, targetStaffId: string): Promise<SwapRequest> {
    try {
      const swapRequest = await this.swapRepository.findSwapRequestById(swapRequestId);
      if (!swapRequest) {
        throw new NotFoundException('Swap request not found');
      }

      // Validate target staff is the recipient
      if (swapRequest.targetStaffId !== targetStaffId) {
        throw new BadRequestException('You can only accept swap requests sent to you');
      }

      // Validate swap request is in PENDING status
      if (swapRequest.status !== 'PENDING') {
        throw new BadRequestException(
          `Cannot accept swap request with status: ${swapRequest.status}`
        );
      }

      // Get shift details
      const shift = await this.prisma.shift.findUnique({
        where: { id: swapRequest.shiftId },
        include: {
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      // Re-validate target staff still has required skills
      const requiredSkillIds = shift.skills.map((s) => s.skillId);
      const targetStaff = await this.prisma.user.findUnique({
        where: { id: targetStaffId },
        include: {
          skills: true,
          certifications: true,
        },
      });

      if (!targetStaff) {
        throw new NotFoundException('Target staff not found');
      }

      const targetSkillIds = targetStaff.skills.map((s) => s.skillId);
      const missingSkills = requiredSkillIds.filter((skillId) => !targetSkillIds.includes(skillId));

      if (missingSkills.length > 0) {
        const missingSkillNames = shift.skills
          .filter((s) => missingSkills.includes(s.skillId))
          .map((s) => s.skill.name);
        throw new BadRequestException(
          `You no longer have required skills: ${missingSkillNames.join(', ')}`
        );
      }

      // Re-validate location certification
      const hasCertification = targetStaff.certifications.some(
        (cert) => cert.locationId === shift.locationId
      );

      if (!hasCertification) {
        throw new BadRequestException('You are no longer certified for this location');
      }

      // Update swap request to mark target staff acceptance
      const updatedSwapRequest = await this.prisma.swapRequest.update({
        where: { id: swapRequestId },
        data: {
          targetStaffAcceptedAt: new Date(),
        },
      });

      this.logger.log(`Swap request ${swapRequestId} accepted by target staff ${targetStaffId}`);

      return updatedSwapRequest;
    } catch (error) {
      this.logger.error(`Error accepting swap request ${swapRequestId}:`, error);
      throw error;
    }
  }

  /**
   * Decline a swap request by the target staff
   * Requirements: 7.6
   */
  async declineSwapRequest(swapRequestId: string, targetStaffId: string): Promise<SwapRequest> {
    try {
      const swapRequest = await this.swapRepository.findSwapRequestById(swapRequestId);
      if (!swapRequest) {
        throw new NotFoundException('Swap request not found');
      }

      // Validate target staff is the recipient
      if (swapRequest.targetStaffId !== targetStaffId) {
        throw new BadRequestException('You can only decline swap requests sent to you');
      }

      // Validate swap request is in PENDING status
      if (swapRequest.status !== 'PENDING') {
        throw new BadRequestException(
          `Cannot decline swap request with status: ${swapRequest.status}`
        );
      }

      // Update status to REJECTED (declined by target staff)
      const updatedSwapRequest = await this.swapRepository.updateSwapRequestStatus(
        swapRequestId,
        'REJECTED',
        targetStaffId,
        'Declined by target staff'
      );

      // Log decline
      await this.auditService.logSwapAction('REJECT', swapRequestId, targetStaffId, {
        previousState: {
          status: 'PENDING',
        },
        newState: {
          status: 'REJECTED',
          rejectionReason: 'Declined by target staff',
        },
      });

      // Emit real-time event
      const shift = await this.prisma.shift.findUnique({
        where: { id: swapRequest.shiftId },
      });
      if (shift) {
        this.realtimeGateway.emitSwapUpdated(
          shift.locationId,
          swapRequest.requestorId,
          swapRequest.targetStaffId,
          updatedSwapRequest
        );
      }

      this.logger.log(`Swap request ${swapRequestId} declined by target staff ${targetStaffId}`);

      return updatedSwapRequest;
    } catch (error) {
      this.logger.error(`Error declining swap request ${swapRequestId}:`, error);
      throw error;
    }
  }
}
