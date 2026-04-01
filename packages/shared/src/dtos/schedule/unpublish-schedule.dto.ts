import { z } from 'zod';

export const UnpublishScheduleSchema = z.object({
  locationId: z.string().uuid(),
  weekStartDate: z.string().datetime(),
});

export type UnpublishScheduleDto = z.infer<typeof UnpublishScheduleSchema>;
