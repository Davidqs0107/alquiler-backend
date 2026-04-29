import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  activateCatalogItemHandler,
  addCatalogItemToTicketHandler,
  addExtraItemToTicketHandler,
  addManualItemToTicketHandler,
  addRentalToTicketHandler,
  applyTicketDiscountHandler,
  applyTicketItemDiscountHandler,
  cancelTicketHandler,
  cancelTicketItemHandler,
  cancelTicketWithReversalHandler,
  closeTicketHandler,
  createCatalogItemHandler,
  createPaymentHandler,
  createTicketHandler,
  deactivateCatalogItemHandler,
  finishRentalHandler,
  getTicketDetailHandler,
  listCatalogItemsHandler,
  listTicketsHandler,
  startRentalHandler,
  updateCatalogItemHandler,
} from './operations.controller';

export const operationsRouter = Router();

operationsRouter.use(authMiddleware);

operationsRouter.post('/companies/:companyId/catalog-items', createCatalogItemHandler);
operationsRouter.get('/companies/:companyId/catalog-items', listCatalogItemsHandler);
operationsRouter.patch('/companies/:companyId/catalog-items/:catalogItemId', updateCatalogItemHandler);
operationsRouter.post('/companies/:companyId/catalog-items/:catalogItemId/activate', activateCatalogItemHandler);
operationsRouter.post('/companies/:companyId/catalog-items/:catalogItemId/deactivate', deactivateCatalogItemHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets', createTicketHandler);
operationsRouter.get('/companies/:companyId/branches/:branchId/tickets', listTicketsHandler);
operationsRouter.get('/companies/:companyId/branches/:branchId/tickets/:ticketId', getTicketDetailHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/rentals/start', startRentalHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/rentals', addRentalToTicketHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/items/catalog', addCatalogItemToTicketHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/items/manual', addManualItemToTicketHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/items/extra', addExtraItemToTicketHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/items/:ticketItemId/discount', applyTicketItemDiscountHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/discount', applyTicketDiscountHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/items/:ticketItemId/cancel', cancelTicketItemHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/cancel', cancelTicketHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/cancel-with-reversal', cancelTicketWithReversalHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/rentals/:rentalSessionId/finish', finishRentalHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/payments', createPaymentHandler);
operationsRouter.post('/companies/:companyId/branches/:branchId/tickets/:ticketId/close', closeTicketHandler);
