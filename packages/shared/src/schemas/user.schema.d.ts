import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    role: z.ZodEnum<["ADMIN", "MANAGER", "STAFF"]>;
    locationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: "ADMIN" | "MANAGER" | "STAFF";
    locationIds?: string[];
}, {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: "ADMIN" | "MANAGER" | "STAFF";
    locationIds?: string[];
}>;
export declare const assignRoleSchema: z.ZodObject<{
    role: z.ZodEnum<["ADMIN", "MANAGER", "STAFF"]>;
    locationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    role?: "ADMIN" | "MANAGER" | "STAFF";
    locationIds?: string[];
}, {
    role?: "ADMIN" | "MANAGER" | "STAFF";
    locationIds?: string[];
}>;
export declare const addSkillSchema: z.ZodObject<{
    skillId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    skillId?: string;
}, {
    skillId?: string;
}>;
export declare const addCertificationSchema: z.ZodObject<{
    locationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    locationId?: string;
}, {
    locationId?: string;
}>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type AssignRoleDto = z.infer<typeof assignRoleSchema>;
export type AddSkillDto = z.infer<typeof addSkillSchema>;
export type AddCertificationDto = z.infer<typeof addCertificationSchema>;
//# sourceMappingURL=user.schema.d.ts.map