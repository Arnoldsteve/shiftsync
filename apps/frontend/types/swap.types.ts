export interface SwapRequest {
  id: string;
  shiftId: string;
  requestorId: string;
  requestorName: string;
  targetStaffId: string;
  targetStaffName: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  shift?: {
    id: string;
    startTime: string;
    endTime: string;
    locationId: string;
  };
}

export interface CreateSwapRequestDto {
  shiftId: string;
  targetStaffId: string;
  reason?: string;
}

export interface ApproveSwapDto {
  swapRequestId: string;
}

export interface RejectSwapDto {
  swapRequestId: string;
  reason: string;
}

export interface SwapFilters {
  status?: 'pending' | 'approved' | 'rejected';
  staffId?: string;
  locationId?: string;
}

// Drop Request (Requirement 33)
export interface DropRequest {
  id: string;
  shiftId: string;
  requestorId: string;
  requestorName: string;
  status: 'pending' | 'claimed' | 'expired' | 'cancelled';
  expiresAt: string;
  claimedBy?: string;
  claimedAt?: string;
  reason?: string;
  createdAt: string;
  shift?: {
    id: string;
    startTime: string;
    endTime: string;
    locationId: string;
    locationName: string;
  };
}

export interface CreateDropRequestDto {
  shiftId: string;
  reason?: string;
}
