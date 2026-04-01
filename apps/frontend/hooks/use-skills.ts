import { useQuery } from '@tanstack/react-query';
import { skillService } from '@/services/skill.service';

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: () => skillService.getSkills(),
    staleTime: 300000, // 5 minutes - skills don't change often
  });
}
