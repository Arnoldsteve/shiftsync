import { z } from 'zod';

/**
 * DTO for setting desired weekly hours
 * Requirement 41.1: Staff can set desired weekly hours
 */
export const SetDesiredHoursSchema = z.object({
  hours: z.number().positive().max(168).describe('Desired weekly hours (positive number, max 168)'),
});

export type SetDesiredHoursDto = z.infer<typeof SetDesiredHoursSchema>;
