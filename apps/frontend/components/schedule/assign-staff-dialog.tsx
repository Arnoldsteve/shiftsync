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
  Input,
} from '@shiftsync/ui';
import { useAssignStaff, useAlternativeStaff } from '@/hooks/use-shifts';
import { useAvailableStaff } from '@/hooks/use-callouts';
import type { Shift } from '@/types/shift.types';
import type { StaffSuggestion } from '@/types/shift.types';
import { AlertTriangle, XCircle } from 'lucide-react';

interface ValidationError {
  type: string;
  message: string;
  details?: any;
}

interface ValidationWarning {
  type: string;
  message: string;
  details?: any;
}

interface GraduatedValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  requiresOverride: boolean;
}

interface AssignStaffDialogProps {
  shift: Shift | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignStaffDialog({ shift, open, onOpenChange }: AssignStaffDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [graduatedValidation, setGraduatedValidation] = useState<GraduatedValidationResult | null>(
    null
  );
  const [overrideReason, setOverrideReason] = useState('');
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
      setGraduatedValidation(null);
      setOverrideReason('');
      setShowAlternatives(false);
    }
  }, [open]);

  const handleAssign = async (staffId?: string, withOverride?: boolean) => {
    if (!shift) return;
    const targetStaffId = staffId || selectedStaffId;
    if (!targetStaffId) return;

    try {
      const payload: any = { staffId: targetStaffId };

      // Include override reason if provided
      if (withOverride && overrideReason.trim()) {
        payload.overrideReason = overrideReason.trim();
      }

      await assignStaff.mutateAsync({
        shiftId: shift.id,
        ...payload,
      });

      setSelectedStaffId('');
      setAssignmentError(null);
      setGraduatedValidation(null);
      setOverrideReason('');
      setShowAlternatives(false);
      onOpenChange(false);
    } catch (error: any) {
      // Check if this is a graduated validation error
      const errorData = error.response?.data;

      if (errorData?.errors || errorData?.warnings) {
        // Graduated validation response
        setGraduatedValidation({
          errors: errorData.errors || [],
          warnings: errorData.warnings || [],
          requiresOverride: errorData.requiresOverride || false,
        });
        setAssignmentError(null);
      } else {
        // Simple error message
        const errorMessage = errorData?.message || 'Failed to assign staff';
        setAssignmentError(errorMessage);
        setGraduatedValidation(null);
      }

      setShowAlternatives(true);
      fetchAlternatives();
    }
  };

  const hasBlockingErrors = graduatedValidation ? graduatedValidation.errors.length > 0 : false;
  const requiresOverride =
    graduatedValidation?.requiresOverride &&
    graduatedValidation.errors.some((e) => e.type === 'SEVEN_CONSECUTIVE_DAYS');

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

          {/* Graduated Validation Display */}
          {graduatedValidation && (
            <div className="space-y-3">
              {/* Display Errors (Red) */}
              {graduatedValidation.errors.map((error, index) => (
                <div
                  key={`error-${index}`}
                  className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2"
                >
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">{error.message}</p>
                  </div>
                </div>
              ))}

              {/* Display Warnings (Yellow) */}
              {graduatedValidation.warnings.map((warning, index) => (
                <div
                  key={`warning-${index}`}
                  className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex gap-2"
                >
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800">{warning.message}</p>
                  </div>
                </div>
              ))}

              {/* Override Option for 7-Day Scenario */}
              {requiresOverride && (
                <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <Label htmlFor="override-reason">Override Reason (Required)</Label>
                  <Input
                    id="override-reason"
                    placeholder="Enter reason for override..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                  <Button
                    onClick={() => handleAssign(undefined, true)}
                    disabled={!overrideReason.trim() || assignStaff.isPending}
                    className="w-full"
                  >
                    {assignStaff.isPending ? 'Assigning...' : 'Assign with Override'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Simple Error Message (fallback) */}
          {assignmentError && !graduatedValidation && (
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
              disabled={
                !selectedStaffId ||
                assignStaff.isPending ||
                (hasBlockingErrors && !requiresOverride)
              }
            >
              {assignStaff.isPending ? 'Assigning...' : 'Assign Staff'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
