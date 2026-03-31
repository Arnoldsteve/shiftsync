import { useQuery } from '@tanstack/react-query';
import { overtimeService } from '@/services/overtime.service';
import { queryKeys } from '@/lib/query-keys';
import type { OvertimeFilters } from '@/types/overtime.types';

export function useOvertimeReport(filters: OvertimeFilters) {
  return useQuery({
    queryKey: queryKeys.overtime.report(filters.locationId, filters.startDate),
    queryFn: () => overtimeService.getOvertimeReport(filters),
    enabled: !!filters.locationId && !!filters.startDate && !!filters.endDate,
  });
}

export function useStaffOvertime(staffId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.overtime.staff(staffId, startDate, endDate),
    queryFn: () => overtimeService.getStaffOvertime(staffId, startDate, endDate),
    enabled: !!staffId && !!startDate && !!endDate,
  });
}
