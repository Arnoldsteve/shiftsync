import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/contexts/websocket-context';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

export function useJobRealtime() {
  const { socket } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleJobCompleted = (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });

      if (data.status === 'completed') {
        toast.success(`Job ${data.type} completed successfully`);
      } else if (data.status === 'failed') {
        toast.error(`Job ${data.type} failed: ${data.error || 'Unknown error'}`);
      }
    };

    socket.on('job:completed', handleJobCompleted);

    return () => {
      socket.off('job:completed', handleJobCompleted);
    };
  }, [socket, queryClient]);
}
