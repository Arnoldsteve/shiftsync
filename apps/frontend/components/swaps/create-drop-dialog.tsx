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
  Input,
} from '@shiftsync/ui';
import { HandHelping } from 'lucide-react';
import { useCreateDropRequest } from '@/hooks/use-drop-requests';
import type { CreateDropRequestDto } from '@/types/swap.types';

interface CreateDropDialogProps {
  staffShifts: Array<{ id: string; startTime: string; endTime: string; locationName?: string }>;
}

export function CreateDropDialog({ staffShifts }: CreateDropDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateDropRequestDto>({
    shiftId: '',
    reason: '',
  });

  const createDrop = useCreateDropRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDrop.mutate(formData, {
      onSuccess: () => {
        setIsOpen(false);
        setFormData({ shiftId: '', reason: '' });
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <HandHelping className="mr-2 h-4 w-4" />
          Drop Shift
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Drop Shift Request</DialogTitle>
            <DialogDescription>
              Offer your shift to any qualified staff member. Expires 24 hours before shift starts.
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
                      {shift.locationName && `${shift.locationName} - `}
                      {new Date(shift.startTime).toLocaleString()} -{' '}
                      {new Date(shift.endTime).toLocaleTimeString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                value={formData.reason || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Why are you dropping this shift?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDrop.isPending || !formData.shiftId}>
              {createDrop.isPending ? 'Creating...' : 'Drop Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
