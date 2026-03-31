import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fairnessService } from '@/services/fairness.service';
import { queryKeys } from '@/lib/query-keys';
import type { FairnessFilters } from '@/types/fairness.types';

export function useFairnessReport(filters: FairnessFilters) {
  return useQuery({
    queryKey: queryKeys.fairness.hours(filters.locationId, filters.startDate, filters.endDate),
    queryFn: () => fairnessService.getFairnessReport(filters),
    enabled: !!filters.locationId && !!filters.startDate && !!filters.endDate,
  });
}

export function useHourDistribution(filters: FairnessFilters) {
  return useQuery({
    queryKey: queryKeys.fairness.hours(filters.locationId, filters.startDate, filters.endDate),
    queryFn: () => fairnessService.getHourDistribution(filters),
    enabled: !!filters.locationId && !!filters.startDate && !!filters.endDate,
  });
}

export function usePremiumShiftDistribution(filters: FairnessFilters) {
  return useQuery({
    queryKey: queryKeys.fairness.premium(filters.locationId, filters.startDate, filters.endDate),
    queryFn: () => fairnessService.getPremiumShiftDistribution(filters),
    enabled: !!filters.locationId && !!filters.startDate && !!filters.endDate,
  });
}

export function useGenerateFairnessReport() {
  return useMutation({
    mutationFn: (filters: FairnessFilters) => fairnessService.generateFairnessReport(filters),
    onSuccess: () => {
      toast.success('Fairness report generation started');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate fairness report');
    },
  });
}
