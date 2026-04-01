import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('NotificationService - Preferences', () => {
  let service: NotificationService;
  let repository: NotificationRepository;

  beforeEach(() => {
    repository = {
      upsertPreferences: vi.fn(),
      findPreferencesByUserId: vi.fn(),
    } as any;

    const realtimeGateway = {
      emitNotification: vi.fn(),
    } as any;

    service = new NotificationService(repository, realtimeGateway);
  });

  describe('setNotificationPreferences', () => {
    it('should create new preferences with provided values', async () => {
      const userId = 'user-1';
      const inAppEnabled = true;
      const emailEnabled = true;

      vi.mocked(repository.upsertPreferences).mockResolvedValue({
        id: 'pref-1',
        userId,
        inAppEnabled,
        emailEnabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.setNotificationPreferences(userId, inAppEnabled, emailEnabled);

      expect(repository.upsertPreferences).toHaveBeenCalledWith(userId, inAppEnabled, emailEnabled);
      expect(result).toEqual({
        inAppEnabled: true,
        emailEnabled: true,
      });
    });

    it('should update existing preferences', async () => {
      const userId = 'user-1';
      const inAppEnabled = false;
      const emailEnabled = true;

      vi.mocked(repository.upsertPreferences).mockResolvedValue({
        id: 'pref-1',
        userId,
        inAppEnabled,
        emailEnabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.setNotificationPreferences(userId, inAppEnabled, emailEnabled);

      expect(repository.upsertPreferences).toHaveBeenCalledWith(userId, inAppEnabled, emailEnabled);
      expect(result).toEqual({
        inAppEnabled: false,
        emailEnabled: true,
      });
    });

    it('should handle default values (in-app enabled, email disabled)', async () => {
      const userId = 'user-1';
      const inAppEnabled = true;
      const emailEnabled = false;

      vi.mocked(repository.upsertPreferences).mockResolvedValue({
        id: 'pref-1',
        userId,
        inAppEnabled,
        emailEnabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.setNotificationPreferences(userId, inAppEnabled, emailEnabled);

      expect(result).toEqual({
        inAppEnabled: true,
        emailEnabled: false,
      });
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return existing preferences', async () => {
      const userId = 'user-1';

      vi.mocked(repository.findPreferencesByUserId).mockResolvedValue({
        id: 'pref-1',
        userId,
        inAppEnabled: false,
        emailEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.getNotificationPreferences(userId);

      expect(repository.findPreferencesByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        inAppEnabled: false,
        emailEnabled: true,
      });
    });

    it('should return defaults when no preferences exist', async () => {
      const userId = 'user-1';

      vi.mocked(repository.findPreferencesByUserId).mockResolvedValue(null);

      const result = await service.getNotificationPreferences(userId);

      expect(repository.findPreferencesByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        inAppEnabled: true,
        emailEnabled: false,
      });
    });
  });

  describe('preference round-trip', () => {
    it('should set preferences and then retrieve the same values', async () => {
      const userId = 'user-1';
      const inAppEnabled = false;
      const emailEnabled = true;

      // Set preferences
      vi.mocked(repository.upsertPreferences).mockResolvedValue({
        id: 'pref-1',
        userId,
        inAppEnabled,
        emailEnabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const setResult = await service.setNotificationPreferences(
        userId,
        inAppEnabled,
        emailEnabled
      );

      // Get preferences
      vi.mocked(repository.findPreferencesByUserId).mockResolvedValue({
        id: 'pref-1',
        userId,
        inAppEnabled,
        emailEnabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const getResult = await service.getNotificationPreferences(userId);

      expect(setResult).toEqual(getResult);
      expect(getResult).toEqual({
        inAppEnabled: false,
        emailEnabled: true,
      });
    });
  });
});
