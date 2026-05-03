import { GlobalRole, MembershipRole, RecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';

export async function ensureCompanyAccess(companyId: string, userId: string, globalRole: GlobalRole) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, status: true },
  });

  if (!company || company.status !== RecordStatus.ACTIVE) {
    throw new AppError(404, 'Company not found');
  }

  if (globalRole === GlobalRole.SUPERADMIN) {
    return company;
  }

  const membership = await prisma.companyUser.findFirst({
    where: {
      companyId,
      userId,
      role: MembershipRole.ADMIN_EMPRESA,
      status: RecordStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (!membership) {
    throw new AppError(403, 'Insufficient permissions');
  }

  return company;
}

export async function ensureCompanyMemberAccess(companyId: string, userId: string, globalRole: GlobalRole) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, status: true },
  });

  if (!company || company.status !== RecordStatus.ACTIVE) {
    throw new AppError(404, 'Company not found');
  }

  if (globalRole === GlobalRole.SUPERADMIN) {
    return company;
  }

  const membership = await prisma.companyUser.findFirst({
    where: {
      companyId,
      userId,
      role: { in: [MembershipRole.ADMIN_EMPRESA, MembershipRole.ADMIN_SEDE, MembershipRole.CAJERO, MembershipRole.RECEPCION] },
      status: RecordStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (!membership) {
    throw new AppError(403, 'Insufficient permissions');
  }

  return company;
}

export async function ensureBranchInCompany(companyId: string, branchId: string) {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      companyId,
      status: RecordStatus.ACTIVE,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      status: true,
    },
  });

  if (!branch) {
    throw new AppError(404, 'Branch not found');
  }

  return branch;
}

export async function hasBranchAccess(userId: string, branchId: string, globalRole: GlobalRole) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, companyId: true },
  });

  if (!branch) return false;

  if (globalRole === GlobalRole.SUPERADMIN) return true;

  const membership = await prisma.companyUser.findFirst({
    where: {
      userId,
      companyId: branch.companyId,
      status: RecordStatus.ACTIVE,
    },
    select: { role: true },
  });

  if (!membership) return false;

  if (membership.role === MembershipRole.ADMIN_EMPRESA) return true;

  const branchUser = await prisma.branchUser.findFirst({
    where: {
      userId,
      branchId,
      status: RecordStatus.ACTIVE,
    },
  });

  return !!branchUser;
}
