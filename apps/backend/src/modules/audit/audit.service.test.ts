import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit.service';
import { AuditRepository } from './repositories/audit.repository';
import { NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';

describe('AuditService', () => {
  let auditService: AuditService;
  let auditRepository: AuditRepository;

  beforeEach(() => {
    auditRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      query: vi.fn(),
    } as any;

    auditService = new AuditService(auditRepository);
  });

  describe('logShiftChange', () => {
    it('should create audit log for shift creation', async () => {
      const shiftId = 'shift-123';
      const userId = 'user-456';
      const newState = { locationId: 'loc-1', startTime: '2024-01-15T09:00:00Z' };

      const mockAuditLog = {
        id: 'audit-1',
        action: 'CREATE',
        entityType: 'SHIFT',
        entityId: shiftId,
        userId,
        timestamp: new Date(),
        previousState: null,
        newState,
        hash: 'mock-hash',
      };

      vi.mocked(auditRepository.create).mockResolvedValue(mockAuditLog as any);

      const result = await auditService.logShiftChange('CREATE', shiftId, userId, {
        newState,
      });

      expect(result).toEqual(mockAuditLog);
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entityType: 'SHIFT',
          entityId: shiftId,
          newState,
          hash: expect.any(String),
          user: {
            connect: { id: userId },
          },
        })
      );
    });

    it('should create audit log for shift update with previous and new state', async () => {
      const shiftId = 'shift-123';
      const userId = 'user-456';
      const previousState = { startTime: '2024-01-15T09:00:00Z' };
      const newState = { startTime: '2024-01-15T10:00:00Z' };

      const mockAuditLog = {
        id: 'audit-1',
        action: 'UPDATE',
        entityType: 'SHIFT',
        entityId: shiftId,
        userId,
        timestamp: new Date(),
        previousState,
        newState,
        hash: 'mock-hash',
      };

      vi.mocked(auditRepository.create).mockResolvedValue(mockAuditLog as any);

      const result = await auditService.logShiftChange('UPDATE', shiftId, userId, {
        previousState,
        newState,
      });

      expect(result).toEqual(mockAuditLog);
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entityType: 'SHIFT',
          previousState,
          newState,
        })
      );
    });
  });

  describe('logAssignmentChange', () => {
    it('should create audit log for assignment creation', async () => {
      const assignmentId = 'assignment-123';
      const userId = 'user-456';
      const newState = { shiftId: 'shift-1', staffId: 'staff-1' };

      const mockAuditLog = {
        id: 'audit-1',
        action: 'CREATE',
        entityType: 'ASSIGNMENT',
        entityId: assignmentId,
        userId,
        timestamp: new Date(),
        previousState: null,
        newState,
        hash: 'mock-hash',
      };

      vi.mocked(auditRepository.create).mockResolvedValue(mockAuditLog as any);

      const result = await auditService.logAssignmentChange('CREATE', assignmentId, userId, {
        newState,
      });

      expect(result).toEqual(mockAuditLog);
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entityType: 'ASSIGNMENT',
          entityId: assignmentId,
          newState,
          user: {
            connect: { id: userId },
          },
        })
      );
    });
  });

  describe('logSwapAction', () => {
    it('should create audit log for swap request creation', async () => {
      const swapRequestId = 'swap-123';
      const userId = 'user-456';
      const newState = { shiftId: 'shift-1', requestorId: 'staff-1', targetStaffId: 'staff-2' };

      const mockAuditLog = {
        id: 'audit-1',
        action: 'CREATE',
        entityType: 'SWAP_REQUEST',
        entityId: swapRequestId,
        userId,
        timestamp: new Date(),
        previousState: null,
        newState,
        hash: 'mock-hash',
      };

      vi.mocked(auditRepository.create).mockResolvedValue(mockAuditLog as any);

      const result = await auditService.logSwapAction('CREATE', swapRequestId, userId, {
        newState,
      });

      expect(result).toEqual(mockAuditLog);
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entityType: 'SWAP_REQUEST',
          entityId: swapRequestId,
          user: {
            connect: { id: userId },
          },
        })
      );
    });

    it('should create audit log for swap approval', async () => {
      const swapRequestId = 'swap-123';
      const userId = 'manager-456';
      const previousState = { status: 'PENDING' };
      const newState = { status: 'APPROVED', reviewedBy: userId };

      const mockAuditLog = {
        id: 'audit-1',
        action: 'APPROVE',
        entityType: 'SWAP_REQUEST',
        entityId: swapRequestId,
        userId,
        timestamp: new Date(),
        previousState,
        newState,
        hash: 'mock-hash',
      };

      vi.mocked(auditRepository.create).mockResolvedValue(mockAuditLog as any);

      const result = await auditService.logSwapAction('APPROVE', swapRequestId, userId, {
        previousState,
        newState,
      });

      expect(result).toEqual(mockAuditLog);
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'APPROVE',
          entityType: 'SWAP_REQUEST',
          previousState,
          newState,
        })
      );
    });
  });

  describe('logUserChange', () => {
    it('should create audit log for user role change', async () => {
      const targetUserId = 'user-123';
      const actorUserId = 'admin-456';
      const previousState = { role: 'STAFF' };
      const newState = { role: 'MANAGER', locationIds: ['loc-1'] };

      const mockAuditLog = {
        id: 'audit-1',
        action: 'UPDATE',
        entityType: 'USER',
        entityId: targetUserId,
        userId: actorUserId,
        timestamp: new Date(),
        previousState,
        newState,
        hash: 'mock-hash',
      };

      vi.mocked(auditRepository.create).mockResolvedValue(mockAuditLog as any);

      const result = await auditService.logUserChange('UPDATE', targetUserId, actorUserId, {
        previousState,
        newState,
      });

      expect(result).toEqual(mockAuditLog);
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entityType: 'USER',
          entityId: targetUserId,
          previousState,
          newState,
          user: {
            connect: { id: actorUserId },
          },
        })
      );
    });
  });

  describe('queryAuditLog', () => {
    it('should query audit logs with date range filter', async () => {
      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const mockAuditLogs = [
        {
          id: 'audit-1',
          action: 'CREATE',
          entityType: 'SHIFT',
          entityId: 'shift-1',
          userId: 'user-1',
          timestamp: new Date('2024-01-15'),
          previousState: null,
          newState: {},
          hash: 'hash-1',
          user: { firstName: 'John', lastName: 'Doe' },
        },
        {
          id: 'audit-2',
          action: 'UPDATE',
          entityType: 'ASSIGNMENT',
          entityId: 'assignment-1',
          userId: 'user-2',
          timestamp: new Date('2024-01-20'),
          previousState: {},
          newState: {},
          hash: 'hash-2',
          user: { firstName: 'Jane', lastName: 'Smith' },
        },
      ];

      vi.mocked(auditRepository.query).mockResolvedValue(mockAuditLogs as any);

      const result = await auditService.queryAuditLog(filters);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].action).toBe('create');
      expect(result.data[0].entityType).toBe('shift');
      expect(result.data[0].userName).toBe('John Doe');
      expect(auditRepository.query).toHaveBeenCalledWith(filters);
    });

    it('should query audit logs with user filter', async () => {
      const filters = { userId: 'user-123' };

      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'user-123',
          action: 'CREATE',
          entityType: 'SHIFT',
          entityId: 'shift-1',
          timestamp: new Date('2024-01-15'),
          previousState: null,
          newState: {},
          hash: 'hash-1',
          user: { firstName: 'John', lastName: 'Doe' },
        },
      ];

      vi.mocked(auditRepository.query).mockResolvedValue(mockAuditLogs as any);

      const result = await auditService.queryAuditLog(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe('user-123');
      expect(auditRepository.query).toHaveBeenCalledWith(filters);
    });

    it('should query audit logs with entity type and action filters', async () => {
      const filters = { entityType: 'SHIFT', action: 'CREATE' };

      const mockAuditLogs = [
        {
          id: 'audit-1',
          action: 'CREATE',
          entityType: 'SHIFT',
          entityId: 'shift-1',
          userId: 'user-1',
          timestamp: new Date('2024-01-15'),
          previousState: null,
          newState: {},
          hash: 'hash-1',
          user: { firstName: 'John', lastName: 'Doe' },
        },
      ];

      vi.mocked(auditRepository.query).mockResolvedValue(mockAuditLogs as any);

      const result = await auditService.queryAuditLog(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe('create');
      expect(result.data[0].entityType).toBe('shift');
      expect(auditRepository.query).toHaveBeenCalledWith(filters);
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify integrity of audit record with correct hash', async () => {
      const recordId = 'audit-123';
      const timestamp = new Date('2024-01-15T10:00:00Z');
      const previousState = { status: 'PENDING' };
      const newState = { status: 'APPROVED' };

      // Compute expected hash
      const hashInput = [
        'APPROVE',
        'SWAP_REQUEST',
        'swap-123',
        'user-456',
        timestamp.toISOString(),
        JSON.stringify(previousState),
        JSON.stringify(newState),
      ].join('|');
      const expectedHash = createHash('sha256').update(hashInput).digest('hex');

      const mockAuditLog = {
        id: recordId,
        action: 'APPROVE',
        entityType: 'SWAP_REQUEST',
        entityId: 'swap-123',
        userId: 'user-456',
        timestamp,
        previousState,
        newState,
        hash: expectedHash,
      };

      vi.mocked(auditRepository.findById).mockResolvedValue(mockAuditLog as any);

      const result = await auditService.verifyIntegrity(recordId);

      expect(result).toBe(true);
      expect(auditRepository.findById).toHaveBeenCalledWith(recordId);
    });

    it('should detect tampered audit record with incorrect hash', async () => {
      const recordId = 'audit-123';
      const timestamp = new Date('2024-01-15T10:00:00Z');

      const mockAuditLog = {
        id: recordId,
        action: 'APPROVE',
        entityType: 'SWAP_REQUEST',
        entityId: 'swap-123',
        userId: 'user-456',
        timestamp,
        previousState: { status: 'PENDING' },
        newState: { status: 'APPROVED' },
        hash: 'tampered-hash-value',
      };

      vi.mocked(auditRepository.findById).mockResolvedValue(mockAuditLog as any);

      const result = await auditService.verifyIntegrity(recordId);

      expect(result).toBe(false);
    });

    it('should throw NotFoundException when audit record does not exist', async () => {
      const recordId = 'non-existent-audit';

      vi.mocked(auditRepository.findById).mockResolvedValue(null);

      await expect(auditService.verifyIntegrity(recordId)).rejects.toThrow(NotFoundException);
      await expect(auditService.verifyIntegrity(recordId)).rejects.toThrow(
        'Audit record not found'
      );
    });
  });

  describe('hash generation consistency', () => {
    it('should generate consistent hash for same input', async () => {
      const shiftId = 'shift-123';
      const userId = 'user-456';
      const newState = { locationId: 'loc-1' };
      const fixedDate = new Date('2024-01-15T10:00:00Z');

      // Mock Date to return consistent timestamp
      vi.useFakeTimers();
      vi.setSystemTime(fixedDate);

      const mockAuditLog1 = {
        id: 'audit-1',
        action: 'CREATE',
        entityType: 'SHIFT',
        entityId: shiftId,
        userId,
        timestamp: fixedDate,
        previousState: null,
        newState,
        hash: 'hash-1',
      };

      const mockAuditLog2 = {
        id: 'audit-2',
        action: 'CREATE',
        entityType: 'SHIFT',
        entityId: shiftId,
        userId,
        timestamp: fixedDate,
        previousState: null,
        newState,
        hash: 'hash-2',
      };

      vi.mocked(auditRepository.create)
        .mockResolvedValueOnce(mockAuditLog1 as any)
        .mockResolvedValueOnce(mockAuditLog2 as any);

      await auditService.logShiftChange('CREATE', shiftId, userId, { newState });
      await auditService.logShiftChange('CREATE', shiftId, userId, { newState });

      const calls = vi.mocked(auditRepository.create).mock.calls;
      expect(calls[0][0].hash).toBe(calls[1][0].hash);

      vi.useRealTimers();
    });

    it('should generate different hash for different input', async () => {
      const shiftId = 'shift-123';
      const userId = 'user-456';
      const newState1 = { locationId: 'loc-1' };
      const newState2 = { locationId: 'loc-2' };

      const mockAuditLog1 = {
        id: 'audit-1',
        action: 'CREATE',
        entityType: 'SHIFT',
        entityId: shiftId,
        userId,
        timestamp: new Date(),
        previousState: null,
        newState: newState1,
        hash: 'hash-1',
      };

      const mockAuditLog2 = {
        id: 'audit-2',
        action: 'CREATE',
        entityType: 'SHIFT',
        entityId: shiftId,
        userId,
        timestamp: new Date(),
        previousState: null,
        newState: newState2,
        hash: 'hash-2',
      };

      vi.mocked(auditRepository.create)
        .mockResolvedValueOnce(mockAuditLog1 as any)
        .mockResolvedValueOnce(mockAuditLog2 as any);

      await auditService.logShiftChange('CREATE', shiftId, userId, { newState: newState1 });
      await auditService.logShiftChange('CREATE', shiftId, userId, { newState: newState2 });

      const calls = vi.mocked(auditRepository.create).mock.calls;
      expect(calls[0][0].hash).not.toBe(calls[1][0].hash);
    });
  });
});
