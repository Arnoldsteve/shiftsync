'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shiftsync/ui';
import { Clock, Award } from 'lucide-react';
import { usePickupShift } from '@/hooks/use-shift-pickup';
import type { AvailableShift } from '@/types/shift.types';

interface ShiftPickupCardProps {
  shift: AvailableShift;
  autoOpen?: boolean;
  onModalClose?: () => void;
}

export function ShiftPickupCard({ shift, autoOpen = false, onModalClose }: ShiftPickupCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(autoOpen);
  const pickupShift = usePickupShift();

  // Auto-open dialog if this shift is highlighted
  useEffect(() => {
    if (autoOpen && !isDialogOpen) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        setIsDialogOpen(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, isDialogOpen]);

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open && onModalClose) {
      onModalClose();
    }
  };

  const handlePickup = () => {
    pickupShift.mutate(shift.id, {
      onSuccess: () => {
        setIsDialogOpen(false);
        if (onModalClose) {
          onModalClose();
        }
      },
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const calculateDuration = () => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{shift.locationName}</CardTitle>
              <CardDescription className="mt-1">
                {formatTime(shift.startTime)} - {new Date(shift.endTime).toLocaleTimeString()}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-1">
              {shift.offeredToUser && (
                <Badge variant="default" className="bg-green-600">
                  Offered to You
                </Badge>
              )}
              {shift.type === 'drop_request' && <Badge variant="secondary">Drop Request</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{calculateDuration()} hours</span>
            </div>

            {shift.requiredSkills && shift.requiredSkills.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Award className="h-4 w-4" />
                <span>{shift.requiredSkills.join(', ')}</span>
              </div>
            )}

            <Button onClick={() => setIsDialogOpen(true)} className="w-full mt-4">
              Pick Up Shift
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Shift Pickup</DialogTitle>
            <DialogDescription>Are you sure you want to pick up this shift?</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <div className="text-sm">
              <span className="font-semibold">Location:</span> {shift.locationName}
            </div>
            <div className="text-sm">
              <span className="font-semibold">Time:</span> {formatTime(shift.startTime)} -{' '}
              {new Date(shift.endTime).toLocaleTimeString()}
            </div>
            <div className="text-sm">
              <span className="font-semibold">Duration:</span> {calculateDuration()} hours
            </div>
            {shift.offeredToUser && (
              <div className="p-3 bg-green-50 rounded border border-green-200 text-xs text-green-800">
                This shift was specifically offered to you by a manager.
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => handleDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePickup} disabled={pickupShift.isPending}>
              {pickupShift.isPending ? 'Confirming...' : 'Confirm Pickup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
