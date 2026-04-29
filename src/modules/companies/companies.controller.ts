import type { NextFunction, Request, Response } from 'express';
import { createBranchSchema, createCompanySchema } from './companies.schemas';
import * as companiesService from './companies.service';

export async function createCompanyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createCompanySchema.parse(req.body);
    const result = await companiesService.createCompany(body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createBranchHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createBranchSchema.parse(req.body);
    const companyId = String(req.params.companyId);
    const branch = await companiesService.createBranch(
      companyId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );

    return res.status(201).json(branch);
  } catch (error) {
    return next(error);
  }
}

export async function listCompaniesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companies = await companiesService.listCompanies(req.auth!.userId, req.auth!.globalRole);
    return res.json(companies);
  } catch (error) {
    return next(error);
  }
}

export async function getCompanyByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const company = await companiesService.getCompanyById(
      companyId,
      req.auth!.userId,
      req.auth!.globalRole,
    );

    return res.json(company);
  } catch (error) {
    return next(error);
  }
}
