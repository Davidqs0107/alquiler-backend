import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  addRentalToTicketHandler,
  closeTicketHandler,
  createPaymentHandler,
  createTicketHandler,
  finishRentalHandler,
  getTicketDetailHandler,
  listTicketsHandler,
  startRentalHandler,
} from './operations.controller';

export const operationsRouter = Router();

operationsRouter.use(authMiddleware);

operationsRouter.post('/companies/:companyId/branches/:branchId/tickets', createTicketHandler);
operationsRouter.get('/companies/:companyId/branches/:branchId/tickets', listTicketsHandler);
operationsRouter.get('/companies/:companyId/branches/:branchId/tickets/:ticketId', getTicketDetailHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/rentals/start', startRentalHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/rentals', addRentalToTicketHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/rentals/:rentalSessionId/finish', finishRentalHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/payments', createPaymentHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/close', closeTicketHandler);
