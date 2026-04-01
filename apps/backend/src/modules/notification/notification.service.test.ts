import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: NotificationRepository;
  let realtimeGateway: RealtimeGateway;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findByUserId: vi.fn(),
      findById: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    } as any;

    realtimeGateway = {
      emitNotification: vi.fn(),
    } as any;

    service = new NotificationService(repository, realtimeGateway);
  });

  describe('createNotification', () => {
    it('should create a notification with read/unread status (38.1)', async () => {
      const userId = 'user-1';
      const type = 'SHIFT_ASSIGNED';
      const title = 'New Shift Assigned';
      const message = 'You have been assigned to a shift on Monday';
      const metadata = { shiftId: 'shift-1' };

      const mockNotification = {
        id: 'notif-1',
        userId,
        type,
        title,
        message,
        isRead: false,
        metadata,
        createdAt: new Date(),
      };

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      const result = await service.createNotification(userId, type, title, message, metadata);

      expect(result).toEqual(mockNotification);
      expect(result.isRead).toBe(false);
      expect(repository.create).toHaveBeenCalledWith({
        user: { connect: { id: userId } },
        type,
        title,
        message,
        isRead: false,
        metadata,
      });
    });

    it('should emit real-time notification after creation', async () => {
      const userId = 'user-1';
      const mockNotification = {
        id: 'notif-1',
        userId,
        type: 'SHIFT_ASSIGNED',
        title: 'Test',
        message: 'Test message',
        isRead: false,
        metadata: null,
        createdAt: new Date(),
      };

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      await service.createNotification(userId, 'SHIFT_ASSIGNED', 'Test', 'Test message');

      expect(realtimeGateway.emitNotification).toHaveBeenCalledWith(userId, mockNotification);
    });

    it('should create notification without metadata', async () => {
      const userId = 'user-1';
      const mockNotification = {
        id: 'notif-1',
        userId,
        type: 'SHIFT_ASSIGNED',
        title: 'Test',
        message: 'Test message',
        isRead: false,
        metadata: null,
        createdAt: new Date(),
      };

      vi.mocked(repository.create).mockResolvedValue(mockNotification as any);

      const result = await service.createNotification(
        userId,
        'SHIFT_ASSIGNED',
        'Test',
        'Test message'
      );

      expect(result).toEqual(mockNotification);
      expect(repository.create).toHaveBeenCalledWith({
        user: { connect: { id: userId } },
        type: 'SHIFT_ASSIGNED',
        title: 'Test',
        message: 'Test message',
        isRead: false,
        metadata: undefined,
      });
    });
  });

  describe('getNotifications', () => {
    it('should retrieve all notifications including read ones (38.3)', async () => {
      const userId = 'user-1';
      const mockNotifications = [
        {
          id: 'notif-1',
          userId,
          type: 'SHIFT_ASSIGNED',
          title: 'Shift 1',
          message: 'Message 1',
          isRead: true,
          metadata: null,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'notif-2',
          userId,
          type: 'SHIFT_MODIFIED',
          title: 'Shift 2',
          message: 'Message 2',
          isRead: false,
          metadata: null,
          createdAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(repository.findByUserId).mockResolvedValue(mockNotifications as any);

      const result = await service.getNotifications(userId, true);

      expect(result).toEqual(mockNotifications);
      expect(result.length).toBe(2);
      expect(repository.findByUserId).toHaveBeenCalledWith(userId, true);
    });

    it('should retrieve only unread notifications when includeRead is false', async () => {
      const userId = 'user-1';
      const mockNotifications = [
        {
          id: 'notif-2',
          userId,
          type: 'SHIFT_MODIFIED',
          title: 'Shift 2',
          message: 'Message 2',
          isRead: false,
          metadata: null,
          createdAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(repository.findByUserId).mockResolvedValue(mockNotifications as any);

      const result = await service.getNotifications(userId, false);

      expect(result).toEqual(mockNotifications);
      expect(result.length).toBe(1);
      expect(result[0].isRead).toBe(false);
      expect(repository.findByUserId).toHaveBeenCalledWith(userId, false);
    });

    it('should return empty array when no notifications exist', async () => {
      const userId = 'user-1';
      vi.mocked(repository.findByUserId).mockResolvedValue([]);

      const result = await service.getNotifications(userId, true);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 'notif-1';
      const userId = 'user-1';
      const mockNotification = {
        id: notificationId,
        userId,
        type: 'SHIFT_ASSIGNED',
        title: 'Test',
        message: 'Test message',
        isRead: false,
        metadata: null,
        createdAt: new Date(),
      };

      const updatedNotification = { ...mockNotification, isRead: true };

      vi.mocked(repository.findById).mockResolvedValue(mockNotification as any);
      vi.mocked(repository.markAsRead).mockResolvedValue(updatedNotification as any);

      const result = await service.markAsRead(notificationId, userId);

      expect(result.isRead).toBe(true);
      expect(repository.findById).toHaveBeenCalledWith(notificationId);
      expect(repository.markAsRead).toHaveBeenCalledWith(notificationId);
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      const notificationId = 'nonexistent';
      const userId = 'user-1';

      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(NotFoundException);
      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(
        'Notification not found'
      );
    });

    it('should throw ForbiddenException when user tries to mark another users notification', async () => {
      const notificationId = 'notif-1';
      const userId = 'user-1';
      const otherUserId = 'user-2';

      const mockNotification = {
        id: notificationId,
        userId: otherUserId,
        type: 'SHIFT_ASSIGNED',
        title: 'Test',
        message: 'Test message',
        isRead: false,
        metadata: null,
        createdAt: new Date(),
      };

      vi.mocked(repository.findById).mockResolvedValue(mockNotification as any);

      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(ForbiddenException);
      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(
        'You can only mark your own notifications as read'
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      const userId = 'user-1';
      const markedCount = 5;

      vi.mocked(repository.markAllAsRead).mockResolvedValue(markedCount);

      const result = await service.markAllAsRead(userId);

      expect(result).toBe(markedCount);
      expect(repository.markAllAsRead).toHaveBeenCalledWith(userId);
    });

    it('should return 0 when no unread notifications exist', async () => {
      const userId = 'user-1';

      vi.mocked(repository.markAllAsRead).mockResolvedValue(0);

      const result = await service.markAllAsRead(userId);

      expect(result).toBe(0);
    });
  });

  describe('notification history completeness (38.3)', () => {
    it('should store all notifications in history viewable by recipient', async () => {
      const userId = 'user-1';
      const notifications = [
        {
          id: 'notif-1',
          userId,
          type: 'SHIFT_ASSIGNED',
          title: 'Shift Assigned',
          message: 'You have been assigned',
          isRead: true,
          metadata: { shiftId: 'shift-1' },
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'notif-2',
          userId,
          type: 'SHIFT_MODIFIED',
          title: 'Shift Modified',
          message: 'Your shift has been modified',
          isRead: true,
          metadata: { shiftId: 'shift-1' },
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'notif-3',
          userId,
          type: 'SWAP_REQUEST_APPROVED',
          title: 'Swap Approved',
          message: 'Your swap request was approved',
          isRead: false,
          metadata: { swapRequestId: 'swap-1' },
          createdAt: new Date('2024-01-03'),
        },
      ];

      vi.mocked(repository.findByUserId).mockResolvedValue(notifications as any);

      const result = await service.getNotifications(userId, true);

      // All notifications should be retrievable
      expect(result.length).toBe(3);
      expect(result).toEqual(notifications);

      // Verify all notification types are stored
      const types = result.map((n) => n.type);
      expect(types).toContain('SHIFT_ASSIGNED');
      expect(types).toContain('SHIFT_MODIFIED');
      expect(types).toContain('SWAP_REQUEST_APPROVED');

      // Verify metadata is preserved
      expect(result[0].metadata).toEqual({ shiftId: 'shift-1' });
      expect(result[2].metadata).toEqual({ swapRequestId: 'swap-1' });
    });
  });
});
