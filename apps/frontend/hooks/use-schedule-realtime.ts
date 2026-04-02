import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRealtimeEvents } from './use-realtime-events';
import { queryKeys } from '@/lib/query-keys';

export function useScheduleRealtime() {
  const queryClient = useQueryClient();

  useRealtimeEvents({
    onShiftCreated: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.onDuty() });
      toast.success('New shift created');
    },
    onShiftUpdated: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.onDuty() });
      toast.info('Shift updated');
    },
    onShiftDeleted: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.onDuty() });
      toast.info('Shift deleted');
    },
    onAssignmentChanged: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.onDuty() });
      toast.info('Staff assignment changed');
    },
    onSchedulePublished: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.onDuty() });
      toast.success('Schedule published');
    },
  });
}
