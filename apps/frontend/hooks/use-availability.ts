import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userService } from '@/services/user.service';
import { queryKeys } from '@/lib/query-keys';

/**
 * Hook to fetch availability windows and exceptions for a user.
 * Requirement 31.1
 */
export function useAvailability(userId?: string) {
  return useQuery({
    queryKey: queryKeys.users.availability(userId || 'me'),
    queryFn: () => userService.getAvailability(userId),
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
}

/**
 * Hook to set availability window (recurring weekly).
 * Requirement 31.2
 */
export function useSetAvailabilityWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { dayOfWeek: number; startTime: string; endTime: string }) =>
      userService.setAvailabilityWindow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success('Availability window added successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add availability window';
      toast.error(message);
    },
  });
}

/**
 * Hook to remove availability window.
 * Requirement 31.3
 */
export function useRemoveAvailabilityWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (windowId: string) => userService.removeAvailabilityWindow(windowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success('Availability window removed successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to remove availability window';
      toast.error(message);
    },
  });
}

/**
 * Hook to add availability exception (one-off unavailability).
 * Requirement 31.4
 */
export function useAddAvailabilityException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { date: string; startTime?: string; endTime?: string }) =>
      userService.addAvailabilityException(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success('Availability exception added successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add availability exception';
      toast.error(message);
    },
  });
}
