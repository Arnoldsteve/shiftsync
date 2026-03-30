"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectSwapSchema = exports.approveSwapSchema = exports.createSwapRequestSchema = void 0;
const zod_1 = require("zod");
exports.createSwapRequestSchema = zod_1.z.object({
    shiftId: zod_1.z.string().uuid('Invalid shift ID'),
    targetStaffId: zod_1.z.string().uuid('Invalid target staff ID'),
});
exports.approveSwapSchema = zod_1.z.object({
    swapRequestId: zod_1.z.string().uuid('Invalid swap request ID'),
});
exports.rejectSwapSchema = zod_1.z.object({
    swapRequestId: zod_1.z.string().uuid('Invalid swap request ID'),
    reason: zod_1.z.string().min(1, 'Rejection reason is required'),
});
//# sourceMappingURL=swap.schema.js.map