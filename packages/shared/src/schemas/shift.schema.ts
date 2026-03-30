import { z } from 'zod';

export const createShiftSchema = z
  .object({
    locationId: z.string().uuid('Invalid location ID'),
    startTime: z.string().datetime('Invalid start time format'),
    endTime: z.string().datetime('Invalid end time format'),
    requiredSkills: z.array(z.string().uuid()).min(1, 'At least one skill is required'),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export const assignStaffSchema = z.object({
  staffId: z.string().uuid('Invalid staff ID'),
});

export const getScheduleSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  timezone: z.string().optional(),
});

export type CreateShiftDto = z.infer<typeof createShiftSchema>;
export type AssignStaffDto = z.infer<typeof assignStaffSchema>;
export type GetScheduleDto = z.infer<typeof getScheduleSchema>;
