import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { swapService } from '@/services/swap.service';
import { queryKeys } from '@/lib/query-keys';
import type { CreateDropRequestDto } from '@/types/swap.types';

/**
 * Hook to fetch drop requests for a specific staff member.
 * Requirement 33.1
 */
export function useDropRequests(staffId: string) {
  return useQuery({
    queryKey: queryKeys.swaps.dropsByStaff(staffId),
    queryFn: () => swapService.getDropRequestsByStaff(staffId),
    enabled: !!staffId,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
}

/**
 * Hook to create a drop request (offer shift without target staff).
 * Requirements: 33.2, 33.3
 */
export function useCreateDropRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDropRequestDto) => swapService.createDropRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Drop request created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create drop request';
      toast.error(message);
    },
  });
}

/**
 * Hook to get pending request count (swaps + drops).
 * Requirement 35.1 - Max 3 pending requests per staff
 */
export function usePendingRequestCount(staffId: string) {
  return useQuery({
    queryKey: queryKeys.swaps.pendingCount(staffId),
    queryFn: () => swapService.getPendingRequestCount(staffId),
    enabled: !!staffId,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });
}

/**
 * Hook to cancel a drop request by the requestor.
 * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5 (similar to swap cancellation)
 */
export function useCancelDropRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dropRequestId: string) => swapService.cancelDropRequest(dropRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Drop request cancelled successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to cancel drop request';
      toast.error(message);
    },
  });
}
