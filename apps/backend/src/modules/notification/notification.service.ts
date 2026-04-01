import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { NotificationCrudService } from './services/notification-crud.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { NotificationEventsService } from './services/notification-events.service';

/**
 * Orchestrator service that delegates to specialized notification services
 * This service acts as a facade, providing a unified interface for notification operations
 */
@Injectable()
export class NotificationService {
  constructor(
    private readonly crudService: NotificationCrudService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly eventsService: NotificationEventsService
  ) {}

  // ============================================
  // CRUD Operations - Delegated to NotificationCrudService
  // ============================================

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
    return this.crudService.createNotification(userId, type, title, message, metadata);
  }

  /**
   * Get notifications for a user with optional read filter
   * Requirements: 38.1, 38.3
   */
  async getNotifications(userId: string, includeRead: boolean = true): Promise<Notification[]> {
    return this.crudService.getNotifications(userId, includeRead);
  }

  /**
   * Mark a single notification as read
   * Requirements: 38.1
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    return this.crudService.markAsRead(notificationId, userId);
  }

  /**
   * Mark all notifications as read for a user
   * Requirements: 38.1
   */
  async markAllAsRead(userId: string): Promise<number> {
    return this.crudService.markAllAsRead(userId);
  }

  // ============================================
  // Preferences - Delegated to NotificationPreferencesService
  // ============================================

  /**
   * Set notification preferences for a user
   * Requirements: 38.2
   */
  async setNotificationPreferences(
    userId: string,
    inAppEnabled: boolean,
    emailEnabled: boolean
  ): Promise<{ inAppEnabled: boolean; emailEnabled: boolean }> {
    return this.preferencesService.setNotificationPreferences(userId, inAppEnabled, emailEnabled);
  }

  /**
   * Get notification preferences for a user
   * Returns defaults if no preferences exist
   * Requirements: 38.2
   */
  async getNotificationPreferences(
    userId: string
  ): Promise<{ inAppEnabled: boolean; emailEnabled: boolean }> {
    return this.preferencesService.getNotificationPreferences(userId);
  }

  // ============================================
  // Event-Triggered Notifications - Delegated to NotificationEventsService
  // ============================================

  /**
   * Notify staff user when a shift is assigned to them
   * Requirements: 38.4
   */
  async notifyShiftAssignment(
    staffId: string,
    shiftId: string,
    shiftDetails: { startTime: Date; endTime: Date; locationName: string }
  ): Promise<Notification> {
    return this.eventsService.notifyShiftAssignment(staffId, shiftId, shiftDetails);
  }

  /**
   * Notify staff user when their shift is modified or deleted
   * Requirements: 38.5
   */
  async notifyShiftModification(
    staffId: string,
    shiftId: string,
    changeType: 'modified' | 'deleted',
    shiftDetails?: { startTime?: Date; endTime?: Date; locationName?: string }
  ): Promise<Notification> {
    return this.eventsService.notifyShiftModification(staffId, shiftId, changeType, shiftDetails);
  }

  /**
   * Notify relevant users about swap request actions
   * Requirements: 38.6
   */
  async notifySwapRequest(
    requestorId: string,
    targetId: string,
    managerId: string,
    swapId: string,
    action: 'created' | 'approved' | 'rejected'
  ): Promise<Notification[]> {
    return this.eventsService.notifySwapRequest(requestorId, targetId, managerId, swapId, action);
  }

  /**
   * Notify all staff users when a schedule is published
   * Requirements: 38.7
   */
  async notifySchedulePublished(
    staffIds: string[],
    weekStart: Date,
    locationName: string
  ): Promise<Notification[]> {
    return this.eventsService.notifySchedulePublished(staffIds, weekStart, locationName);
  }

  /**
   * Notify staff and manager when approaching overtime (35+ hours)
   * Requirements: 38.8
   */
  async notifyOvertimeApproaching(
    staffId: string,
    managerId: string,
    currentHours: number,
    weekStart: Date
  ): Promise<Notification[]> {
    return this.eventsService.notifyOvertimeApproaching(
      staffId,
      managerId,
      currentHours,
      weekStart
    );
  }

  /**
   * Notify managers when a staff user modifies their availability
   * Requirements: 38.9
   */
  async notifyAvailabilityChange(
    staffId: string,
    managerIds: string[],
    changeType: 'added' | 'removed' | 'modified'
  ): Promise<Notification[]> {
    return this.eventsService.notifyAvailabilityChange(staffId, managerIds, changeType);
  }
}
