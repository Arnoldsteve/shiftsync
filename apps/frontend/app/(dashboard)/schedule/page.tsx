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
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shiftsync/ui';
import { CheckCircle, XCircle } from 'lucide-react';
import { useShifts, usePublishSchedule, useUnpublishSchedule } from '@/hooks/use-shifts';
import { useScheduleRealtime } from '@/hooks/use-schedule-realtime';
import { useLocations } from '@/hooks/use-locations';
import { useAuth } from '@/contexts/auth-context';
import { WeekCalendar } from '@/components/schedule/week-calendar';
import { CreateShiftDialog } from '@/components/schedule/create-shift-dialog';
import { AssignStaffDialog } from '@/components/schedule/assign-staff-dialog';
import { Can } from '@/components/auth/can';
import { Action } from '@/lib/ability';
import type { Shift } from '@/types/shift.types';

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);

  const { user } = useAuth();
  const isStaff = user?.role === 'STAFF';

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
  const publishSchedule = usePublishSchedule();
  const unpublishSchedule = useUnpublishSchedule();

  useScheduleRealtime();

  // Filter shifts based on user role (Requirement 32.3, 32.4)
  const filteredShifts = isStaff
    ? shifts?.filter((shift) => shift.isPublished) || []
    : shifts || [];

  // Check if schedule is published
  const isSchedulePublished = shifts?.some((shift) => shift.isPublished) || false;

  // Calculate cutoff time (48 hours before week start)
  const cutoffTime = new Date(startDate);
  cutoffTime.setHours(cutoffTime.getHours() - 48);
  const isWithinCutoff = new Date() > cutoffTime;

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

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift);
    setAssignDialogOpen(true);
  };

  const handlePublish = async () => {
    if (!selectedLocationId) return;

    await publishSchedule.mutateAsync({
      locationId: selectedLocationId,
      weekStartDate: startDate.toISOString(),
    });
  };

  const handleUnpublish = async () => {
    if (!selectedLocationId) return;

    // Check cutoff time (Requirement 32.4)
    if (isWithinCutoff) {
      setUnpublishDialogOpen(true);
      return;
    }

    await unpublishSchedule.mutateAsync({
      locationId: selectedLocationId,
      weekStartDate: startDate.toISOString(),
    });
  };

  const confirmUnpublish = async () => {
    if (!selectedLocationId) return;

    await unpublishSchedule.mutateAsync({
      locationId: selectedLocationId,
      weekStartDate: startDate.toISOString(),
    });
    setUnpublishDialogOpen(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Manage shifts and staff assignments</p>
        </div>
        <Can I={Action.Create} a="Shift">
          <CreateShiftDialog />
        </Can>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
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
                {isStaff && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Showing published shifts only
                  </div>
                )}
              </CardDescription>
            </div>

            {/* Publish/Unpublish Buttons (Requirement 32.1, 32.2) */}
            <Can I={Action.Update} a="Schedule">
              <div className="flex gap-2">
                {isSchedulePublished ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnpublish}
                    disabled={!selectedLocationId || unpublishSchedule.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePublish}
                    disabled={!selectedLocationId || publishSchedule.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Publish Schedule
                  </Button>
                )}
              </div>
            </Can>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading schedule...</div>
          ) : filteredShifts.length > 0 ? (
            <WeekCalendar
              startDate={startDate}
              endDate={endDate}
              shifts={filteredShifts}
              onPreviousWeek={goToPreviousWeek}
              onNextWeek={goToNextWeek}
              onToday={goToToday}
              onShiftClick={handleShiftClick}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {selectedLocationId
                ? isStaff
                  ? 'No published shifts available'
                  : 'No shifts scheduled for this week'
                : 'Select a location to view schedule'}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignStaffDialog
        shift={selectedShift}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />

      {/* Cutoff Time Warning Dialog (Requirement 32.4) */}
      <AlertDialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish Schedule Warning</AlertDialogTitle>
            <AlertDialogDescription>
              You are attempting to unpublish a schedule within 48 hours of the week start date (
              {startDate.toLocaleDateString()}). This may cause confusion for staff who have already
              viewed their published schedules.
              <br />
              <br />
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnpublish}>Unpublish Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
