import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { swapService } from '@/services/swap.service';
import { queryKeys } from '@/lib/query-keys';
import type {
  CreateSwapRequestDto,
  ApproveSwapDto,
  RejectSwapDto,
  SwapFilters,
} from '@/types/swap.types';

export function useSwaps(filters?: SwapFilters) {
  return useQuery({
    queryKey: queryKeys.swaps.all,
    queryFn: () => swapService.getSwapRequests(filters),
  });
}

export function usePendingSwaps() {
  return useQuery({
    queryKey: queryKeys.swaps.pending(),
    queryFn: () => swapService.getPendingSwaps(),
  });
}

export function useStaffSwaps(staffId: string) {
  return useQuery({
    queryKey: queryKeys.swaps.byStaff(staffId),
    queryFn: () => swapService.getSwapsByStaff(staffId),
    enabled: !!staffId,
  });
}

export function useCreateSwapRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSwapRequestDto) => swapService.createSwapRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      toast.success('Swap request created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create swap request');
    },
  });
}

export function useApproveSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApproveSwapDto) => swapService.approveSwap(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Swap request approved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve swap');
    },
  });
}

export function useRejectSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RejectSwapDto) => swapService.rejectSwap(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      toast.success('Swap request rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject swap');
    },
  });
}

/**
 * Hook to cancel a pending swap request
 * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5
 *
 * Allows staff to cancel their own pending swap requests
 * Notifies target staff and manager, decrements pending count
 */
export function useCancelSwapRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (swapRequestId: string) => swapService.cancelSwapRequest(swapRequestId),
    onSuccess: () => {
      // Invalidate swaps and all pending counts
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      toast.success('Swap request cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel swap request');
    },
  });
}

/**
 * Hook to accept a swap request (target staff)
 * Requirements: 7.6
 */
export function useAcceptSwapRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (swapRequestId: string) => swapService.acceptSwapRequest(swapRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      toast.success('Swap request accepted - pending manager approval');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to accept swap request');
    },
  });
}

/**
 * Hook to decline a swap request (target staff)
 * Requirements: 7.6
 */
export function useDeclineSwapRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (swapRequestId: string) => swapService.declineSwapRequest(swapRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      toast.success('Swap request declined');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to decline swap request');
    },
  });
}
