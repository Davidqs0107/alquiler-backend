import {
  CatalogItemType,
  GlobalRole,
  MembershipRole,
  PaymentMethod,
  PricingType,
  Prisma,
  RecordStatus,
  RentalSessionStatus,
  TicketItemType,
  TicketStatus,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { ensureBranchInCompany } from '../companies/companies.access';

type ListTicketsQuery = {
  status?: TicketStatus;
  limit?: number;
  offset?: number;
};

type ListCatalogItemsQuery = {
  status?: RecordStatus;
  branchId?: string;
  type?: CatalogItemType;
  search?: string;
  limit?: number;
  offset?: number;
};

type CreateCatalogItemInput = {
  name: string;
  type: CatalogItemType;
  price: number;
  branchId?: string;
};

type UpdateCatalogItemInput = {
  name?: string;
  type?: CatalogItemType;
  price?: number;
  branchId?: string | null;
};

type RentalInput = {
  resourceId: string;
  reservedMinutes: number;
  startAt?: Date;
  notes?: string;
};

type FinishRentalInput = {
  endedAt?: Date;
};

type CreatePaymentInput = {
  method: PaymentMethod;
  amount: number;
  notes?: string;
};

type CreatePaymentReversalInput = {
  amount: number;
  reason: string;
};

type AddCatalogItemToTicketInput = {
  catalogItemId: string;
  quantity: number;
};

type AddManualItemToTicketInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type ApplyDiscountInput = {
  discountAmount: number;
  reason?: string;
};

type CancelInput = {
  reason: string;
};

type PrismaTx = Prisma.TransactionClient;

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function ceilDiv(a: number, b: number) {
  return Math.ceil(a / b);
}

function isZero(value: number) {
  return Math.abs(value) < 0.000001;
}

function grossSubtotal(quantity: number, unitPrice: number) {
  return quantity * unitPrice;
}

async function ensureOperationalCompanyAccess(companyId: string, userId: string, globalRole: GlobalRole) {
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

  const [companyMembership, branchMembership] = await Promise.all([
    prisma.companyUser.findFirst({
      where: {
        companyId,
        userId,
        role: { in: [MembershipRole.ADMIN_EMPRESA, MembershipRole.CAJERO, MembershipRole.RECEPCION] },
        status: RecordStatus.ACTIVE,
      },
      select: { id: true },
    }),
    prisma.branchUser.findFirst({
      where: {
        userId,
        role: { in: [MembershipRole.ADMIN_SEDE, MembershipRole.CAJERO, MembershipRole.RECEPCION] },
        status: RecordStatus.ACTIVE,
        branch: {
          companyId,
          status: RecordStatus.ACTIVE,
        },
      },
      select: { id: true },
    }),
  ]);

  if (!companyMembership && !branchMembership) {
    throw new AppError(403, 'Insufficient permissions');
  }

  return company;
}

async function ensureCatalogAdminAccess(companyId: string, userId: string, globalRole: GlobalRole) {
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

  const [companyMembership, branchMembership] = await Promise.all([
    prisma.companyUser.findFirst({
      where: {
        companyId,
        userId,
        role: MembershipRole.ADMIN_EMPRESA,
        status: RecordStatus.ACTIVE,
      },
      select: { id: true },
    }),
    prisma.branchUser.findFirst({
      where: {
        userId,
        role: MembershipRole.ADMIN_SEDE,
        status: RecordStatus.ACTIVE,
        branch: {
          companyId,
          status: RecordStatus.ACTIVE,
        },
      },
      select: { id: true },
    }),
  ]);

  if (!companyMembership && !branchMembership) {
    throw new AppError(403, 'Insufficient permissions');
  }

  return company;
}

async function ensureSensitiveTicketActionAccess(companyId: string, branchId: string, userId: string, globalRole: GlobalRole) {
  await ensureCatalogAdminAccess(companyId, userId, globalRole);
  return ensureBranchInCompany(companyId, branchId);
}

async function ensureOperationsAccess(companyId: string, branchId: string, userId: string, globalRole: GlobalRole) {
  await ensureOperationalCompanyAccess(companyId, userId, globalRole);
  return ensureBranchInCompany(companyId, branchId);
}

async function ensureTicketInBranch(tx: PrismaTx, companyId: string, branchId: string, ticketId: string) {
  const ticket = await tx.ticket.findFirst({
    where: { id: ticketId, companyId, branchId },
    select: ticketSummarySelect,
  });

  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  return ticket;
}

function ensureTicketOpen(ticket: { status: TicketStatus; cancelledAt: Date | null }) {
  if (ticket.status === TicketStatus.CANCELLED || ticket.cancelledAt) {
    throw new AppError(409, 'Ticket is cancelled');
  }

  if (ticket.status !== TicketStatus.OPEN) {
    throw new AppError(409, 'Ticket is closed');
  }
}

async function ensureTicketWithoutPayments(tx: PrismaTx, ticketId: string) {
  const count = await tx.payment.count({ where: { ticketId } });

  if (count > 0) {
    throw new AppError(409, 'Ticket with payments does not allow this simple discount/cancellation operation');
  }
}

async function ensureResourceOperable(tx: PrismaTx, companyId: string, branchId: string, resourceId: string) {
  const resource = await tx.resource.findFirst({
    where: {
      id: resourceId,
      companyId,
      branchId,
      status: RecordStatus.ACTIVE,
      category: {
        status: RecordStatus.ACTIVE,
      },
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      resourceCategoryId: true,
      name: true,
      category: {
        select: {
          id: true,
          name: true,
          visibilityOverrides: {
            where: {
              branchId,
              isVisible: false,
            },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!resource) {
    throw new AppError(404, 'Resource not found');
  }

  if (resource.category.visibilityOverrides.length > 0) {
    throw new AppError(409, 'Category is hidden in this branch');
  }

  return resource;
}

async function ensureResourceAvailable(tx: PrismaTx, resourceId: string, startAt: Date, scheduledEndAt: Date) {
  const overlapping = await tx.rentalSession.findFirst({
    where: {
      resourceId,
      status: {
        in: [RentalSessionStatus.RESERVED, RentalSessionStatus.IN_USE],
      },
      startAt: { lt: scheduledEndAt },
      scheduledEndAt: { gt: startAt },
    },
    select: { id: true },
  });

  if (overlapping) {
    throw new AppError(409, 'Resource is occupied or has an overlapping rental');
  }
}

async function resolveRatePlan(tx: PrismaTx, companyId: string, branchId: string, resourceId: string, categoryId: string) {
  const [resourcePlan, categoryPlan, branchPlan] = await Promise.all([
    tx.ratePlan.findFirst({
      where: { companyId, branchId, resourceId, status: RecordStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    }),
    tx.ratePlan.findFirst({
      where: {
        companyId,
        branchId,
        resourceCategoryId: categoryId,
        resourceId: null,
        status: RecordStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    }),
    tx.ratePlan.findFirst({
      where: {
        companyId,
        branchId,
        resourceId: null,
        resourceCategoryId: null,
        status: RecordStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const plan = resourcePlan ?? categoryPlan ?? branchPlan;

  if (!plan) {
    throw new AppError(409, 'No applicable rate plan found');
  }

  return plan;
}

function calculateBaseAmount(ratePlan: { pricingType: PricingType; basePrice: Prisma.Decimal; timeUnitMinutes: number | null }, reservedMinutes: number) {
  const basePrice = decimalToNumber(ratePlan.basePrice);

  if (ratePlan.pricingType === PricingType.TIME_UNIT) {
    if (!ratePlan.timeUnitMinutes) {
      throw new AppError(409, 'Rate plan is missing timeUnitMinutes');
    }

    return basePrice * ceilDiv(reservedMinutes, ratePlan.timeUnitMinutes);
  }

  return basePrice;
}

function calculateOvertimeAmount(
  ratePlan: { pricingType: PricingType; basePrice: Prisma.Decimal; timeUnitMinutes: number | null },
  reservedMinutes: number,
  overtimeMinutes: number,
) {
  if (overtimeMinutes <= 0) {
    return 0;
  }

  const basePrice = decimalToNumber(ratePlan.basePrice);

  if (ratePlan.pricingType === PricingType.TIME_UNIT) {
    if (!ratePlan.timeUnitMinutes) {
      throw new AppError(409, 'Rate plan is missing timeUnitMinutes');
    }

    return basePrice * ceilDiv(overtimeMinutes, ratePlan.timeUnitMinutes);
  }

  return basePrice * ceilDiv(overtimeMinutes, reservedMinutes);
}

async function getNextTicketNumber(tx: PrismaTx, branchId: string) {
  const lastTicket = await tx.ticket.findFirst({
    where: { branchId },
    orderBy: { ticketNumber: 'desc' },
    select: { ticketNumber: true },
  });

  return (lastTicket?.ticketNumber ?? 0) + 1;
}

const ticketSummarySelect = {
  id: true,
  companyId: true,
  branchId: true,
  openedById: true,
  ticketNumber: true,
  status: true,
  subtotal: true,
  discountAmount: true,
  discountReason: true,
  total: true,
  openedAt: true,
  closedAt: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ticketItemSelect = {
  id: true,
  ticketId: true,
  type: true,
  description: true,
  quantity: true,
  unitPrice: true,
  subtotal: true,
  discountAmount: true,
  discountReason: true,
  cancelledAt: true,
  cancellationReason: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function recalculateTicketTotals(tx: PrismaTx, ticketId: string) {
  const [items, ticket] = await Promise.all([
    tx.ticketItem.findMany({
      where: {
        ticketId,
        cancelledAt: null,
      },
      select: { subtotal: true },
    }),
    tx.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, status: true, discountAmount: true },
    }),
  ]);

  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  const subtotal = items.reduce((sum, item) => sum + decimalToNumber(item.subtotal), 0);
  const ticketDiscountAmount = decimalToNumber(ticket.discountAmount);
  const total = subtotal - ticketDiscountAmount;

  if (total < -0.000001) {
    throw new AppError(409, 'Ticket total cannot be negative');
  }

  return tx.ticket.update({
    where: { id: ticketId },
    data: {
      subtotal: toDecimal(subtotal),
      total: toDecimal(Math.max(total, 0)),
    },
    select: ticketSummarySelect,
  });
}

async function getTicketPaidGrossTotal(tx: PrismaTx, ticketId: string) {
  const aggregate = await tx.payment.aggregate({
    where: { ticketId },
    _sum: { amount: true },
  });

  return decimalToNumber(aggregate._sum.amount);
}

async function getTicketReversedTotal(tx: PrismaTx, ticketId: string) {
  const aggregate = await tx.paymentReversal.aggregate({
    where: { ticketId },
    _sum: { amount: true },
  });

  return decimalToNumber(aggregate._sum.amount);
}

async function getTicketFinancialSummary(tx: PrismaTx, ticketId: string) {
  const [paidGrossTotal, reversedTotal] = await Promise.all([
    getTicketPaidGrossTotal(tx, ticketId),
    getTicketReversedTotal(tx, ticketId),
  ]);

  return {
    paidGrossTotal,
    reversedTotal,
    paidNetTotal: Math.max(paidGrossTotal - reversedTotal, 0),
  };
}

async function ensurePaymentInTicket(tx: PrismaTx, ticketId: string, paymentId: string) {
  const payment = await tx.payment.findFirst({
    where: {
      id: paymentId,
      ticketId,
    },
    select: {
      id: true,
      companyId: true,
      ticketId: true,
      method: true,
      amount: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      paymentReversals: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          amount: true,
          reason: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(404, 'Payment not found');
  }

  return payment;
}

function buildPaymentReversalSummary(payment: {
  amount: Prisma.Decimal | number;
  paymentReversals: Array<{ amount: Prisma.Decimal | number }>;
}) {
  const originalAmount = decimalToNumber(payment.amount);
  const reversedAmount = payment.paymentReversals.reduce((sum, reversal) => sum + decimalToNumber(reversal.amount), 0);

  return {
    originalAmount,
    reversedAmount,
    remainingReversibleAmount: Math.max(originalAmount - reversedAmount, 0),
  };
}

async function buildTicketSummary(tx: PrismaTx, ticketId: string) {
  const ticket = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: ticketSummarySelect,
  });

  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  const totals = await getTicketFinancialSummary(tx, ticketId);
  const total = decimalToNumber(ticket.total);

  return {
    ...ticket,
    ...totals,
    paidTotal: totals.paidNetTotal,
    pendingAmount: Math.max(total - totals.paidNetTotal, 0),
  };
}

async function createRentalArtifacts(tx: PrismaTx, companyId: string, branchId: string, ticketId: string, input: RentalInput) {
  const resource = await ensureResourceOperable(tx, companyId, branchId, input.resourceId);
  const ratePlan = await resolveRatePlan(tx, companyId, branchId, resource.id, resource.resourceCategoryId);
  const startAt = input.startAt ?? new Date();
  const scheduledEndAt = new Date(startAt.getTime() + input.reservedMinutes * 60 * 1000);

  await ensureResourceAvailable(tx, resource.id, startAt, scheduledEndAt);

  const baseAmount = calculateBaseAmount(ratePlan, input.reservedMinutes);
  const description = input.notes ? `${resource.name} — ${input.notes}` : resource.name;

  const ticketItem = await tx.ticketItem.create({
    data: {
      ticketId,
      type: TicketItemType.RENTAL,
      description,
      quantity: toDecimal(1),
      unitPrice: toDecimal(baseAmount),
      subtotal: toDecimal(baseAmount),
      discountAmount: toDecimal(0),
      metadata: {
        resourceId: resource.id,
        resourceName: resource.name,
        resourceCategoryId: resource.resourceCategoryId,
        ratePlanId: ratePlan.id,
        ratePlanName: ratePlan.name,
        pricingType: ratePlan.pricingType,
        reservedMinutes: input.reservedMinutes,
        notes: input.notes ?? null,
      },
    },
    select: ticketItemSelect,
  });

  const rentalSession = await tx.rentalSession.create({
    data: {
      companyId,
      branchId,
      resourceId: resource.id,
      ticketItemId: ticketItem.id,
      status: RentalSessionStatus.RESERVED,
      startAt,
      scheduledEndAt,
      reservedMinutes: input.reservedMinutes,
      ratePlanSnapshot: {
        id: ratePlan.id,
        name: ratePlan.name,
        pricingType: ratePlan.pricingType,
        basePrice: decimalToNumber(ratePlan.basePrice),
        timeUnitMinutes: ratePlan.timeUnitMinutes,
      },
      baseAmount: toDecimal(baseAmount),
      overtimeAmount: toDecimal(0),
      totalAmount: toDecimal(baseAmount),
    },
    select: rentalSessionSelect,
  });

  return { ticketItem, rentalSession };
}

const rentalSessionSelect = {
  id: true,
  companyId: true,
  branchId: true,
  resourceId: true,
  ticketItemId: true,
  status: true,
  startAt: true,
  scheduledEndAt: true,
  endedAt: true,
  reservedMinutes: true,
  usedMinutes: true,
  overtimeMinutes: true,
  ratePlanSnapshot: true,
  baseAmount: true,
  overtimeAmount: true,
  totalAmount: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function ensureCatalogItemForTicket(tx: PrismaTx, companyId: string, branchId: string, catalogItemId: string) {
  const catalogItem = await tx.saleCatalogItem.findFirst({
    where: {
      id: catalogItemId,
      companyId,
      status: RecordStatus.ACTIVE,
      OR: [{ branchId: null }, { branchId }],
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      type: true,
      name: true,
      price: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!catalogItem) {
    throw new AppError(404, 'Catalog item not found');
  }

  return catalogItem;
}

async function ensureCatalogItemInCompany(companyId: string, catalogItemId: string) {
  const catalogItem = await prisma.saleCatalogItem.findFirst({
    where: {
      id: catalogItemId,
      companyId,
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      type: true,
      name: true,
      price: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!catalogItem) {
    throw new AppError(404, 'Catalog item not found');
  }

  return catalogItem;
}

async function ensureTicketItemInTicket(tx: PrismaTx, ticketId: string, ticketItemId: string) {
  const ticketItem = await tx.ticketItem.findFirst({
    where: {
      id: ticketItemId,
      ticketId,
    },
    include: {
      rentalSession: {
        select: {
          id: true,
          status: true,
          endedAt: true,
        },
      },
    },
  });

  if (!ticketItem) {
    throw new AppError(404, 'Ticket item not found');
  }

  return ticketItem;
}

async function allocateReversalAmountsFIFO(tx: PrismaTx, ticketId: string, amountNeeded: number) {
  const payments = await tx.payment.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      amount: true,
      paymentReversals: {
        orderBy: { createdAt: 'asc' },
        select: {
          amount: true,
        },
      },
    },
  });

  const allocations: Array<{ paymentId: string; amount: number }> = [];
  let remaining = amountNeeded;

  for (const payment of payments) {
    if (remaining <= 0.000001) {
      break;
    }

    const summary = buildPaymentReversalSummary(payment);
    if (summary.remainingReversibleAmount <= 0.000001) {
      continue;
    }

    const allocated = Math.min(summary.remainingReversibleAmount, remaining);
    allocations.push({ paymentId: payment.id, amount: allocated });
    remaining -= allocated;
  }

  if (remaining > 0.000001) {
    throw new AppError(409, 'Insufficient reversible balance to support rental cancellation');
  }

  return allocations;
}

function getTicketItemGrossSubtotal(ticketItem: { quantity: Prisma.Decimal | number; unitPrice: Prisma.Decimal | number }) {
  return decimalToNumber(ticketItem.quantity) * decimalToNumber(ticketItem.unitPrice);
}

async function createSimpleTicketItem(
  tx: PrismaTx,
  ticketId: string,
  type: TicketItemType,
  description: string,
  quantity: number,
  unitPrice: number,
  metadata?: Prisma.InputJsonValue,
) {
  const subtotal = grossSubtotal(quantity, unitPrice);

  return tx.ticketItem.create({
    data: {
      ticketId,
      type,
      description,
      quantity: toDecimal(quantity),
      unitPrice: toDecimal(unitPrice),
      subtotal: toDecimal(subtotal),
      discountAmount: toDecimal(0),
      metadata,
    },
    select: ticketItemSelect,
  });
}

export async function createCatalogItem(
  companyId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CreateCatalogItemInput,
) {
  await ensureCatalogAdminAccess(companyId, userId, globalRole);

  if (input.branchId) {
    await ensureBranchInCompany(companyId, input.branchId);
  }

  return prisma.saleCatalogItem.create({
    data: {
      companyId,
      branchId: input.branchId,
      type: input.type,
      name: input.name,
      price: toDecimal(input.price),
      status: RecordStatus.ACTIVE,
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      type: true,
      name: true,
      price: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listCatalogItems(
  companyId: string,
  userId: string,
  globalRole: GlobalRole,
  query: ListCatalogItemsQuery,
) {
  await ensureOperationalCompanyAccess(companyId, userId, globalRole);

  if (query.branchId) {
    await ensureBranchInCompany(companyId, query.branchId);
  }

  const [items, total] = await Promise.all([
    prisma.saleCatalogItem.findMany({
      where: {
        companyId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
        ...(query.branchId ? { OR: [{ branchId: null }, { branchId: query.branchId }] } : {}),
      },
      orderBy: [{ branchId: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        companyId: true,
        branchId: true,
        type: true,
        name: true,
        price: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.saleCatalogItem.count({
      where: {
        companyId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
        ...(query.branchId ? { OR: [{ branchId: null }, { branchId: query.branchId }] } : {}),
      },
    }),
  ]);

  return {
    data: items,
    total,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  };
}

export async function updateCatalogItem(
  companyId: string,
  catalogItemId: string,
  userId: string,
  globalRole: GlobalRole,
  input: UpdateCatalogItemInput,
) {
  await ensureCatalogAdminAccess(companyId, userId, globalRole);
  await ensureCatalogItemInCompany(companyId, catalogItemId);

  if (input.branchId !== undefined && input.branchId !== null) {
    await ensureBranchInCompany(companyId, input.branchId);
  }

  return prisma.saleCatalogItem.update({
    where: { id: catalogItemId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.price !== undefined ? { price: toDecimal(input.price) } : {}),
      ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      type: true,
      name: true,
      price: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function activateCatalogItem(
  companyId: string,
  catalogItemId: string,
  userId: string,
  globalRole: GlobalRole,
) {
  await ensureCatalogAdminAccess(companyId, userId, globalRole);
  const catalogItem = await ensureCatalogItemInCompany(companyId, catalogItemId);

  if (catalogItem.status === RecordStatus.ACTIVE) {
    throw new AppError(409, 'Catalog item is already active');
  }

  return prisma.saleCatalogItem.update({
    where: { id: catalogItemId },
    data: { status: RecordStatus.ACTIVE },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      type: true,
      name: true,
      price: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deactivateCatalogItem(
  companyId: string,
  catalogItemId: string,
  userId: string,
  globalRole: GlobalRole,
) {
  await ensureCatalogAdminAccess(companyId, userId, globalRole);
  const catalogItem = await ensureCatalogItemInCompany(companyId, catalogItemId);

  if (catalogItem.status === RecordStatus.INACTIVE) {
    throw new AppError(409, 'Catalog item is already inactive');
  }

  return prisma.saleCatalogItem.update({
    where: { id: catalogItemId },
    data: { status: RecordStatus.INACTIVE },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      type: true,
      name: true,
      price: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createTicket(companyId: string, branchId: string, userId: string, globalRole: GlobalRole) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticketNumber = await getNextTicketNumber(tx, branchId);

    return tx.ticket.create({
      data: {
        companyId,
        branchId,
        openedById: userId,
        ticketNumber,
        status: TicketStatus.OPEN,
        subtotal: toDecimal(0),
        discountAmount: toDecimal(0),
        total: toDecimal(0),
      },
      select: ticketSummarySelect,
    });
  });
}

export async function listTickets(
  companyId: string,
  branchId: string,
  userId: string,
  globalRole: GlobalRole,
  query: ListTicketsQuery,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        companyId,
        branchId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ openedAt: 'desc' }, { ticketNumber: 'desc' }],
      select: {
        ...ticketSummarySelect,
        payments: {
          select: {
            amount: true,
            paymentReversals: {
              select: {
                amount: true,
              },
            },
          },
        },
      },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.ticket.count({
      where: {
        companyId,
        branchId,
        ...(query.status ? { status: query.status } : {}),
      },
    }),
  ]);

  return {
    data: tickets.map((ticket) => {
      const paidGrossTotal = ticket.payments.reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);
      const reversedTotal = ticket.payments.reduce(
        (sum, payment) =>
          sum + payment.paymentReversals.reduce((innerSum, reversal) => innerSum + decimalToNumber(reversal.amount), 0),
        0,
      );
      const paidNetTotal = Math.max(paidGrossTotal - reversedTotal, 0);
      const total = decimalToNumber(ticket.total);

      return {
        ...ticket,
        paidGrossTotal,
        reversedTotal,
        paidNetTotal,
        pendingAmount: Math.max(total - paidNetTotal, 0),
      };
    }),
    total,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  };
}

export async function getTicketDetail(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, companyId, branchId },
    select: {
      ...ticketSummarySelect,
      items: {
        orderBy: { createdAt: 'asc' },
        select: {
          ...ticketItemSelect,
          rentalSession: {
            select: rentalSessionSelect,
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          method: true,
          amount: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          paymentReversals: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              amount: true,
              reason: true,
              createdById: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
      paymentReversals: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          paymentId: true,
          amount: true,
          reason: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  const paidGrossTotal = ticket.payments.reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);
  const reversedTotal = ticket.paymentReversals.reduce((sum, reversal) => sum + decimalToNumber(reversal.amount), 0);
  const paidNetTotal = Math.max(paidGrossTotal - reversedTotal, 0);
  const total = decimalToNumber(ticket.total);

  return {
    ...ticket,
    paidGrossTotal,
    reversedTotal,
    paidNetTotal,
    paidTotal: paidNetTotal,
    pendingAmount: Math.max(total - paidNetTotal, 0),
  };
}

export async function startRental(
  companyId: string,
  branchId: string,
  userId: string,
  globalRole: GlobalRole,
  input: RentalInput,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticketNumber = await getNextTicketNumber(tx, branchId);
    const ticket = await tx.ticket.create({
      data: {
        companyId,
        branchId,
        openedById: userId,
        ticketNumber,
        status: TicketStatus.OPEN,
        subtotal: toDecimal(0),
        discountAmount: toDecimal(0),
        total: toDecimal(0),
      },
      select: { id: true },
    });

    const { ticketItem, rentalSession } = await createRentalArtifacts(tx, companyId, branchId, ticket.id, input);
    const ticketSummary = await recalculateTicketTotals(tx, ticket.id);
    const fullSummary = await buildTicketSummary(tx, ticket.id);

    return {
      ticket: ticketSummary,
      ticketItem,
      rentalSession,
      totals: {
        paidTotal: fullSummary.paidTotal,
        pendingAmount: fullSummary.pendingAmount,
      },
    };
  });
}

export async function addRentalToTicket(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
  input: RentalInput,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);

    const { ticketItem, rentalSession } = await createRentalArtifacts(tx, companyId, branchId, ticketId, input);
    const ticketSummary = await recalculateTicketTotals(tx, ticketId);
    const fullSummary = await buildTicketSummary(tx, ticketId);

    return {
      ticket: ticketSummary,
      ticketItem,
      rentalSession,
      totals: {
        paidTotal: fullSummary.paidTotal,
        pendingAmount: fullSummary.pendingAmount,
      },
    };
  });
}

export async function addCatalogItemToTicket(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
  input: AddCatalogItemToTicketInput,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);

    const catalogItem = await ensureCatalogItemForTicket(tx, companyId, branchId, input.catalogItemId);
    const item = await createSimpleTicketItem(
      tx,
      ticketId,
      TicketItemType.PRODUCT,
      catalogItem.name,
      input.quantity,
      decimalToNumber(catalogItem.price),
      {
        catalogItemId: catalogItem.id,
        catalogItemType: catalogItem.type,
        source: 'CATALOG',
      },
    );

    const ticketSummary = await recalculateTicketTotals(tx, ticketId);
    const totals = await buildTicketSummary(tx, ticketId);

    return {
      ticket: ticketSummary,
      ticketItem: item,
      totals: {
        paidTotal: totals.paidTotal,
        pendingAmount: totals.pendingAmount,
      },
    };
  });
}

async function addFreeformTicketItem(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
  input: AddManualItemToTicketInput,
  type: TicketItemType,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);

    const item = await createSimpleTicketItem(tx, ticketId, type, input.description, input.quantity, input.unitPrice, {
      source: type,
    });
    const ticketSummary = await recalculateTicketTotals(tx, ticketId);
    const totals = await buildTicketSummary(tx, ticketId);

    return {
      ticket: ticketSummary,
      ticketItem: item,
      totals: {
        paidTotal: totals.paidTotal,
        pendingAmount: totals.pendingAmount,
      },
    };
  });
}

export function addManualItemToTicket(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
  input: AddManualItemToTicketInput,
) {
  return addFreeformTicketItem(companyId, branchId, ticketId, userId, globalRole, input, TicketItemType.MANUAL);
}

export function addExtraItemToTicket(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
  input: AddManualItemToTicketInput,
) {
  return addFreeformTicketItem(companyId, branchId, ticketId, userId, globalRole, input, TicketItemType.EXTRA);
}

export async function applyTicketItemDiscount(
  companyId: string,
  branchId: string,
  ticketId: string,
  ticketItemId: string,
  userId: string,
  globalRole: GlobalRole,
  input: ApplyDiscountInput,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);
    await ensureTicketWithoutPayments(tx, ticketId);

    const ticketItem = await ensureTicketItemInTicket(tx, ticketId, ticketItemId);

    if (ticketItem.cancelledAt) {
      throw new AppError(409, 'Ticket item is cancelled');
    }

    const gross = getTicketItemGrossSubtotal(ticketItem);

    if (input.discountAmount > gross) {
      throw new AppError(409, 'Discount exceeds allowed amount');
    }

    const updatedItem = await tx.ticketItem.update({
      where: { id: ticketItemId },
      data: {
        discountAmount: toDecimal(input.discountAmount),
        discountReason: input.reason,
        subtotal: toDecimal(gross - input.discountAmount),
      },
      select: ticketItemSelect,
    });

    const updatedTicket = await recalculateTicketTotals(tx, ticketId);
    const totals = await buildTicketSummary(tx, ticketId);

    return {
      ticket: updatedTicket,
      ticketItem: updatedItem,
      totals: {
        paidTotal: totals.paidTotal,
        pendingAmount: totals.pendingAmount,
      },
    };
  });
}

export async function applyTicketDiscount(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
  input: ApplyDiscountInput,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);
    await ensureTicketWithoutPayments(tx, ticketId);

    const activeItems = await tx.ticketItem.findMany({
      where: { ticketId, cancelledAt: null },
      select: { subtotal: true },
    });
    const itemsSubtotal = activeItems.reduce((sum, item) => sum + decimalToNumber(item.subtotal), 0);

    if (input.discountAmount > itemsSubtotal) {
      throw new AppError(409, 'Discount exceeds allowed amount');
    }

    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        discountAmount: toDecimal(input.discountAmount),
        discountReason: input.reason,
      },
    });

    const updatedTicket = await recalculateTicketTotals(tx, ticketId);
    const totals = await buildTicketSummary(tx, ticketId);

    return {
      ticket: updatedTicket,
      totals: {
        paidTotal: totals.paidTotal,
        pendingAmount: totals.pendingAmount,
      },
    };
  });
}

export async function cancelTicketItem(
  companyId: string,
  branchId: string,
  ticketId: string,
  ticketItemId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CancelInput,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);
    await ensureTicketWithoutPayments(tx, ticketId);

    const ticketItem = await ensureTicketItemInTicket(tx, ticketId, ticketItemId);

    if (ticketItem.cancelledAt) {
      throw new AppError(409, 'Ticket item is already cancelled');
    }

    if (ticketItem.type === TicketItemType.RENTAL && ticketItem.rentalSession) {
      throw new AppError(409, 'Rental ticket item cannot be cancelled in this phase');
    }

    const updatedItem = await tx.ticketItem.update({
      where: { id: ticketItemId },
      data: {
        cancelledAt: new Date(),
        cancellationReason: input.reason,
      },
      select: ticketItemSelect,
    });

    const updatedTicket = await recalculateTicketTotals(tx, ticketId);
    const totals = await buildTicketSummary(tx, ticketId);

    return {
      ticket: updatedTicket,
      ticketItem: updatedItem,
      totals: {
        paidTotal: totals.paidTotal,
        pendingAmount: totals.pendingAmount,
      },
    };
  });
}

export async function cancelTicket(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CancelInput,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);
    await ensureTicketWithoutPayments(tx, ticketId);

    const now = new Date();

    await tx.ticketItem.updateMany({
      where: {
        ticketId,
        cancelledAt: null,
      },
      data: {
        cancelledAt: now,
        cancellationReason: `Ticket cancelled: ${input.reason}`,
      },
    });

    return tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: input.reason,
        subtotal: toDecimal(0),
        discountAmount: toDecimal(0),
        discountReason: null,
        total: toDecimal(0),
      },
      select: ticketSummarySelect,
    });
  });
}

