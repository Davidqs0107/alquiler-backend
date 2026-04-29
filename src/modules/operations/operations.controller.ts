import type { NextFunction, Request, Response } from 'express';
import {
  addRentalToTicketSchema,
  closeTicketSchema,
  createPaymentSchema,
  createTicketSchema,
  finishRentalSchema,
  listTicketsQuerySchema,
  startRentalSchema,
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
