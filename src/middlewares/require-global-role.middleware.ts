import type { GlobalRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from './error.middleware';

export function requireGlobalRole(...roles: GlobalRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (!roles.includes(req.auth.globalRole)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }

    return next();
  };
}
