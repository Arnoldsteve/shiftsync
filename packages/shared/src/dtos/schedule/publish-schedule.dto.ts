import { z } from 'zod';

export const PublishScheduleSchema = z.object({
  locationId: z.string().uuid(),
  weekStartDate: z.string().datetime(),
});

export type PublishScheduleDto = z.infer<typeof PublishScheduleSchema>;
