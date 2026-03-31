import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { jobService } from '@/services/job.service';
import { queryKeys } from '@/lib/query-keys';
import type { JobListFilters } from '@/types/job.types';

export function useJobs(filters: JobListFilters) {
  return useQuery({
    queryKey: queryKeys.jobs.list(filters.queue || 'all', filters.status || 'all'),
    queryFn: () => jobService.getJobs(filters),
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

export function useJob(queue: string, jobId: string) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(queue, jobId),
    queryFn: () => jobService.getJob(queue, jobId),
    enabled: !!queue && !!jobId,
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) =>
      jobService.retryJob(queue, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      toast.success('Job retry initiated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to retry job');
    },
  });
}
