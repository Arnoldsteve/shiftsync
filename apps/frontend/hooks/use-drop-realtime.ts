import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRealtimeDropEvents } from './use-realtime-events';
import { queryKeys } from '@/lib/query-keys';

/**
 * Hook for real-time drop request updates
 * Requirements: 33.3, 33.5 - Drop request expiration notifications
 */
export function useDropRealtime() {
  const queryClient = useQueryClient();

  useRealtimeDropEvents(
    // onDropCreated
    () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
    },
    // onDropExpired
    (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.warning('Drop request expired', {
        description: 'Your drop request has expired as the shift starts in less than 24 hours.',
      });
    },
    // onDropClaimed
    (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Drop request claimed', {
        description: 'Someone has picked up your dropped shift.',
      });
    },
    // onDropCancelled
    () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
    }
  );
}
