import { MembershipRole, RecordStatus } from '@prisma/client';
import { z } from 'zod';

const companyMembershipRoleSchema = z.union([
  z.literal(MembershipRole.ADMIN_EMPRESA),
  z.literal(MembershipRole.CAJERO),
  z.literal(MembershipRole.RECEPCION),
]);

const branchMembershipRoleSchema = z.union([
  z.literal(MembershipRole.ADMIN_SEDE),
  z.literal(MembershipRole.CAJERO),
  z.literal(MembershipRole.RECEPCION),
]);

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

export const createCompanyMemberSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6),
  role: companyMembershipRoleSchema,
});

export const createBranchMemberSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6),
  companyRole: companyMembershipRoleSchema,
  branchRole: branchMembershipRoleSchema,
});

export const updateCompanySchema = z.object({
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).toLowerCase().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: z.nativeEnum(RecordStatus).optional(),
});

export const updateCompanyMemberSchema = z.object({
  role: companyMembershipRoleSchema.optional(),
  status: z.nativeEnum(RecordStatus).optional(),
});

export const updateBranchMemberSchema = z.object({
  role: branchMembershipRoleSchema.optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  branchId: z.string().uuid().optional(),
});
