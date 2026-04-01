import { Injectable } from '@nestjs/common';
import { SwapRequestService } from './services/swap-request.service';
import { DropRequestService } from './services/drop-request.service';
import { SwapRequest, DropRequest } from '@prisma/client';
import { SwapRequestWithDetails } from './interfaces';

/**
 * Swap Service Orchestrator
 * Delegates to specialized services for swap requests and drop requests
 */
@Injectable()
export class SwapService {
  constructor(
    private readonly swapRequestService: SwapRequestService,
    private readonly dropRequestService: DropRequestService
  ) {}

  // ============================================
  // Swap Request Operations
  // ============================================

  /**
   * Create a swap request
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async createSwapRequest(
    shiftId: string,
    requestorId: string,
    targetStaffId: string
  ): Promise<SwapRequest> {
    return this.swapRequestService.createSwapRequest(shiftId, requestorId, targetStaffId);
  }

  /**
   * Approve a swap request
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 26.1, 26.2, 26.3, 26.4
   */
  async approveSwap(swapRequestId: string, approverId: string): Promise<SwapRequest> {
    return this.swapRequestService.approveSwap(swapRequestId, approverId);
  }

  /**
   * Reject a swap request
   * Requirements: 8.5
   */
  async rejectSwap(
    swapRequestId: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<SwapRequest> {
    return this.swapRequestService.rejectSwap(swapRequestId, rejectedBy, rejectionReason);
  }

  /**
   * Get pending swap requests
   * Requirements: 8.1
   */
  async getPendingSwaps(locationId?: string): Promise<SwapRequestWithDetails[]> {
    return this.swapRequestService.getPendingSwaps(locationId);
  }

  /**
   * Get swap requests by staff
   * Requirements: 8.1
   */
  async getSwapsByStaff(staffId: string): Promise<SwapRequestWithDetails[]> {
    return this.swapRequestService.getSwapsByStaff(staffId);
  }

  // ============================================
  // Drop Request Operations
  // ============================================

  /**
   * Create a drop request (shift offered to any qualified staff)
   * Requirements: 33.1, 33.2, 33.3, 33.4, 33.5
   */
  async createDropRequest(
    shiftId: string,
    requestorId: string,
    reason?: string
  ): Promise<DropRequest> {
    return this.dropRequestService.createDropRequest(shiftId, requestorId, reason);
  }

  /**
   * Expire drop requests that have passed their expiration time
   * Requirements: 33.3, 33.5
   */
  async expireDropRequests(): Promise<number> {
    return this.dropRequestService.expireDropRequests();
  }

  /**
   * Get available drop requests
   * Requirements: 33.2
   */
  async getAvailableDropRequests(locationIds?: string[]): Promise<DropRequest[]> {
    return this.dropRequestService.getAvailableDropRequests(locationIds);
  }

  /**
   * Get pending request count (swap + drop requests)
   * Requirements: 33.4, 35.2
   */
  async getPendingRequestCount(staffId: string): Promise<number> {
    return this.dropRequestService.getPendingRequestCount(staffId);
  }

  /**
   * Get drop requests by staff
   * Requirements: 33.1
   */
  async getDropRequestsByStaff(staffId: string): Promise<DropRequest[]> {
    return this.dropRequestService.getDropRequestsByStaff(staffId);
  }

  /**
   * Cancel a drop request by the requestor
   * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5 (similar to swap cancellation)
   */
  async cancelDropRequest(dropRequestId: string, requestorId: string): Promise<DropRequest> {
    return this.dropRequestService.cancelDropRequest(dropRequestId, requestorId);
  }

  // ============================================
  // Swap Cancellation Operations
  // ============================================

  /**
   * Cancel all pending swap requests for a shift (called when shift is edited)
   * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5
   */
  async cancelPendingSwapsForShift(shiftId: string, cancelledBy: string): Promise<number> {
    return this.swapRequestService.cancelPendingSwapsForShift(shiftId, cancelledBy);
  }

  /**
   * Cancel a swap request by the requestor
   * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5
   */
  async cancelSwapRequest(swapRequestId: string, requestorId: string): Promise<SwapRequest> {
    return this.swapRequestService.cancelSwapRequest(swapRequestId, requestorId);
  }
}
