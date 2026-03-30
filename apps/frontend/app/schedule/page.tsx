'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shiftsync/ui';
import { Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useRealtimeEvents } from '@/hooks/use-realtime-events';

interface Shift {
  id: string;
  locationId: string;
  startTime: string;
  endTime: string;
  timezone: string;
  requiredSkills: string[];
  assignment?: {
    id: string;
    staffId: string;
    staffName: string;
  };
}

interface CreateShiftData {
  locationId: string;
  startTime: string;
  endTime: string;
  requiredSkills: string[];
}

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [formData, setFormData] = useState<CreateShiftData>({
    locationId: '',
    startTime: '',
    endTime: '',
    requiredSkills: [],
  });

  const startDate = new Date(selectedDate);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const { data: shifts, isLoading } = useQuery({
    queryKey: queryKeys.shifts.list({
      locationId: selectedLocationId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    queryFn: async () => {
      const response = await apiClient.get('/shifts', {
        params: {
          locationId: selectedLocationId || undefined,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      return response.data as Shift[];
    },
    enabled: !!selectedLocationId,
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: CreateShiftData) => {
      const response = await apiClient.post('/shifts', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.lists() });
      toast.success('Shift created successfully');
      setIsCreateDialogOpen(false);
      setFormData({
        locationId: '',
        startTime: '',
        endTime: '',
        requiredSkills: [],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create shift');
    },
  });

  // Real-time updates
  useRealtimeEvents({
    onShiftCreated: (_shift) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.lists() });
      toast.success('New shift created');
    },
    onShiftUpdated: (_shift) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.lists() });
      toast.info('Shift updated');
    },
    onShiftDeleted: (_shiftId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.lists() });
      toast.info('Shift deleted');
    },
    onAssignmentChanged: (_assignment) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.lists() });
      toast.info('Staff assignment changed');
    },
  });

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      toast.error('End time must be after start time');
      return;
    }
    createShiftMutation.mutate(formData);
  };

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

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    return day;
  });

  const getShiftsForDay = (date: Date) => {
    return shifts?.filter((shift) => {
      const shiftDate = new Date(shift.startTime);
      return shiftDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Manage shifts and staff assignments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Shift
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateShift}>
              <DialogHeader>
                <DialogTitle>Create New Shift</DialogTitle>
                <DialogDescription>Add a new shift to the schedule</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loc1">Downtown</SelectItem>
                      <SelectItem value="loc2">Uptown</SelectItem>
                      <SelectItem value="loc3">Westside</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createShiftMutation.isPending}>
                  {createShiftMutation.isPending ? 'Creating...' : 'Create Shift'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Week View</CardTitle>
              <CardDescription>
                {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                <Calendar className="h-4 w-4 mr-2" />
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Location Filter</Label>
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loc1">Downtown</SelectItem>
                <SelectItem value="loc2">Uptown</SelectItem>
                <SelectItem value="loc3">Westside</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading schedule...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => {
                const dayShifts = getShiftsForDay(day);
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 min-h-[200px] ${
                      isToday ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="font-semibold mb-2">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      <div className="text-sm font-normal text-muted-foreground">
                        {day.getDate()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {dayShifts?.map((shift) => (
                        <div
                          key={shift.id}
                          className={`p-2 rounded text-xs ${
                            shift.assignment
                              ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                              : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                          }`}
                        >
                          <div className="font-medium">
                            {new Date(shift.startTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(shift.endTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {shift.assignment ? (
                            <div className="text-muted-foreground">
                              {shift.assignment.staffName}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">Uncovered</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
