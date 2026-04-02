'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shiftsync/ui';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { Action } from '@/lib/ability';
import { Can } from '@/components/auth/can';
import { useStaffShifts } from '@/hooks/use-shifts';
import {
  useStaffSwaps,
  useCancelSwapRequest,
  useAcceptSwapRequest,
  useDeclineSwapRequest,
} from '@/hooks/use-swaps';
import {
  useDropRequests,
  useCancelDropRequest,
  usePendingRequestCount,
} from '@/hooks/use-drop-requests';
import { useDropRealtime } from '@/hooks/use-drop-realtime';
import { useSwapRealtime } from '@/hooks/use-swap-realtime';
import { useUsers } from '@/hooks/use-users';
import { CreateSwapDialog } from '@/components/swaps/create-swap-dialog';
import { CreateDropDialog } from '@/components/swaps/create-drop-dialog';
import { Clock, MapPin, X, AlertCircle, Check } from 'lucide-react';

export default function MyShiftsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [dateRange] = useState(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  });

  // Requirement 37: Swap cancellation confirmation dialog state
  const [swapToCancelId, setSwapToCancelId] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSwapId, setSelectedSwapId] = useState<string>('');

  const { data: shifts, isLoading: shiftsLoading } = useStaffShifts(user?.id || '', {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { data: swapRequests, isLoading: swapsLoading } = useStaffSwaps(user?.id || '');
  const { data: dropRequests, isLoading: dropsLoading } = useDropRequests(user?.id || '');
  const { data: pendingCount } = usePendingRequestCount(user?.id || '');
  const { data: allUsers } = useUsers();

  // Debug logging
  console.log('[MyShiftsPage] User ID:', user?.id);
  console.log('[MyShiftsPage] Swap Requests:', swapRequests);
  console.log('[MyShiftsPage] Pending Count:', pendingCount);
  console.log('[MyShiftsPage] Drop Requests:', dropRequests);
  const cancelSwap = useCancelSwapRequest();
  const acceptSwap = useAcceptSwapRequest();
  const declineSwap = useDeclineSwapRequest();
  const cancelDrop = useCancelDropRequest();

  // Enable real-time updates
  useDropRealtime();
  useSwapRealtime();

  // Requirement 35.1 - Max 3 pending requests per staff (configurable per location)
  const maxPendingRequests = 3; // Default limit
  const currentPendingCount = pendingCount?.count || 0;
  const isAtRequestLimit = currentPendingCount >= maxPendingRequests;

  // Filter for staff members only (exclude current user)
  const availableStaff = useMemo(() => {
    if (!allUsers || !user) return [];
    return allUsers
      .filter((u) => u.role === 'STAFF' && u.id !== user.id)
      .map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
      }));
  }, [allUsers, user]);

  // Helper functions
  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTimeUntilExpiration = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const hoursUntil = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 0) return 'Expired';
    if (hoursUntil < 1) return `${Math.round(hoursUntil * 60)} minutes`;
    if (hoursUntil < 24) return `${Math.round(hoursUntil)} hours`;
    return `${Math.round(hoursUntil / 24)} days`;
  };

  const isExpiringSoon = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const hoursUntil = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil < 6 && hoursUntil > 0; // Less than 6 hours
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      cancelled: 'outline',
      claimed: 'default',
      expired: 'outline',
    };
    return <Badge variant={variants[statusLower] || 'default'}>{status.toUpperCase()}</Badge>;
  };

  // The useStaffShifts hook already filters by staff ID, no need to filter again
  const myShifts = shifts || [];

  // Requirement 37.1: Handle swap cancellation with confirmation
  const handleCancelSwapClick = (swapId: string) => {
    setSwapToCancelId(swapId);
    setCancelDialogOpen(true);
  };

  // Requirement 37.2, 37.3: Confirm cancellation and update status
  const confirmCancelSwap = () => {
    if (swapToCancelId) {
      cancelSwap.mutate(swapToCancelId);
    }
    setCancelDialogOpen(false);
    setSwapToCancelId(null);
  };

  const confirmAcceptSwap = () => {
    if (selectedSwapId) {
      acceptSwap.mutate(selectedSwapId);
    }
    setAcceptDialogOpen(false);
    setSelectedSwapId('');
  };

  const confirmDeclineSwap = () => {
    if (selectedSwapId) {
      declineSwap.mutate(selectedSwapId);
    }
    setRejectDialogOpen(false);
    setSelectedSwapId('');
  };

  // Route guard: Only STAFF can access this page
  if (user?.role !== 'STAFF') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>This page is only available to staff members.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check permissions
  if (!can(Action.Read, 'SwapRequest')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don&apos;t have permission to view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Shifts</h1>
          <p className="text-muted-foreground">Manage your shifts, swaps, and drop requests</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Requirement 35.1, 35.2 - Display pending request count */}
          <div className="text-sm text-muted-foreground">
            Pending requests: {currentPendingCount}/{maxPendingRequests}
          </div>
          <div className="flex gap-2">
            <Can I={Action.Create} a="SwapRequest">
              <CreateSwapDialog
                staffShifts={myShifts}
                availableStaff={availableStaff}
                disabled={isAtRequestLimit}
              />
            </Can>
            <Can I={Action.Create} a="DropRequest">
              <CreateDropDialog staffShifts={myShifts} disabled={isAtRequestLimit} />
            </Can>
          </div>
          {/* Requirement 35.3 - Show error message when limit reached */}
          {isAtRequestLimit && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="h-4 w-4" />
              <span>Request limit reached. Cancel or wait for approval.</span>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="shifts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shifts">My Shifts</TabsTrigger>
          <TabsTrigger value="swaps">Swap Requests</TabsTrigger>
          <TabsTrigger value="drops">Drop Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-4">
          {shiftsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading shifts...</div>
          ) : myShifts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myShifts.map((shift) => (
                <Card key={shift.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{shift.locationName}</CardTitle>
                    <CardDescription>{formatDateTime(shift.startTime)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(shift.endTime).toLocaleTimeString()} (
                          {(
                            (new Date(shift.endTime).getTime() -
                              new Date(shift.startTime).getTime()) /
                            (1000 * 60 * 60)
                          ).toFixed(1)}{' '}
                          hrs)
                        </span>
                      </div>
                      {shift.requiredSkills && shift.requiredSkills.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>Skills: {shift.requiredSkills.join(', ')}</span>
                        </div>
                      )}
                      {shift.isPublished && (
                        <Badge variant="outline" className="mt-2">
                          Published
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Shifts</CardTitle>
                <CardDescription>You don&apos;t have any shifts scheduled.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="swaps" className="space-y-4">
          {swapsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading swap requests...</div>
          ) : swapRequests && swapRequests.length > 0 ? (
            <div className="space-y-4">
              {swapRequests.map((swap) => {
                const isOutgoing = swap.requestorId === user?.id;
                const isIncoming = swap.targetStaffId === user?.id;
                const isPending = swap.status === 'PENDING';

                return (
                  <Card key={swap.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">
                              {isOutgoing ? 'Outgoing' : 'Incoming'} Swap Request
                            </CardTitle>
                            <Badge variant={isOutgoing ? 'default' : 'secondary'}>
                              {isOutgoing ? 'Sent' : 'Received'}
                            </Badge>
                          </div>
                          <CardDescription>
                            {formatDateTime(swap.shift?.startTime || '')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">{getStatusBadge(swap.status)}</div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium">{isOutgoing ? 'To:' : 'From:'}</span>{' '}
                          {isOutgoing ? swap.targetStaffName : swap.requestorName}
                        </div>
                        {swap.reason && (
                          <div>
                            <span className="font-medium">Reason:</span> {swap.reason}
                          </div>
                        )}
                        <Can I={Action.Update} a="SwapRequest">
                          {isPending && (
                            <div className="flex gap-2 pt-2">
                              {isOutgoing && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelSwapClick(swap.id)}
                                  disabled={cancelSwap.isPending}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel Request
                                </Button>
                              )}
                              {isIncoming && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedSwapId(swap.id);
                                      setAcceptDialogOpen(true);
                                    }}
                                    disabled={acceptSwap.isPending}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Accept
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedSwapId(swap.id);
                                      setRejectDialogOpen(true);
                                    }}
                                    disabled={declineSwap.isPending}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Decline
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </Can>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Swap Requests</CardTitle>
                <CardDescription>You don&apos;t have any swap requests.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="drops" className="space-y-4">
          {dropsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading drop requests...</div>
          ) : dropRequests && dropRequests.length > 0 ? (
            <div className="space-y-4">
              {dropRequests.map((drop) => (
                <Card key={drop.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Drop Request</CardTitle>
                        <CardDescription>
                          {formatDateTime(drop.shift?.startTime || '')}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(drop.status)}
                        <Can I={Action.Update} a="DropRequest">
                          {drop.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelDrop.mutate(drop.id)}
                              disabled={cancelDrop.isPending}
                              title="Cancel drop request"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </Can>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{drop.shift?.locationName}</span>
                      </div>
                      {drop.reason && (
                        <div>
                          <span className="font-medium">Reason:</span> {drop.reason}
                        </div>
                      )}
                      {drop.claimedBy && (
                        <div>
                          <span className="font-medium">Claimed by:</span> {drop.claimedBy}
                        </div>
                      )}
                      {drop.expiresAt && drop.status === 'PENDING' && (
                        <div
                          className={`flex items-center gap-2 text-xs ${
                            isExpiringSoon(drop.expiresAt)
                              ? 'text-orange-600 font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {isExpiringSoon(drop.expiresAt) && <AlertCircle className="h-3 w-3" />}
                          <span>
                            Expires in {getTimeUntilExpiration(drop.expiresAt)} (
                            {new Date(drop.expiresAt).toLocaleString()})
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Drop Requests</CardTitle>
                <CardDescription>You don&apos;t have any drop requests.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Requirement 37: Swap cancellation confirmation dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Swap Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this swap request? The target staff member and manager
              will be notified of the cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelSwap}>Yes, cancel request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accept Swap Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Swap Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this swap request? This will send it to your manager
              for final approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAcceptSwap} disabled={acceptSwap.isPending}>
              {acceptSwap.isPending ? 'Accepting...' : 'Accept Swap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Swap Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Swap Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this swap request?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeclineSwap}
              disabled={declineSwap.isPending}
            >
              {declineSwap.isPending ? 'Declining...' : 'Decline Swap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
