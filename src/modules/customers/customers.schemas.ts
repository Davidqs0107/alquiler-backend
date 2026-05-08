import { RecordStatus } from '@prisma/client';
import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().toLowerCase().nullable().or(z.literal('').transform(() => null)),
  phone: z.string().trim().nullable().or(z.literal('').transform(() => null)),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().toLowerCase().nullable().optional().or(z.literal('').transform(() => null)),
  phone: z.string().trim().nullable().optional().or(z.literal('').transform(() => null)),
  status: z.nativeEnum(RecordStatus).optional(),
});

export const listCustomersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  search: z.string().trim().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;