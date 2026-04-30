import {
  GlobalRole,
  MembershipRole,
  PaymentMethod,
  PricingType,
  RecordStatus,
  TicketStatus,
} from '@prisma/client';
import { prisma } from '../../src/lib/prisma';

function unique(value: string) {
  return `${value}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createUser(input?: {
  email?: string;
  globalRole?: GlobalRole;
  status?: RecordStatus;
}) {
  return prisma.user.create({
    data: {
      email: input?.email ?? `${unique('user')}@test.local`,
      passwordHash: 'test-hash',
      globalRole: input?.globalRole ?? GlobalRole.USER,
      status: input?.status ?? RecordStatus.ACTIVE,
    },
  });
}

export async function createCompany(input?: { name?: string; slug?: string; status?: RecordStatus }) {
  return prisma.company.create({
    data: {
      name: input?.name ?? unique('Company'),
      slug: input?.slug ?? unique('company'),
      status: input?.status ?? RecordStatus.ACTIVE,
    },
  });
}

export async function createBranch(input: { companyId: string; name?: string; status?: RecordStatus }) {
  return prisma.branch.create({
    data: {
      companyId: input.companyId,
      name: input.name ?? unique('Branch'),
      status: input.status ?? RecordStatus.ACTIVE,
    },
  });
}

export async function grantCompanyMembership(input: {
  companyId: string;
  userId: string;
  role?: MembershipRole;
  status?: RecordStatus;
}) {
  return prisma.companyUser.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      role: input.role ?? MembershipRole.ADMIN_EMPRESA,
      status: input.status ?? RecordStatus.ACTIVE,
    },
  });
}

export async function grantBranchMembership(input: {
  branchId: string;
  userId: string;
  role?: MembershipRole;
  status?: RecordStatus;
}) {
  return prisma.branchUser.create({
    data: {
      branchId: input.branchId,
      userId: input.userId,
      role: input.role ?? MembershipRole.ADMIN_SEDE,
      status: input.status ?? RecordStatus.ACTIVE,
    },
  });
}

export async function createResourceCategory(input: {
  companyId: string;
  name?: string;
  status?: RecordStatus;
}) {
  return prisma.resourceCategory.create({
    data: {
      companyId: input.companyId,
      name: input.name ?? unique('Category'),
      status: input.status ?? RecordStatus.ACTIVE,
    },
  });
}

export async function createResource(input: {
  companyId: string;
  branchId: string;
  resourceCategoryId: string;
  name?: string;
  status?: RecordStatus;
}) {
  return prisma.resource.create({
    data: {
      companyId: input.companyId,
      branchId: input.branchId,
      resourceCategoryId: input.resourceCategoryId,
      name: input.name ?? unique('Resource'),
      status: input.status ?? RecordStatus.ACTIVE,
    },
  });
}

export async function createRatePlan(input: {
  companyId: string;
  branchId: string;
  name?: string;
  pricingType?: PricingType;
  basePrice?: number;
  timeUnitMinutes?: number | null;
  resourceCategoryId?: string | null;
  resourceId?: string | null;
  status?: RecordStatus;
}) {
  return prisma.ratePlan.create({
    data: {
      companyId: input.companyId,
      branchId: input.branchId,
      name: input.name ?? unique('RatePlan'),
      pricingType: input.pricingType ?? PricingType.TIME_UNIT,
      basePrice: input.basePrice ?? 100,
      timeUnitMinutes: input.timeUnitMinutes ?? 60,
      resourceCategoryId: input.resourceCategoryId ?? null,
      resourceId: input.resourceId ?? null,
      status: input.status ?? RecordStatus.ACTIVE,
    },
  });
}

export async function createManualTicketWithItem(input: {
  companyId: string;
  branchId: string;
  openedById: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  status?: TicketStatus;
}) {
  const ticket = await prisma.ticket.create({
    data: {
      companyId: input.companyId,
      branchId: input.branchId,
      openedById: input.openedById,
      ticketNumber: 1,
      status: input.status ?? TicketStatus.OPEN,
      subtotal: input.quantity && input.unitPrice ? input.quantity * input.unitPrice : input.unitPrice ?? 100,
      discountAmount: 0,
      total: input.quantity && input.unitPrice ? input.quantity * input.unitPrice : input.unitPrice ?? 100,
    },
  });

  const quantity = input.quantity ?? 1;
  const unitPrice = input.unitPrice ?? 100;

  const item = await prisma.ticketItem.create({
    data: {
      ticketId: ticket.id,
      type: 'MANUAL',
      description: input.description ?? 'Manual item',
      quantity,
      unitPrice,
      subtotal: quantity * unitPrice,
      discountAmount: 0,
    },
  });

  return { ticket, item };
}

export async function createPaymentRecord(input: {
  companyId: string;
  ticketId: string;
  method?: PaymentMethod;
  amount?: number;
  notes?: string;
}) {
  return prisma.payment.create({
    data: {
      companyId: input.companyId,
      ticketId: input.ticketId,
      method: input.method ?? PaymentMethod.CASH,
      amount: input.amount ?? 100,
      notes: input.notes,
    },
  });
}
