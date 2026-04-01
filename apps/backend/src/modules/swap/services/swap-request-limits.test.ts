import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SwapRequestService } from './swap-request.service';
import { DropRequestService } from './drop-request.service';
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
 * Test suite for Requirement 35: Request Limits
 * Validates that pending request limits are enforced correctly
 */
describe('SwapRequestService - Request Limits (Requirement 35)', () => {
  let swapRequestService: SwapRequestService;
  let dropRequestService: DropRequestService;
  let swapRepository: Partial<SwapRepository>;
  let dropRequestRepository: Partial<DropRequestRepository>;
  let configService: Partial<ConfigService>;
  let prisma: Partial<PrismaService>;
  let auditService: Partial<AuditService>;
  let cacheService: Partial<CacheService>;
  let conflictService: Partial<ConflictService>;
  let complianceService: Partial<ComplianceService>;
  let realtimeGateway: Partial<RealtimeGateway>;

  const mockShift = {
    id: 'shift-1',
    locationId: 'location-1',
    startTime: new Date('2024-04-15T09:00:00Z'),
    endTime: new Date('2024-04-15T17:00:00Z'),
    requiredHeadcount: 1,
    isPublished: true,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'manager-1',
    skills: [],
  };

  const mockLocationConfig = {
    id: 'config-1',
    locationId: 'location-1',
    dailyLimitEnabled: false,
    dailyLimitHours: null,
    weeklyLimitEnabled: true,
    weeklyLimitHours: 40,
    consecutiveDaysEnabled: false,
    consecutiveDaysLimit: null,
    restPeriodHours: 10,
    schedulePublishCutoffHours: 48,
    maxPendingRequests: 3,
  };

  beforeEach(() => {
    swapRepository = {
      findAssignmentByShiftAndStaff: vi.fn(),
      createSwapRequest: vi.fn(),
      countPendingByRequestor: vi.fn(),
    };

    dropRequestRepository = {
      create: vi.fn(),
      findByShiftId: vi.fn(),
      countPendingByRequestor: vi.fn(),
    };

    auditService = {
      logSwapAction: vi.fn(),
    };

    cacheService = {
      delete: vi.fn(),
    };

    conflictService = {
      checkOverlap: vi.fn(),
    };

    complianceService = {
      validateAll: vi.fn(),
    };

    configService = {
      getLocationConfig: vi.fn(),
    };

    realtimeGateway = {
      emitSwapCreated: vi.fn(),
      emitDropCreated: vi.fn(),
    };

    prisma = {
      shift: {
        findUnique: vi.fn(),
      } as any,
    };

    swapRequestService = new SwapRequestService(
      swapRepository as SwapRepository,
      dropRequestRepository as DropRequestRepository,
      auditService as AuditService,
      cacheService as CacheService,
      conflictService as ConflictService,
      complianceService as ComplianceService,
      configService as ConfigService,
      realtimeGateway as RealtimeGateway,
      prisma as PrismaService
    );

    dropRequestService = new DropRequestService(
      swapRepository as SwapRepository,
      dropRequestRepository as DropRequestRepository,
      auditService as AuditService,
      configService as ConfigService,
      realtimeGateway as RealtimeGateway,
      prisma as PrismaService
    );
  });

  describe('getPendingRequestCount', () => {
    it('should count both swap and drop requests (Requirement 35.2)', async () => {
      // Arrange
      vi.spyOn(swapRepository, 'countPendingByRequestor').mockResolvedValue(2);
      vi.spyOn(dropRequestRepository, 'countPendingByRequestor').mockResolvedValue(1);

      // Act
      const count = await swapRequestService.getPendingRequestCount('staff-1');

      // Assert
      expect(count).toBe(3);
      expect(swapRepository.countPendingByRequestor).toHaveBeenCalledWith('staff-1');
      expect(dropRequestRepository.countPendingByRequestor).toHaveBeenCalledWith('staff-1');
    });

    it('should return 0 when staff has no pending requests', async () => {
      // Arrange
      vi.spyOn(swapRepository, 'countPendingByRequestor').mockResolvedValue(0);
      vi.spyOn(dropRequestRepository, 'countPendingByRequestor').mockResolvedValue(0);

      // Act
      const count = await swapRequestService.getPendingRequestCount('staff-1');

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('createSwapRequest - Request Limit Enforcement', () => {
    it('should reject swap request when at limit (Requirement 35.1, 35.3)', async () => {
      // Arrange
      vi.spyOn(swapRepository, 'findAssignmentByShiftAndStaff').mockResolvedValue({
        id: 'assignment-1',
        shiftId: 'shift-1',
        staffId: 'staff-1',
        assignedAt: new Date(),
        assignedBy: 'manager-1',
        version: 1,
      });
      vi.spyOn(prisma.shift, 'findUnique').mockResolvedValue(mockShift as any);
      vi.spyOn(swapRepository, 'countPendingByRequestor').mockResolvedValue(2);
      vi.spyOn(dropRequestRepository, 'countPendingByRequestor').mockResolvedValue(1);
      vi.spyOn(configService, 'getLocationConfig').mockResolvedValue(mockLocationConfig as any);

      // Act & Assert
      await expect(
        swapRequestService.createSwapRequest('shift-1', 'staff-1', 'staff-2')
      ).rejects.toThrow(BadRequestException);

      await expect(
        swapRequestService.createSwapRequest('shift-1', 'staff-1', 'staff-2')
      ).rejects.toThrow(
        'Cannot create swap request: you have reached the maximum of 3 pending requests'
      );
    });

    it('should allow swap request when below limit', async () => {
      // Arrange
      const mockSwapRequest = {
        id: 'swap-1',
        shiftId: 'shift-1',
        requestorId: 'staff-1',
        targetStaffId: 'staff-2',
        status: 'PENDING',
        createdAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      };

      vi.spyOn(swapRepository, 'findAssignmentByShiftAndStaff').mockResolvedValue({
        id: 'assignment-1',
        shiftId: 'shift-1',
        staffId: 'staff-1',
        assignedAt: new Date(),
        assignedBy: 'manager-1',
        version: 1,
      });
      vi.spyOn(prisma.shift, 'findUnique').mockResolvedValue(mockShift as any);
      vi.spyOn(swapRepository, 'countPendingByRequestor').mockResolvedValue(1);
      vi.spyOn(dropRequestRepository, 'countPendingByRequestor').mockResolvedValue(1);
      vi.spyOn(configService, 'getLocationConfig').mockResolvedValue(mockLocationConfig as any);
      vi.spyOn(swapRepository, 'createSwapRequest').mockResolvedValue(mockSwapRequest as any);

      // Act
      const result = await swapRequestService.createSwapRequest('shift-1', 'staff-1', 'staff-2');

      // Assert
      expect(result).toEqual(mockSwapRequest);
      expect(swapRepository.createSwapRequest).toHaveBeenCalled();
    });

    it('should use location-specific max pending requests (Requirement 35.5)', async () => {
      // Arrange
      const customLocationConfig = {
        ...mockLocationConfig,
        maxPendingRequests: 5, // Custom limit
      };

      vi.spyOn(swapRepository, 'findAssignmentByShiftAndStaff').mockResolvedValue({
        id: 'assignment-1',
        shiftId: 'shift-1',
        staffId: 'staff-1',
        assignedAt: new Date(),
        assignedBy: 'manager-1',
        version: 1,
      });
      vi.spyOn(prisma.shift, 'findUnique').mockResolvedValue(mockShift as any);
      vi.spyOn(swapRepository, 'countPendingByRequestor').mockResolvedValue(3);
      vi.spyOn(dropRequestRepository, 'countPendingByRequestor').mockResolvedValue(1);
      vi.spyOn(configService, 'getLocationConfig').mockResolvedValue(customLocationConfig as any);
      vi.spyOn(swapRepository, 'createSwapRequest').mockResolvedValue({
        id: 'swap-1',
        shiftId: 'shift-1',
        requestorId: 'staff-1',
        targetStaffId: 'staff-2',
        status: 'PENDING',
        createdAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      } as any);

      // Act
      const result = await swapRequestService.createSwapRequest('shift-1', 'staff-1', 'staff-2');

      // Assert - Should succeed because limit is 5 and staff has 4 pending
      expect(result).toBeDefined();
      expect(configService.getLocationConfig).toHaveBeenCalledWith('location-1');
    });
  });

  describe('createDropRequest - Request Limit Enforcement', () => {
    it('should reject drop request when at limit (Requirement 35.1, 35.3)', async () => {
      // Arrange
      vi.spyOn(swapRepository, 'findAssignmentByShiftAndStaff').mockResolvedValue({
        id: 'assignment-1',
        shiftId: 'shift-1',
        staffId: 'staff-1',
        assignedAt: new Date(),
        assignedBy: 'manager-1',
        version: 1,
      });
      vi.spyOn(prisma.shift, 'findUnique').mockResolvedValue({
        ...mockShift,
        location: { id: 'location-1', name: 'Location 1', timezone: 'America/New_York' },
      } as any);
      vi.spyOn(swapRepository, 'countPendingByRequestor').mockResolvedValue(1);
      vi.spyOn(dropRequestRepository, 'countPendingByRequestor').mockResolvedValue(2);
      vi.spyOn(configService, 'getLocationConfig').mockResolvedValue(mockLocationConfig as any);

      // Act & Assert
      await expect(
        dropRequestService.createDropRequest('shift-1', 'staff-1', 'Need time off')
      ).rejects.toThrow(BadRequestException);

      await expect(
        dropRequestService.createDropRequest('shift-1', 'staff-1', 'Need time off')
      ).rejects.toThrow(
        'Cannot create drop request: you have reached the maximum of 3 pending requests'
      );
    });

    it('should allow drop request when below limit', async () => {
      // Arrange
      const futureShift = {
        ...mockShift,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        endTime: new Date(Date.now() + 56 * 60 * 60 * 1000),
        location: { id: 'location-1', name: 'Location 1', timezone: 'America/New_York' },
      };

      const mockDropRequest = {
        id: 'drop-1',
        shiftId: 'shift-1',
        requestorId: 'staff-1',
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(futureShift.startTime.getTime() - 24 * 60 * 60 * 1000),
        claimedBy: null,
        claimedAt: null,
        reason: 'Need time off',
      };

      vi.spyOn(swapRepository, 'findAssignmentByShiftAndStaff').mockResolvedValue({
        id: 'assignment-1',
        shiftId: 'shift-1',
        staffId: 'staff-1',
        assignedAt: new Date(),
        assignedBy: 'manager-1',
        version: 1,
      });
      vi.spyOn(prisma.shift, 'findUnique').mockResolvedValue(futureShift as any);
      vi.spyOn(dropRequestRepository, 'findByShiftId').mockResolvedValue(null);
      vi.spyOn(swapRepository, 'countPendingByRequestor').mockResolvedValue(1);
      vi.spyOn(dropRequestRepository, 'countPendingByRequestor').mockResolvedValue(0);
      vi.spyOn(configService, 'getLocationConfig').mockResolvedValue(mockLocationConfig as any);
      vi.spyOn(dropRequestRepository, 'create').mockResolvedValue(mockDropRequest as any);

      // Act
      const result = await dropRequestService.createDropRequest(
        'shift-1',
        'staff-1',
        'Need time off'
      );

      // Assert
      expect(result).toEqual(mockDropRequest);
      expect(dropRequestRepository.create).toHaveBeenCalled();
    });
  });
});
