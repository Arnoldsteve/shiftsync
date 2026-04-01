import { apiClient } from '@/lib/api-client';

export interface Skill {
  id: string;
  name: string;
  description?: string;
}

class SkillService {
  async getSkills(): Promise<Skill[]> {
    const response = await apiClient.get<Skill[]>('/users/skills/all');
    return response.data;
  }
}

export const skillService = new SkillService();
