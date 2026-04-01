import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { NotificationRepository } from './repositories/notification.repository';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  /**
   * Create a notification and emit real-time event
   * Requirements: 38.1, 38.3
   */
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: any
  ): Promise<Notification> {
    const notification = await this.notificationRepository.create({
      user: { connect: { id: userId } },
      type,
      title,
      message,
      isRead: false,
      metadata: metadata || undefined,
    });

    // Emit real-time notification
    this.realtimeGateway.emitNotification(userId, notification);

    return notification;
  }

  /**
   * Get notifications for a user with optional read filter
   * Requirements: 38.1, 38.3
   */
  async getNotifications(userId: string, includeRead: boolean = true): Promise<Notification[]> {
    return this.notificationRepository.findByUserId(userId, includeRead);
  }

  /**
   * Mark a single notification as read
   * Requirements: 38.1
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Verify notification belongs to user
    if (notification.userId !== userId) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    return this.notificationRepository.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read for a user
   * Requirements: 38.1
   */
  async markAllAsRead(userId: string): Promise<number> {
    return this.notificationRepository.markAllAsRead(userId);
  }
}
