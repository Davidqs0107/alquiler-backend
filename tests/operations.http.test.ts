import './setup';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { PaymentMethod, GlobalRole, MembershipRole } from '@prisma/client';
import { createApp } from '../src/app';
import * as operationsService from '../src/modules/operations/operations.service';
import { signAccessToken } from '../src/utils/jwt';
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

function authHeaderFor(user: { id: string; email: string; globalRole: GlobalRole }) {
  const token = signAccessToken({
    sub: user.id,
    email: user.email,
    globalRole: user.globalRole,
  });

  return `Bearer ${token}`;
}

describe('operations http smoke', () => {
  it('creates a ticket', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });

    const response = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets`)
      .set('Authorization', authHeaderFor(user))
      .send({});

    assert.equal(response.status, 201);
    assert.equal(response.body.status, 'OPEN');
    assert.equal(response.body.companyId, company.id);
    assert.equal(response.body.branchId, branch.id);
    assert.ok(response.body.id);
  });

  it('registers a payment', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    const response = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticket.id}/payments`)
      .set('Authorization', authHeaderFor(user))
      .send({
        method: PaymentMethod.CASH,
        amount: 100,
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.paidNetTotal, 100);
    assert.equal(response.body.pendingAmount, 0);
    assert.equal(response.body.payment.method, 'CASH');
    assert.ok(response.body.payment.id);
  });

  it('cancels a ticket with payment reversals', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
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

    const response = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticket.id}/cancel-with-reversal`)
      .set('Authorization', authHeaderFor(user))
      .send({ reason: 'Customer request' });

    assert.equal(response.status, 200);
    assert.equal(response.body.ticket.status, 'CANCELLED');
    assert.equal(response.body.totals.paidGrossTotal, 100);
    assert.equal(response.body.totals.reversedTotal, 100);
    assert.equal(response.body.totals.paidNetTotal, 0);
    assert.equal(response.body.paymentReversals.length, 1);
    assert.ok(response.body.paymentReversals[0].id);
  });
});

describe('operations http catalog filters', () => {
  it('lists global and branch items when filtering by branchId', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();
    const branchA = await createBranch({ companyId: company.id, name: 'Branch A' });
    const branchB = await createBranch({ companyId: company.id, name: 'Branch B' });

    await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
      name: 'Water Bottle',
      type: 'PRODUCT',
      price: 50,
    });

    await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
      name: 'Towel Rental',
      type: 'SERVICE',
      price: 20,
      branchId: branchA.id,
    });

    await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
      name: 'Snacks Combo',
      type: 'PRODUCT',
      price: 30,
      branchId: branchB.id,
    });

    const inactive = await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
      name: 'Old Service',
      type: 'SERVICE',
      price: 10,
    });

    await operationsService.deactivateCatalogItem(company.id, inactive.id, user.id, user.globalRole);

    const response = await request(app)
      .get(`/companies/${company.id}/catalog-items`)
      .query({ branchId: branchA.id })
      .set('Authorization', authHeaderFor(user));

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.map((item: { name: string }) => item.name).sort(),
      ['Old Service', 'Towel Rental', 'Water Bottle'],
    );
  });

  it('filters catalog items by status and type through endpoint', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();

    await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
      name: 'Water Bottle',
      type: 'PRODUCT',
      price: 50,
    });

    const inactive = await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
      name: 'Old Service',
      type: 'SERVICE',
      price: 10,
    });

    await operationsService.deactivateCatalogItem(company.id, inactive.id, user.id, user.globalRole);

    const response = await request(app)
      .get(`/companies/${company.id}/catalog-items`)
      .query({ status: 'INACTIVE', type: 'SERVICE' })
      .set('Authorization', authHeaderFor(user));

    assert.equal(response.status, 200);
    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].name, 'Old Service');
  });

  it('filters catalog items by search through endpoint', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();

    await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
      name: 'Water Bottle',
      type: 'PRODUCT',
      price: 50,
    });

    await operationsService.createCatalogItem(company.id, user.id, user.globalRole, {
      name: 'Towel Rental',
      type: 'SERVICE',
      price: 20,
    });

    const response = await request(app)
      .get(`/companies/${company.id}/catalog-items`)
      .query({ search: 'water' })
      .set('Authorization', authHeaderFor(user));

    assert.equal(response.status, 200);
    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].name, 'Water Bottle');
  });
});

describe('operations http simple cancellations', () => {
  it('cancels a non-rental item through endpoint and recalculates ticket total', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
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

    const response = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticket.id}/items/${manual.ticketItem.id}/cancel`)
      .set('Authorization', authHeaderFor(user))
      .send({ reason: 'Remove manual item' });

    assert.equal(response.status, 200);
    assert.ok(response.body.ticketItem.cancelledAt);
    assert.equal(response.body.ticketItem.cancellationReason, 'Remove manual item');
    assert.equal(Number(response.body.ticket.total), 25);
  });

  it('cancels a ticket without payments through endpoint', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
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

    const response = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticket.id}/cancel`)
      .set('Authorization', authHeaderFor(user))
      .send({ reason: 'Cancel whole ticket' });

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'CANCELLED');
    assert.equal(response.body.cancellationReason, 'Cancel whole ticket');
    assert.equal(Number(response.body.total), 0);
  });
});

describe('operations http sales happy path', () => {
  it('completes sale flow with catalog, manual and extra items through endpoints', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });

    const catalogResponse = await request(app)
      .post(`/companies/${company.id}/catalog-items`)
      .set('Authorization', authHeaderFor(user))
      .send({
        name: 'Water bottle',
        type: 'PRODUCT',
        price: 50,
        branchId: branch.id,
      });

    assert.equal(catalogResponse.status, 201);

    const ticketResponse = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets`)
      .set('Authorization', authHeaderFor(user))
      .send({});

    assert.equal(ticketResponse.status, 201);

    const catalogAdded = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticketResponse.body.id}/items/catalog`)
      .set('Authorization', authHeaderFor(user))
      .send({ catalogItemId: catalogResponse.body.id, quantity: 1 });

    assert.equal(catalogAdded.status, 201);
    assert.equal(catalogAdded.body.ticketItem.type, 'PRODUCT');

    const manualAdded = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticketResponse.body.id}/items/manual`)
      .set('Authorization', authHeaderFor(user))
      .send({ description: 'Manual service', quantity: 1, unitPrice: 100 });

    assert.equal(manualAdded.status, 201);
    assert.equal(manualAdded.body.ticketItem.type, 'MANUAL');

    const extraAdded = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticketResponse.body.id}/items/extra`)
      .set('Authorization', authHeaderFor(user))
      .send({ description: 'Extra fee', quantity: 1, unitPrice: 25 });

    assert.equal(extraAdded.status, 201);
    assert.equal(extraAdded.body.ticketItem.type, 'EXTRA');
    assert.equal(Number(extraAdded.body.ticket.total), 175);

    const paymentResponse = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticketResponse.body.id}/payments`)
      .set('Authorization', authHeaderFor(user))
      .send({ method: PaymentMethod.CASH, amount: 175 });

    assert.equal(paymentResponse.status, 201);
    assert.equal(paymentResponse.body.paidNetTotal, 175);
    assert.equal(paymentResponse.body.pendingAmount, 0);

    const closeResponse = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticketResponse.body.id}/close`)
      .set('Authorization', authHeaderFor(user))
      .send({});

    assert.equal(closeResponse.status, 200);
    assert.equal(closeResponse.body.status, 'CLOSED');
  });
});

describe('operations http rental happy path', () => {
  it('completes rental without overtime through endpoints', async () => {
    const app = createApp();
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

    const startResponse = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/rentals/start`)
      .set('Authorization', authHeaderFor(user))
      .send({
        resourceId: resource.id,
        reservedMinutes: 60,
        startAt: '2026-04-30T10:00:00.000Z',
      });

    assert.equal(startResponse.status, 201);
    assert.equal(startResponse.body.ticket.status, 'OPEN');
    assert.equal(startResponse.body.rentalSession.status, 'RESERVED');

    const finishResponse = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/rentals/${startResponse.body.rentalSession.id}/finish`)
      .set('Authorization', authHeaderFor(user))
      .send({ endedAt: '2026-04-30T10:45:00.000Z' });

    assert.equal(finishResponse.status, 200);
    assert.equal(finishResponse.body.rentalSession.status, 'FINISHED');
    assert.equal(finishResponse.body.rentalSession.overtimeMinutes, 0);
    assert.equal(Number(finishResponse.body.rentalSession.totalAmount), 100);

    const paymentResponse = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${startResponse.body.ticket.id}/payments`)
      .set('Authorization', authHeaderFor(user))
      .send({
        method: PaymentMethod.CASH,
        amount: 100,
      });

    assert.equal(paymentResponse.status, 201);
    assert.equal(paymentResponse.body.paidNetTotal, 100);
    assert.equal(paymentResponse.body.pendingAmount, 0);

    const closeResponse = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${startResponse.body.ticket.id}/close`)
      .set('Authorization', authHeaderFor(user))
      .send({});

    assert.equal(closeResponse.status, 200);
    assert.equal(closeResponse.body.status, 'CLOSED');
  });
});

describe('operations http discounts', () => {
  it('recalculates line discount through endpoint', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
    const ticket = await operationsService.createTicket(company.id, branch.id, user.id, user.globalRole);

    const added = await operationsService.addManualItemToTicket(company.id, branch.id, ticket.id, user.id, user.globalRole, {
      description: 'Manual item',
      quantity: 1,
      unitPrice: 100,
    });

    const response = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticket.id}/items/${added.ticketItem.id}/discount`)
      .set('Authorization', authHeaderFor(user))
      .send({ discountAmount: 20, reason: 'Promo' });

    assert.equal(response.status, 200);
    assert.equal(Number(response.body.ticketItem.discountAmount), 20);
    assert.equal(Number(response.body.ticketItem.subtotal), 80);
    assert.equal(Number(response.body.ticket.total), 80);
  });

  it('recalculates global discount through endpoint', async () => {
    const app = createApp();
    const user = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
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

    const response = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticket.id}/discount`)
      .set('Authorization', authHeaderFor(user))
      .send({ discountAmount: 30, reason: 'Global promo' });

    assert.equal(response.status, 200);
    assert.equal(Number(response.body.ticket.discountAmount), 30);
    assert.equal(Number(response.body.ticket.total), 120);
  });
});

describe('operations http rental overtime', () => {
  it('recalculates overtime for TIME_UNIT rentals through endpoints', async () => {
    const app = createApp();
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

    const startResponse = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/rentals/start`)
      .set('Authorization', authHeaderFor(user))
      .send({
        resourceId: resource.id,
        reservedMinutes: 60,
        startAt: '2026-04-30T10:00:00.000Z',
      });

    assert.equal(startResponse.status, 201);

    const finishResponse = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/rentals/${startResponse.body.rentalSession.id}/finish`)
      .set('Authorization', authHeaderFor(user))
      .send({ endedAt: '2026-04-30T11:30:00.000Z' });

    assert.equal(finishResponse.status, 200);
    assert.equal(finishResponse.body.rentalSession.usedMinutes, 90);
    assert.equal(finishResponse.body.rentalSession.overtimeMinutes, 30);
    assert.equal(Number(finishResponse.body.rentalSession.baseAmount), 100);
    assert.equal(Number(finishResponse.body.rentalSession.overtimeAmount), 100);
    assert.equal(Number(finishResponse.body.rentalSession.totalAmount), 200);
    assert.equal(Number(finishResponse.body.ticket.total), 200);
  });
});

describe('operations http permissions', () => {
  it('allows CAJERO on a normal endpoint', async () => {
    const app = createApp();
    const user = await createUser();
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
    await grantCompanyMembership({ companyId: company.id, userId: user.id, role: MembershipRole.CAJERO });

    const response = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets`)
      .set('Authorization', authHeaderFor(user))
      .send({});

    assert.equal(response.status, 201);
    assert.equal(response.body.status, 'OPEN');
  });

  it('rejects CAJERO on a sensitive endpoint', async () => {
    const app = createApp();
    const owner = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const actor = await createUser();
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
    await grantCompanyMembership({ companyId: company.id, userId: actor.id, role: MembershipRole.CAJERO });
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

    const response = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticket.id}/cancel-with-reversal`)
      .set('Authorization', authHeaderFor(actor))
      .send({ reason: 'Cashier should fail' });

    assert.equal(response.status, 403);
    assert.equal(response.body.message, 'Insufficient permissions');
  });

  it('allows ADMIN_SEDE on a sensitive endpoint', async () => {
    const app = createApp();
    const owner = await createUser({ globalRole: GlobalRole.SUPERADMIN });
    const actor = await createUser();
    const company = await createCompany();
    const branch = await createBranch({ companyId: company.id });
    await grantBranchMembership({ branchId: branch.id, userId: actor.id, role: MembershipRole.ADMIN_SEDE });
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

    const response = await request(app)
      .post(`/companies/${company.id}/branches/${branch.id}/tickets/${ticket.id}/cancel-with-reversal`)
      .set('Authorization', authHeaderFor(actor))
      .send({ reason: 'Branch admin allowed' });

    assert.equal(response.status, 200);
    assert.equal(response.body.ticket.status, 'CANCELLED');
  });
});
