import { GlobalRole } from '@prisma/client';
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireGlobalRole } from '../../middlewares/require-global-role.middleware';
import {
  createBranchHandler,
  createCompanyHandler,
  getCompanyByIdHandler,
  listCompaniesHandler,
} from './companies.controller';

export const companiesRouter = Router();

companiesRouter.use(authMiddleware);

companiesRouter.post('/', requireGlobalRole(GlobalRole.SUPERADMIN), createCompanyHandler);
companiesRouter.post('/:companyId/branches', createBranchHandler);
companiesRouter.get('/', listCompaniesHandler);
companiesRouter.get('/:companyId', getCompanyByIdHandler);
