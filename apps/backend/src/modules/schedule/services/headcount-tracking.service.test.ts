import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HeadcountTrackingService } from './headcount-tracking.service';
import { ScheduleRepository } from '../repositories/schedule.repository';

describe('HeadcountTrackingService', () => {
  let service: HeadcountTrackingService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findShiftById: vi.fn(),
    };
    service = new HeadcountTrackingService(mockRepository);
  });

  describe('getShiftHeadcountStatus', () => {
    it('should return correct status for unfilled shift', async () => {
      // Arrange
      const shiftId = 'shift-1';
      const mockShift = {
        id: shiftId,
        requiredHeadcount: 3,
        assignments: [],
      };
      mockRepository.findShiftById.mockResolvedValue(mockShift);

      // Act
      const result = await service.getShiftHeadcountStatus(shiftId);

      // Assert
      expect(result).toEqual({
        shiftId,
        requiredHeadcount: 3,
        filledHeadcount: 0,
        isFullyCovered: false,
        isPartiallyCovered: false,
      });
    });

    it('should return correct status for partially filled shift', async () => {
      // Arrange
      const shiftId = 'shift-2';
      const mockShift = {
        id: shiftId,
        requiredHeadcount: 3,
        assignments: [
          { id: 'a1', staffId: 's1' },
          { id: 'a2', staffId: 's2' },
        ],
      };
      mockRepository.findShiftById.mockResolvedValue(mockShift);

      // Act
      const result = await service.getShiftHeadcountStatus(shiftId);

      // Assert
      expect(result).toEqual({
        shiftId,
        requiredHeadcount: 3,
        filledHeadcount: 2,
        isFullyCovered: false,
        isPartiallyCovered: true,
      });
    });

    it('should return correct status for fully covered shift', async () => {
      // Arrange
      const shiftId = 'shift-3';
      const mockShift = {
        id: shiftId,
        requiredHeadcount: 2,
        assignments: [
          { id: 'a1', staffId: 's1' },
          { id: 'a2', staffId: 's2' },
        ],
      };
      mockRepository.findShiftById.mockResolvedValue(mockShift);

      // Act
      const result = await service.getShiftHeadcountStatus(shiftId);

      // Assert
      expect(result).toEqual({
        shiftId,
        requiredHeadcount: 2,
        filledHeadcount: 2,
        isFullyCovered: true,
        isPartiallyCovered: false,
      });
    });

    it('should return correct status for over-filled shift', async () => {
      // Arrange
      const shiftId = 'shift-4';
      const mockShift = {
        id: shiftId,
        requiredHeadcount: 2,
        assignments: [
          { id: 'a1', staffId: 's1' },
          { id: 'a2', staffId: 's2' },
          { id: 'a3', staffId: 's3' },
        ],
      };
      mockRepository.findShiftById.mockResolvedValue(mockShift);

      // Act
      const result = await service.getShiftHeadcountStatus(shiftId);

      // Assert
      expect(result).toEqual({
        shiftId,
        requiredHeadcount: 2,
        filledHeadcount: 3,
        isFullyCovered: true,
        isPartiallyCovered: false,
      });
    });

    it('should throw error if shift not found', async () => {
      // Arrange
      const shiftId = 'non-existent';
      mockRepository.findShiftById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getShiftHeadcountStatus(shiftId)).rejects.toThrow('Shift not found');
    });
  });
});
