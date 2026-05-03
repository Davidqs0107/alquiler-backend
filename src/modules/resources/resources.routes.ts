import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  createCategoryHandler,
  createRatePlanHandler,
  createResourceHandler,
  listCategoriesHandler,
  listRatePlansHandler,
  listResourcesHandler,
  updateCategoryHandler,
  updateCategoryVisibilityHandler,
  updateRatePlanHandler,
  updateResourceHandler,
  updateResourceStatusHandler,
  updateRatePlanStatusHandler,
} from './resources.controller';

export const resourcesRouter = Router();

resourcesRouter.use(authMiddleware);

resourcesRouter.post('/companies/:companyId/categories', createCategoryHandler);
resourcesRouter.get('/companies/:companyId/categories', listCategoriesHandler);
resourcesRouter.put('/companies/:companyId/categories/:categoryId', updateCategoryHandler);
resourcesRouter.patch(
  '/companies/:companyId/categories/:categoryId/branches/:branchId/visibility',
  updateCategoryVisibilityHandler,
);
resourcesRouter.post('/companies/:companyId/branches/:branchId/resources', createResourceHandler);
resourcesRouter.get('/companies/:companyId/branches/:branchId/resources', listResourcesHandler);
resourcesRouter.put(
  '/companies/:companyId/branches/:branchId/resources/:resourceId',
  updateResourceHandler,
);
resourcesRouter.patch(
  '/companies/:companyId/branches/:branchId/resources/:resourceId/status',
  updateResourceStatusHandler,
);
resourcesRouter.post('/companies/:companyId/branches/:branchId/rate-plans', createRatePlanHandler);
resourcesRouter.get('/companies/:companyId/branches/:branchId/rate-plans', listRatePlansHandler);
resourcesRouter.put(
  '/companies/:companyId/branches/:branchId/rate-plans/:ratePlanId',
  updateRatePlanHandler,
);
resourcesRouter.patch(
  '/companies/:companyId/branches/:branchId/rate-plans/:ratePlanId/status',
  updateRatePlanStatusHandler,
);
