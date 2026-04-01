'use client';

import { useState, useEffect } from 'react';
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
  Badge,
  Card,
} from '@shiftsync/ui';
import { useAssignStaff, useAlternativeStaff } from '@/hooks/use-shifts';
import { useAvailableStaff } from '@/hooks/use-callouts';
import type { Shift } from '@/types/shift.types';
import type { StaffSuggestion } from '@/types/shift.types';

interface AssignStaffDialogProps {
  shift: Shift | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignStaffDialog({ shift, open, onOpenChange }: AssignStaffDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const assignStaff = useAssignStaff();

  // Fetch available staff for this shift
  const { data: availableStaff, isLoading: isLoadingStaff } = useAvailableStaff(shift?.id || '');

  // Fetch alternative staff suggestions (only when triggered)
  const {
    data: alternativeStaff,
    isLoading: isLoadingAlternatives,
    refetch: fetchAlternatives,
  } = useAlternativeStaff(shift?.id || '', selectedStaffId);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedStaffId('');
      setAssignmentError(null);
      setShowAlternatives(false);
    }
  }, [open]);

  const handleAssign = async (staffId?: string) => {
    if (!shift) return;
    const targetStaffId = staffId || selectedStaffId;
    if (!targetStaffId) return;

    try {
      await assignStaff.mutateAsync({
        shiftId: shift.id,
        staffId: targetStaffId,
      });

      setSelectedStaffId('');
      setAssignmentError(null);
      setShowAlternatives(false);
      onOpenChange(false);
    } catch (error: any) {
      // Capture the error message and fetch alternatives
      const errorMessage = error.response?.data?.message || 'Failed to assign staff';
      setAssignmentError(errorMessage);
      setShowAlternatives(true);

      // Fetch alternative staff suggestions
      fetchAlternatives();
    }
  };

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Error Message */}
          {assignmentError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{assignmentError}</p>
            </div>
          )}

          {/* Alternative Staff Suggestions */}
          {showAlternatives && (
            <div className="space-y-3">
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Alternative Staff Suggestions</h3>

                {isLoadingAlternatives ? (
                  <p className="text-sm text-gray-500">Loading alternatives...</p>
                ) : alternativeStaff && alternativeStaff.length > 0 ? (
                  <div className="space-y-2">
                    {alternativeStaff.map((suggestion: StaffSuggestion) => (
                      <Card key={suggestion.staffId} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{suggestion.staffName}</span>
                              <Badge
                                variant={suggestion.isAvailable ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {suggestion.isAvailable ? 'Available' : 'Unavailable'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {suggestion.currentHours.toFixed(1)} hours this week
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAssign(suggestion.staffId)}
                            disabled={assignStaff.isPending}
                          >
                            {assignStaff.isPending ? 'Assigning...' : 'Assign'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No alternative staff members available for this shift.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAssign()}
              disabled={!selectedStaffId || assignStaff.isPending}
            >
              {assignStaff.isPending ? 'Assigning...' : 'Assign Staff'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
