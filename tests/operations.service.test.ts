import './setup';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../src/middlewares/error.middleware';
import * as operationsService from '../src/modules/operations/operations.service';
import {
  createBranch,
  createCompany,
  createRatePlan,
  createResource,
  createResourceCategory,
  createUser,
  grantBranchMembership,
  grantCompanyMembership,
} from './helpers/factories';
import { GlobalRole, MembershipRole, PaymentMethod } from '@prisma/client';

async function createOperationsContext() {
  const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
  const company = await createCompany();
  const branch = await createBranch({ companyId: company.id });
  const category = await createResourceCategory({ companyId: company.id });
  const resource = await createResource({
    companyId: company.id,
    branchId: branch.id,
    resourceCategoryId: category.id,
  });

  await createRatePlan({
    companyId: company.id,
    branchId: branch.id,
    basePrice: 100,
    timeUnitMinutes: 60,
  });

  return { user, company, branch, category, resource };
}

describe('operations service critical rules', () => {
  it('rejects starting an overlapping rental', async () => {
    const { user, company, branch, resource } = await createOperationsContext();
    const startAt = new Date('2026-04-30T10:00:00.000Z');

    await operationsService.startRental(company.id, branch.id, user.id, user.globalRole, {
      resourceId: resource.id,
      reservedMinutes: 60,
      startAt,
    });

    await assert.rejects(
      operationsService.startRental(company.id, branch.id, user.id, user.globalRole, {
        resourceId: resource.id,
        reservedMinutes: 60,
        startAt: new Date('2026-04-30T10:30:00.000Z'),
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });

  it('rejects a payment greater than the pending amount', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    await assert.rejects(
      operationsService.createPayment(company.id, branch.id, ticket.id, user.id, user.globalRole, {
        method: PaymentMethod.CASH,
        amount: 150,
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });

  it('rejects closing a ticket with pending balance', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    await assert.rejects(
      operationsService.closeTicket(company.id, branch.id, ticket.id, user.id, user.globalRole),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });

  it('rejects closing a ticket with active rental sessions', async () => {
    const { user, company, branch, resource } = await createOperationsContext();
    const rental = await operationsService.startRental(company.id, branch.id, user.id, user.globalRole, {
      resourceId: resource.id,
      reservedMinutes: 60,
      startAt: new Date('2026-04-30T10:00:00.000Z'),
    });

    await assert.rejects(
      operationsService.closeTicket(company.id, branch.id, rental.ticket.id, user.id, user.globalRole),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });

  it('rejects a second cancellation with reversal on the same ticket', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    await operationsService.createPayment(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      method: PaymentMethod.CASH,
      amount: 100,
    });

    await operationsService.cancelTicketWithReversal(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      reason: 'Customer request',
    });

    await assert.rejects(
      operationsService.cancelTicketWithReversal(company.id, branch.id, ticket.id, user.id, user.globalRole, {
        reason: 'Second attempt',
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });

  it('rejects simple ticket cancellation when payments already exist', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    await operationsService.createPayment(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      method: PaymentMethod.CASH,
      amount: 50,
    });

    await assert.rejects(
      operationsService.cancelTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
        reason: 'Should fail',
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });
});

async function createPermissionContext() {
  const owner = await createUser({ globalRole: GlobalRole.SUPERADMIN });
  const company = await createCompany();
  const branch = await createBranch({ companyId: company.id });
  const ticket = await operationsService.createTicket(company.id, branch.id, owner.id, owner.globalRole);

  await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, owner.id, owner.globalRole, {
    description: 'Manual item',
    quantity: 1,
    unitPrice: 100,
  });

  await operationsService.createPayment(company.id, branch.id, ticket.id, owner.id, owner.globalRole, {
    method: PaymentMethod.CASH,
    amount: 100,
  });

  return { company, branch, ticket };
}

describe('operations service rental happy path', () => {
  it('completes rental without overtime, gets paid and closes ticket', async () => {
    const { user, company, branch, resource } = await createOperationsContext();
    const startAt = new Date('2026-04-30T10:00:00.000Z');

    const started = await operationsService.startRental(company.id, branch.id, user.id, user.globalRole, {
      resourceId: resource.id,
      reservedMinutes: 60,
      startAt,
    });

    assert.equal(started.ticket.status, 'OPEN');
    assert.equal(started.ticketItem.type, 'RENTAL');
    assert.equal(started.rentalSession.status, 'RESERVED');
    assert.equal(Number(started.rentalSession.baseAmount), 100);
    assert.equal(Number(started.rentalSession.totalAmount), 100);
    assert.equal(started.totals.pendingAmount, 100);

    const finished = await operationsService.finishRental(
      company.id,
      branch.id,
      started.rentalSession.id,
      user.id,
      user.globalRole,
      { endedAt: new Date('2026-04-30T10:45:00.000Z') },
    );

    assert.equal(finished.rentalSession.status, 'FINISHED');
    assert.equal(finished.rentalSession.overtimeMinutes, 0);
    assert.equal(Number(finished.rentalSession.baseAmount), 100);
    assert.equal(Number(finished.rentalSession.overtimeAmount), 0);
    assert.equal(Number(finished.rentalSession.totalAmount), 100);
    assert.equal(Number(finished.ticket.total), 100);
    assert.equal(finished.totals.pendingAmount, 100);

    const payment = await operationsService.createPayment(company.id, branch.id, started.ticket.id, user.id, user.globalRole, {
      method: PaymentMethod.CASH,
      amount: 100,
    });

    assert.equal(payment.paidNetTotal, 100);
    assert.equal(payment.pendingAmount, 0);

    const closed = await operationsService.closeTicket(company.id, branch.id, started.ticket.id, user.id, user.globalRole);

    assert.equal(closed.status, 'CLOSED');
    assert.ok(closed.closedAt);
  });
});

async function createCatalogFilterDataset() {
  const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
  const company = await createCompany();
  const branchA = await createBranch({ companyId: company.id, name: 'Branch A' });
  const branchB = await createBranch({ companyId: company.id, name: 'Branch B' });

  const globalProduct = await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
    name: 'Water Bottle',
    type: 'PRODUCT',
    price: 50,
  });

  const branchAService = await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
    name: 'Towel Rental',
    type: 'SERVICE',
    price: 20,
    branchId: branchA.id,
  });

  const branchBProduct = await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
    name: 'Snacks Combo',
    type: 'PRODUCT',
    price: 30,
    branchId: branchB.id,
  });

  const inactiveGlobalService = await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
    name: 'Old Service',
    type: 'SERVICE',
    price: 10,
  });

  await operationsService.deactivateCatalogItem(company.id, inactiveGlobalService.id, user.id, user.globalRole);

  return {
    user,
    company,
    branchA,
    branchB,
    globalProduct,
    branchAService,
    branchBProduct,
    inactiveGlobalService,
  };
}

