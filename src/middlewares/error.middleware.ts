import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFoundMiddleware(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'Route not found'));
}

export function errorMiddleware(error: Error, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error.name === 'ZodError') {
    return res.status(400).json({ message: 'Validation error', details: error.message });
  }

  return res.status(500).json({
    message: 'Internal server error',
  });
}
