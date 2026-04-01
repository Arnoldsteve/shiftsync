'use client';

import { AvailabilityForm } from '@/components/users/availability-form';
import { DesiredHoursForm } from '@/components/users/desired-hours-form';

export default function AvailabilityPage() {
  return (
    <div className="container mx-auto p-6">
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
