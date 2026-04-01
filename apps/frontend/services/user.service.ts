import { apiClient } from '@/lib/api-client';
import type { User, CreateUserDto, UpdateUserDto, UserFilters } from '@/types/user.types';

export const userService = {
  async getUsers(filters?: UserFilters): Promise<User[]> {
    const response = await apiClient.get('/users', { params: filters });
    return response.data as User[];
  },

  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get(`/users/${id}`);
    return response.data as User;
  },

  async createUser(data: CreateUserDto): Promise<User> {
    const response = await apiClient.post('/users', data);
    return response.data as User;
  },

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data as User;
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },

  async assignRole(userId: string, roleId: string): Promise<User> {
    const response = await apiClient.put(`/users/${userId}/role`, { roleId });
    return response.data as User;
  },

  // Availability Management (Requirement 31)
  async setAvailabilityWindow(data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }): Promise<void> {
    await apiClient.post('/users/me/availability/windows', data);
  },

  async removeAvailabilityWindow(windowId: string): Promise<void> {
    await apiClient.post(`/users/me/availability/windows/${windowId}/remove`);
  },

  async addAvailabilityException(data: {
    date: string;
    startTime?: string;
    endTime?: string;
  }): Promise<void> {
    await apiClient.post('/users/me/availability/exceptions', data);
  },

  async getAvailability(userId?: string): Promise<{
    windows: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>;
    exceptions: Array<{ id: string; date: string; startTime?: string; endTime?: string }>;
  }> {
    const endpoint = userId ? `/users/${userId}/availability` : '/users/me/availability';
    const response = await apiClient.get(endpoint);
    return response.data as {
      windows: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>;
      exceptions: Array<{ id: string; date: string; startTime?: string; endTime?: string }>;
    };
  },

  // Desired Hours (Requirement 41)
  async setDesiredWeeklyHours(hours: number): Promise<void> {
    await apiClient.post('/users/me/desired-hours', { hours });
  },

  async getDesiredWeeklyHours(userId?: string): Promise<{ hours: number | null }> {
    const endpoint = userId ? `/users/${userId}/desired-hours` : '/users/me/desired-hours';
    const response = await apiClient.get(endpoint);
    // Backend returns { desiredWeeklyHours: number | null }
    return { hours: response.data.desiredWeeklyHours };
  },
};
