import type { NextFunction, Request, Response } from 'express';
import { AppError } from './error.middleware';
import { verifyAccessToken } from '../utils/jwt';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing or invalid authorization header'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);

    req.auth = {
      userId: payload.sub,
      email: payload.email,
      globalRole: payload.globalRole,
    };

    return next();
  } catch {
    return next(new AppError(401, 'Invalid or expired token'));
  }
}