export async function cancelRentalSession(
  companyId: string,
  branchId: string,
  rentalSessionId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CancelInput,
) {
  await ensureSensitiveTicketActionAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const rentalSession = await tx.rentalSession.findFirst({
      where: { id: rentalSessionId, companyId, branchId },
      include: {
        ticketItem: {
          select: {
            id: true,
            ticketId: true,
            subtotal: true,
            cancelledAt: true,
            cancellationReason: true,
          },
        },
      },
    });

    if (!rentalSession) {
      throw new AppError(404, 'Rental session not found');
    }

    const ticket = await ensureTicketInBranch(tx, companyId, branchId, rentalSession.ticketItem.ticketId);
    ensureTicketOpen(ticket);

    if (rentalSession.status === RentalSessionStatus.CANCELLED || rentalSession.ticketItem.cancelledAt) {
      throw new AppError(409, 'Rental session is already cancelled');
    }

    if (rentalSession.status === RentalSessionStatus.IN_USE) {
      throw new AppError(409, 'Rental session in use cannot be cancelled in this phase');
    }

    const lineCancelableNetAmount = decimalToNumber(rentalSession.ticketItem.subtotal);
    const financialsBefore = await getTicketFinancialSummary(tx, rentalSession.ticketItem.ticketId);
    const reversalNeeded = Math.min(lineCancelableNetAmount, financialsBefore.paidNetTotal);
    const paymentReversals = reversalNeeded > 0 ? await allocateReversalAmountsFIFO(tx, rentalSession.ticketItem.ticketId, reversalNeeded) : [];

    const createdReversals = await Promise.all(
      paymentReversals.map((allocation) =>
        tx.paymentReversal.create({
          data: {
            companyId,
            ticketId: rentalSession.ticketItem.ticketId,
            paymentId: allocation.paymentId,
            amount: toDecimal(allocation.amount),
            reason: input.reason,
            createdById: userId,
          },
          select: {
            id: true,
            companyId: true,
            ticketId: true,
            paymentId: true,
            amount: true,
            reason: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ),
    );

    const now = new Date();

    const updatedSession = await tx.rentalSession.update({
      where: { id: rentalSessionId },
      data: {
        status: RentalSessionStatus.CANCELLED,
      },
      select: rentalSessionSelect,
    });

    const ticketItem = await tx.ticketItem.update({
      where: { id: rentalSession.ticketItem.id },
      data: {
        cancelledAt: now,
        cancellationReason: input.reason,
      },
      select: ticketItemSelect,
    });

    const updatedTicket = await recalculateTicketTotals(tx, rentalSession.ticketItem.ticketId);
    const totals = await buildTicketSummary(tx, rentalSession.ticketItem.ticketId);

    return {
      rentalSession: updatedSession,
      ticketItem,
      ticket: updatedTicket,
      paymentReversals: createdReversals,
      totals: {
        paidGrossTotal: totals.paidGrossTotal,
        reversedTotal: totals.reversedTotal,
        paidNetTotal: totals.paidNetTotal,
        paidTotal: totals.paidTotal,
        pendingAmount: totals.pendingAmount,
      },
    };
  });
}

export async function finishRental(
  companyId: string,
  branchId: string,
  rentalSessionId: string,
  userId: string,
  globalRole: GlobalRole,
  input: FinishRentalInput,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const rentalSession = await tx.rentalSession.findFirst({
      where: { id: rentalSessionId, companyId, branchId },
      include: {
        ticketItem: {
          select: {
            id: true,
            ticketId: true,
            discountAmount: true,
          },
        },
      },
    });

    if (!rentalSession) {
      throw new AppError(404, 'Rental session not found');
    }

    const ticket = await ensureTicketInBranch(tx, companyId, branchId, rentalSession.ticketItem.ticketId);
    ensureTicketOpen(ticket);

    if (rentalSession.status === RentalSessionStatus.FINISHED || rentalSession.endedAt) {
      throw new AppError(409, 'Rental session is already finished');
    }

    const endedAt = input.endedAt ?? new Date();

    if (endedAt < rentalSession.startAt) {
      throw new AppError(409, 'endedAt cannot be before startAt');
    }

    const ratePlanSnapshot = rentalSession.ratePlanSnapshot as {
      pricingType: PricingType;
      basePrice: number;
      timeUnitMinutes?: number | null;
    } | null;

    if (!ratePlanSnapshot) {
      throw new AppError(409, 'Rental session is missing rate plan snapshot');
    }

    const usedMinutes = Math.max(1, Math.ceil((endedAt.getTime() - rentalSession.startAt.getTime()) / 60000));
    const overtimeMinutes = Math.max(usedMinutes - rentalSession.reservedMinutes, 0);
    const ratePlanLike = {
      pricingType: ratePlanSnapshot.pricingType,
      basePrice: toDecimal(ratePlanSnapshot.basePrice),
      timeUnitMinutes: ratePlanSnapshot.timeUnitMinutes ?? null,
    };
    const baseAmount = calculateBaseAmount(ratePlanLike, rentalSession.reservedMinutes);
    const overtimeAmount = calculateOvertimeAmount(ratePlanLike, rentalSession.reservedMinutes, overtimeMinutes);
    const totalAmount = baseAmount + overtimeAmount;
    const lineDiscountAmount = decimalToNumber(rentalSession.ticketItem.discountAmount);

    if (lineDiscountAmount > totalAmount) {
      throw new AppError(409, 'Discount exceeds allowed amount');
    }

    const updatedSession = await tx.rentalSession.update({
      where: { id: rentalSessionId },
      data: {
        status: RentalSessionStatus.FINISHED,
        endedAt,
        usedMinutes,
        overtimeMinutes,
        baseAmount: toDecimal(baseAmount),
        overtimeAmount: toDecimal(overtimeAmount),
        totalAmount: toDecimal(totalAmount),
      },
      select: rentalSessionSelect,
    });

    const ticketItem = await tx.ticketItem.update({
      where: { id: rentalSession.ticketItem.id },
      data: {
        unitPrice: toDecimal(totalAmount),
        subtotal: toDecimal(totalAmount - lineDiscountAmount),
      },
      select: ticketItemSelect,
    });

    const updatedTicket = await recalculateTicketTotals(tx, rentalSession.ticketItem.ticketId);
    const totals = await buildTicketSummary(tx, rentalSession.ticketItem.ticketId);

    return {
      rentalSession: updatedSession,
      ticketItem,
      ticket: updatedTicket,
      totals: {
        paidTotal: totals.paidTotal,
        pendingAmount: totals.pendingAmount,
      },
    };
  });
}

