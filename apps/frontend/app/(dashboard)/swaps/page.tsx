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
  Button,
  Input,
  Label,
} from '@shiftsync/ui';
import { usePendingSwaps, useApproveSwap, useRejectSwap } from '@/hooks/use-swaps';
import { SwapTable } from '@/components/swaps/swap-table';
import { useSwapRealtime } from '@/hooks/use-swap-realtime';

export default function SwapsPage() {
  const { data: swaps, isLoading } = usePendingSwaps();
  const approveSwap = useApproveSwap();
  const rejectSwap = useRejectSwap();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSwapId, setSelectedSwapId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');

  useSwapRealtime();

  const handleApprove = (swapId: string) => {
    approveSwap.mutate({ swapRequestId: swapId });
  };

  const handleRejectClick = (swapId: string) => {
    setSelectedSwapId(swapId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedSwapId && rejectionReason) {
      rejectSwap.mutate(
        { swapRequestId: selectedSwapId, reason: rejectionReason },
        {
          onSuccess: () => {
            setRejectDialogOpen(false);
            setSelectedSwapId('');
            setRejectionReason('');
          },
        }
      );
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Swap Requests</h1>
          <p className="text-muted-foreground">Review and manage shift swap requests</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Swaps</CardTitle>
          <CardDescription>Approve or reject shift swap requests from staff</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading swap requests...</div>
          ) : swaps && swaps.length > 0 ? (
            <SwapTable
              swaps={swaps}
              onApprove={handleApprove}
              onReject={handleRejectClick}
              showActions
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">No pending swap requests</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Swap Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this swap request
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Input
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason || rejectSwap.isPending}
            >
              {rejectSwap.isPending ? 'Rejecting...' : 'Reject Swap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
