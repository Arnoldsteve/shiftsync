import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRealtimeEvents } from './use-realtime-events';
import { queryKeys } from '@/lib/query-keys';

export function useSwapRealtime() {
  const queryClient = useQueryClient();

  useRealtimeEvents({
    onSwapCreated: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      toast.info('New swap request created');
    },
    onSwapUpdated: (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all });
      if (data.status === 'approved') {
        toast.success('Swap request approved');
      } else if (data.status === 'rejected') {
        toast.error('Swap request rejected');
      }
    },
  });
}
