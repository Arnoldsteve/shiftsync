import { apiClient } from '@/lib/api-client';
import type { LocationConfig, UpdateLocationConfigDto } from '@/types/config.types';

export const configService = {
  async getLocationConfig(locationId: string): Promise<LocationConfig> {
    const response = await apiClient.get(`/locations/${locationId}/config`);
    return response.data as LocationConfig;
  },

  async updateLocationConfig(
    locationId: string,
    data: UpdateLocationConfigDto
  ): Promise<LocationConfig> {
    const response = await apiClient.put(`/locations/${locationId}/config`, data);
    return response.data as LocationConfig;
  },
};
