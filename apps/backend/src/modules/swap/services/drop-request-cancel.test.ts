import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DropRequestService } from './drop-request.service';
import { DropStatus } from '@prisma/client';

describe('DropRequestService - Cancel Drop Request', () => {
  let service: DropRequestService;
  let mockDropRequestRepository: any;
  let mockAuditService: any;
  let mockRealtimeGateway: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockDropRequestRepository = {
      findById: vi.fn(),
      updateStatus: vi.fn(),
    };

    mockAuditService = {
      logSwapAction: vi.fn(),
    };

    mockRealtimeGateway = {
      emitDropCancelled: vi.fn(),
    };

    mockPrisma = {
      shift: {
        findUnique: vi.fn(),
      },
    };

    service = new DropRequestService(
      {} as any, // swapRepository
      mockDropRequestRepository,
      mockAuditService,
      {} as any, // configService
      mockRealtimeGateway,
      mockPrisma
    );
  });

  describe('cancelDropRequest', () => {
    it('should cancel a pending drop request by the requestor', async () => {
      const dropRequestId = 'drop-1';
      const requestorId = 'user-1';
      const shiftId = 'shift-1';
      const locationId = 'location-1';

      const mockDropRequest = {
        id: dropRequestId,
        shiftId,
        requestorId,
        status: DropStatus.PENDING,
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      const mockShift = {
        id: shiftId,
        locationId,
        startTime: new Date(),
        endTime: new Date(),
      };

      const mockCancelledRequest = {
        ...mockDropRequest,
        status: DropStatus.CANCELLED,
      };

      mockDropRequestRepository.findById.mockResolvedValue(mockDropRequest);
      mockDropRequestRepository.updateStatus.mockResolvedValue(mockCancelledRequest);
      mockPrisma.shift.findUnique.mockResolvedValue(mockShift);

      const result = await service.cancelDropRequest(dropRequestId, requestorId);

      expect(result.status).toBe(DropStatus.CANCELLED);
      expect(mockDropRequestRepository.findById).toHaveBeenCalledWith(dropRequestId);
      expect(mockDropRequestRepository.updateStatus).toHaveBeenCalledWith(
        dropRequestId,
        DropStatus.CANCELLED
      );
      expect(mockAuditService.logSwapAction).toHaveBeenCalledWith(
        'CANCEL',
        dropRequestId,
        requestorId,
        expect.objectContaining({
          previousState: { status: DropStatus.PENDING },
          newState: { status: DropStatus.CANCELLED },
        })
      );
      expect(mockRealtimeGateway.emitDropCancelled).toHaveBeenCalledWith(
        locationId,
        dropRequestId,
        'Cancelled by requestor'
      );
    });

    it('should throw NotFoundException if drop request does not exist', async () => {
      mockDropRequestRepository.findById.mockResolvedValue(null);

      await expect(service.cancelDropRequest('drop-1', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if requestor does not own the drop request', async () => {
      const mockDropRequest = {
        id: 'drop-1',
        shiftId: 'shift-1',
        requestorId: 'user-1',
        status: DropStatus.PENDING,
      };

      mockDropRequestRepository.findById.mockResolvedValue(mockDropRequest);

      await expect(service.cancelDropRequest('drop-1', 'user-2')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.cancelDropRequest('drop-1', 'user-2')).rejects.toThrow(
        'You can only cancel your own drop requests'
      );
    });

    it('should throw BadRequestException if drop request is not pending', async () => {
      const mockDropRequest = {
        id: 'drop-1',
        shiftId: 'shift-1',
        requestorId: 'user-1',
        status: DropStatus.CLAIMED,
      };

      mockDropRequestRepository.findById.mockResolvedValue(mockDropRequest);

      await expect(service.cancelDropRequest('drop-1', 'user-1')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.cancelDropRequest('drop-1', 'user-1')).rejects.toThrow(
        'Cannot cancel drop request with status: CLAIMED'
      );
    });
  });
});
