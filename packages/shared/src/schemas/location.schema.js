"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLocationConfigSchema = exports.createLocationSchema = void 0;
const zod_1 = require("zod");
exports.createLocationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Location name is required'),
    timezone: zod_1.z.string().min(1, 'Timezone is required'),
    address: zod_1.z.string().optional(),
});
exports.updateLocationConfigSchema = zod_1.z.object({
    dailyLimitEnabled: zod_1.z.boolean().optional(),
    dailyLimitHours: zod_1.z.number().positive().optional(),
    weeklyLimitEnabled: zod_1.z.boolean().optional(),
    weeklyLimitHours: zod_1.z.number().positive().optional(),
    consecutiveDaysEnabled: zod_1.z.boolean().optional(),
    consecutiveDaysLimit: zod_1.z.number().int().positive().optional(),
});
//# sourceMappingURL=location.schema.js.map