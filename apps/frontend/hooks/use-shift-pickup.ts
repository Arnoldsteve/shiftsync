import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { shiftService } from '@/services/shift.service';
import { queryKeys } from '@/lib/query-keys';

/**
 * Hook to fetch available shifts for pickup
 * Requirements: 34.1, 34.2
 *
 * Returns unassigned shifts and drop requests that the current staff member
 * is qualified for (has required skills and location certification)
 */
export function useAvailableShifts() {
  return useQuery({
    queryKey: queryKeys.shifts.available(),
    queryFn: () => shiftService.getAvailableShifts(),
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    staleTime: 10000, // 10 seconds - keep fresh for real-time feel
  });
}

/**
 * Hook to pick up an available shift
 * Requirements: 34.3, 34.4, 34.5
 *
 * Validates all constraints (overlap, rest period, compliance) before assignment
 */
export function usePickupShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftId: string) => shiftService.pickupShift(shiftId),
    onSuccess: () => {
      // Invalidate both available shifts and regular shifts
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.available() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Shift picked up successfully!');
    },
    onError: (error: any) => {
      // Show detailed constraint violation messages
      const message = error.response?.data?.message || 'Failed to pick up shift';
      toast.error(message, {
        duration: 5000, // Show longer for constraint violation details
      });
    },
  });
}
