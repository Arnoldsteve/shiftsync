import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calloutService } from '@/services/callout.service';
import { queryKeys } from '@/lib/query-keys';
import type { CreateCalloutDto } from '@/types/callout.types';

export function useCurrentCoverage() {
  return useQuery({
    queryKey: queryKeys.callouts.coverage(),
    queryFn: () => calloutService.getCurrentCoverage(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useUpcomingShifts() {
  return useQuery({
    queryKey: queryKeys.callouts.upcoming(),
    queryFn: () => calloutService.getUpcomingShifts(),
    refetchInterval: 30000,
  });
}

export function useAvailableStaff(shiftId: string) {
  return useQuery({
    queryKey: queryKeys.callouts.availableStaff(shiftId),
    queryFn: () => calloutService.getAvailableStaff(shiftId),
    enabled: !!shiftId,
  });
}

export function useReportCallout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCalloutDto) => calloutService.reportCallout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.callouts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Callout reported successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to report callout');
    },
  });
}

export function useSendShiftOffer() {
  return useMutation({
    mutationFn: ({ shiftId, staffId }: { shiftId: string; staffId: string }) =>
      calloutService.sendShiftOffer(shiftId, staffId),
    onSuccess: () => {
      toast.success('Shift offer sent successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send shift offer');
    },
  });
}
