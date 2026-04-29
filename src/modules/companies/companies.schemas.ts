import { z } from 'zod';

export const createCompanySchema = z.object({
  company: z.object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1).toLowerCase(),
  }),
  branch: z.object({
    name: z.string().trim().min(1),
  }),
  admin: z.object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(6),
  }),
});

export const createBranchSchema = z.object({
  name: z.string().trim().min(1),
});
