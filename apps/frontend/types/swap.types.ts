export interface SwapRequest {
  id: string;
  shiftId: string;
  requestorId: string;
  requestorName: string;
  targetStaffId: string;
  targetStaffName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  targetStaffAcceptedAt?: string;
  reason?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  requestor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  targetStaff?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  shift?: {
    id: string;
    startTime: string;
    endTime: string;
    locationId: string;
    location?: {
      name: string;
    };
  };
  targetShift?: {
    id: string;
    startTime: string;
    endTime: string;
    locationId: string;
    location?: {
      name: string;
    };
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
