'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@shiftsync/ui';
import { NotificationPreferencesForm } from '@/components/settings/notification-preferences-form';

/**
 * Settings page for user preferences
 * Requirements: 38.2
 */
export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose how you want to receive notifications about schedule changes and requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationPreferencesForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
