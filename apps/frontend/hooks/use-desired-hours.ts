import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userService } from '@/services/user.service';
import { queryKeys } from '@/lib/query-keys';

/**
 * Hook to fetch desired weekly hours for a user.
 * Requirement 41.1
 */
export function useDesiredHours(userId?: string) {
  return useQuery({
    queryKey: queryKeys.users.desiredHours(userId || 'me'),
    queryFn: () => userService.getDesiredWeeklyHours(userId),
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to set desired weekly hours for current user.
 * Requirement 41.2
 */
export function useSetDesiredHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hours: number) => userService.setDesiredWeeklyHours(hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success('Desired hours updated successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update desired hours';
      toast.error(message);
    },
  });
}
