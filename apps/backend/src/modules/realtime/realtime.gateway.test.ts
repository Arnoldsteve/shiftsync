import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { AuthenticatedSocket } from './interfaces';
import { Server } from 'socket.io';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: JwtService;
  let mockServer: Partial<Server>;
  let mockVerifyAsync: any;

  beforeEach(async () => {
    // Mock Socket.io Server
    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    mockVerifyAsync = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: mockVerifyAsync,
          },
        },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    jwtService = module.get<JwtService>(JwtService);

    // Attach mock server
    gateway.server = mockServer as Server;
  });

  describe('handleConnection', () => {
    it('should authenticate client with valid token from auth object', async () => {
      const mockClient = {
        id: 'client-123',
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
        },
        disconnect: vi.fn(),
      } as unknown as AuthenticatedSocket;

      mockVerifyAsync.mockResolvedValueOnce({
        sub: 'user-123',
        role: 'STAFF',
      });

      await gateway.handleConnection(mockClient);

      expect(mockVerifyAsync).toHaveBeenCalledWith('valid-token');
      expect(mockClient.userId).toBe('user-123');
      expect(mockClient.userRole).toBe('STAFF');
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should authenticate client with valid token from authorization header', async () => {
      const mockClient = {
        id: 'client-123',
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: vi.fn(),
      } as unknown as AuthenticatedSocket;

      mockVerifyAsync.mockResolvedValueOnce({
        sub: 'user-456',
        role: 'MANAGER',
      });

      await gateway.handleConnection(mockClient);

      expect(mockVerifyAsync).toHaveBeenCalledWith('valid-token');
      expect(mockClient.userId).toBe('user-456');
      expect(mockClient.userRole).toBe('MANAGER');
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client with no token', async () => {
      const mockClient = {
        id: 'client-123',
        handshake: {
          auth: {},
          headers: {},
        },
        disconnect: vi.fn(),
      } as unknown as AuthenticatedSocket;

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should disconnect client with invalid token', async () => {
      const mockClient = {
        id: 'client-123',
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {},
        },
        disconnect: vi.fn(),
      } as unknown as AuthenticatedSocket;

      mockVerifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleLocationSubscription', () => {
    it('should subscribe client to location room', async () => {
      const mockClient = {
        id: 'client-123',
        userId: 'user-123',
        userRole: 'MANAGER',
        join: vi.fn(),
      } as unknown as AuthenticatedSocket;

      const result = await gateway.handleLocationSubscription(mockClient, {
        locationId: 'location-1',
      });

      expect(mockClient.join).toHaveBeenCalledWith('location:location-1');
      expect(result).toEqual({ success: true, room: 'location:location-1' });
    });

    it('should return error when locationId is missing', async () => {
      const mockClient = {
        id: 'client-123',
        userId: 'user-123',
        userRole: 'MANAGER',
        join: vi.fn(),
      } as unknown as AuthenticatedSocket;

      const result = await gateway.handleLocationSubscription(mockClient, {});

      expect(mockClient.join).not.toHaveBeenCalled();
      expect(result).toEqual({ error: 'Location ID is required' });
    });
  });

  describe('handleStaffSubscription', () => {
    it('should allow staff to subscribe to their own updates', async () => {
      const mockClient = {
        id: 'client-123',
        userId: 'user-123',
        userRole: 'STAFF',
        join: vi.fn(),
      } as unknown as AuthenticatedSocket;

      const result = await gateway.handleStaffSubscription(mockClient, {
        staffId: 'user-123',
      });

      expect(mockClient.join).toHaveBeenCalledWith('staff:user-123');
      expect(result).toEqual({ success: true, room: 'staff:user-123' });
    });

    it('should allow admin to subscribe to any staff updates', async () => {
      const mockClient = {
        id: 'client-123',
        userId: 'admin-1',
        userRole: 'ADMIN',
        join: vi.fn(),
      } as unknown as AuthenticatedSocket;

      const result = await gateway.handleStaffSubscription(mockClient, {
        staffId: 'user-456',
      });

      expect(mockClient.join).toHaveBeenCalledWith('staff:user-456');
      expect(result).toEqual({ success: true, room: 'staff:user-456' });
    });

    it('should allow manager to subscribe to any staff updates', async () => {
      const mockClient = {
        id: 'client-123',
        userId: 'manager-1',
        userRole: 'MANAGER',
        join: vi.fn(),
      } as unknown as AuthenticatedSocket;

      const result = await gateway.handleStaffSubscription(mockClient, {
        staffId: 'user-456',
      });

      expect(mockClient.join).toHaveBeenCalledWith('staff:user-456');
      expect(result).toEqual({ success: true, room: 'staff:user-456' });
    });

    it('should reject staff subscribing to other staff updates', async () => {
      const mockClient = {
        id: 'client-123',
        userId: 'user-123',
        userRole: 'STAFF',
        join: vi.fn(),
      } as unknown as AuthenticatedSocket;

      const result = await gateway.handleStaffSubscription(mockClient, {
        staffId: 'user-456',
      });

      expect(mockClient.join).not.toHaveBeenCalled();
      expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('should return error when staffId is missing', async () => {
      const mockClient = {
        id: 'client-123',
        userId: 'user-123',
        userRole: 'STAFF',
        join: vi.fn(),
      } as unknown as AuthenticatedSocket;

      const result = await gateway.handleStaffSubscription(mockClient, {});

      expect(mockClient.join).not.toHaveBeenCalled();
      expect(result).toEqual({ error: 'Staff ID is required' });
    });
  });

  describe('Event Broadcasting - Requirements 32-38', () => {
    describe('emitSchedulePublished (Requirement 32.1)', () => {
      it('should broadcast shift:published event to location room', () => {
        const locationId = 'location-1';
        const weekStartDate = new Date('2024-01-01');
        const publishedCount = 15;

        gateway.emitSchedulePublished(locationId, weekStartDate, publishedCount);

        expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
        expect(mockServer.emit).toHaveBeenCalledWith('shift:published', {
          locationId: 'location-1',
          weekStartDate: weekStartDate.toISOString(),
          publishedCount: 15,
        });
      });

      it('should handle different week start dates', () => {
        const locationId = 'location-2';
        const weekStartDate = new Date('2024-06-15');
        const publishedCount = 20;

        gateway.emitSchedulePublished(locationId, weekStartDate, publishedCount);

        expect(mockServer.to).toHaveBeenCalledWith('location:location-2');
        expect(mockServer.emit).toHaveBeenCalledWith('shift:published', {
          locationId: 'location-2',
          weekStartDate: weekStartDate.toISOString(),
          publishedCount: 20,
        });
      });
    });

    describe('emitSwapCancelled (Requirements 36.2, 37.3)', () => {
      it('should broadcast swap:cancelled event to all involved parties', () => {
        const locationId = 'location-1';
        const requestorId = 'user-123';
        const targetId = 'user-456';
        const swapRequestId = 'swap-789';
        const reason = 'shift edited by manager';

        gateway.emitSwapCancelled(locationId, requestorId, targetId, swapRequestId, reason);

        expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
        expect(mockServer.to).toHaveBeenCalledWith('staff:user-123');
        expect(mockServer.to).toHaveBeenCalledWith('staff:user-456');
        expect(mockServer.emit).toHaveBeenCalledWith('swap:cancelled', {
          swapRequestId: 'swap-789',
          reason: 'shift edited by manager',
        });
      });

      it('should handle requestor-initiated cancellation', () => {
        const locationId = 'location-2';
        const requestorId = 'user-111';
        const targetId = 'user-222';
        const swapRequestId = 'swap-333';
        const reason = 'cancelled by requestor';

        gateway.emitSwapCancelled(locationId, requestorId, targetId, swapRequestId, reason);

        expect(mockServer.to).toHaveBeenCalledWith('location:location-2');
        expect(mockServer.to).toHaveBeenCalledWith('staff:user-111');
        expect(mockServer.to).toHaveBeenCalledWith('staff:user-222');
        expect(mockServer.emit).toHaveBeenCalledWith('swap:cancelled', {
          swapRequestId: 'swap-333',
          reason: 'cancelled by requestor',
        });
      });
    });

    describe('emitDropCreated (Requirement 33.2)', () => {
      it('should broadcast drop:created event to location room', () => {
        const locationId = 'location-1';
        const dropRequest = {
          id: 'drop-123',
          shiftId: 'shift-456',
          requestorId: 'user-789',
          status: 'PENDING',
          createdAt: new Date(),
          expiresAt: new Date(),
        };

        gateway.emitDropCreated(locationId, dropRequest);

        expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
        expect(mockServer.emit).toHaveBeenCalledWith('drop:created', dropRequest);
      });

      it('should broadcast multiple drop requests to different locations', () => {
        const dropRequest1 = { id: 'drop-1', shiftId: 'shift-1' };
        const dropRequest2 = { id: 'drop-2', shiftId: 'shift-2' };

        gateway.emitDropCreated('location-1', dropRequest1);
        gateway.emitDropCreated('location-2', dropRequest2);

        expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
        expect(mockServer.to).toHaveBeenCalledWith('location:location-2');
        expect(mockServer.emit).toHaveBeenCalledWith('drop:created', dropRequest1);
        expect(mockServer.emit).toHaveBeenCalledWith('drop:created', dropRequest2);
      });
    });

    describe('emitDropExpired (Requirement 33.3)', () => {
      it('should broadcast drop:expired event to location room', () => {
        const locationId = 'location-1';
        const dropRequest = {
          id: 'drop-123',
          shiftId: 'shift-456',
          requestorId: 'user-789',
          status: 'EXPIRED',
          createdAt: new Date(),
          expiresAt: new Date(),
        };

        gateway.emitDropExpired(locationId, dropRequest);

        expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
        expect(mockServer.emit).toHaveBeenCalledWith('drop:expired', dropRequest);
      });

      it('should handle expired drop requests with full metadata', () => {
        const locationId = 'location-3';
        const dropRequest = {
          id: 'drop-999',
          shiftId: 'shift-888',
          requestorId: 'user-777',
          status: 'EXPIRED',
          createdAt: new Date('2024-01-01'),
          expiresAt: new Date('2024-01-02'),
        };

        gateway.emitDropExpired(locationId, dropRequest);

        expect(mockServer.to).toHaveBeenCalledWith('location:location-3');
        expect(mockServer.emit).toHaveBeenCalledWith('drop:expired', dropRequest);
      });
    });

    describe('emitDropClaimed (Requirement 34.4)', () => {
      it('should broadcast drop:claimed event to location room', () => {
        const locationId = 'location-1';
        const dropRequestId = 'drop-123';
        const staffId = 'user-456';

        gateway.emitDropClaimed(locationId, dropRequestId, staffId);

        expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
        expect(mockServer.emit).toHaveBeenCalledWith('drop:claimed', {
          dropRequestId: 'drop-123',
          staffId: 'user-456',
        });
      });

      it('should handle multiple staff claiming different drops', () => {
        gateway.emitDropClaimed('location-1', 'drop-1', 'user-1');
        gateway.emitDropClaimed('location-1', 'drop-2', 'user-2');

        expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
        expect(mockServer.emit).toHaveBeenCalledWith('drop:claimed', {
          dropRequestId: 'drop-1',
          staffId: 'user-1',
        });
        expect(mockServer.emit).toHaveBeenCalledWith('drop:claimed', {
          dropRequestId: 'drop-2',
          staffId: 'user-2',
        });
      });
    });

    describe('emitNotification (Requirement 38.4)', () => {
      it('should broadcast notification:new event to staff room', () => {
        const userId = 'user-123';
        const notification = {
          id: 'notif-456',
          userId: 'user-123',
          type: 'SHIFT_ASSIGNED',
          title: 'New Shift Assigned',
          message: 'You have been assigned to a shift on Monday',
          isRead: false,
          createdAt: new Date(),
          metadata: { shiftId: 'shift-789' },
        };

        gateway.emitNotification(userId, notification);

        expect(mockServer.to).toHaveBeenCalledWith('staff:user-123');
        expect(mockServer.emit).toHaveBeenCalledWith('notification:new', notification);
      });

      it('should broadcast different notification types', () => {
        const userId = 'user-456';
        const notification1 = {
          id: 'notif-1',
          userId: 'user-456',
          type: 'SHIFT_MODIFIED',
          title: 'Shift Modified',
          message: 'Your shift has been updated',
          isRead: false,
          createdAt: new Date(),
        };

        const notification2 = {
          id: 'notif-2',
          userId: 'user-456',
          type: 'SWAP_REQUEST',
          title: 'Swap Request',
          message: 'You have a new swap request',
          isRead: false,
          createdAt: new Date(),
          metadata: { swapRequestId: 'swap-123' },
        };

        gateway.emitNotification(userId, notification1);
        gateway.emitNotification(userId, notification2);

        expect(mockServer.to).toHaveBeenCalledWith('staff:user-456');
        expect(mockServer.emit).toHaveBeenCalledWith('notification:new', notification1);
        expect(mockServer.emit).toHaveBeenCalledWith('notification:new', notification2);
      });

      it('should broadcast notifications to multiple users', () => {
        const notification1 = {
          id: 'notif-1',
          userId: 'user-1',
          type: 'SCHEDULE_PUBLISHED',
          title: 'Schedule Published',
          message: 'The schedule for next week is now available',
          isRead: false,
          createdAt: new Date(),
        };

        const notification2 = {
          id: 'notif-2',
          userId: 'user-2',
          type: 'SCHEDULE_PUBLISHED',
          title: 'Schedule Published',
          message: 'The schedule for next week is now available',
          isRead: false,
          createdAt: new Date(),
        };

        gateway.emitNotification('user-1', notification1);
        gateway.emitNotification('user-2', notification2);

        expect(mockServer.to).toHaveBeenCalledWith('staff:user-1');
        expect(mockServer.to).toHaveBeenCalledWith('staff:user-2');
        expect(mockServer.emit).toHaveBeenCalledWith('notification:new', notification1);
        expect(mockServer.emit).toHaveBeenCalledWith('notification:new', notification2);
      });

      it('should handle notification with metadata', () => {
        const userId = 'user-789';
        const notification = {
          id: 'notif-999',
          userId: 'user-789',
          type: 'OVERTIME_WARNING',
          title: 'Overtime Warning',
          message: 'You are approaching 40 hours this week',
          isRead: false,
          createdAt: new Date(),
          metadata: {
            currentHours: 38,
            weekStart: '2024-01-01',
            weekEnd: '2024-01-07',
          },
        };

        gateway.emitNotification(userId, notification);

        expect(mockServer.to).toHaveBeenCalledWith('staff:user-789');
        expect(mockServer.emit).toHaveBeenCalledWith('notification:new', notification);
      });
    });
  });

  describe('Existing Event Broadcasting', () => {
    it('should broadcast shift:created event', () => {
      const locationId = 'location-1';
      const shift = { id: 'shift-123', startTime: new Date(), endTime: new Date() };

      gateway.emitShiftCreated(locationId, shift);

      expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
      expect(mockServer.emit).toHaveBeenCalledWith('shift:created', shift);
    });

    it('should broadcast shift:updated event', () => {
      const locationId = 'location-1';
      const shift = { id: 'shift-123', startTime: new Date(), endTime: new Date() };

      gateway.emitShiftUpdated(locationId, shift);

      expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
      expect(mockServer.emit).toHaveBeenCalledWith('shift:updated', shift);
    });

    it('should broadcast shift:deleted event', () => {
      const locationId = 'location-1';
      const shiftId = 'shift-123';

      gateway.emitShiftDeleted(locationId, shiftId);

      expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
      expect(mockServer.emit).toHaveBeenCalledWith('shift:deleted', { shiftId });
    });

    it('should broadcast assignment:changed event to location and staff', () => {
      const locationId = 'location-1';
      const staffId = 'user-123';
      const assignment = { id: 'assign-456', shiftId: 'shift-789', staffId: 'user-123' };

      gateway.emitAssignmentChanged(locationId, staffId, assignment);

      expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
      expect(mockServer.to).toHaveBeenCalledWith('staff:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('assignment:changed', assignment);
    });

    it('should broadcast swap:created event', () => {
      const locationId = 'location-1';
      const requestorId = 'user-123';
      const targetId = 'user-456';
      const swap = { id: 'swap-789', shiftId: 'shift-111' };

      gateway.emitSwapCreated(locationId, requestorId, targetId, swap);

      expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
      expect(mockServer.to).toHaveBeenCalledWith('staff:user-123');
      expect(mockServer.to).toHaveBeenCalledWith('staff:user-456');
      expect(mockServer.emit).toHaveBeenCalledWith('swap:created', swap);
    });

    it('should broadcast conflict:detected event', () => {
      const staffId = 'user-123';
      const conflict = { type: 'OVERLAP', shiftId: 'shift-456' };

      gateway.emitConflictDetected(staffId, conflict);

      expect(mockServer.to).toHaveBeenCalledWith('staff:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('conflict:detected', conflict);
    });

    it('should broadcast job:completed event', () => {
      const locationId = 'location-1';
      const job = { id: 'job-123', type: 'fairness-report', status: 'completed' };

      gateway.emitJobCompleted(locationId, job);

      expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
      expect(mockServer.emit).toHaveBeenCalledWith('job:completed', job);
    });

    it('should broadcast callout:reported event', () => {
      const locationId = 'location-1';
      const callout = { id: 'callout-123', shiftId: 'shift-456', staffId: 'user-789' };

      gateway.emitCalloutReported(locationId, callout);

      expect(mockServer.to).toHaveBeenCalledWith('location:location-1');
      expect(mockServer.emit).toHaveBeenCalledWith('callout:reported', callout);
    });
  });
});