describe('operations service catalog filters', () => {
  it('filters catalog items by status', async () => {
    const { user, company, inactiveGlobalService } = await createCatalogFilterDataset();

    const activeItems = await operationsService.listCatalogItems(company.id, user.id, user.globalRole, { status: 'ACTIVE' });
    const inactiveItems = await operationsService.listCatalogItems(company.id, user.id, user.globalRole, { status: 'INACTIVE' });

    assert.equal(activeItems.every((item) => item.status === 'ACTIVE'), true);
    assert.equal(inactiveItems.length, 1);
    assert.equal(inactiveItems[0].id, inactiveGlobalService.id);
  });

  it('filters catalog items by type', async () => {
    const { user, company } = await createCatalogFilterDataset();

    const serviceItems = await operationsService.listCatalogItems(company.id, user.id, user.globalRole, { type: 'SERVICE' });

    assert.equal(serviceItems.every((item) => item.type === 'SERVICE'), true);
    assert.deepEqual(
      serviceItems.map((item) => item.name).sort(),
      ['Old Service', 'Towel Rental'],
    );
  });

  it('filters catalog items by branch including global items and excluding other branches', async () => {
    const { user, company, branchA } = await createCatalogFilterDataset();

    const items = await operationsService.listCatalogItems(company.id, user.id, user.globalRole, { branchId: branchA.id });
    const names = items.map((item) => item.name).sort();

    assert.deepEqual(names, ['Old Service', 'Towel Rental', 'Water Bottle']);
  });

  it('filters catalog items by partial case-insensitive search', async () => {
    const { user, company } = await createCatalogFilterDataset();

    const items = await operationsService.listCatalogItems(company.id, user.id, user.globalRole, { search: 'water' });

    assert.equal(items.length, 1);
    assert.equal(items[0].name, 'Water Bottle');
  });

  it('combines catalog filters correctly', async () => {
    const { user, company, branchA } = await createCatalogFilterDataset();

    const items = await operationsService.listCatalogItems(company.id, user.id, user.globalRole, {
      branchId: branchA.id,
      status: 'ACTIVE',
      type: 'SERVICE',
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].name, 'Towel Rental');
  });
});

