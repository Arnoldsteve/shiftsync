'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Input,
} from '@shiftsync/ui';
import { Clock } from 'lucide-react';
import { useDesiredHours, useSetDesiredHours } from '@/hooks/use-desired-hours';

export function DesiredHoursForm() {
  const { data: desiredHours, isLoading } = useDesiredHours();
  const setDesiredHours = useSetDesiredHours();
  const [hours, setHours] = useState<string>('');

  useEffect(() => {
    if (desiredHours?.hours !== undefined && desiredHours?.hours !== null) {
      setHours(desiredHours.hours.toString());
    }
  }, [desiredHours]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hoursValue = parseFloat(hours);
    if (hoursValue > 0 && hoursValue <= 168) {
      setDesiredHours.mutate(hoursValue);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desired Weekly Hours</CardTitle>
        <CardDescription>
          Set your preferred number of hours per week. Managers will use this to ensure fair
          distribution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hours">Hours per Week</Label>
            <div className="flex gap-2">
              <Input
                id="hours"
                type="number"
                min="0"
                max="168"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Enter desired hours"
                className="flex-1"
              />
              <Button type="submit" disabled={setDesiredHours.isPending || !hours}>
                <Clock className="mr-2 h-4 w-4" />
                {setDesiredHours.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Current:{' '}
              {desiredHours?.hours !== null ? `${desiredHours?.hours} hours/week` : 'Not set'}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
