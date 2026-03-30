import { z } from 'zod';
export declare const createLocationSchema: z.ZodObject<{
    name: z.ZodString;
    timezone: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timezone?: string;
    name?: string;
    address?: string;
}, {
    timezone?: string;
    name?: string;
    address?: string;
}>;
export declare const updateLocationConfigSchema: z.ZodObject<{
    dailyLimitEnabled: z.ZodOptional<z.ZodBoolean>;
    dailyLimitHours: z.ZodOptional<z.ZodNumber>;
    weeklyLimitEnabled: z.ZodOptional<z.ZodBoolean>;
    weeklyLimitHours: z.ZodOptional<z.ZodNumber>;
    consecutiveDaysEnabled: z.ZodOptional<z.ZodBoolean>;
    consecutiveDaysLimit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    dailyLimitEnabled?: boolean;
    dailyLimitHours?: number;
    weeklyLimitEnabled?: boolean;
    weeklyLimitHours?: number;
    consecutiveDaysEnabled?: boolean;
    consecutiveDaysLimit?: number;
}, {
    dailyLimitEnabled?: boolean;
    dailyLimitHours?: number;
    weeklyLimitEnabled?: boolean;
    weeklyLimitHours?: number;
    consecutiveDaysEnabled?: boolean;
    consecutiveDaysLimit?: number;
}>;
export type CreateLocationDto = z.infer<typeof createLocationSchema>;
export type UpdateLocationConfigDto = z.infer<typeof updateLocationConfigSchema>;
//# sourceMappingURL=location.schema.d.ts.map