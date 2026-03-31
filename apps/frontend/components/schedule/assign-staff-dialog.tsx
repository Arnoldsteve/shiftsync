'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shiftsync/ui';
import { useAssignStaff } from '@/hooks/use-shifts';
import { useAvailableStaff } from '@/hooks/use-callouts';
import type { Shift } from '@/types/shift.types';

interface AssignStaffDialogProps {
  shift: Shift | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignStaffDialog({ shift, open, onOpenChange }: AssignStaffDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const assignStaff = useAssignStaff();

  // Fetch available staff for this shift
  const { data: availableStaff, isLoading: isLoadingStaff } = useAvailableStaff(shift?.id || '');

  const handleAssign = async () => {
    if (!shift || !selectedStaffId) return;

    await assignStaff.mutateAsync({
      shiftId: shift.id,
      staffId: selectedStaffId,
    });

    setSelectedStaffId('');
    onOpenChange(false);
  };

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Staff to Shift</DialogTitle>
          <DialogDescription>
            {new Date(shift.startTime).toLocaleString()} -{' '}
            {new Date(shift.endTime).toLocaleTimeString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Staff Member</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose staff member" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingStaff ? (
                  <SelectItem value="loading" disabled>
                    Loading staff...
                  </SelectItem>
                ) : availableStaff && availableStaff.length > 0 ? (
                  availableStaff.map((staff) => (
                    <SelectItem key={staff.staffId} value={staff.staffId}>
                      {staff.staffName} ({staff.currentHours.toFixed(1)}h this week)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No available staff
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedStaffId && availableStaff && (
            <div className="space-y-2">
              {(() => {
                const staff = availableStaff.find((s) => s.staffId === selectedStaffId);
                if (!staff) return null;

                return (
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium">Skills:</span>{' '}
                      {staff.skills.join(', ') || 'None'}
                    </div>
                    <div>
                      <span className="font-medium">Current Hours:</span>{' '}
                      {staff.currentHours.toFixed(1)} hours this week
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedStaffId || assignStaff.isPending}>
              {assignStaff.isPending ? 'Assigning...' : 'Assign Staff'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
