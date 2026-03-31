'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shiftsync/ui';
import { useShifts } from '@/hooks/use-shifts';
import { useScheduleRealtime } from '@/hooks/use-schedule-realtime';
import { useLocations } from '@/hooks/use-locations';
import { WeekCalendar } from '@/components/schedule/week-calendar';
import { CreateShiftDialog } from '@/components/schedule/create-shift-dialog';

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const startDate = new Date(selectedDate);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const { data: shifts, isLoading } = useShifts({
    locationId: selectedLocationId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  useScheduleRealtime();

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Manage shifts and staff assignments</p>
        </div>
        <CreateShiftDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Week View</CardTitle>
          <CardDescription>
            <div className="mt-2">
              <Label>Location Filter</Label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingLocations ? (
                    <SelectItem value="loading" disabled>
                      Loading locations...
                    </SelectItem>
                  ) : locations && locations.length > 0 ? (
                    locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No locations available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading schedule...</div>
          ) : shifts ? (
            <WeekCalendar
              startDate={startDate}
              endDate={endDate}
              shifts={shifts}
              onPreviousWeek={goToPreviousWeek}
              onNextWeek={goToNextWeek}
              onToday={goToToday}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select a location to view schedule
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
