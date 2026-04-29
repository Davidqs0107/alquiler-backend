import { PaymentMethod, TicketStatus } from '@prisma/client';
import { z } from 'zod';

export const createTicketSchema = z.object({}).strict();

export const listTicketsQuerySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
});

export const startRentalSchema = z.object({
  resourceId: z.string().trim().min(1),
  reservedMinutes: z.coerce.number().int().positive(),
  startAt: z.coerce.date().optional(),
  notes: z.string().trim().min(1).optional(),
});

export const addRentalToTicketSchema = startRentalSchema;

export const finishRentalSchema = z.object({
  endedAt: z.coerce.date().optional(),
}).strict();

export const createPaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().min(1).optional(),
});

export const closeTicketSchema = z.object({}).strict();
