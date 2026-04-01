import { SwapRequest, User, Shift } from '@prisma/client';

export interface SwapRequestWithDetails extends SwapRequest {
  requestor: User;
  targetStaff: User;
  shift: Shift;
  requestorName?: string;
  targetStaffName?: string;
}
