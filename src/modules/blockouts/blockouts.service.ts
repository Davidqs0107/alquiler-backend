import { GlobalRole, RecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { ensureBranchInCompany, ensureResourceManagementAccess } from '../companies/companies.access';
import type { CreateBlockoutInput, ListBlockoutsQuery } from './blockouts.schemas';

export async function listBlockouts(
  companyId: string,
  branchId: string,
  userId: string,
  globalRole: GlobalRole,
  query: ListBlockoutsQuery = {},
) {
  await ensureBranchInCompany(companyId, branchId);

  const where: any = {
    Resource: {
      branchId,
    },
  };

  if (query.resourceId) {
    where.resourceId = query.resourceId;
  }

  const [blockouts, total] = await Promise.all([
    prisma.resourceBlockout.findMany({
      where,
      orderBy: { startAt: 'asc' },
      select: {
        id: true,
        resourceId: true,
        startAt: true,
        endAt: true,
        reason: true,
        createdAt: true,
        Resource: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.resourceBlockout.count({ where }),
  ]);

  return {
    data: blockouts,
    total,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  };
}

export async function createBlockout(
  companyId: string,
  branchId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CreateBlockoutInput,
) {
  await ensureResourceManagementAccess(companyId, branchId, userId, globalRole);

  const resource = await prisma.resource.findFirst({
    where: { id: input.resourceId, branchId, status: RecordStatus.ACTIVE },
    select: { id: true, name: true },
  });

  if (!resource) {
    throw new AppError(404, 'Resource not found in this branch');
  }

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  if (endAt <= startAt) {
    throw new AppError(400, 'End time must be after start time');
  }

  const existingBlockout = await prisma.resourceBlockout.findFirst({
    where: {
      resourceId: input.resourceId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });

  if (existingBlockout) {
    throw new AppError(409, 'Blockout already exists for this resource in the selected time range');
  }

  return prisma.resourceBlockout.create({
    data: {
      resourceId: input.resourceId,
      startAt,
      endAt,
      reason: input.reason,
    },
    select: {
      id: true,
      resourceId: true,
      startAt: true,
      endAt: true,
      reason: true,
      createdAt: true,
      Resource: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function deleteBlockout(
  companyId: string,
  branchId: string,
  blockoutId: string,
  userId: string,
  globalRole: GlobalRole,
) {
  await ensureResourceManagementAccess(companyId, branchId, userId, globalRole);

  const blockout = await prisma.resourceBlockout.findFirst({
    where: {
      id: blockoutId,
      Resource: {
        branchId,
      },
    },
    select: { id: true },
  });

  if (!blockout) {
    throw new AppError(404, 'Blockout not found');
  }

  return prisma.resourceBlockout.delete({
    where: { id: blockoutId },
    select: {
      id: true,
    },
  });
}