import { apiClient } from '@/lib/api-client';
import type {
  Shift,
  CreateShiftDto,
  UpdateShiftDto,
  ShiftFilters,
  AssignStaffDto,
} from '@/types/shift.types';

export const shiftService = {
  async getShifts(filters?: ShiftFilters): Promise<Shift[]> {
    const response = await apiClient.get('/shifts', { params: filters });
    return response.data as Shift[];
  },

  async getShiftById(id: string): Promise<Shift> {
    const response = await apiClient.get(`/shifts/${id}`);
    return response.data as Shift;
  },

  async createShift(data: CreateShiftDto): Promise<Shift> {
    const response = await apiClient.post('/shifts', data);
    return response.data as Shift;
  },

  async updateShift(id: string, data: UpdateShiftDto): Promise<Shift> {
    const response = await apiClient.put(`/shifts/${id}`, data);
    return response.data as Shift;
  },

  async deleteShift(id: string): Promise<void> {
    await apiClient.delete(`/shifts/${id}`);
  },

  async assignStaff(data: AssignStaffDto): Promise<Shift> {
    const response = await apiClient.post(`/shifts/${data.shiftId}/assign`, {
      staffId: data.staffId,
    });
    return response.data as Shift;
  },

  async unassignStaff(assignmentId: string): Promise<void> {
    await apiClient.delete(`/assignments/${assignmentId}`);
  },
};
