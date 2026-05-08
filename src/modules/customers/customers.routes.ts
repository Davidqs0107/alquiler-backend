import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  createCustomerHandler,
  getCustomerHandler,
  listCustomersHandler,
  updateCustomerHandler,
} from './customers.controller';

export const customersRouter = Router();

customersRouter.use(authMiddleware);

customersRouter.get('/companies/:companyId/customers', listCustomersHandler);
customersRouter.post('/companies/:companyId/customers', createCustomerHandler);
customersRouter.get('/companies/:companyId/customers/:customerId', getCustomerHandler);
customersRouter.put('/companies/:companyId/customers/:customerId', updateCustomerHandler);