export async function createPayment(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CreatePaymentInput,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);

    const financials = await getTicketFinancialSummary(tx, ticketId);
    const ticketTotal = decimalToNumber(ticket.total);
    const pendingAmount = ticketTotal - financials.paidNetTotal;

    if (input.amount > pendingAmount + 0.000001) {
      throw new AppError(409, 'Payment exceeds pending amount');
    }

    const payment = await tx.payment.create({
      data: {
        companyId,
        ticketId,
        method: input.method,
        amount: toDecimal(input.amount),
        notes: input.notes,
      },
      select: {
        id: true,
        companyId: true,
        ticketId: true,
        method: true,
        amount: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const paidGrossTotal = financials.paidGrossTotal + input.amount;
    const paidNetTotal = paidGrossTotal - financials.reversedTotal;

    return {
      payment,
      paidGrossTotal,
      reversedTotal: financials.reversedTotal,
      paidNetTotal,
      paidTotal: paidNetTotal,
      pendingAmount: Math.max(ticketTotal - paidNetTotal, 0),
    };
  });
}

export async function createPaymentReversal(
  companyId: string,
  branchId: string,
  ticketId: string,
  paymentId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CreatePaymentReversalInput,
) {
  await ensureSensitiveTicketActionAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);

    const payment = await ensurePaymentInTicket(tx, ticketId, paymentId);
    const summary = buildPaymentReversalSummary(payment);

    if (input.amount > summary.remainingReversibleAmount + 0.000001) {
      throw new AppError(409, 'Reversal amount exceeds remaining reversible amount');
    }

    const reversal = await tx.paymentReversal.create({
      data: {
        companyId,
        ticketId,
        paymentId,
        amount: toDecimal(input.amount),
        reason: input.reason,
        createdById: userId,
      },
      select: {
        id: true,
        companyId: true,
        ticketId: true,
        paymentId: true,
        amount: true,
        reason: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const updatedPayment = await ensurePaymentInTicket(tx, ticketId, paymentId);
    const paymentSummary = buildPaymentReversalSummary(updatedPayment);
    const totals = await getTicketFinancialSummary(tx, ticketId);

    return {
      reversal,
      payment: {
        id: updatedPayment.id,
        companyId: updatedPayment.companyId,
        ticketId: updatedPayment.ticketId,
        method: updatedPayment.method,
        amount: updatedPayment.amount,
        notes: updatedPayment.notes,
        createdAt: updatedPayment.createdAt,
        updatedAt: updatedPayment.updatedAt,
      },
      paymentSummary,
      totals,
    };
  });
}

