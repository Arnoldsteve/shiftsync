import { apiClient } from '@/lib/api-client';
import type {
  Callout,
  CreateCalloutDto,
  CoverageStatus,
  AvailableStaff,
  UpcomingShift,
} from '@/types/callout.types';

export const calloutService = {
  async reportCallout(data: CreateCalloutDto): Promise<Callout> {
    const response = await apiClient.post('/callouts', data);
    return response.data as Callout;
  },

  async getCurrentCoverage(): Promise<CoverageStatus[]> {
    const response = await apiClient.get('/callouts/dashboard/coverage');
    return response.data as CoverageStatus[];
  },

  async getUpcomingShifts(): Promise<UpcomingShift[]> {
    const response = await apiClient.get('/callouts/dashboard/upcoming');
    return response.data as UpcomingShift[];
  },

  async getAvailableStaff(shiftId: string): Promise<AvailableStaff[]> {
    const response = await apiClient.get(`/callouts/shifts/${shiftId}/available-staff`);
    return response.data as AvailableStaff[];
  },

  async sendShiftOffer(shiftId: string, staffId: string): Promise<void> {
    await apiClient.post(`/callouts/shifts/${shiftId}/offer`, { staffId });
  },
};
