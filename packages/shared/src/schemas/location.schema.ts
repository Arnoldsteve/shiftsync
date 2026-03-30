import { z } from 'zod';

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  address: z.string().optional(),
});

export const updateLocationConfigSchema = z.object({
  dailyLimitEnabled: z.boolean().optional(),
  dailyLimitHours: z.number().positive().optional(),
  weeklyLimitEnabled: z.boolean().optional(),
  weeklyLimitHours: z.number().positive().optional(),
  consecutiveDaysEnabled: z.boolean().optional(),
  consecutiveDaysLimit: z.number().int().positive().optional(),
});

export type CreateLocationDto = z.infer<typeof createLocationSchema>;
export type UpdateLocationConfigDto = z.infer<typeof updateLocationConfigSchema>;
