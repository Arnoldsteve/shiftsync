import { apiClient } from '@/lib/api-client';
import type { OvertimeReport, OvertimeFilters } from '@/types/overtime.types';

export const overtimeService = {
  async getOvertimeReport(filters: OvertimeFilters): Promise<OvertimeReport> {
    const response = await apiClient.get(`/overtime/report/${filters.locationId}`, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
    return response.data as OvertimeReport;
  },

  async getStaffOvertime(
    staffId: string,
    startDate: string,
    endDate: string
  ): Promise<{ regularHours: number; overtimeHours: number }> {
    const response = await apiClient.get(`/overtime/${staffId}`, {
      params: { startDate, endDate },
    });
    return response.data as { regularHours: number; overtimeHours: number };
  },
};
