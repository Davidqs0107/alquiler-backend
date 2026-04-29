import { CatalogItemType, PaymentMethod, TicketStatus } from '@prisma/client';
import { z } from 'zod';

export const createTicketSchema = z.object({}).strict();

export const listTicketsQuerySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
});

export const createCatalogItemSchema = z.object({
  name: z.string().trim().min(1),
  type: z.nativeEnum(CatalogItemType),
  price: z.coerce.number().nonnegative(),
  branchId: z.string().trim().min(1).optional(),
});

export const listCatalogItemsQuerySchema = z.object({
  branchId: z.string().trim().min(1).optional(),
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

export const addCatalogItemToTicketSchema = z.object({
  catalogItemId: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
});

const manualTicketItemBaseSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

export const addManualItemToTicketSchema = manualTicketItemBaseSchema;
export const addExtraItemToTicketSchema = manualTicketItemBaseSchema;

export const applyTicketItemDiscountSchema = z.object({
  discountAmount: z.coerce.number().nonnegative(),
  reason: z.string().trim().min(1).optional(),
});

export const applyTicketDiscountSchema = z.object({
  discountAmount: z.coerce.number().nonnegative(),
  reason: z.string().trim().min(1).optional(),
});

export const cancelTicketItemSchema = z.object({
  reason: z.string().trim().min(1),
});

export const cancelTicketSchema = z.object({
  reason: z.string().trim().min(1),
});

export const closeTicketSchema = z.object({}).strict();
