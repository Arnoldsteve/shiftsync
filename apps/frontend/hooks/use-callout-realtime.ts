import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRealtimeEvents } from './use-realtime-events';
import { queryKeys } from '@/lib/query-keys';

export function useCalloutRealtime() {
  const queryClient = useQueryClient();

  useRealtimeEvents({
    onCalloutReported: (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.callouts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.warning(`Callout reported: ${data.shiftDetails || 'Shift uncovered'}`);
    },
  });
}
