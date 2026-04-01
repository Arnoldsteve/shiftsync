import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './notification.service';
import { NotificationCrudService } from './services/notification-crud.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { NotificationEventsService } from './services/notification-events.service';
import { NotificationRepository } from './repositories/notification.repository';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationTypes } from './interfaces/notification-types.interface';

describe('NotificationService - Event-Triggered Notifications', () => {
  let service: NotificationService;
  let crudService: NotificationCrudService;
  let preferencesService: NotificationPreferencesService;
  let eventsService: NotificationEventsService;
  let repository: NotificationRepository;
  let gateway: RealtimeGateway;

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'TEST_TYPE',
    title: 'Test Title',
    message: 'Test Message',
    isRead: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findByUserId: vi.fn(),
      findById: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      upsertPreferences: vi.fn(),
      findPreferencesByUserId: vi.fn(),
    } as any;

    gateway = {
      emitNotification: vi.fn(),
    } as any;

    // Create specialized services
    crudService = new NotificationCrudService(repository, gateway);
    preferencesService = new NotificationPreferencesService(repository);
    eventsService = new NotificationEventsService(crudService);

    // Create orchestrator service with specialized services
    service = new NotificationService(crudService, preferencesService, eventsService);
  });

  describe('notifyShiftAssignment', () => {
    it('should create notification for shift assignment', async () => {
      const staffId = 'staff-1';
      const shiftId = 'shift-1';
      const shiftDetails = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
        locationName: 'Downtown Location',
      };

      vi.mocked(repository.create).mockResolvedValue({
        ...mockNotification,
        userId: staffId,
        type: NotificationTypes.SHIFT_ASSIGNED,
      } as any);

      const result = await service.notifyShiftAssignment(staffId, shiftId, shiftDetails);

      expect(repository.create).toHaveBeenCalledWith({
        user: { connect: { id: staffId } },
        type: NotificationTypes.SHIFT_ASSIGNED,
        title: 'New Shift Assigned',
        message: expect.stringContaining('Downtown Location'),
        isRead: false,
        metadata: { shiftId, ...shiftDetails },
      });

      expect(gateway.emitNotification).toHaveBeenCalledWith(staffId, expect.any(Object));
      expect(result.type).toBe(NotificationTypes.SHIFT_ASSIGNED);
    });

    it('should include shift details in metadata', async () => {
      const staffId = 'staff-1';
      const shiftId = 'shift-1';
      const shiftDetails = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
        locationName: 'Downtown Location',
      };

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      await service.notifyShiftAssignment(staffId, shiftId, shiftDetails);

      const createCall = vi.mocked(repository.create).mock.calls[0][0];
      expect(createCall.metadata).toEqual({ shiftId, ...shiftDetails });
    });
  });

  describe('notifyShiftModification', () => {
    it('should create notification for shift modification', async () => {
      const staffId = 'staff-1';
      const shiftId = 'shift-1';
      const shiftDetails = {
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
        locationName: 'Downtown Location',
      };

      vi.mocked(repository.create).mockResolvedValue({
        ...mockNotification,
        type: NotificationTypes.SHIFT_MODIFIED,
      } as any);

      const result = await service.notifyShiftModification(
        staffId,
        shiftId,
        'modified',
        shiftDetails
      );

      expect(repository.create).toHaveBeenCalledWith({
        user: { connect: { id: staffId } },
        type: NotificationTypes.SHIFT_MODIFIED,
        title: 'Shift Modified',
        message: expect.stringContaining('modified'),
        isRead: false,
        metadata: { shiftId, changeType: 'modified', ...shiftDetails },
      });

      expect(result.type).toBe(NotificationTypes.SHIFT_MODIFIED);
    });

    it('should create notification for shift deletion', async () => {
      const staffId = 'staff-1';
      const shiftId = 'shift-1';
      const shiftDetails = {
        locationName: 'Downtown Location',
      };

      vi.mocked(repository.create).mockResolvedValue({
        ...mockNotification,
        type: NotificationTypes.SHIFT_DELETED,
      } as any);

      const result = await service.notifyShiftModification(
        staffId,
        shiftId,
        'deleted',
        shiftDetails
      );

      expect(repository.create).toHaveBeenCalledWith({
        user: { connect: { id: staffId } },
        type: NotificationTypes.SHIFT_DELETED,
        title: 'Shift Deleted',
        message: expect.stringContaining('deleted'),
        isRead: false,
        metadata: expect.objectContaining({ shiftId, changeType: 'deleted' }),
      });

      expect(result.type).toBe(NotificationTypes.SHIFT_DELETED);
    });

    it('should handle missing shift details gracefully', async () => {
      const staffId = 'staff-1';
      const shiftId = 'shift-1';

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      await service.notifyShiftModification(staffId, shiftId, 'modified');

      const createCall = vi.mocked(repository.create).mock.calls[0][0];
      expect(createCall.message).toContain('One of your shifts has been modified');
    });
  });

  describe('notifySwapRequest', () => {
    it('should create notifications for swap request creation', async () => {
      const requestorId = 'staff-1';
      const targetId = 'staff-2';
      const managerId = 'manager-1';
      const swapId = 'swap-1';

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      const results = await service.notifySwapRequest(
        requestorId,
        targetId,
        managerId,
        swapId,
        'created'
      );

      expect(results).toHaveLength(2); // Target and manager
      expect(repository.create).toHaveBeenCalledTimes(2);

      // Check target notification
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { connect: { id: targetId } },
          type: NotificationTypes.SWAP_REQUEST_CREATED,
          title: 'New Swap Request',
        })
      );

      // Check manager notification
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { connect: { id: managerId } },
          type: NotificationTypes.SWAP_REQUEST_CREATED,
        })
      );
    });

    it('should create notifications for swap request approval', async () => {
      const requestorId = 'staff-1';
      const targetId = 'staff-2';
      const managerId = 'manager-1';
      const swapId = 'swap-1';

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      const results = await service.notifySwapRequest(
        requestorId,
        targetId,
        managerId,
        swapId,
        'approved'
      );

      expect(results).toHaveLength(3); // Requestor, target, and manager
      expect(repository.create).toHaveBeenCalledTimes(3);

      // Check all use approved type
      const calls = vi.mocked(repository.create).mock.calls;
      calls.forEach((call) => {
        expect(call[0].type).toBe(NotificationTypes.SWAP_REQUEST_APPROVED);
      });
    });

    it('should create notifications for swap request rejection', async () => {
      const requestorId = 'staff-1';
      const targetId = 'staff-2';
      const managerId = 'manager-1';
      const swapId = 'swap-1';

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      const results = await service.notifySwapRequest(
        requestorId,
        targetId,
        managerId,
        swapId,
        'rejected'
      );

      expect(results).toHaveLength(3); // Requestor, target, and manager
      expect(repository.create).toHaveBeenCalledTimes(3);

      // Check all use rejected type
      const calls = vi.mocked(repository.create).mock.calls;
      calls.forEach((call) => {
        expect(call[0].type).toBe(NotificationTypes.SWAP_REQUEST_REJECTED);
      });
    });

    it('should include swap metadata in all notifications', async () => {
      const requestorId = 'staff-1';
      const targetId = 'staff-2';
      const managerId = 'manager-1';
      const swapId = 'swap-1';

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      await service.notifySwapRequest(requestorId, targetId, managerId, swapId, 'created');

      const calls = vi.mocked(repository.create).mock.calls;
      calls.forEach((call) => {
        expect(call[0].metadata).toHaveProperty('swapId', swapId);
        expect(call[0].metadata).toHaveProperty('action', 'created');
      });
    });
  });

  describe('notifySchedulePublished', () => {
    it('should create notifications for all staff users', async () => {
      const staffIds = ['staff-1', 'staff-2', 'staff-3'];
      const weekStart = new Date('2024-01-15');
      const locationName = 'Downtown Location';

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      const results = await service.notifySchedulePublished(staffIds, weekStart, locationName);

      expect(results).toHaveLength(3);
      expect(repository.create).toHaveBeenCalledTimes(3);

      staffIds.forEach((staffId) => {
        expect(repository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { connect: { id: staffId } },
            type: NotificationTypes.SCHEDULE_PUBLISHED,
            title: 'Schedule Published',
            message: expect.stringContaining(locationName),
          })
        );
      });
    });

    it('should include schedule metadata', async () => {
      const staffIds = ['staff-1'];
      const weekStart = new Date('2024-01-15');
      const locationName = 'Downtown Location';

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      await service.notifySchedulePublished(staffIds, weekStart, locationName);

      const createCall = vi.mocked(repository.create).mock.calls[0][0];
      expect(createCall.metadata).toEqual({ weekStart, locationName });
    });

    it('should handle empty staff list', async () => {
      const staffIds: string[] = [];
      const weekStart = new Date('2024-01-15');
      const locationName = 'Downtown Location';

      const results = await service.notifySchedulePublished(staffIds, weekStart, locationName);

      expect(results).toHaveLength(0);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('notifyOvertimeApproaching', () => {
    it('should create notifications for staff and manager', async () => {
      const staffId = 'staff-1';
      const managerId = 'manager-1';
      const currentHours = 36;
      const weekStart = new Date('2024-01-15');

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      const results = await service.notifyOvertimeApproaching(
        staffId,
        managerId,
        currentHours,
        weekStart
      );

      expect(results).toHaveLength(2);
      expect(repository.create).toHaveBeenCalledTimes(2);

      // Check staff notification
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { connect: { id: staffId } },
          type: NotificationTypes.OVERTIME_APPROACHING,
          title: 'Overtime Approaching',
          message: expect.stringContaining('36 hours'),
        })
      );

      // Check manager notification
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { connect: { id: managerId } },
          type: NotificationTypes.OVERTIME_APPROACHING,
          title: 'Staff Overtime Approaching',
        })
      );
    });

    it('should include overtime metadata with limit', async () => {
      const staffId = 'staff-1';
      const managerId = 'manager-1';
      const currentHours = 37.5;
      const weekStart = new Date('2024-01-15');

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      await service.notifyOvertimeApproaching(staffId, managerId, currentHours, weekStart);

      const calls = vi.mocked(repository.create).mock.calls;
      calls.forEach((call) => {
        expect(call[0].metadata).toHaveProperty('currentHours', currentHours);
        expect(call[0].metadata).toHaveProperty('weekStart', weekStart);
        expect(call[0].metadata).toHaveProperty('limit', 40);
      });
    });

    it('should include staffId in manager notification metadata', async () => {
      const staffId = 'staff-1';
      const managerId = 'manager-1';
      const currentHours = 35;
      const weekStart = new Date('2024-01-15');

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      await service.notifyOvertimeApproaching(staffId, managerId, currentHours, weekStart);

      const managerNotificationCall = vi.mocked(repository.create).mock.calls[1][0];
      expect(managerNotificationCall.metadata).toHaveProperty('staffId', staffId);
    });
  });

  describe('notifyAvailabilityChange', () => {
    it('should create notifications for all managers', async () => {
      const staffId = 'staff-1';
      const managerIds = ['manager-1', 'manager-2'];
      const changeType = 'modified';

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      const results = await service.notifyAvailabilityChange(staffId, managerIds, changeType);

      expect(results).toHaveLength(2);
      expect(repository.create).toHaveBeenCalledTimes(2);

      managerIds.forEach((managerId) => {
        expect(repository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { connect: { id: managerId } },
            type: NotificationTypes.AVAILABILITY_CHANGED,
            title: 'Staff Availability Changed',
            message: expect.stringContaining('modified'),
          })
        );
      });
    });

    it('should handle different change types', async () => {
      const staffId = 'staff-1';
      const managerIds = ['manager-1'];

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      // Test 'added'
      await service.notifyAvailabilityChange(staffId, managerIds, 'added');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('added'),
        })
      );

      vi.mocked(repository.create).mockClear();

      // Test 'removed'
      await service.notifyAvailabilityChange(staffId, managerIds, 'removed');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('removed'),
        })
      );
    });

    it('should include staff and change type in metadata', async () => {
      const staffId = 'staff-1';
      const managerIds = ['manager-1'];
      const changeType = 'added';

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      await service.notifyAvailabilityChange(staffId, managerIds, changeType);

      const createCall = vi.mocked(repository.create).mock.calls[0][0];
      expect(createCall.metadata).toEqual({ staffId, changeType });
    });

    it('should handle empty manager list', async () => {
      const staffId = 'staff-1';
      const managerIds: string[] = [];
      const changeType = 'modified';

      const results = await service.notifyAvailabilityChange(staffId, managerIds, changeType);

      expect(results).toHaveLength(0);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('Real-time event emission', () => {
    it('should emit real-time events for all notification methods', async () => {
      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      // Test shift assignment
      await service.notifyShiftAssignment('staff-1', 'shift-1', {
        startTime: new Date(),
        endTime: new Date(),
        locationName: 'Location',
      });
      expect(gateway.emitNotification).toHaveBeenCalled();

      vi.mocked(gateway.emitNotification).mockClear();

      // Test shift modification
      await service.notifyShiftModification('staff-1', 'shift-1', 'modified');
      expect(gateway.emitNotification).toHaveBeenCalled();

      vi.mocked(gateway.emitNotification).mockClear();

      // Test swap request
      await service.notifySwapRequest('staff-1', 'staff-2', 'manager-1', 'swap-1', 'created');
      expect(gateway.emitNotification).toHaveBeenCalledTimes(2);

      vi.mocked(gateway.emitNotification).mockClear();

      // Test schedule published
      await service.notifySchedulePublished(['staff-1'], new Date(), 'Location');
      expect(gateway.emitNotification).toHaveBeenCalled();

      vi.mocked(gateway.emitNotification).mockClear();

      // Test overtime approaching
      await service.notifyOvertimeApproaching('staff-1', 'manager-1', 35, new Date());
      expect(gateway.emitNotification).toHaveBeenCalledTimes(2);

      vi.mocked(gateway.emitNotification).mockClear();

      // Test availability change
      await service.notifyAvailabilityChange('staff-1', ['manager-1'], 'modified');
      expect(gateway.emitNotification).toHaveBeenCalled();
    });
  });
});
