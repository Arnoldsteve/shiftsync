'use client';

import { useState } from 'react';
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
} from '@shiftsync/ui';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateShift } from '@/hooks/use-shifts';
import type { CreateShiftDto } from '@/types/shift.types';

export function CreateShiftDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateShiftDto>({
    locationId: '',
    startTime: '',
    endTime: '',
    requiredSkills: [],
  });

  const createShift = useCreateShift();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      toast.error('End time must be after start time');
      return;
    }

    createShift.mutate(formData, {
      onSuccess: () => {
        setIsOpen(false);
        setFormData({
          locationId: '',
          startTime: '',
          endTime: '',
          requiredSkills: [],
        });
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Shift
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
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
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createShift.isPending}>
              {createShift.isPending ? 'Creating...' : 'Create Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
