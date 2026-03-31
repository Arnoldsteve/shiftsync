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
};
