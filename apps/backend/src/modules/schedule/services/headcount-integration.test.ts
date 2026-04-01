import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StaffAssignmentService } from './staff-assignment.service';
import { ShiftPickupService } from './shift-pickup.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Headcount Tracking Integration', () => {
  let staffAssignmentService: StaffAssignmentService;
  let shiftPickupService: ShiftPickupService;
  let mockScheduleRepository: any;
  let mockAuditService: any;
  let mockConflictService: any;
  let mockComplianceService: any;
  let mockRealtimeGateway: any;
  let mockCacheService: any;
  let mockDropRequestRepository: any;
  let mockUserRepository: any;

  beforeEach(() => {
    mockScheduleRepository = {
      findShiftById: vi.fn(),
      createAssignment: vi.fn(),
      findLocationById: vi.fn(),
      findUnassignedShifts: vi.fn(),
    };
    mockAuditService = {
      logAssignmentChange: vi.fn(),
      logSwapAction: vi.fn(),
    };
    mockConflictService = {
      checkOverlap: vi.fn(),
    };
    mockComplianceService = {
      validateAll: vi.fn(),
    };
    mockRealtimeGateway = {
      emitAssignmentChanged: vi.fn(),
      emitDropClaimed: vi.fn(),
    };
    mockCacheService = {
      invalidateSchedule: vi.fn(),
    };
    mockDropRequestRepository = {
      findAvailableDropRequests: vi.fn(),
      findByShiftId: vi.fn(),
      updateStatus: vi.fn(),
    };
    mockUserRepository = {
      findById: vi.fn(),
    };

    staffAssignmentService = new StaffAssignmentService(
      mockScheduleRepository,
      mockAuditService,
      mockConflictService,
      mockComplianceService,
      mockRealtimeGateway
    );

    shiftPickupService = new ShiftPickupService(
      mockScheduleRepository,
      mockAuditService,
      mockCacheService,
      mockConflictService,
      mockComplianceService,
      mockRealtimeGateway,
      mockDropRequestRepository,
      mockUserRepository
    );
  });

  describe('StaffAssignmentService - Headcount Validation', () => {
    it('should allow assignment when headcount not reached', async () => {
      // Arrange
      const shiftId = 'shift-1';
      const staffId = 'staff-1';
      const assignedBy = 'manager-1';

      const mockShift = {
        id: shiftId,
        locationId: 'loc-1',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T17:00:00Z'),
        requiredHeadcount: 3,
        assignments: [{ id: 'a1', staffId: 'staff-2' }],
      };

      mockScheduleRepository.findShiftById.mockResolvedValue(mockShift);
      mockConflictService.checkOverlap.mockResolvedValue({ hasConflict: false });
      mockScheduleRepository.findLocationById.mockResolvedValue({ timezone: 'UTC' });
      mockComplianceService.validateAll.mockResolvedValue([{ isValid: true }]);
      mockScheduleRepository.createAssignment.mockResolvedValue({
        id: 'new-assignment',
        shiftId,
        staffId,
        assignedBy,
      });

      // Act
      const result = await staffAssignmentService.assignStaff(shiftId, staffId, assignedBy);

      // Assert
      expect(result).toBeDefined();
      expect(mockScheduleRepository.createAssignment).toHaveBeenCalled();
    });

    it('should reject assignment when headcount limit reached', async () => {
      // Arrange
      const shiftId = 'shift-1';
      const staffId = 'staff-3';
      const assignedBy = 'manager-1';

      const mockShift = {
        id: shiftId,
        locationId: 'loc-1',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T17:00:00Z'),
        requiredHeadcount: 2,
        assignments: [
          { id: 'a1', staffId: 'staff-1' },
          { id: 'a2', staffId: 'staff-2' },
        ],
      };

      mockScheduleRepository.findShiftById.mockResolvedValue(mockShift);

      // Act & Assert
      await expect(
        staffAssignmentService.assignStaff(shiftId, staffId, assignedBy)
      ).rejects.toThrow(BadRequestException);
      await expect(
        staffAssignmentService.assignStaff(shiftId, staffId, assignedBy)
      ).rejects.toThrow('Shift headcount limit reached');
    });

    it('should reject duplicate assignment of same staff to same shift', async () => {
      // Arrange
      const shiftId = 'shift-1';
      const staffId = 'staff-1';
      const assignedBy = 'manager-1';

      const mockShift = {
        id: shiftId,
        locationId: 'loc-1',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T17:00:00Z'),
        requiredHeadcount: 3,
        assignments: [{ id: 'a1', staffId: 'staff-1' }],
      };

      mockScheduleRepository.findShiftById.mockResolvedValue(mockShift);

      // Act & Assert
      await expect(
        staffAssignmentService.assignStaff(shiftId, staffId, assignedBy)
      ).rejects.toThrow(BadRequestException);
      await expect(
        staffAssignmentService.assignStaff(shiftId, staffId, assignedBy)
      ).rejects.toThrow('Staff member is already assigned to this shift');
    });
  });

  describe('ShiftPickupService - Headcount Validation', () => {
    it('should exclude fully covered shifts from available listings', async () => {
      // Arrange
      const staffId = 'staff-1';

      const mockStaff = {
        id: staffId,
        skills: [{ skillId: 'skill-1' }],
        certifications: [{ locationId: 'loc-1' }],
      };

      const mockShifts = [
        {
          id: 'shift-1',
          locationId: 'loc-1',
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T17:00:00Z'),
          requiredHeadcount: 2,
          assignments: [{ id: 'a1', staffId: 'staff-2' }],
          skills: [{ skillId: 'skill-1', skill: { name: 'Cooking' } }],
          location: { name: 'Location 1', timezone: 'UTC' },
        },
        {
          id: 'shift-2',
          locationId: 'loc-1',
          startTime: new Date('2024-01-02T09:00:00Z'),
          endTime: new Date('2024-01-02T17:00:00Z'),
          requiredHeadcount: 2,
          assignments: [
            { id: 'a2', staffId: 'staff-3' },
            { id: 'a3', staffId: 'staff-4' },
          ],
          skills: [{ skillId: 'skill-1', skill: { name: 'Cooking' } }],
          location: { name: 'Location 1', timezone: 'UTC' },
        },
      ];

      mockUserRepository.findById.mockResolvedValue(mockStaff);
      mockScheduleRepository.findUnassignedShifts.mockResolvedValue(mockShifts);
      mockDropRequestRepository.findAvailableDropRequests.mockResolvedValue([]);

      // Act
      const result = await shiftPickupService.getAvailableShifts(staffId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('shift-1');
    });

    it('should reject pickup when headcount limit reached', async () => {
      // Arrange
      const shiftId = 'shift-1';
      const staffId = 'staff-3';

      const mockShift = {
        id: shiftId,
        locationId: 'loc-1',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T17:00:00Z'),
        requiredHeadcount: 2,
        assignments: [
          { id: 'a1', staffId: 'staff-1' },
          { id: 'a2', staffId: 'staff-2' },
        ],
        skills: [{ skillId: 'skill-1' }],
      };

      const mockStaff = {
        id: staffId,
        skills: [{ skillId: 'skill-1' }],
        certifications: [{ locationId: 'loc-1' }],
      };

      mockScheduleRepository.findShiftById.mockResolvedValue(mockShift);
      mockUserRepository.findById.mockResolvedValue(mockStaff);

      // Act & Assert
      await expect(shiftPickupService.pickupShift(shiftId, staffId)).rejects.toThrow(
        BadRequestException
      );
      await expect(shiftPickupService.pickupShift(shiftId, staffId)).rejects.toThrow(
        'Shift headcount limit reached'
      );
    });
  });
});
