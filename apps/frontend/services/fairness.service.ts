import { apiClient } from '@/lib/api-client';
import type { FairnessReport, FairnessFilters } from '@/types/fairness.types';

export const fairnessService = {
  async getFairnessReport(filters: FairnessFilters): Promise<FairnessReport> {
    const response = await apiClient.get(`/fairness/${filters.locationId}/report`, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
    return response.data as FairnessReport;
  },

  async getHourDistribution(filters: FairnessFilters) {
    const response = await apiClient.get(`/fairness/${filters.locationId}/hours`, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
    return response.data;
  },

  async getPremiumShiftDistribution(filters: FairnessFilters) {
    const response = await apiClient.get(`/fairness/${filters.locationId}/premium`, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
    return response.data;
  },

  async generateFairnessReport(filters: FairnessFilters): Promise<{ jobId: string }> {
    const response = await apiClient.post(`/fairness/${filters.locationId}/report`, {
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
    return response.data as { jobId: string };
  },

  async getDesiredHoursComparison(filters: FairnessFilters) {
    const response = await apiClient.get(`/fairness/${filters.locationId}/desired-hours`, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
    return response.data;
  },

  async getUnderScheduledStaff(filters: FairnessFilters) {
    const response = await apiClient.get(`/fairness/${filters.locationId}/under-scheduled`, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
    return response.data;
  },

  async getOverScheduledStaff(filters: FairnessFilters) {
    const response = await apiClient.get(`/fairness/${filters.locationId}/over-scheduled`, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
    return response.data;
  },
};
