import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  createBlockoutHandler,
  deleteBlockoutHandler,
  listBlockoutsHandler,
} from './blockouts.controller';

export const blockoutsRouter = Router();

blockoutsRouter.use(authMiddleware);

blockoutsRouter.get('/companies/:companyId/branches/:branchId/blockouts', listBlockoutsHandler);
blockoutsRouter.post('/companies/:companyId/branches/:branchId/blockouts', createBlockoutHandler);
blockoutsRouter.delete('/companies/:companyId/branches/:branchId/blockouts/:blockoutId', deleteBlockoutHandler);