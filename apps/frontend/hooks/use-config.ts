import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { configService } from '@/services/config.service';
import { queryKeys } from '@/lib/query-keys';
import type { UpdateLocationConfigDto } from '@/types/config.types';

export function useLocationConfig(locationId: string) {
  return useQuery({
    queryKey: queryKeys.config.location(locationId),
    queryFn: () => configService.getLocationConfig(locationId),
    enabled: !!locationId,
  });
}

export function useUpdateLocationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ locationId, data }: { locationId: string; data: UpdateLocationConfigDto }) =>
      configService.updateLocationConfig(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.all });
      toast.success('Configuration updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update configuration');
    },
  });
}
