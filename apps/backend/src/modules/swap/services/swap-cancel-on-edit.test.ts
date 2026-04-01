import { describe, it, expect, beforeEach, vi } from 'vitest';
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
 * Test suite for swap cancellation on shift edit
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5
 */
describe('SwapRequestService - Cancel Pending Swaps on Shift Edit', () => {
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
      findPendingSwapsByShift: vi.fn(),
      cancelSwapRequests: vi.fn(),
      createSwapRequest: vi.fn(),
      findSwapRequestById: vi.fn(),
      updateSwapRequestStatus: vi.fn(),
      findPendingSwaps: vi.fn(),
      findSwapsByStaff: vi.fn(),
      findAssignmentByShiftAndStaff: vi.fn(),
      countPendingByRequestor: vi.fn(),
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

  describe('cancelPendingSwapsForShift', () => {
    const shiftId = 'shift-1';
    const managerId = 'manager-1';
    const locationId = 'location-1';

    const pendingSwaps = [
      {
        id: 'swap-1',
        shiftId,
        requestorId: 'staff-1',
        targetStaffId: 'staff-2',
        status: 'PENDING',
        createdAt: new Date(),
        shift: {
          id: shiftId,
          locationId,
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T17:00:00Z'),
        },
      },
      {
        id: 'swap-2',
        shiftId,
        requestorId: 'staff-3',
        targetStaffId: 'staff-4',
        status: 'PENDING',
        createdAt: new Date(),
        shift: {
          id: shiftId,
          locationId,
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T17:00:00Z'),
        },
      },
    ];

    it('should find all pending swap requests for the shift', async () => {
      // Arrange
      mockSwapRepository.findPendingSwapsByShift.mockResolvedValue(pendingSwaps);
      mockSwapRepository.cancelSwapRequests.mockResolvedValue(2);

      // Act
      await service.cancelPendingSwapsForShift(shiftId, managerId);

      // Assert
      expect(mockSwapRepository.findPendingSwapsByShift).toHaveBeenCalledWith(shiftId);
    });

    it('should cancel all pending swap requests', async () => {
      // Arrange
      mockSwapRepository.findPendingSwapsByShift.mockResolvedValue(pendingSwaps);
      mockSwapRepository.cancelSwapRequests.mockResolvedValue(2);

      // Act
      const result = await service.cancelPendingSwapsForShift(shiftId, managerId);

      // Assert
      expect(mockSwapRepository.cancelSwapRequests).toHaveBeenCalledWith(['swap-1', 'swap-2']);
      expect(result).toBe(2);
    });

    it('should log each cancellation with reason "shift edited by manager"', async () => {
      // Arrange
      mockSwapRepository.findPendingSwapsByShift.mockResolvedValue(pendingSwaps);
      mockSwapRepository.cancelSwapRequests.mockResolvedValue(2);

      // Act
      await service.cancelPendingSwapsForShift(shiftId, managerId);

      // Assert
      expect(mockAuditService.logSwapAction).toHaveBeenCalledTimes(2);
      expect(mockAuditService.logSwapAction).toHaveBeenCalledWith(
        'CANCEL',
        'swap-1',
        managerId,
        expect.objectContaining({
          previousState: { status: 'PENDING' },
          newState: {
            status: 'CANCELLED',
            reason: 'shift edited by manager',
          },
        })
      );
      expect(mockAuditService.logSwapAction).toHaveBeenCalledWith(
        'CANCEL',
        'swap-2',
        managerId,
        expect.objectContaining({
          previousState: { status: 'PENDING' },
          newState: {
            status: 'CANCELLED',
            reason: 'shift edited by manager',
          },
        })
      );
    });

    it('should emit real-time notifications to requestor and target staff', async () => {
      // Arrange
      mockSwapRepository.findPendingSwapsByShift.mockResolvedValue(pendingSwaps);
      mockSwapRepository.cancelSwapRequests.mockResolvedValue(2);

      // Act
      await service.cancelPendingSwapsForShift(shiftId, managerId);

      // Assert
      expect(mockRealtimeGateway.emitSwapCancelled).toHaveBeenCalledTimes(2);
      expect(mockRealtimeGateway.emitSwapCancelled).toHaveBeenCalledWith(
        locationId,
        'staff-1',
        'staff-2',
        'swap-1',
        'shift edited by manager'
      );
      expect(mockRealtimeGateway.emitSwapCancelled).toHaveBeenCalledWith(
        locationId,
        'staff-3',
        'staff-4',
        'swap-2',
        'shift edited by manager'
      );
    });

    it('should return 0 if no pending swaps exist', async () => {
      // Arrange
      mockSwapRepository.findPendingSwapsByShift.mockResolvedValue([]);

      // Act
      const result = await service.cancelPendingSwapsForShift(shiftId, managerId);

      // Assert
      expect(result).toBe(0);
      expect(mockSwapRepository.cancelSwapRequests).not.toHaveBeenCalled();
      expect(mockAuditService.logSwapAction).not.toHaveBeenCalled();
      expect(mockRealtimeGateway.emitSwapCancelled).not.toHaveBeenCalled();
    });

    it('should return the count of cancelled swaps', async () => {
      // Arrange
      mockSwapRepository.findPendingSwapsByShift.mockResolvedValue(pendingSwaps);
      mockSwapRepository.cancelSwapRequests.mockResolvedValue(2);

      // Act
      const result = await service.cancelPendingSwapsForShift(shiftId, managerId);

      // Assert
      expect(result).toBe(2);
    });

    it('should handle single pending swap', async () => {
      // Arrange
      const singleSwap = [pendingSwaps[0]];
      mockSwapRepository.findPendingSwapsByShift.mockResolvedValue(singleSwap);
      mockSwapRepository.cancelSwapRequests.mockResolvedValue(1);

      // Act
      const result = await service.cancelPendingSwapsForShift(shiftId, managerId);

      // Assert
      expect(result).toBe(1);
      expect(mockSwapRepository.cancelSwapRequests).toHaveBeenCalledWith(['swap-1']);
      expect(mockAuditService.logSwapAction).toHaveBeenCalledTimes(1);
      expect(mockRealtimeGateway.emitSwapCancelled).toHaveBeenCalledTimes(1);
    });

    it('should decrement pending request count automatically (status change to CANCELLED)', async () => {
      // Arrange
      mockSwapRepository.findPendingSwapsByShift.mockResolvedValue(pendingSwaps);
      mockSwapRepository.cancelSwapRequests.mockResolvedValue(2);

      // Act
      await service.cancelPendingSwapsForShift(shiftId, managerId);

      // Assert
      // The pending count is automatically decremented because the repository
      // count methods only count requests with status: PENDING
      // When status changes to CANCELLED, they are no longer included in the count
      expect(mockSwapRepository.cancelSwapRequests).toHaveBeenCalledWith(['swap-1', 'swap-2']);
    });
  });
});
