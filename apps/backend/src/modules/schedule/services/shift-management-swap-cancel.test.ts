import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShiftManagementService } from './shift-management.service';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { AuditService } from '../../audit/audit.service';
import { CacheService } from '../../cache/cache.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { SwapService } from '../../swap/swap.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

/**
 * Test suite for swap cancellation on shift edit
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5
 */
describe('ShiftManagementService - Swap Cancellation on Shift Edit', () => {
  let service: ShiftManagementService;
  let mockScheduleRepository: any;
  let mockAuditService: any;
  let mockCacheService: any;
  let mockRealtimeGateway: any;
  let mockSwapService: any;

  beforeEach(() => {
    mockScheduleRepository = {
      findShiftById: vi.fn(),
      updateShift: vi.fn(),
      createShift: vi.fn(),
      findShiftsByLocation: vi.fn(),
      findShiftsByStaff: vi.fn(),
      findPublishedShiftsByStaff: vi.fn(),
      findStaffByIds: vi.fn(),
    };

    mockAuditService = {
      logShiftChange: vi.fn(),
    };

    mockCacheService = {
      invalidateSchedule: vi.fn(),
    };

    mockRealtimeGateway = {
      emitShiftCreated: vi.fn(),
      emitShiftUpdated: vi.fn(),
    };

    mockSwapService = {
      cancelPendingSwapsForShift: vi.fn(),
    };

    service = new ShiftManagementService(
      mockScheduleRepository,
      mockAuditService,
      mockCacheService,
      mockRealtimeGateway,
      mockSwapService
    );
  });

  describe('updateShift', () => {
    const managerId = 'manager-1';
    const shiftId = 'shift-1';
    const locationId = 'location-1';

    const existingShift = {
      id: shiftId,
      locationId,
      startTime: new Date('2024-01-15T09:00:00Z'),
      endTime: new Date('2024-01-15T17:00:00Z'),
      requiredHeadcount: 1,
      createdBy: managerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublished: false,
      publishedAt: null,
    };

    const updatedShift = {
      ...existingShift,
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T18:00:00Z'),
    };

    it('should cancel pending swap requests when shift is edited', async () => {
      // Arrange
      mockScheduleRepository.findShiftById.mockResolvedValue(existingShift);
      mockSwapService.cancelPendingSwapsForShift.mockResolvedValue(2); // 2 swaps cancelled
      mockScheduleRepository.updateShift.mockResolvedValue(updatedShift);

      // Act
      const result = await service.updateShift(shiftId, managerId, {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T18:00:00Z'),
      });

      // Assert
      expect(mockSwapService.cancelPendingSwapsForShift).toHaveBeenCalledWith(shiftId, managerId);
      expect(result.cancelledSwapsCount).toBe(2);
      expect(result.shift).toEqual(updatedShift);
    });

    it('should cancel swaps BEFORE updating the shift', async () => {
      // Arrange
      const callOrder: string[] = [];
      mockScheduleRepository.findShiftById.mockResolvedValue(existingShift);
      mockSwapService.cancelPendingSwapsForShift.mockImplementation(async () => {
        callOrder.push('cancelSwaps');
        return 1;
      });
      mockScheduleRepository.updateShift.mockImplementation(async () => {
        callOrder.push('updateShift');
        return updatedShift;
      });

      // Act
      await service.updateShift(shiftId, managerId, {
        startTime: new Date('2024-01-15T10:00:00Z'),
      });

      // Assert
      expect(callOrder).toEqual(['cancelSwaps', 'updateShift']);
    });

    it('should proceed with shift edit after cancelling swaps', async () => {
      // Arrange
      mockScheduleRepository.findShiftById.mockResolvedValue(existingShift);
      mockSwapService.cancelPendingSwapsForShift.mockResolvedValue(1);
      mockScheduleRepository.updateShift.mockResolvedValue(updatedShift);

      // Act
      const result = await service.updateShift(shiftId, managerId, {
        startTime: new Date('2024-01-15T10:00:00Z'),
      });

      // Assert
      expect(mockScheduleRepository.updateShift).toHaveBeenCalledWith(shiftId, {
        startTime: new Date('2024-01-15T10:00:00Z'),
      });
      expect(result.shift).toEqual(updatedShift);
    });

    it('should log shift update with cancelled swaps count', async () => {
      // Arrange
      mockScheduleRepository.findShiftById.mockResolvedValue(existingShift);
      mockSwapService.cancelPendingSwapsForShift.mockResolvedValue(3);
      mockScheduleRepository.updateShift.mockResolvedValue(updatedShift);

      // Act
      await service.updateShift(shiftId, managerId, {
        startTime: new Date('2024-01-15T10:00:00Z'),
      });

      // Assert
      expect(mockAuditService.logShiftChange).toHaveBeenCalledWith(
        'UPDATE',
        shiftId,
        managerId,
        expect.objectContaining({
          newState: expect.objectContaining({
            cancelledSwapsCount: 3,
          }),
        })
      );
    });

    it('should invalidate cache for the shift location', async () => {
      // Arrange
      mockScheduleRepository.findShiftById.mockResolvedValue(existingShift);
      mockSwapService.cancelPendingSwapsForShift.mockResolvedValue(0);
      mockScheduleRepository.updateShift.mockResolvedValue(updatedShift);

      // Act
      await service.updateShift(shiftId, managerId, {
        startTime: new Date('2024-01-15T10:00:00Z'),
      });

      // Assert
      expect(mockCacheService.invalidateSchedule).toHaveBeenCalledWith(locationId);
    });

    it('should emit real-time shift updated event', async () => {
      // Arrange
      mockScheduleRepository.findShiftById.mockResolvedValue(existingShift);
      mockSwapService.cancelPendingSwapsForShift.mockResolvedValue(0);
      mockScheduleRepository.updateShift.mockResolvedValue(updatedShift);

      // Act
      await service.updateShift(shiftId, managerId, {
        startTime: new Date('2024-01-15T10:00:00Z'),
      });

      // Assert
      expect(mockRealtimeGateway.emitShiftUpdated).toHaveBeenCalledWith(locationId, updatedShift);
    });

    it('should throw NotFoundException if shift does not exist', async () => {
      // Arrange
      mockScheduleRepository.findShiftById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateShift(shiftId, managerId, {
          startTime: new Date('2024-01-15T10:00:00Z'),
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if manager not authorized for location', async () => {
      // Arrange
      mockScheduleRepository.findShiftById.mockResolvedValue(existingShift);

      // Act & Assert
      await expect(
        service.updateShift(
          shiftId,
          managerId,
          {
            startTime: new Date('2024-01-15T10:00:00Z'),
          },
          ['location-2'] // Manager only authorized for location-2, not location-1
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if end time is before start time', async () => {
      // Arrange
      mockScheduleRepository.findShiftById.mockResolvedValue(existingShift);

      // Act & Assert
      await expect(
        service.updateShift(shiftId, managerId, {
          startTime: new Date('2024-01-15T18:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle zero cancelled swaps gracefully', async () => {
      // Arrange
      mockScheduleRepository.findShiftById.mockResolvedValue(existingShift);
      mockSwapService.cancelPendingSwapsForShift.mockResolvedValue(0); // No swaps to cancel
      mockScheduleRepository.updateShift.mockResolvedValue(updatedShift);

      // Act
      const result = await service.updateShift(shiftId, managerId, {
        requiredHeadcount: 2,
      });

      // Assert
      expect(result.cancelledSwapsCount).toBe(0);
      expect(mockScheduleRepository.updateShift).toHaveBeenCalled();
    });

    it('should invalidate cache for both old and new locations when location changes', async () => {
      // Arrange
      const newLocationId = 'location-2';
      mockScheduleRepository.findShiftById.mockResolvedValue(existingShift);
      mockSwapService.cancelPendingSwapsForShift.mockResolvedValue(1);
      mockScheduleRepository.updateShift.mockResolvedValue({
        ...updatedShift,
        locationId: newLocationId,
      });

      // Act
      await service.updateShift(shiftId, managerId, {
        locationId: newLocationId,
      });

      // Assert
      expect(mockCacheService.invalidateSchedule).toHaveBeenCalledWith(locationId);
      expect(mockCacheService.invalidateSchedule).toHaveBeenCalledWith(newLocationId);
    });
  });
});
