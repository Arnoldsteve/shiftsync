'use client';

import { useState } from 'react';
import {
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
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
} from '@shiftsync/ui';
import { AlertTriangle } from 'lucide-react';
import { useReportCallout } from '@/hooks/use-callouts';
import { useShifts } from '@/hooks/use-shifts';
import type { CreateCalloutDto } from '@/types/callout.types';

export default function CalloutsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCalloutDto>({
    shiftId: '',
    reason: '',
  });

  const reportCallout = useReportCallout();

  // Get upcoming shifts for current user (would need auth context for staffId)
  const { data: upcomingShifts } = useShifts({
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reportCallout.mutate(formData, {
      onSuccess: () => {
        setIsOpen(false);
        setFormData({ shiftId: '', reason: '' });
      },
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Report Callout</h1>
          <p className="text-muted-foreground">Report when you cannot make your scheduled shift</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report Callout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Report Callout</DialogTitle>
                <DialogDescription>
                  Select the shift you cannot attend and provide a reason
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="shift">Shift</Label>
                  <Select
                    value={formData.shiftId}
                    onValueChange={(value) => setFormData({ ...formData, shiftId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {upcomingShifts?.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
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
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Enter reason..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={reportCallout.isPending}>
                  {reportCallout.isPending ? 'Reporting...' : 'Report Callout'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Upcoming Shifts</CardTitle>
          <CardDescription>Shifts you are scheduled for in the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingShifts && upcomingShifts.length > 0 ? (
            <div className="space-y-2">
              {upcomingShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="p-4 border rounded-lg flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">
                      {new Date(shift.startTime).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(shift.startTime).toLocaleTimeString()} -{' '}
                      {new Date(shift.endTime).toLocaleTimeString()}
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm ${
                      shift.assignment ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {shift.assignment ? 'Assigned' : 'Uncovered'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No upcoming shifts</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
