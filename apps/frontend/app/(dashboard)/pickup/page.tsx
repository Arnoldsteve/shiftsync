'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@shiftsync/ui';
import { useAvailableShifts } from '@/hooks/use-shift-pickup';
import { ShiftPickupCard } from '@/components/shifts/shift-pickup-card';
import { usePendingRequestCount } from '@/hooks/use-drop-requests';
import { useAuth } from '@/contexts/auth-context';

export default function PickupPage() {
  const { user } = useAuth();
  const { data: availableShifts, isLoading } = useAvailableShifts();
  const { data: pendingCount } = usePendingRequestCount(user?.id || '');

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Available Shifts</h1>
          <p className="text-muted-foreground">Pick up shifts that match your qualifications</p>
        </div>
        {pendingCount && (
          <div className="text-sm text-muted-foreground">
            Pending requests: {pendingCount.count} / 3
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading available shifts...</div>
      ) : availableShifts && availableShifts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableShifts.map((shift) => (
            <ShiftPickupCard key={shift.id} shift={shift} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Available Shifts</CardTitle>
            <CardDescription>
              There are currently no shifts available for pickup that match your qualifications.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
