'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DatePicker,
} from '@shiftsync/ui';
import { toast } from 'sonner';
import { useCreateShift } from '@/hooks/use-shifts';
import { useLocations } from '@/hooks/use-locations';
import type { CreateShiftDto } from '@/types/shift.types';

export function CreateShiftDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [locationId, setLocationId] = useState('');

  const createShift = useCreateShift();
  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  const resetForm = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime('09:00');
    setEndTime('17:00');
    setLocationId('');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    if (!locationId) {
      toast.error('Please select a location');
      return;
    }

    // Combine date and time
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startDateTime = new Date(startDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(endDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    if (endDateTime <= startDateTime) {
      toast.error('End time must be after start time');
      return;
    }

    const formData: CreateShiftDto = {
      locationId,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      requiredSkillIds: [],
    };

    createShift.mutate(formData, {
      onSuccess: () => {
        setIsOpen(false);
        resetForm();
      },
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Shift
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Shift</DialogTitle>
            <DialogDescription>Add a new shift to the schedule</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Location */}
            <div className="grid gap-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Location
              </Label>
              <Select value={locationId} onValueChange={setLocationId} required>
                <SelectTrigger id="location" className="w-full">
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

            {/* Start Date & Time */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Start Date & Time</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Select start date"
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* End Date & Time */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">End Date & Time</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <DatePicker value={endDate} onChange={setEndDate} placeholder="Select end date" />
                </div>
                <div className="w-32">
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              disabled={createShift.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createShift.isPending || !locationId}>
              {createShift.isPending ? 'Creating...' : 'Create Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
