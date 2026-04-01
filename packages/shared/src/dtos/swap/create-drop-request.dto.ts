import { z } from 'zod';

export const CreateDropRequestSchema = z.object({
  shiftId: z.string().uuid(),
  reason: z.string().min(1).max(500).optional(),
});

export type CreateDropRequestDto = z.infer<typeof CreateDropRequestSchema>;
