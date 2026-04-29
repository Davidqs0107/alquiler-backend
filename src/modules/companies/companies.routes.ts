import { GlobalRole } from '@prisma/client';
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireGlobalRole } from '../../middlewares/require-global-role.middleware';
import {
  createBranchHandler,
  createBranchMemberHandler,
  createCompanyHandler,
  createCompanyMemberHandler,
  getCompanyByIdHandler,
  listBranchMembersHandler,
  listCompaniesHandler,
  listCompanyMembersHandler,
} from './companies.controller';

export const companiesRouter = Router();

companiesRouter.use(authMiddleware);

companiesRouter.post('/', requireGlobalRole(GlobalRole.SUPERADMIN), createCompanyHandler);
companiesRouter.post('/:companyId/branches', createBranchHandler);
companiesRouter.post('/:companyId/members', createCompanyMemberHandler);
companiesRouter.post('/:companyId/branches/:branchId/members', createBranchMemberHandler);
companiesRouter.get('/', listCompaniesHandler);
companiesRouter.get('/:companyId', getCompanyByIdHandler);
companiesRouter.get('/:companyId/members', listCompanyMembersHandler);
companiesRouter.get('/:companyId/branches/:branchId/members', listBranchMembersHandler);
