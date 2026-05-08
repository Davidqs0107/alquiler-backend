import { GlobalRole, RecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { ensureCompanyMemberAccess } from '../companies/companies.access';
import type { CreateCustomerInput, UpdateCustomerInput, ListCustomersQuery } from './customers.schemas';

export async function listCustomers(
  companyId: string,
  userId: string,
  globalRole: GlobalRole,
  query: ListCustomersQuery = {},
) {
  await ensureCompanyMemberAccess(companyId, userId, globalRole);

  const where = {
    companyId,
    ...(query.search ? {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { phone: { contains: query.search, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data: customers,
    total,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  };
}

export async function createCustomer(
  companyId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CreateCustomerInput,
) {
  await ensureCompanyMemberAccess(companyId, userId, globalRole);

  if (input.email) {
    const existing = await prisma.customer.findFirst({
      where: { companyId, email: input.email },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(409, 'Customer email already exists in this company');
    }
  }

  return prisma.customer.create({
    data: {
      companyId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      status: RecordStatus.ACTIVE,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateCustomer(
  companyId: string,
  customerId: string,
  userId: string,
  globalRole: GlobalRole,
  input: UpdateCustomerInput,
) {
  await ensureCompanyMemberAccess(companyId, userId, globalRole);

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
    select: { id: true },
  });

  if (!customer) {
    throw new AppError(404, 'Customer not found');
  }

  if (input.email) {
    const existing = await prisma.customer.findFirst({
      where: { companyId, email: input.email, id: { not: customerId } },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(409, 'Customer email already exists in this company');
    }
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.status !== undefined && { status: input.status }),
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getCustomer(
  companyId: string,
  customerId: string,
  userId: string,
  globalRole: GlobalRole,
) {
  await ensureCompanyMemberAccess(companyId, userId, globalRole);

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!customer) {
    throw new AppError(404, 'Customer not found');
  }

  return customer;
}