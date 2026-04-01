/**
 * Notification types for frontend
 * Requirements: 38.1, 38.3
 */

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export type NotificationType =
  | 'SHIFT_ASSIGNED'
  | 'SHIFT_MODIFIED'
  | 'SHIFT_DELETED'
  | 'SWAP_REQUEST_CREATED'
  | 'SWAP_REQUEST_APPROVED'
  | 'SWAP_REQUEST_REJECTED'
  | 'SCHEDULE_PUBLISHED'
  | 'OVERTIME_APPROACHING'
  | 'AVAILABILITY_CHANGED';

export interface NotificationPreference {
  id: string;
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesDto {
  inAppEnabled: boolean;
  emailEnabled: boolean;
}
