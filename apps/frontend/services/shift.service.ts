import { apiClient } from '@/lib/api-client';
import type {
  Shift,
  CreateShiftDto,
  UpdateShiftDto,
  ShiftFilters,
  AssignStaffDto,
  PublishScheduleDto,
  UnpublishScheduleDto,
  AvailableShift,
  StaffSuggestion,
} from '@/types/shift.types';

export const shiftService = {
  async getShifts(filters?: ShiftFilters): Promise<Shift[]> {
    const response = await apiClient.get('/schedule/shifts', { params: filters });
    // Backend returns { shifts: [], total: number }, extract the shifts array
    return (response.data as any).shifts as Shift[];
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
    return response.data as { publishedCount: number };
  },

  async unpublishSchedule(data: UnpublishScheduleDto): Promise<{ unpublishedCount: number }> {
    const response = await apiClient.post('/schedule/unpublish', data);
    return response.data as { unpublishedCount: number };
  },

  async getPublishedShifts(staffId: string, filters?: ShiftFilters): Promise<Shift[]> {
    const response = await apiClient.get(`/schedule/staff/${staffId}/published-shifts`, {
      params: filters,
    });
    return response.data as Shift[];
  },

  async getStaffShifts(staffId: string, filters?: ShiftFilters): Promise<Shift[]> {
    const response = await apiClient.get(`/schedule/staff/${staffId}/shifts`, {
      params: filters,
    });
    // Backend returns an array directly, not wrapped in { shifts: [], total: number }
    return response.data as Shift[];
  },

  // Shift Pickup (Requirement 34)
  async getAvailableShifts(): Promise<AvailableShift[]> {
    const response = await apiClient.get('/schedule/available-shifts');
    return response.data as AvailableShift[];
  },

  async pickupShift(shiftId: string): Promise<void> {
    await apiClient.post(`/schedule/shifts/${shiftId}/pickup`);
  },

  // Alternative Staff Suggestions (Requirement 40)
  async getAlternativeStaff(shiftId: string, excludeStaffId?: string): Promise<StaffSuggestion[]> {
    const response = await apiClient.get(`/schedule/shifts/${shiftId}/alternatives`, {
      params: excludeStaffId ? { excludeStaffId } : undefined,
    });
    return response.data as StaffSuggestion[];
  },
};
