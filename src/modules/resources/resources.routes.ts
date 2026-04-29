import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  createCategoryHandler,
  createRatePlanHandler,
  createResourceHandler,
  listCategoriesHandler,
  listRatePlansHandler,
  listResourcesHandler,
  updateCategoryVisibilityHandler,
} from './resources.controller';

export const resourcesRouter = Router();

resourcesRouter.use(authMiddleware);

resourcesRouter.post('/companies/:companyId/categories', createCategoryHandler);
resourcesRouter.get('/companies/:companyId/categories', listCategoriesHandler);
resourcesRouter.patch(
  '/companies/:companyId/categories/:categoryId/branches/:branchId/visibility',
  updateCategoryVisibilityHandler,
);
resourcesRouter.post('/companies/:companyId/branches/:branchId/resources', createResourceHandler);
resourcesRouter.get('/companies/:companyId/branches/:branchId/resources', listResourcesHandler);
resourcesRouter.post('/companies/:companyId/branches/:branchId/rate-plans', createRatePlanHandler);
resourcesRouter.get('/companies/:companyId/branches/:branchId/rate-plans', listRatePlansHandler);