describe('operations service simple cancellations', () => {
  it('cancels a non-rental ticket item and recalculates ticket total', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    const manual = await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    await operationsService.addExtraItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Extra item',
      quantity: 1,
      unitPrice: 25,
    });

    const cancelled = await operationsService.cancelTicketItem(
      company.id,
      branch.id,
      ticket.id,
      manual.ticketItem.id,
      user.id,
      user.globalRole,
      { reason: 'Remove manual item' },
    );

    assert.ok(cancelled.ticketItem.cancelledAt);
    assert.equal(cancelled.ticketItem.cancellationReason, 'Remove manual item');
    assert.equal(Number(cancelled.ticket.total), 25);
  });

  it('cancels a ticket without payments and zeroes financial totals', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    await operationsService.addExtraItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Extra item',
      quantity: 1,
      unitPrice: 25,
    });

    const cancelled = await operationsService.cancelTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      reason: 'Cancel whole ticket',
    });

    assert.equal(cancelled.status, 'CANCELLED');
    assert.ok(cancelled.cancelledAt);
    assert.equal(cancelled.cancellationReason, 'Cancel whole ticket');
    assert.equal(Number(cancelled.subtotal), 0);
    assert.equal(Number(cancelled.discountAmount), 0);
    assert.equal(Number(cancelled.total), 0);
  });

  it('rejects simple cancellation of rental ticket item', async () => {
    const { user, company, branch, resource } = await createOperationsContext();
    const rental = await operationsService.startRental(company.id, branch.id, user.id, user.globalRole, {
      resourceId: resource.id,
      reservedMinutes: 60,
      startAt: new Date('2026-04-30T10:00:00.000Z'),
    });

    await assert.rejects(
      operationsService.cancelTicketItem(
        company.id,
        branch.id,
        rental.ticket.id,
        rental.ticketItem.id,
        user.id,
        user.globalRole,
        { reason: 'Should fail' },
      ),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });

  it('rejects simple line cancellation when ticket already has payments', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    const manual = await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    await operationsService.createPayment(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      method: PaymentMethod.CASH,
      amount: 50,
    });

    await assert.rejects(
      operationsService.cancelTicketItem(
        company.id,
        branch.id,
        ticket.id,
        manual.ticketItem.id,
        user.id,
        user.globalRole,
        { reason: 'Should fail' },
      ),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });

  it('rejects simple ticket cancellation when ticket already has payments', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    await operationsService.createPayment(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      method: PaymentMethod.CASH,
      amount: 50,
    });

    await assert.rejects(
      operationsService.cancelTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
        reason: 'Should fail',
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });
});

describe('operations service sales happy path', () => {
  it('completes sale flow with catalog, manual and extra items, payment and closing', async () => {
    const { user, company, branch } = await createOperationsContext();

    const catalogItem = await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
      name: 'Water bottle',
      type: 'PRODUCT',
      price: 50,
      branchId: branch.id,
    });

    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    const catalogAdded = await operationsService.addCatalogItemToTicket(
      company.id,
      branch.id,
      ticket.id,
      user.id,
      user.globalRole,
      { catalogItemId: catalogItem.id, quantity: 1 },
    );

    const manualAdded = await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual service',
      quantity: 1,
      unitPrice: 100,
    });

    const extraAdded = await operationsService.addExtraItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Extra fee',
      quantity: 1,
      unitPrice: 25,
    });

    assert.equal(catalogAdded.ticketItem.type, 'PRODUCT');
    assert.equal(manualAdded.ticketItem.type, 'MANUAL');
    assert.equal(extraAdded.ticketItem.type, 'EXTRA');
    assert.equal(Number(extraAdded.ticket.total), 175);

    const payment = await operationsService.createPayment(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      method: PaymentMethod.CASH,
      amount: 175,
    });

    assert.equal(payment.paidNetTotal, 175);
    assert.equal(payment.pendingAmount, 0);

    const closed = await operationsService.closeTicket(company.id, branch.id, ticket.id, user.id, user.globalRole);

    assert.equal(closed.status, 'CLOSED');
  });
});

