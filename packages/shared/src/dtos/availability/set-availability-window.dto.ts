import { z } from 'zod';

/**
 * DTO for setting recurring weekly availability window
 * Requirement 31.1: Staff can define recurring weekly availability windows
 */
export const SetAvailabilityWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).describe('Day of week (0=Sunday, 6=Saturday)'),
  startTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')
    .describe('Start time in HH:MM format (e.g., "09:00")'),
  endTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')
    .describe('End time in HH:MM format (e.g., "17:00")'),
});

export type SetAvailabilityWindowDto = z.infer<typeof SetAvailabilityWindowSchema>;
