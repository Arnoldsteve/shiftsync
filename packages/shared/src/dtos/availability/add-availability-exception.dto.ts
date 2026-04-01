import { z } from 'zod';

/**
 * DTO for adding one-off availability exception
 * Requirement 31.2: Staff can define one-off availability exceptions
 */
export const AddAvailabilityExceptionSchema = z.object({
  date: z.coerce.date().describe('Specific date for exception'),
  startTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')
    .optional()
    .describe('Start time in HH:MM format (optional, null means unavailable all day)'),
  endTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')
    .optional()
    .describe('End time in HH:MM format (optional, null means unavailable all day)'),
});

export type AddAvailabilityExceptionDto = z.infer<typeof AddAvailabilityExceptionSchema>;
