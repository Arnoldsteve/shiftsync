import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedSocket, SubscriptionRequest } from './interfaces';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Handle client connection with JWT authentication
   * Requirements: 15.3, 30.1
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);

      // Attach user info to socket
      client.userId = payload.sub;
      client.userRole = payload.role;

      this.logger.log(
        `Client ${client.id} connected (User: ${client.userId}, Role: ${client.userRole})`
      );
    } catch (error) {
      this.logger.warn(`Client ${client.id} connection rejected: Invalid token`);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   * Requirements: 15.5
   */
  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client ${client.id} disconnected (User: ${client.userId})`);
  }

  /**
   * Subscribe to location-based updates
   * Requirements: 15.4, 15.5
   */
  @SubscribeMessage('subscribe:location')
  async handleLocationSubscription(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscriptionRequest
  ) {
    const { locationId } = data;

    if (!locationId) {
      return { error: 'Location ID is required' };
    }

    // TODO: Verify user has access to this location
    // For now, allow all authenticated users

    const roomName = `location:${locationId}`;
    await client.join(roomName);

    this.logger.log(`Client ${client.id} subscribed to ${roomName}`);

    return { success: true, room: roomName };
  }

  /**
   * Subscribe to staff-specific updates
   * Requirements: 15.4, 15.5
   */
  @SubscribeMessage('subscribe:staff')
  async handleStaffSubscription(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscriptionRequest
  ) {
    const { staffId } = data;

    if (!staffId) {
      return { error: 'Staff ID is required' };
    }

    // Verify user can only subscribe to their own updates (unless admin/manager)
    if (client.userId !== staffId && client.userRole !== 'ADMIN' && client.userRole !== 'MANAGER') {
      this.logger.warn(`Client ${client.id} unauthorized to subscribe to staff:${staffId}`);
      return { error: 'Unauthorized' };
    }

    const roomName = `staff:${staffId}`;
    await client.join(roomName);

    this.logger.log(`Client ${client.id} subscribed to ${roomName}`);

    return { success: true, room: roomName };
  }

  /**
   * Unsubscribe from location updates
   * Requirements: 15.5
   */
  @SubscribeMessage('unsubscribe:location')
  async handleLocationUnsubscription(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscriptionRequest
  ) {
    const { locationId } = data;

    if (!locationId) {
      return { error: 'Location ID is required' };
    }

    const roomName = `location:${locationId}`;
    await client.leave(roomName);

    this.logger.log(`Client ${client.id} unsubscribed from ${roomName}`);

    return { success: true, room: roomName };
  }

  /**
   * Unsubscribe from staff updates
   * Requirements: 15.5
   */
  @SubscribeMessage('unsubscribe:staff')
  async handleStaffUnsubscription(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscriptionRequest
  ) {
    const { staffId } = data;

    if (!staffId) {
      return { error: 'Staff ID is required' };
    }

    const roomName = `staff:${staffId}`;
    await client.leave(roomName);

    this.logger.log(`Client ${client.id} unsubscribed from ${roomName}`);

    return { success: true, room: roomName };
  }

  /**
   * Broadcast shift created event
   * Requirements: 15.1
   */
  emitShiftCreated(locationId: string, shift: any) {
    this.server.to(`location:${locationId}`).emit('shift:created', shift);
    this.logger.log(`Broadcasted shift:created to location:${locationId}`);
  }

  /**
   * Broadcast shift updated event
   * Requirements: 15.1
   */
  emitShiftUpdated(locationId: string, shift: any) {
    this.server.to(`location:${locationId}`).emit('shift:updated', shift);
    this.logger.log(`Broadcasted shift:updated to location:${locationId}`);
  }

  /**
   * Broadcast shift deleted event
   * Requirements: 15.1
   */
  emitShiftDeleted(locationId: string, shiftId: string) {
    this.server.to(`location:${locationId}`).emit('shift:deleted', { shiftId });
    this.logger.log(`Broadcasted shift:deleted to location:${locationId}`);
  }

  /**
   * Broadcast assignment changed event
   * Requirements: 15.2
   */
  emitAssignmentChanged(locationId: string, staffId: string, assignment: any) {
    this.server.to(`location:${locationId}`).emit('assignment:changed', assignment);
    this.server.to(`staff:${staffId}`).emit('assignment:changed', assignment);
    this.logger.log(
      `Broadcasted assignment:changed to location:${locationId} and staff:${staffId}`
    );
  }

  /**
   * Broadcast swap request created event
   * Requirements: 15.2
   */
  emitSwapCreated(locationId: string, requestorId: string, targetId: string, swap: any) {
    this.server.to(`location:${locationId}`).emit('swap:created', swap);
    this.server.to(`staff:${requestorId}`).emit('swap:created', swap);
    this.server.to(`staff:${targetId}`).emit('swap:created', swap);
    this.logger.log(`Broadcasted swap:created to location:${locationId}`);
  }

  /**
   * Broadcast swap request updated event
   * Requirements: 15.2
   */
  emitSwapUpdated(locationId: string, requestorId: string, targetId: string, swap: any) {
    this.server.to(`location:${locationId}`).emit('swap:updated', swap);
    this.server.to(`staff:${requestorId}`).emit('swap:updated', swap);
    this.server.to(`staff:${targetId}`).emit('swap:updated', swap);
    this.logger.log(`Broadcasted swap:updated to location:${locationId}`);
  }

  /**
   * Broadcast conflict detected event
   * Requirements: 16.4
   */
  emitConflictDetected(staffId: string, conflict: any) {
    this.server.to(`staff:${staffId}`).emit('conflict:detected', conflict);
    this.logger.log(`Broadcasted conflict:detected to staff:${staffId}`);
  }

  /**
   * Broadcast job completed event
   * Requirements: 24.4
   */
  emitJobCompleted(locationId: string, job: any) {
    this.server.to(`location:${locationId}`).emit('job:completed', job);
    this.logger.log(`Broadcasted job:completed to location:${locationId}`);
  }

  /**
   * Broadcast callout reported event
   * Requirements: 22.2
   */
  emitCalloutReported(locationId: string, callout: any) {
    this.server.to(`location:${locationId}`).emit('callout:reported', callout);
    this.logger.log(`Broadcasted callout:reported to location:${locationId}`);
  }

  /**
   * Broadcast schedule published event
   * Requirements: 32.1
   */
  emitSchedulePublished(locationId: string, weekStartDate: Date, publishedCount: number) {
    this.server.to(`location:${locationId}`).emit('shift:published', {
      locationId,
      weekStartDate: weekStartDate.toISOString(),
      publishedCount,
    });
    this.logger.log(`Broadcasted shift:published to location:${locationId}`);
  }

  /**
   * Broadcast drop request created event
   * Requirements: 33.2
   */
  emitDropCreated(locationId: string, dropRequest: any) {
    this.server.to(`location:${locationId}`).emit('drop:created', dropRequest);
    this.logger.log(`Broadcasted drop:created to location:${locationId}`);
  }

  /**
   * Broadcast drop request expired event
   * Requirements: 33.3
   */
  emitDropExpired(locationId: string, dropRequest: any) {
    this.server.to(`location:${locationId}`).emit('drop:expired', dropRequest);
    this.logger.log(`Broadcasted drop:expired to location:${locationId}`);
  }

  /**
   * Broadcast drop request claimed event
   * Requirements: 34.4
   */
  emitDropClaimed(locationId: string, dropRequestId: string, staffId: string) {
    this.server.to(`location:${locationId}`).emit('drop:claimed', {
      dropRequestId,
      staffId,
    });
    this.logger.log(`Broadcasted drop:claimed to location:${locationId}`);
  }
}
