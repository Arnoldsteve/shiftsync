"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCertificationSchema = exports.addSkillSchema = exports.assignRoleSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    role: zod_1.z.enum(['ADMIN', 'MANAGER', 'STAFF']),
    locationIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
exports.assignRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['ADMIN', 'MANAGER', 'STAFF']),
    locationIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
exports.addSkillSchema = zod_1.z.object({
    skillId: zod_1.z.string().uuid('Invalid skill ID'),
});
exports.addCertificationSchema = zod_1.z.object({
    locationId: zod_1.z.string().uuid('Invalid location ID'),
});
//# sourceMappingURL=user.schema.js.map