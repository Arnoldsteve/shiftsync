import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SwapRepository } from './repositories/swap.repository';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { ConflictService } from '../conflict/conflict.service';
import { ComplianceService } from '../compliance/compliance.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { SwapRequest } from '@prisma/client';
import { SwapRequestWithDetails } from './interfaces';

@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);

  constructor(
    private readonly swapRepository: SwapRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly conflictService: ConflictService,
    private readonly complianceService: ComplianceService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Create a swap request
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
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

      // TODO: Verify target staff has required skills (will implement with User Service integration)
      // TODO: Verify target staff has location certification (will implement with User Service integration)

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
      return this.swapRepository.findPendingSwaps(locationId);
    } catch (error) {
      this.logger.error(`Error getting pending swaps:`, error);
      throw error;
    }
  }

  /**
   * Get swap requests by staff
   * Requirements: 8.1
   */
  async getSwapsByStaff(staffId: string): Promise<SwapRequestWithDetails[]> {
    try {
      return this.swapRepository.findSwapsByStaff(staffId);
    } catch (error) {
      this.logger.error(`Error getting swaps for staff ${staffId}:`, error);
      throw error;
    }
  }
}
