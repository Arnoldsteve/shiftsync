import { useQuery } from '@tanstack/react-query';
import { locationService } from '@/services/location.service';

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAllLocations(),
    staleTime: 5 * 60 * 1000, // 5 minutes - locations don't change often
  });
}
