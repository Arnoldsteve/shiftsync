import { z } from 'zod';
export declare const createSwapRequestSchema: z.ZodObject<{
    shiftId: z.ZodString;
    targetStaffId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    shiftId?: string;
    targetStaffId?: string;
}, {
    shiftId?: string;
    targetStaffId?: string;
}>;
export declare const approveSwapSchema: z.ZodObject<{
    swapRequestId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    swapRequestId?: string;
}, {
    swapRequestId?: string;
}>;
export declare const rejectSwapSchema: z.ZodObject<{
    swapRequestId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    swapRequestId?: string;
    reason?: string;
}, {
    swapRequestId?: string;
    reason?: string;
}>;
export type CreateSwapRequestDto = z.infer<typeof createSwapRequestSchema>;
export type ApproveSwapDto = z.infer<typeof approveSwapSchema>;
export type RejectSwapDto = z.infer<typeof rejectSwapSchema>;
//# sourceMappingURL=swap.schema.d.ts.map