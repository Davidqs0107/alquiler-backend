import type { NextFunction, Request, Response } from 'express';
import {
  createBranchMemberSchema,
  createBranchSchema,
  createCompanyMemberSchema,
  createCompanySchema,
  updateCompanySchema,
  updateBranchSchema,
  updateCompanyMemberSchema,
  updateBranchMemberSchema,
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

export async function listBranchesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branches = await companiesService.listBranches(
      companyId,
      req.auth!.userId,
      req.auth!.globalRole,
    );

    return res.json(branches);
  } catch (error) {
    return next(error);
  }
}

export async function updateCompanyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const body = updateCompanySchema.parse(req.body);
    const result = await companiesService.updateCompany(
      companyId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateBranchHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const body = updateBranchSchema.parse(req.body);
    const result = await companiesService.updateBranch(
      companyId,
      branchId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateCompanyMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const membershipId = String(req.params.membershipId);
    const body = updateCompanyMemberSchema.parse(req.body);
    const result = await companiesService.updateCompanyMember(
      companyId,
      membershipId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateBranchMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const membershipId = String(req.params.membershipId);
    const body = updateBranchMemberSchema.parse(req.body);
    const result = await companiesService.updateBranchMember(
      companyId,
      branchId,
      membershipId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
