'use client';

import { useState } from 'react';
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
} from '@shiftsync/ui';
import { useAuth } from '@/contexts/auth-context';
import { useShifts } from '@/hooks/use-shifts';
import { useStaffSwaps, useCancelSwapRequest } from '@/hooks/use-swaps';
import { useDropRequests } from '@/hooks/use-drop-requests';
import { CreateSwapDialog } from '@/components/swaps/create-swap-dialog';
import { CreateDropDialog } from '@/components/swaps/create-drop-dialog';
import { Clock, MapPin, X } from 'lucide-react';

export default function MyShiftsPage() {
  const { user } = useAuth();
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

  const { data: shifts, isLoading: shiftsLoading } = useShifts({
    staffId: user?.id,
    ...dateRange,
  });

  const { data: swapRequests, isLoading: swapsLoading } = useStaffSwaps(user?.id || '');
  const { data: dropRequests, isLoading: dropsLoading } = useDropRequests(user?.id || '');
  const cancelSwap = useCancelSwapRequest();

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      cancelled: 'outline',
      claimed: 'default',
      expired: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
  };

  const myShifts = shifts?.filter((s) => s.assignment?.staffId === user?.id) || [];
  const availableStaff: Array<{ id: string; name: string }> = []; // TODO: Fetch available staff for swaps

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Shifts</h1>
          <p className="text-muted-foreground">Manage your shifts, swaps, and drop requests</p>
        </div>
        <div className="flex gap-2">
          <CreateSwapDialog staffShifts={myShifts} availableStaff={availableStaff} />
          <CreateDropDialog staffShifts={myShifts} />
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
              {swapRequests.map((swap) => (
                <Card key={swap.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Swap Request</CardTitle>
                        <CardDescription>
                          {formatDateTime(swap.shift?.startTime || '')}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(swap.status)}
                        {swap.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelSwap.mutate(swap.id)}
                            disabled={cancelSwap.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Target Staff:</span> {swap.targetStaffName}
                      </div>
                      {swap.reason && (
                        <div>
                          <span className="font-medium">Reason:</span> {swap.reason}
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
                <CardTitle>No Swap Requests</CardTitle>
                <CardDescription>You don&apos;t have any pending swap requests.</CardDescription>
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
                      {getStatusBadge(drop.status)}
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
                      {drop.expiresAt && drop.status === 'pending' && (
                        <div className="text-xs text-muted-foreground">
                          Expires: {new Date(drop.expiresAt).toLocaleString()}
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
    </div>
  );
}
