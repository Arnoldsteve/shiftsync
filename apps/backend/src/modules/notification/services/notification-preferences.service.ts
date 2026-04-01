import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  /**
   * Set notification preferences for a user
   * Requirements: 38.2
   */
  async setNotificationPreferences(
    userId: string,
    inAppEnabled: boolean,
    emailEnabled: boolean
  ): Promise<{ inAppEnabled: boolean; emailEnabled: boolean }> {
    const preferences = await this.notificationRepository.upsertPreferences(
      userId,
      inAppEnabled,
      emailEnabled
    );

    return {
      inAppEnabled: preferences.inAppEnabled,
      emailEnabled: preferences.emailEnabled,
    };
  }

  /**
   * Get notification preferences for a user
   * Returns defaults if no preferences exist
   * Requirements: 38.2
   */
  async getNotificationPreferences(
    userId: string
  ): Promise<{ inAppEnabled: boolean; emailEnabled: boolean }> {
    const preferences = await this.notificationRepository.findPreferencesByUserId(userId);

    if (!preferences) {
      // Return defaults: in-app enabled, email disabled
      return {
        inAppEnabled: true,
        emailEnabled: false,
      };
    }

    return {
      inAppEnabled: preferences.inAppEnabled,
      emailEnabled: preferences.emailEnabled,
    };
  }
}
