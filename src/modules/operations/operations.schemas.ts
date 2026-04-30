import { CatalogItemType, PaymentMethod, RecordStatus, TicketStatus } from '@prisma/client';
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
  status: z.nativeEnum(RecordStatus).optional(),
  branchId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(CatalogItemType).optional(),
  search: z.string().trim().min(1).optional(),
});

export const updateCatalogItemSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    type: z.nativeEnum(CatalogItemType).optional(),
    price: z.coerce.number().nonnegative().optional(),
    branchId: z.union([z.string().trim().min(1), z.null()]).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

export const activateCatalogItemSchema = z.object({}).strict();
export const deactivateCatalogItemSchema = z.object({}).strict();

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

export const createPaymentReversalSchema = z.object({
  amount: z.coerce.number().positive(),
  reason: z.string().trim().min(1),
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

export const cancelWithReversalSchema = z.object({
  reason: z.string().trim().min(1),
});

export const closeTicketSchema = z.object({}).strict();
