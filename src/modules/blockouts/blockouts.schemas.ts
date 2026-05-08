import { z } from 'zod';

export const createBlockoutSchema = z.object({
  resourceId: z.string().trim().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().trim().min(1),
});

export const listBlockoutsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  resourceId: z.string().trim().optional(),
});

export type CreateBlockoutInput = z.infer<typeof createBlockoutSchema>;
export type ListBlockoutsQuery = z.infer<typeof listBlockoutsQuerySchema>;