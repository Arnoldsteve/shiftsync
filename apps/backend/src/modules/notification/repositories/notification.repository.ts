import { Injectable } from '@nestjs/common';
import { Notification, NotificationPreference, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new notification
   * Requirements: 38.1
   */
  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  /**
   * Find notifications by user ID with optional read filter
   * Requirements: 38.1, 38.3
   */
  async findByUserId(userId: string, includeRead: boolean = true): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = { userId };

    if (!includeRead) {
      where.isRead = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find a single notification by ID
   * Requirements: 38.1
   */
  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  /**
   * Mark a notification as read
   * Requirements: 38.1
   */
  async markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   * Requirements: 38.1
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return result.count;
  }

  /**
   * Upsert notification preferences for a user
   * Requirements: 38.2
   */
  async upsertPreferences(
    userId: string,
    inAppEnabled: boolean,
    emailEnabled: boolean
  ): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        inAppEnabled,
        emailEnabled,
      },
      create: {
        userId,
        inAppEnabled,
        emailEnabled,
      },
    });
  }

  /**
   * Get notification preferences for a user
   * Requirements: 38.2
   */
  async findPreferencesByUserId(userId: string): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
  }
}
