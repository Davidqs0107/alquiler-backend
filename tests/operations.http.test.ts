import './setup';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { PaymentMethod, GlobalRole } from '@prisma/client';
import { createApp } from '../src/app';
import * as operationsService from '../src/modules/operations/operations.service';
import { signAccessToken } from '../src/utils/jwt';
import { createBranch, createCompany, createUser } from './helpers/factories';

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
