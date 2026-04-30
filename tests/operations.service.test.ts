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
