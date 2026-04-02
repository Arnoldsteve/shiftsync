'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@shiftsync/ui';
import { AvailabilityForm } from '@/components/users/availability-form';
import { DesiredHoursForm } from '@/components/users/desired-hours-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/contexts/auth-context';
import { Action } from '@/lib/ability';

export default function AvailabilityPage() {
  const { can } = usePermissions();
  const { user } = useAuth();

  // Route guard: Only STAFF can access this page
  if (user?.role !== 'STAFF') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>This page is only available to staff members.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check permissions
  if (!can(Action.Read, 'Availability')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don&apos;t have permission to view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Availability</h1>
        <p className="text-muted-foreground">
          Set your recurring weekly availability and one-off exceptions
        </p>
      </div>

      <div className="space-y-6">
        <DesiredHoursForm />
        <AvailabilityForm />
      </div>
    </div>
  );
}