describe('operations service discounts', () => {
  it('recalculates ticket totals after line discount', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    const added = await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    const discounted = await operationsService.applyTicketItemDiscount(
      company.id,
      branch.id,
      ticket.id,
      added.ticketItem.id,
      user.id,
      user.globalRole,
      { discountAmount: 20, reason: 'Promo' },
    );

    assert.equal(Number(discounted.ticketItem.discountAmount), 20);
    assert.equal(Number(discounted.ticketItem.subtotal), 80);
    assert.equal(Number(discounted.ticket.total), 80);
  });

  it('recalculates ticket totals after global discount', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item 1',
      quantity: 1,
      unitPrice: 100,
    });

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item 2',
      quantity: 1,
      unitPrice: 50,
    });

    const discounted = await operationsService.applyTicketDiscount(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      discountAmount: 30,
      reason: 'Global promo',
    });

    assert.equal(Number(discounted.ticket.discountAmount), 30);
    assert.equal(Number(discounted.ticket.total), 120);
  });

  it('rejects line discount greater than item subtotal', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    const added = await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    await assert.rejects(
      operationsService.applyTicketItemDiscount(
        company.id,
        branch.id,
        ticket.id,
        added.ticketItem.id,
        user.id,
        user.globalRole,
        { discountAmount: 120, reason: 'Too much' },
      ),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });

  it('rejects global discount greater than active ticket subtotal', async () => {
    const { user, company, branch } = await createOperationsContext();
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item 1',
      quantity: 1,
      unitPrice: 100,
    });

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item 2',
      quantity: 1,
      unitPrice: 50,
    });

    await assert.rejects(
      operationsService.applyTicketDiscount(company.id, branch.id, ticket.id, user.id, user.globalRole, {
        discountAmount: 200,
        reason: 'Too much',
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
  });
});

describe('operations service rental overtime', () => {
  it('recalculates overtime for TIME_UNIT rentals rounding up extra block', async () => {
    const { user, company, branch, resource } = await createOperationsContext();

    const started = await operationsService.startRental(company.id, branch.id, user.id, user.globalRole, {
      resourceId: resource.id,
      reservedMinutes: 60,
      startAt: new Date('2026-04-30T10:00:00.000Z'),
    });

    const finished = await operationsService.finishRental(
      company.id,
      branch.id,
      started.rentalSession.id,
      user.id,
      user.globalRole,
      { endedAt: new Date('2026-04-30T11:30:00.000Z') },
    );

    assert.equal(finished.rentalSession.usedMinutes, 90);
    assert.equal(finished.rentalSession.overtimeMinutes, 30);
    assert.equal(Number(finished.rentalSession.baseAmount), 100);
    assert.equal(Number(finished.rentalSession.overtimeAmount), 100);
    assert.equal(Number(finished.rentalSession.totalAmount), 200);
    assert.equal(Number(finished.ticket.total), 200);
  });
});

describe('operations service permissions', () => {
  it('allows CAJERO to create a ticket', async () => {
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
    const user = await createUser();
    await grantCompanyMembership({ companyId: company.id, userId: user.id, role: MembershipRole.CAJERO });

    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    assert.equal(ticket.status, 'OPEN');
  });

  it('allows RECEPCION to create a ticket', async () => {
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
    const user = await createUser();
    await grantBranchMembership({ branchId: branch.id, userId: user.id, role: MembershipRole.RECEPCION });

    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    assert.equal(ticket.status, 'OPEN');
  });

  it('rejects creating a ticket without membership', async () => {
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
    const user = await createUser();

    await assert.rejects(
      operationsService.createTicket(company.id, branch.id, user.id, user.globalRole),
      (error: unknown) => error instanceof AppError && error.statusCode === 403,
    );
  });

  it('allows ADMIN_EMPRESA to cancel with reversal', async () => {
    const { company, branch, ticket } = await createPermissionContext();
    const user = await createUser();
    await grantCompanyMembership({ companyId: company.id, userId: user.id, role: MembershipRole.ADMIN_EMPRESA });

    const result = await operationsService.cancelTicketWithReversal(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      reason: 'Admin company cancel',
    });

    assert.equal(result.ticket.status, 'CANCELLED');
  });

  it('allows ADMIN_SEDE to cancel with reversal', async () => {
    const { company, branch, ticket } = await createPermissionContext();
    const user = await createUser();
    await grantBranchMembership({ branchId: branch.id, userId: user.id, role: MembershipRole.ADMIN_SEDE });

    const result = await operationsService.cancelTicketWithReversal(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      reason: 'Admin branch cancel',
    });

    assert.equal(result.ticket.status, 'CANCELLED');
  });

  it('rejects CAJERO for cancel with reversal', async () => {
    const { company, branch, ticket } = await createPermissionContext();
    const user = await createUser();
    await grantCompanyMembership({ companyId: company.id, userId: user.id, role: MembershipRole.CAJERO });

    await assert.rejects(
      operationsService.cancelTicketWithReversal(company.id, branch.id, ticket.id, user.id, user.globalRole, {
        reason: 'Cashier should fail',
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 403,
    );
  });

  it('rejects RECEPCION for cancel with reversal', async () => {
    const { company, branch, ticket } = await createPermissionContext();
    const user = await createUser();
    await grantBranchMembership({ branchId: branch.id, userId: user.id, role: MembershipRole.RECEPCION });

    await assert.rejects(
      operationsService.cancelTicketWithReversal(company.id, branch.id, ticket.id, user.id, user.globalRole, {
        reason: 'Reception should fail',
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 403,
    );
  });
});
