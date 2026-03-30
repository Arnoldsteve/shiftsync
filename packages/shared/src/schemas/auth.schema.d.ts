import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
}, {
    email?: string;
    password?: string;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    role: z.ZodEnum<["ADMIN", "MANAGER", "STAFF"]>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: "ADMIN" | "MANAGER" | "STAFF";
}, {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: "ADMIN" | "MANAGER" | "STAFF";
}>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
//# sourceMappingURL=auth.schema.d.ts.map