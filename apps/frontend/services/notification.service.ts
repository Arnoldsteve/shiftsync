import { apiClient } from '@/lib/api-client';
import type {
  Notification,
  NotificationPreference,
  UpdateNotificationPreferencesDto,
} from '@/types/notification.types';

/**
 * Notification service for API communication
 * Requirements: 38.1, 38.2, 38.3
 */
export const notificationService = {
  /**
   * Get notifications for the current user
   * Requirements: 38.1, 38.3
   */
  async getNotifications(includeRead: boolean = false): Promise<Notification[]> {
    const response = await apiClient.get('/notifications', {
      params: { includeRead: includeRead.toString() },
    });
    return (response.data as { data: Notification[] }).data;
  },

  /**
   * Mark a notification as read
   * Requirements: 38.1
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiClient.put(`/notifications/${notificationId}/read`);
    return (response.data as { data: Notification }).data;
  },

  /**
   * Mark all notifications as read
   * Requirements: 38.1
   */
  async markAllAsRead(): Promise<number> {
    const response = await apiClient.put('/notifications/read-all');
    return (response.data as { count: number }).count;
  },

  /**
   * Get notification preferences
   * Requirements: 38.2
   */
  async getPreferences(): Promise<NotificationPreference> {
    const response = await apiClient.get('/notifications/preferences');
    return (response.data as { data: NotificationPreference }).data;
  },

  /**
   * Update notification preferences
   * Requirements: 38.2
   */
  async updatePreferences(
    preferences: UpdateNotificationPreferencesDto
  ): Promise<NotificationPreference> {
    const response = await apiClient.put('/notifications/preferences', preferences);
    return (response.data as { data: NotificationPreference }).data;
  },
};
