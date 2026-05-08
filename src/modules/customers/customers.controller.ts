import type { NextFunction, Request, Response } from 'express';
import { createCustomerSchema, listCustomersQuerySchema, updateCustomerSchema } from './customers.schemas';
import * as customersService from './customers.service';

export async function listCustomersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const query = listCustomersQuerySchema.parse(req.query);
    const result = await customersService.listCustomers(companyId, req.auth!.userId, req.auth!.globalRole, query);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const body = createCustomerSchema.parse(req.body);
    const result = await customersService.createCustomer(companyId, req.auth!.userId, req.auth!.globalRole, body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const customerId = String(req.params.customerId);
    const body = updateCustomerSchema.parse(req.body);
    const result = await customersService.updateCustomer(companyId, customerId, req.auth!.userId, req.auth!.globalRole, body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const customerId = String(req.params.customerId);
    const result = await customersService.getCustomer(companyId, customerId, req.auth!.userId, req.auth!.globalRole);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}