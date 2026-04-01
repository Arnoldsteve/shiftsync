'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Badge,
} from '@shiftsync/ui';
import { Plus, Trash2, Calendar } from 'lucide-react';
import {
  useAvailability,
  useSetAvailabilityWindow,
  useRemoveAvailabilityWindow,
  useAddAvailabilityException,
} from '@/hooks/use-availability';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function AvailabilityForm() {
  const { data: availability, isLoading } = useAvailability();
  const setWindow = useSetAvailabilityWindow();
  const removeWindow = useRemoveAvailabilityWindow();
  const addException = useAddAvailabilityException();

  const [windowForm, setWindowForm] = useState({
    dayOfWeek: '',
    startTime: '',
    endTime: '',
  });

  const [exceptionForm, setExceptionForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });

  const handleAddWindow = (e: React.FormEvent) => {
    e.preventDefault();
    setWindow.mutate(
      {
        dayOfWeek: parseInt(windowForm.dayOfWeek),
        startTime: windowForm.startTime,
        endTime: windowForm.endTime,
      },
      {
        onSuccess: () => {
          setWindowForm({ dayOfWeek: '', startTime: '', endTime: '' });
        },
      }
    );
  };

  const handleAddException = (e: React.FormEvent) => {
    e.preventDefault();
    addException.mutate(
      {
        date: exceptionForm.date,
        startTime: exceptionForm.startTime || undefined,
        endTime: exceptionForm.endTime || undefined,
      },
      {
        onSuccess: () => {
          setExceptionForm({ date: '', startTime: '', endTime: '' });
        },
      }
    );
  };

  if (isLoading) {
    return <div>Loading availability...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Recurring Weekly Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Availability</CardTitle>
          <CardDescription>Set your recurring weekly availability windows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddWindow} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={windowForm.dayOfWeek}
                  onValueChange={(value) => setWindowForm({ ...windowForm, dayOfWeek: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={windowForm.startTime}
                  onChange={(e) => setWindowForm({ ...windowForm, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={windowForm.endTime}
                  onChange={(e) => setWindowForm({ ...windowForm, endTime: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={setWindow.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {setWindow.isPending ? 'Adding...' : 'Add Window'}
            </Button>
          </form>

          {availability?.windows && availability.windows.length > 0 && (
            <div className="space-y-2 mt-4">
              <Label>Current Windows</Label>
              <div className="space-y-2">
                {availability.windows.map((window: any) => (
                  <div
                    key={window.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {DAYS_OF_WEEK.find((d) => d.value === window.dayOfWeek)?.label}
                      </Badge>
                      <span className="text-sm">
                        {window.startTime} - {window.endTime}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWindow.mutate(window.id)}
                      disabled={removeWindow.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* One-off Exceptions */}
      <Card>
        <CardHeader>
          <CardTitle>Availability Exceptions</CardTitle>
          <CardDescription>
            Add one-off unavailability (time off, appointments, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddException} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={exceptionForm.date}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Start Time (Optional)</Label>
                <Input
                  type="time"
                  value={exceptionForm.startTime}
                  onChange={(e) =>
                    setExceptionForm({ ...exceptionForm, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Time (Optional)</Label>
                <Input
                  type="time"
                  value={exceptionForm.endTime}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, endTime: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={addException.isPending}>
              <Calendar className="mr-2 h-4 w-4" />
              {addException.isPending ? 'Adding...' : 'Add Exception'}
            </Button>
          </form>

          {availability?.exceptions && availability.exceptions.length > 0 && (
            <div className="space-y-2 mt-4">
              <Label>Current Exceptions</Label>
              <div className="space-y-2">
                {availability.exceptions.map((exception: any) => (
                  <div
                    key={exception.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        {new Date(exception.date).toLocaleDateString()}
                      </Badge>
                      {exception.startTime && exception.endTime ? (
                        <span className="text-sm">
                          {exception.startTime} - {exception.endTime}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">All day</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
