import { apiClient } from '@/lib/api-client';
import type {
  SwapRequest,
  CreateSwapRequestDto,
  ApproveSwapDto,
  RejectSwapDto,
  SwapFilters,
  CreateDropRequestDto,
  DropRequest,
} from '@/types/swap.types';

export const swapService = {
  async getSwapRequests(filters?: SwapFilters): Promise<SwapRequest[]> {
    const response = await apiClient.get('/swaps', { params: filters });
    return response.data as SwapRequest[];
  },

  async getPendingSwaps(): Promise<SwapRequest[]> {
    const response = await apiClient.get('/swaps/pending');
    return response.data as SwapRequest[];
  },

  async getSwapsByStaff(staffId: string): Promise<SwapRequest[]> {
    const response = await apiClient.get(`/staff/${staffId}/swaps`);
    return response.data as SwapRequest[];
  },

  async createSwapRequest(data: CreateSwapRequestDto): Promise<SwapRequest> {
    const response = await apiClient.post('/swaps', data);
    return response.data as SwapRequest;
  },

  async approveSwap(data: ApproveSwapDto): Promise<SwapRequest> {
    const response = await apiClient.put(`/swaps/${data.swapRequestId}/approve`);
    return response.data as SwapRequest;
  },

  async rejectSwap(data: RejectSwapDto): Promise<SwapRequest> {
    const response = await apiClient.put(`/swaps/${data.swapRequestId}/reject`, {
      reason: data.reason,
    });
    return response.data as SwapRequest;
  },

  // Drop Requests (Requirement 33)
  async createDropRequest(data: CreateDropRequestDto): Promise<DropRequest> {
    const response = await apiClient.post('/drops', data);
    return response.data as DropRequest;
  },

  async getDropRequestsByStaff(staffId: string): Promise<DropRequest[]> {
    const response = await apiClient.get(`/staff/${staffId}/drops`);
    return response.data as DropRequest[];
  },

  // Swap Cancellation (Requirement 37)
  async cancelSwapRequest(swapRequestId: string): Promise<void> {
    await apiClient.delete(`/swaps/${swapRequestId}/cancel`);
  },

  // Pending Request Count (Requirement 35)
  async getPendingRequestCount(staffId: string): Promise<{ count: number }> {
    const response = await apiClient.get(`/staff/${staffId}/pending-count`);
    return response.data as { count: number };
  },
};
