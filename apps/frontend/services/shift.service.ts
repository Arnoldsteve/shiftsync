import { apiClient } from '@/lib/api-client';
import type {
  Shift,
  CreateShiftDto,
  UpdateShiftDto,
  ShiftFilters,
  AssignStaffDto,
  PublishScheduleDto,
  UnpublishScheduleDto,
} from '@/types/shift.types';

export const shiftService = {
  async getShifts(filters?: ShiftFilters): Promise<Shift[]> {
    const response = await apiClient.get('/schedule/shifts', { params: filters });
    // Backend returns { shifts: [], total: number }, extract the shifts array
    return response.data.shifts as Shift[];
  },

  async getShiftById(id: string): Promise<Shift> {
    const response = await apiClient.get(`/schedule/shifts/${id}`);
    return response.data as Shift;
  },

  async createShift(data: CreateShiftDto): Promise<Shift> {
    const response = await apiClient.post('/schedule/shifts', data);
    return response.data as Shift;
  },

  async updateShift(id: string, data: UpdateShiftDto): Promise<Shift> {
    const response = await apiClient.put(`/schedule/shifts/${id}`, data);
    return response.data as Shift;
  },

  async deleteShift(id: string): Promise<void> {
    await apiClient.delete(`/schedule/shifts/${id}`);
  },

  async assignStaff(data: AssignStaffDto): Promise<Shift> {
    const response = await apiClient.post(`/schedule/shifts/${data.shiftId}/assign`, {
      staffId: data.staffId,
    });
    return response.data as Shift;
  },

  async unassignStaff(assignmentId: string): Promise<void> {
    await apiClient.delete(`/schedule/assignments/${assignmentId}`);
  },

  async publishSchedule(data: PublishScheduleDto): Promise<{ publishedCount: number }> {
    const response = await apiClient.post('/schedule/publish', data);
    return response.data;
  },

  async unpublishSchedule(data: UnpublishScheduleDto): Promise<{ unpublishedCount: number }> {
    const response = await apiClient.post('/schedule/unpublish', data);
    return response.data;
  },

  async getPublishedShifts(staffId: string, filters?: ShiftFilters): Promise<Shift[]> {
    const response = await apiClient.get(`/schedule/staff/${staffId}/published-shifts`, {
      params: filters,
    });
    return response.data as Shift[];
  },
};
