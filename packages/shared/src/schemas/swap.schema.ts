import { z } from 'zod';

export const createSwapRequestSchema = z.object({
  shiftId: z.string().uuid('Invalid shift ID'),
  targetStaffId: z.string().uuid('Invalid target staff ID'),
});

export const approveSwapSchema = z.object({
  swapRequestId: z.string().uuid('Invalid swap request ID'),
});

export const rejectSwapSchema = z.object({
  swapRequestId: z.string().uuid('Invalid swap request ID'),
  reason: z.string().min(1, 'Rejection reason is required'),
});

export type CreateSwapRequestDto = z.infer<typeof createSwapRequestSchema>;
export type ApproveSwapDto = z.infer<typeof approveSwapSchema>;
export type RejectSwapDto = z.infer<typeof rejectSwapSchema>;
