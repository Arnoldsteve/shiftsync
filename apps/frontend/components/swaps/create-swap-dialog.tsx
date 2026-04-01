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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shiftsync/ui';
import { Plus } from 'lucide-react';
import { useCreateSwapRequest } from '@/hooks/use-swaps';
import type { CreateSwapRequestDto } from '@/types/swap.types';

interface CreateSwapDialogProps {
  staffShifts: Array<{ id: string; startTime: string; endTime: string }>;
  availableStaff: Array<{ id: string; name: string }>;
  disabled?: boolean;
}

export function CreateSwapDialog({
  staffShifts,
  availableStaff,
  disabled = false,
}: CreateSwapDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSwapRequestDto>({
    shiftId: '',
    targetStaffId: '',
  });

  const createSwap = useCreateSwapRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSwap.mutate(formData, {
      onSuccess: () => {
        setIsOpen(false);
        setFormData({ shiftId: '', targetStaffId: '' });
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} title={disabled ? 'Request limit reached' : undefined}>
          <Plus className="mr-2 h-4 w-4" />
          Request Swap
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request Shift Swap</DialogTitle>
            <DialogDescription>
              Select a shift and target staff member for the swap
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="shift">Your Shift</Label>
              <Select
                value={formData.shiftId}
                onValueChange={(value) => setFormData({ ...formData, shiftId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {staffShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {new Date(shift.startTime).toLocaleString()} -{' '}
                      {new Date(shift.endTime).toLocaleTimeString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="targetStaff">Target Staff</Label>
              <Select
                value={formData.targetStaffId}
                onValueChange={(value) => setFormData({ ...formData, targetStaffId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSwap.isPending}>
              {createSwap.isPending ? 'Requesting...' : 'Request Swap'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
