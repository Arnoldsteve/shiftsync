import { z } from 'zod';
export declare const createShiftSchema: z.ZodEffects<z.ZodObject<{
    locationId: z.ZodString;
    startTime: z.ZodString;
    endTime: z.ZodString;
    requiredSkills: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    locationId?: string;
    startTime?: string;
    endTime?: string;
    requiredSkills?: string[];
}, {
    locationId?: string;
    startTime?: string;
    endTime?: string;
    requiredSkills?: string[];
}>, {
    locationId?: string;
    startTime?: string;
    endTime?: string;
    requiredSkills?: string[];
}, {
    locationId?: string;
    startTime?: string;
    endTime?: string;
    requiredSkills?: string[];
}>;
export declare const assignStaffSchema: z.ZodObject<{
    staffId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    staffId?: string;
}, {
    staffId?: string;
}>;
export declare const getScheduleSchema: z.ZodObject<{
    locationId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    timezone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    timezone?: string;
}, {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    timezone?: string;
}>;
export type CreateShiftDto = z.infer<typeof createShiftSchema>;
export type AssignStaffDto = z.infer<typeof assignStaffSchema>;
export type GetScheduleDto = z.infer<typeof getScheduleSchema>;
//# sourceMappingURL=shift.schema.d.ts.map