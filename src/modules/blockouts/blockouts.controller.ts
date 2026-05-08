import type { NextFunction, Request, Response } from 'express';
import { createBlockoutSchema, listBlockoutsQuerySchema } from './blockouts.schemas';
import * as blockoutsService from './blockouts.service';

export async function listBlockoutsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const query = listBlockoutsQuerySchema.parse(req.query);
    const result = await blockoutsService.listBlockouts(companyId, branchId, req.auth!.userId, req.auth!.globalRole, query);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createBlockoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const body = createBlockoutSchema.parse(req.body);
    const result = await blockoutsService.createBlockout(companyId, branchId, req.auth!.userId, req.auth!.globalRole, body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function deleteBlockoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const blockoutId = String(req.params.blockoutId);
    const result = await blockoutsService.deleteBlockout(companyId, branchId, blockoutId, req.auth!.userId, req.auth!.globalRole);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}