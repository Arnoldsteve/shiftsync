import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']),
  locationIds: z.array(z.string().uuid()).optional(),
});

export const assignRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']),
  locationIds: z.array(z.string().uuid()).optional(),
});

export const addSkillSchema = z.object({
  skillId: z.string().uuid('Invalid skill ID'),
});

export const addCertificationSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type AssignRoleDto = z.infer<typeof assignRoleSchema>;
export type AddSkillDto = z.infer<typeof addSkillSchema>;
export type AddCertificationDto = z.infer<typeof addCertificationSchema>;
