import type { NextFunction, Request, Response } from 'express';
import {
  createBranchMemberSchema,
  createBranchSchema,
  createCompanyMemberSchema,
  createCompanySchema,
} from './companies.schemas';
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

export async function createCompanyMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const body = createCompanyMemberSchema.parse(req.body);
    const result = await companiesService.createCompanyMember(
      companyId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createBranchMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const body = createBranchMemberSchema.parse(req.body);
    const result = await companiesService.createBranchMember(
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

export async function listCompanyMembersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const members = await companiesService.listCompanyMembers(
      companyId,
      req.auth!.userId,
      req.auth!.globalRole,
    );

    return res.json(members);
  } catch (error) {
    return next(error);
  }
}

export async function listBranchMembersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const members = await companiesService.listBranchMembers(
      companyId,
      branchId,
      req.auth!.userId,
      req.auth!.globalRole,
    );

    return res.json(members);
  } catch (error) {
    return next(error);
  }
}
