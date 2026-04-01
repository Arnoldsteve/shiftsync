'use client';

import { Label, Switch } from '@shiftsync/ui';
import { useNotificationPreferences } from '@/hooks/use-notifications';
import { toast } from 'sonner';

/**
 * Notification preferences form component
 * Requirements: 38.2
 *
 * Features:
 * - Display current preference values
 * - Toggle in-app notifications
 * - Toggle email notifications
 * - Auto-save on change
 */
export function NotificationPreferencesForm() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();

  // Handle toggle changes with auto-save
  const handleInAppToggle = (checked: boolean) => {
    if (!preferences) return;

    updatePreferences(
      {
        inAppEnabled: checked,
        emailEnabled: preferences.emailEnabled,
      },
      {
        onSuccess: () => {
          toast.success('Notification preferences updated');
        },
        onError: () => {
          toast.error('Failed to update preferences');
        },
      }
    );
  };

  const handleEmailToggle = (checked: boolean) => {
    if (!preferences) return;

    updatePreferences(
      {
        inAppEnabled: preferences.inAppEnabled,
        emailEnabled: checked,
      },
      {
        onSuccess: () => {
          toast.success('Notification preferences updated');
        },
        onError: () => {
          toast.error('Failed to update preferences');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-48 bg-muted animate-pulse rounded mt-1" />
          </div>
          <div className="h-6 w-11 bg-muted animate-pulse rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-48 bg-muted animate-pulse rounded mt-1" />
          </div>
          <div className="h-6 w-11 bg-muted animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-sm text-muted-foreground">Failed to load notification preferences</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="in-app-notifications" className="text-base">
            In-App Notifications
          </Label>
          <p className="text-sm text-muted-foreground">
            Receive notifications in the notification center
          </p>
        </div>
        <Switch
          id="in-app-notifications"
          checked={preferences.inAppEnabled}
          onCheckedChange={handleInAppToggle}
          disabled={isUpdating}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="email-notifications" className="text-base">
            Email Notifications
          </Label>
          <p className="text-sm text-muted-foreground">
            Receive notifications via email (simulated)
          </p>
        </div>
        <Switch
          id="email-notifications"
          checked={preferences.emailEnabled}
          onCheckedChange={handleEmailToggle}
          disabled={isUpdating}
        />
      </div>
    </div>
  );
}
