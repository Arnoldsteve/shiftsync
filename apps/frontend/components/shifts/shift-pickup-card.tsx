'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@shiftsync/ui';
import { Clock, Award } from 'lucide-react';
import { usePickupShift } from '@/hooks/use-shift-pickup';
import type { AvailableShift } from '@/types/shift.types';

interface ShiftPickupCardProps {
  shift: AvailableShift;
}

export function ShiftPickupCard({ shift }: ShiftPickupCardProps) {
  const pickupShift = usePickupShift();

  const handlePickup = () => {
    pickupShift.mutate(shift.id);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const calculateDuration = () => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{shift.locationName}</CardTitle>
            <CardDescription className="mt-1">
              {formatTime(shift.startTime)} - {new Date(shift.endTime).toLocaleTimeString()}
            </CardDescription>
          </div>
          {shift.type === 'drop_request' && <Badge variant="secondary">Drop Request</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{calculateDuration()} hours</span>
          </div>

          {shift.requiredSkills && shift.requiredSkills.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="h-4 w-4" />
              <span>{shift.requiredSkills.join(', ')}</span>
            </div>
          )}

          <Button onClick={handlePickup} disabled={pickupShift.isPending} className="w-full mt-4">
            {pickupShift.isPending ? 'Picking up...' : 'Pick Up Shift'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
