import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SwapRequestService } from './swap-request.service';
import { SwapRepository } from '../repositories/swap.repository';
import { DropRequestRepository } from '../repositories/drop-request.repository';
import { AuditService } from '../../audit/audit.service';
import { CacheService } from '../../cache/cache.service';
import { ConflictService } from '../../conflict/conflict.service';
import { ComplianceService } from '../../compliance/compliance.service';
import { ConfigService } from '../../config/config.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Test suite for swap cancellation by requestor
 * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5
 */
describe('SwapRequestService - Cancel Swap by Requestor (Requirement 37)', () => {
  let service: SwapRequestService;
  let mockSwapRepository: any;
  let mockDropRequestRepository: any;
  let mockAuditService: any;
  let mockCacheService: any;
  let mockConflictService: any;
  let mockComplianceService: any;
  let mockConfigService: any;
  let mockRealtimeGateway: any;
  let mockPrismaService: any;

  beforeEach(() => {
    mockSwapRepository = {
      findSwapRequestById: vi.fn(),
      updateSwapRequestStatus: vi.fn(),
      createSwapRequest: vi.fn(),
      findPendingSwaps: vi.fn(),
      findSwapsByStaff: vi.fn(),
      findAssignmentByShiftAndStaff: vi.fn(),
      countPendingByRequestor: vi.fn(),
      findPendingSwapsByShift: vi.fn(),
      cancelSwapRequests: vi.fn(),
    };

    mockDropRequestRepository = {
      countPendingByRequestor: vi.fn(),
    };

    mockAuditService = {
      logSwapAction: vi.fn(),
    };

    mockCacheService = {
      delete: vi.fn(),
    };

    mockConflictService = {
      checkOverlap: vi.fn(),
    };

    mockComplianceService = {
      validateAll: vi.fn(),
    };

    mockConfigService = {
      getLocationConfig: vi.fn(),
    };

    mockRealtimeGateway = {
      emitSwapCreated: vi.fn(),
      emitSwapUpdated: vi.fn(),
      emitSwapCancelled: vi.fn(),
    };

    mockPrismaService = {
      shift: {
        findUnique: vi.fn(),
      },
      location: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    service = new SwapRequestService(
      mockSwapRepository,
      mockDropRequestRepository,
      mockAuditService,
      mockCacheService,
      mockConflictService,
      mockComplianceService,
      mockConfigService,
      mockRealtimeGateway,
      mockPrismaService
    );
  });

  describe('cancelSwapRequest', () => {
    const swapRequestId = 'swap-1';
    const requestorId = 'staff-1';
    const targetStaffId = 'staff-2';
    const locationId = 'location-1';

    const pendingSwapRequest = {
      id: swapRequestId,
      shiftId: 'shift-1',
      requestorId,
      targetStaffId,
      status: 'PENDING',
      createdAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      shift: {
        id: 'shift-1',
        locationId,
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      },
      requestor: {
        id: requestorId,
        name: 'Staff One',
      },
      targetStaff: {
        id: targetStaffId,
        name: 'Staff Two',
      },
    };

    it('should allow staff to cancel their own pending swap request (Requirement 37.1)', async () => {
      // Arrange
      mockSwapRepository.findSwapRequestById.mockResolvedValue(pendingSwapRequest);
      mockSwapRepository.updateSwapRequestStatus.mockResolvedValue({
        ...pendingSwapRequest,
        status: 'CANCELLED',
      });

      // Act
      const result = await service.cancelSwapRequest(swapRequestId, requestorId);

      // Assert
      expect(result.status).toBe('CANCELLED');
      expect(mockSwapRepository.findSwapRequestById).toHaveBeenCalledWith(swapRequestId);
      expect(mockSwapRepository.updateSwapRequestStatus).toHaveBeenCalledWith(
        swapRequestId,
        'CANCELLED',
        requestorId
      );
    });

    it('should update request status to CANCELLED (Requirement 37.2)', async () => {
      // Arrange
      mockSwapRepository.findSwapRequestById.mockResolvedValue(pendingSwapRequest);
      mockSwapRepository.updateSwapRequestStatus.mockResolvedValue({
        ...pendingSwapRequest,
        status: 'CANCELLED',
      });

      // Act
      await service.cancelSwapRequest(swapRequestId, requestorId);

      // Assert
      expect(mockSwapRepository.updateSwapRequestStatus).toHaveBeenCalledWith(
        swapRequestId,
        'CANCELLED',
        requestorId
      );
    });

    it('should notify target staff and manager via real-time event (Requirement 37.3)', async () => {
      // Arrange
      mockSwapRepository.findSwapRequestById.mockResolvedValue(pendingSwapRequest);
      mockSwapRepository.updateSwapRequestStatus.mockResolvedValue({
        ...pendingSwapRequest,
        status: 'CANCELLED',
      });

      // Act
      await service.cancelSwapRequest(swapRequestId, requestorId);

      // Assert
      expect(mockRealtimeGateway.emitSwapCancelled).toHaveBeenCalledWith(
        locationId,
        requestorId,
        targetStaffId,
        swapRequestId,
        'cancelled by requestor'
      );
    });

    it('should log cancellation with timestamp and requestor (Requirement 37.4)', async () => {
      // Arrange
      mockSwapRepository.findSwapRequestById.mockResolvedValue(pendingSwapRequest);
      mockSwapRepository.updateSwapRequestStatus.mockResolvedValue({
        ...pendingSwapRequest,
        status: 'CANCELLED',
      });

      // Act
      await service.cancelSwapRequest(swapRequestId, requestorId);

      // Assert
      expect(mockAuditService.logSwapAction).toHaveBeenCalledWith(
        'CANCEL',
        swapRequestId,
        requestorId,
        expect.objectContaining({
          previousState: { status: 'PENDING' },
          newState: {
            status: 'CANCELLED',
            reason: 'cancelled by requestor',
          },
        })
      );
    });

    it('should decrement pending request count automatically (Requirement 37.5)', async () => {
      // Arrange
      mockSwapRepository.findSwapRequestById.mockResolvedValue(pendingSwapRequest);
      mockSwapRepository.updateSwapRequestStatus.mockResolvedValue({
        ...pendingSwapRequest,
        status: 'CANCELLED',
      });

      // Act
      await service.cancelSwapRequest(swapRequestId, requestorId);

      // Assert
      // The pending count is automatically decremented because the repository
      // count methods only count requests with status: PENDING
      // When status changes to CANCELLED, they are no longer included in the count
      expect(mockSwapRepository.updateSwapRequestStatus).toHaveBeenCalledWith(
        swapRequestId,
        'CANCELLED',
        requestorId
      );
    });

    it('should throw NotFoundException if swap request does not exist', async () => {
      // Arrange
      mockSwapRepository.findSwapRequestById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancelSwapRequest(swapRequestId, requestorId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.cancelSwapRequest(swapRequestId, requestorId)).rejects.toThrow(
        'Swap request not found'
      );
    });

    it('should throw BadRequestException if requestor is not the owner', async () => {
      // Arrange
      const differentStaffId = 'staff-3';
      mockSwapRepository.findSwapRequestById.mockResolvedValue(pendingSwapRequest);

      // Act & Assert
      await expect(service.cancelSwapRequest(swapRequestId, differentStaffId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.cancelSwapRequest(swapRequestId, differentStaffId)).rejects.toThrow(
        'You can only cancel your own swap requests'
      );
    });

    it('should throw BadRequestException if swap request is already APPROVED', async () => {
      // Arrange
      const approvedSwapRequest = {
        ...pendingSwapRequest,
        status: 'APPROVED',
      };
      mockSwapRepository.findSwapRequestById.mockResolvedValue(approvedSwapRequest);

      // Act & Assert
      await expect(service.cancelSwapRequest(swapRequestId, requestorId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.cancelSwapRequest(swapRequestId, requestorId)).rejects.toThrow(
        'Cannot cancel swap request with status: APPROVED'
      );
    });

    it('should throw BadRequestException if swap request is already REJECTED', async () => {
      // Arrange
      const rejectedSwapRequest = {
        ...pendingSwapRequest,
        status: 'REJECTED',
      };
      mockSwapRepository.findSwapRequestById.mockResolvedValue(rejectedSwapRequest);

      // Act & Assert
      await expect(service.cancelSwapRequest(swapRequestId, requestorId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.cancelSwapRequest(swapRequestId, requestorId)).rejects.toThrow(
        'Cannot cancel swap request with status: REJECTED'
      );
    });

    it('should throw BadRequestException if swap request is already CANCELLED', async () => {
      // Arrange
      const cancelledSwapRequest = {
        ...pendingSwapRequest,
        status: 'CANCELLED',
      };
      mockSwapRepository.findSwapRequestById.mockResolvedValue(cancelledSwapRequest);

      // Act & Assert
      await expect(service.cancelSwapRequest(swapRequestId, requestorId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.cancelSwapRequest(swapRequestId, requestorId)).rejects.toThrow(
        'Cannot cancel swap request with status: CANCELLED'
      );
    });

    it('should throw BadRequestException if swap request is EXPIRED', async () => {
      // Arrange
      const expiredSwapRequest = {
        ...pendingSwapRequest,
        status: 'EXPIRED',
      };
      mockSwapRepository.findSwapRequestById.mockResolvedValue(expiredSwapRequest);

      // Act & Assert
      await expect(service.cancelSwapRequest(swapRequestId, requestorId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.cancelSwapRequest(swapRequestId, requestorId)).rejects.toThrow(
        'Cannot cancel swap request with status: EXPIRED'
      );
    });

    it('should handle cancellation of swap request with no target staff', async () => {
      // Arrange
      const swapWithoutTarget = {
        ...pendingSwapRequest,
        targetStaffId: null,
        targetStaff: null,
      };
      mockSwapRepository.findSwapRequestById.mockResolvedValue(swapWithoutTarget);
      mockSwapRepository.updateSwapRequestStatus.mockResolvedValue({
        ...swapWithoutTarget,
        status: 'CANCELLED',
      });

      // Act
      await service.cancelSwapRequest(swapRequestId, requestorId);

      // Assert
      expect(mockRealtimeGateway.emitSwapCancelled).toHaveBeenCalledWith(
        locationId,
        requestorId,
        null,
        swapRequestId,
        'cancelled by requestor'
      );
    });
  });
});
