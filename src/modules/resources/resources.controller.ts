import type { NextFunction, Request, Response } from 'express';
import {
  createCategorySchema,
  createRatePlanSchema,
  createResourceSchema,
  updateCategoryVisibilitySchema,
} from './resources.schemas';
import * as resourcesService from './resources.service';

export async function createCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const body = createCategorySchema.parse(req.body);
    const result = await resourcesService.createCategory(companyId, req.auth!.userId, req.auth!.globalRole, body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listCategoriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const result = await resourcesService.listCategories(companyId, req.auth!.userId, req.auth!.globalRole);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateCategoryVisibilityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const categoryId = String(req.params.categoryId);
    const branchId = String(req.params.branchId);
    const body = updateCategoryVisibilitySchema.parse(req.body);
    const result = await resourcesService.updateCategoryVisibility(
      companyId,
      categoryId,
      branchId,
      req.auth!.userId,
      req.auth!.globalRole,
      body.isVisible,
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createResourceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const body = createResourceSchema.parse(req.body);
    const result = await resourcesService.createResource(
      companyId,
      branchId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listResourcesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const result = await resourcesService.listResources(companyId, branchId, req.auth!.userId, req.auth!.globalRole);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createRatePlanHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const body = createRatePlanSchema.parse(req.body);
    const result = await resourcesService.createRatePlan(
      companyId,
      branchId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listRatePlansHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const result = await resourcesService.listRatePlans(companyId, branchId, req.auth!.userId, req.auth!.globalRole);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
