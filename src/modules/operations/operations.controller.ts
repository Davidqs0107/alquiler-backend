import type { NextFunction, Request, Response } from 'express';
import {
  addCatalogItemToTicketSchema,
  addExtraItemToTicketSchema,
  addManualItemToTicketSchema,
  addRentalToTicketSchema,
  applyTicketDiscountSchema,
  applyTicketItemDiscountSchema,
  cancelTicketItemSchema,
  cancelTicketSchema,
  closeTicketSchema,
  createCatalogItemSchema,
  createPaymentSchema,
  createTicketSchema,
  deactivateCatalogItemSchema,
  finishRentalSchema,
  listCatalogItemsQuerySchema,
  listTicketsQuerySchema,
  startRentalSchema,
  updateCatalogItemSchema,
  activateCatalogItemSchema,
} from './operations.schemas';
import * as operationsService from './operations.service';

export async function createTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    createTicketSchema.parse(req.body ?? {});
    const result = await operationsService.createTicket(companyId, branchId, req.auth!.userId, req.auth!.globalRole);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listTicketsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const query = listTicketsQuerySchema.parse(req.query);
    const result = await operationsService.listTickets(companyId, branchId, req.auth!.userId, req.auth!.globalRole, query);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getTicketDetailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    const result = await operationsService.getTicketDetail(companyId, branchId, ticketId, req.auth!.userId, req.auth!.globalRole);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createCatalogItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const body = createCatalogItemSchema.parse(req.body);
    const result = await operationsService.createCatalogItem(companyId, req.auth!.userId, req.auth!.globalRole, body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listCatalogItemsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const query = listCatalogItemsQuerySchema.parse(req.query);
    const result = await operationsService.listCatalogItems(companyId, req.auth!.userId, req.auth!.globalRole, query);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateCatalogItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const catalogItemId = String(req.params.catalogItemId);
    const body = updateCatalogItemSchema.parse(req.body);
    const result = await operationsService.updateCatalogItem(
      companyId,
      catalogItemId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function activateCatalogItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const catalogItemId = String(req.params.catalogItemId);
    activateCatalogItemSchema.parse(req.body ?? {});
    const result = await operationsService.activateCatalogItem(
      companyId,
      catalogItemId,
      req.auth!.userId,
      req.auth!.globalRole,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function deactivateCatalogItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const catalogItemId = String(req.params.catalogItemId);
    deactivateCatalogItemSchema.parse(req.body ?? {});
    const result = await operationsService.deactivateCatalogItem(
      companyId,
      catalogItemId,
      req.auth!.userId,
      req.auth!.globalRole,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function startRentalHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const body = startRentalSchema.parse(req.body);
    const result = await operationsService.startRental(companyId, branchId, req.auth!.userId, req.auth!.globalRole, body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function addRentalToTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    const body = addRentalToTicketSchema.parse(req.body);
    const result = await operationsService.addRentalToTicket(
      companyId,
      branchId,
      ticketId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function addCatalogItemToTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    const body = addCatalogItemToTicketSchema.parse(req.body);
    const result = await operationsService.addCatalogItemToTicket(
      companyId,
      branchId,
      ticketId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function addManualItemToTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    const body = addManualItemToTicketSchema.parse(req.body);
    const result = await operationsService.addManualItemToTicket(
      companyId,
      branchId,
      ticketId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function addExtraItemToTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    const body = addExtraItemToTicketSchema.parse(req.body);
    const result = await operationsService.addExtraItemToTicket(
      companyId,
      branchId,
      ticketId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function applyTicketItemDiscountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    const ticketItemId = String(req.params.ticketItemId);
    const body = applyTicketItemDiscountSchema.parse(req.body);
    const result = await operationsService.applyTicketItemDiscount(
      companyId,
      branchId,
      ticketId,
      ticketItemId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function applyTicketDiscountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    const body = applyTicketDiscountSchema.parse(req.body);
    const result = await operationsService.applyTicketDiscount(
      companyId,
      branchId,
      ticketId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function cancelTicketItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    const ticketItemId = String(req.params.ticketItemId);
    const body = cancelTicketItemSchema.parse(req.body);
    const result = await operationsService.cancelTicketItem(
      companyId,
      branchId,
      ticketId,
      ticketItemId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function cancelTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    const body = cancelTicketSchema.parse(req.body);
    const result = await operationsService.cancelTicket(
      companyId,
      branchId,
      ticketId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function finishRentalHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const rentalSessionId = String(req.params.rentalSessionId);
    const body = finishRentalSchema.parse(req.body ?? {});
    const result = await operationsService.finishRental(
      companyId,
      branchId,
      rentalSessionId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createPaymentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    const body = createPaymentSchema.parse(req.body);
    const result = await operationsService.createPayment(
      companyId,
      branchId,
      ticketId,
      req.auth!.userId,
      req.auth!.globalRole,
      body,
    );
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function closeTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = String(req.params.companyId);
    const branchId = String(req.params.branchId);
    const ticketId = String(req.params.ticketId);
    closeTicketSchema.parse(req.body ?? {});
    const result = await operationsService.closeTicket(companyId, branchId, ticketId, req.auth!.userId, req.auth!.globalRole);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
