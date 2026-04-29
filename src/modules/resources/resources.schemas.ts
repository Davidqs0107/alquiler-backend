import { PricingType } from '@prisma/client';
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1),
});

export const updateCategoryVisibilitySchema = z.object({
  isVisible: z.boolean(),
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
