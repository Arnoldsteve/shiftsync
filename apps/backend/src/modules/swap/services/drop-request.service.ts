import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SwapRepository } from '../repositories/swap.repository';
import { DropRequestRepository } from '../repositories/drop-request.repository';
import { AuditService } from '../../audit/audit.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { PrismaService } from '../../../prisma/prisma.service';
import { DropRequest, DropStatus } from '@prisma/client';

@Injectable()
export class DropRequestService {
  private readonly logger = new Logger(DropRequestService.name);

  constructor(
    private readonly swapRepository: SwapRepository,
    private readonly dropRequestRepository: DropRequestRepository,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Create a drop request (shift offered to any qualified staff)
   * Requirements: 33.1, 33.2, 33.3, 33.4, 33.5
   */
  async createDropRequest(
    shiftId: string,
    requestorId: string,
    reason?: string
  ): Promise<DropRequest> {
    try {
      // Verify requestor is assigned to the shift
      const requestorAssignment = await this.swapRepository.findAssignmentByShiftAndStaff(
        shiftId,
        requestorId
      );

      if (!requestorAssignment) {
        throw new BadRequestException('Requestor is not assigned to this shift');
      }

      // Get shift details
      const shift = await this.prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
          location: true,
        },
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      // Check if there's already a pending drop request for this shift
      const existingDropRequest = await this.dropRequestRepository.findByShiftId(shiftId);
      if (existingDropRequest) {
        throw new BadRequestException('A drop request already exists for this shift');
      }

      // Set expiration time to 24 hours before shift start
      const expiresAt = new Date(shift.startTime);
      expiresAt.setHours(expiresAt.getHours() - 24);

      // Check if expiration time is in the past
      if (expiresAt <= new Date()) {
        throw new BadRequestException(
          'Cannot create drop request: shift starts in less than 24 hours'
        );
      }

      // Create drop request
      const dropRequest = await this.dropRequestRepository.create({
        shiftId,
        requestorId,
        status: DropStatus.PENDING,
        expiresAt,
        reason,
      });

      // Log drop request creation
      await this.auditService.logSwapAction('CREATE_DROP', dropRequest.id, requestorId, {
        newState: {
          shiftId,
          requestorId,
          status: DropStatus.PENDING,
          expiresAt: expiresAt.toISOString(),
        },
      });

      // Emit real-time event
      this.realtimeGateway.emitDropCreated(shift.locationId, dropRequest);

      this.logger.log(`Drop request created for shift ${shiftId} by ${requestorId}`);

      return dropRequest;
    } catch (error) {
      this.logger.error(`Error creating drop request:`, error);
      throw error;
    }
  }

  /**
   * Expire drop requests that have passed their expiration time
   * Requirements: 33.3, 33.5
   */
  async expireDropRequests(): Promise<number> {
    try {
      const expiredRequests = await this.dropRequestRepository.findExpired();
      let expiredCount = 0;

      for (const dropRequest of expiredRequests) {
        // Update status to EXPIRED
        await this.dropRequestRepository.updateStatus(dropRequest.id, DropStatus.EXPIRED);

        // Restore original assignment (it should still be there)
        // The assignment was never removed, so no action needed

        // Log expiration
        await this.auditService.logSwapAction('EXPIRE_DROP', dropRequest.id, 'SYSTEM', {
          previousState: {
            status: DropStatus.PENDING,
          },
          newState: {
            status: DropStatus.EXPIRED,
          },
        });

        // Emit real-time event
        const shift = await this.prisma.shift.findUnique({
          where: { id: dropRequest.shiftId },
        });

        if (shift) {
          this.realtimeGateway.emitDropExpired(shift.locationId, dropRequest);
        }

        // TODO: Notify requestor of expiration (when notification service is implemented)

        expiredCount++;
      }

      if (expiredCount > 0) {
        this.logger.log(`Expired ${expiredCount} drop requests`);
      }

      return expiredCount;
    } catch (error) {
      this.logger.error(`Error expiring drop requests:`, error);
      throw error;
    }
  }

  /**
   * Get available drop requests
   * Requirements: 33.2
   */
  async getAvailableDropRequests(locationIds?: string[]): Promise<DropRequest[]> {
    try {
      return this.dropRequestRepository.findAvailableDropRequests(locationIds);
    } catch (error) {
      this.logger.error(`Error getting available drop requests:`, error);
      throw error;
    }
  }

  /**
   * Get pending request count (swap + drop requests)
   * Requirements: 33.4, 35.2
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
}
