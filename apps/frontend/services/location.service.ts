import { apiClient } from '@/lib/api-client';

export interface Location {
  id: string;
  name: string;
  timezone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export const locationService = {
  getAllLocations: async (): Promise<Location[]> => {
    const response = await apiClient.get<Location[]>('/locations');
    return response.data;
  },
};
