'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shiftsync/ui';
import { Check, X } from 'lucide-react';
import { usePendingSwaps, useApproveSwap, useRejectSwap } from '@/hooks/use-swaps';
import { useSwapRealtime } from '@/hooks/use-swap-realtime';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { Action } from '@/lib/ability';

export default function SwapsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { data: swaps, isLoading } = usePendingSwaps();
  const approveSwap = useApproveSwap();
  const rejectSwap = useRejectSwap();
  useSwapRealtime();

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSwapId, setSelectedSwapId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Check if user is manager or admin
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const handleApproveClick = (swapId: string) => {
    setSelectedSwapId(swapId);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (swapId: string) => {
    setSelectedSwapId(swapId);
    setRejectDialogOpen(true);
  };

  const handleApproveConfirm = () => {
    if (selectedSwapId) {
      approveSwap.mutate(
        { swapRequestId: selectedSwapId },
        {
          onSuccess: () => {
            setApproveDialogOpen(false);
            setSelectedSwapId('');
          },
        }
      );
    }
  };

  const handleRejectConfirm = () => {
    if (selectedSwapId && rejectionReason.trim()) {
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

  // Filter to only show swaps that have been accepted by target staff (waiting for manager approval)
  const managerPendingSwaps = swaps?.filter((swap) => swap.targetStaffAcceptedAt) || [];

  // Check permissions
  if (!isManagerOrAdmin || !can(Action.Manage, 'SwapRequest')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>This page is only accessible to Managers and Admins.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Swap Requests - Manager Approval</h1>
          <p className="text-muted-foreground">
            Review and approve swap requests that have been accepted by both staff members
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Manager Approval</CardTitle>
          <CardDescription>
            Swap requests accepted by both staff members awaiting your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading swap requests...</div>
          ) : managerPendingSwaps.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Target Staff</TableHead>
                  <TableHead>Shift Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Target Accepted</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managerPendingSwaps.map((swap) => {
                  return (
                    <TableRow key={swap.id}>
                      <TableCell className="font-medium">
                        {swap.requestorName ||
                          (swap.requestor
                            ? `${swap.requestor.firstName} ${swap.requestor.lastName}`
                            : 'Unknown')}
                      </TableCell>
                      <TableCell>
                        {swap.targetStaffName ||
                          (swap.targetStaff
                            ? `${swap.targetStaff.firstName} ${swap.targetStaff.lastName}`
                            : 'Unknown')}
                      </TableCell>
                      <TableCell>
                        {swap.shift && (
                          <div className="text-sm">
                            <div>
                              {new Date(swap.shift.startTime).toLocaleDateString()} at{' '}
                              {new Date(swap.shift.startTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {new Date(swap.shift.endTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{swap.shift?.location?.name || 'Unknown'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {swap.targetStaffAcceptedAt
                            ? new Date(swap.targetStaffAcceptedAt).toLocaleDateString()
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(swap.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApproveClick(swap.id)}
                          disabled={approveSwap.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectClick(swap.id)}
                          disabled={rejectSwap.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No swap requests pending manager approval
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Swap Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this swap request? The shifts will be exchanged
              immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveConfirm} disabled={approveSwap.isPending}>
              {approveSwap.isPending ? 'Approving...' : 'Approve Swap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Swap Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this swap request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="w-full min-h-[100px] p-2 border rounded-md"
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectSwap.isPending || !rejectionReason.trim()}
            >
              {rejectSwap.isPending ? 'Rejecting...' : 'Reject Swap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
