"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScheduleSchema = exports.assignStaffSchema = exports.createShiftSchema = void 0;
const zod_1 = require("zod");
exports.createShiftSchema = zod_1.z
    .object({
    locationId: zod_1.z.string().uuid('Invalid location ID'),
    startTime: zod_1.z.string().datetime('Invalid start time format'),
    endTime: zod_1.z.string().datetime('Invalid end time format'),
    requiredSkills: zod_1.z.array(zod_1.z.string().uuid()).min(1, 'At least one skill is required'),
})
    .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
});
exports.assignStaffSchema = zod_1.z.object({
    staffId: zod_1.z.string().uuid('Invalid staff ID'),
});
exports.getScheduleSchema = zod_1.z.object({
    locationId: zod_1.z.string().uuid('Invalid location ID'),
    startDate: zod_1.z.string().datetime('Invalid start date format'),
    endDate: zod_1.z.string().datetime('Invalid end date format'),
    timezone: zod_1.z.string().optional(),
});
//# sourceMappingURL=shift.schema.js.map