export async function closeTicket(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
) {
  await ensureOperationsAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);

    const activeSession = await tx.rentalSession.findFirst({
      where: {
        companyId,
        branchId,
        ticketItem: { ticketId },
        status: RentalSessionStatus.IN_USE,
      },
      select: { id: true },
    });

    if (activeSession) {
      throw new AppError(409, 'Ticket has active rental sessions');
    }

    const overdueSession = await tx.rentalSession.findFirst({
      where: {
        companyId,
        branchId,
        ticketItem: { ticketId },
        status: RentalSessionStatus.RESERVED,
        scheduledEndAt: { lt: new Date() },
      },
      select: { id: true },
    });

    if (overdueSession) {
      throw new AppError(409, 'Ticket has overdue rental sessions. Cancel or finish them first.');
    }

    const financials = await getTicketFinancialSummary(tx, ticketId);
    const pendingAmount = decimalToNumber(ticket.total) - financials.paidNetTotal;

    if (!isZero(pendingAmount)) {
      throw new AppError(409, 'Ticket has pending amount');
    }

    return tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      },
      select: ticketSummarySelect,
    });
  });
}

export async function cancelTicketWithReversal(
  companyId: string,
  branchId: string,
  ticketId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CancelInput,
) {
  await ensureSensitiveTicketActionAccess(companyId, branchId, userId, globalRole);

  return prisma.$transaction(async (tx) => {
    const ticket = await ensureTicketInBranch(tx, companyId, branchId, ticketId);
    ensureTicketOpen(ticket);

    const payments = await tx.payment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        companyId: true,
        ticketId: true,
        method: true,
        amount: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        paymentReversals: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            amount: true,
          },
        },
      },
    });

    if (payments.length === 0) {
      throw new AppError(409, 'Ticket has no payments to reverse in this flow');
    }

    const reversiblePayments = payments
      .map((payment) => ({
        payment,
        summary: buildPaymentReversalSummary(payment),
      }))
      .filter(({ summary }) => summary.remainingReversibleAmount > 0.000001);

    if (reversiblePayments.length === 0) {
      throw new AppError(409, 'Ticket has no remaining reversible amount in this flow');
    }

    const now = new Date();

    const paymentReversals = await Promise.all(
      reversiblePayments.map(({ payment, summary }) =>
        tx.paymentReversal.create({
          data: {
            companyId,
            ticketId,
            paymentId: payment.id,
            amount: toDecimal(summary.remainingReversibleAmount),
            reason: input.reason,
            createdById: userId,
          },
          select: {
            id: true,
            companyId: true,
            ticketId: true,
            paymentId: true,
            amount: true,
            reason: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ),
    );

    await tx.ticketItem.updateMany({
      where: {
        ticketId,
        cancelledAt: null,
      },
      data: {
        cancelledAt: now,
        cancellationReason: `Ticket cancelled with reversal: ${input.reason}`,
      },
    });

    const cancelledTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: input.reason,
      },
      select: ticketSummarySelect,
    });

    const totals = await getTicketFinancialSummary(tx, ticketId);

    return {
      ticket: cancelledTicket,
      payments: payments.map(({ paymentReversals, ...payment }) => payment),
      paymentReversals,
      totals,
    };
  });
}
