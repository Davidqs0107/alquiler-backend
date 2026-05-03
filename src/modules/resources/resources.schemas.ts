import { PricingType, RecordStatus } from '@prisma/client';
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1),
});

export const listCategoriesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const listResourcesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const listRatePlansQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const updateCategoryVisibilitySchema = z.object({
  isVisible: z.boolean(),
});

export const updateResourceStatusSchema = z.object({
  status: z.nativeEnum(RecordStatus),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export const updateResourceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  resourceCategoryId: z.string().uuid().optional(),
});

export const updateRatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  pricingType: z.nativeEnum(PricingType).optional(),
  basePrice: z.coerce.number().nonnegative().optional(),
  timeUnitMinutes: z.coerce.number().int().positive().optional(),
  resourceId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

export const updateRatePlanStatusSchema = z.object({
  status: z.nativeEnum(RecordStatus),
});

export const createResourceSchema = z.object({
  name: z.string().trim().min(1),
  resourceCategoryId: z.string().trim().min(1),
});

export const createRatePlanSchema = z
  .object({
    name: z.string().trim().min(1),
    pricingType: z.nativeEnum(PricingType),
    basePrice: z.coerce.number().nonnegative(),
    timeUnitMinutes: z.coerce.number().int().positive().optional(),
    resourceCategoryId: z.string().trim().min(1).optional(),
    resourceId: z.string().trim().min(1).optional(),
  })
  .refine((data) => !(data.resourceCategoryId && data.resourceId), {
    message: 'Rate plan cannot target both category and resource at the same time',
    path: ['resourceId'],
  });
