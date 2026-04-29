import type { NextFunction, Request, Response } from 'express';
import { loginSchema } from './auth.schemas';
import * as authService from './auth.service';

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.auth!.userId);
    return res.json(user);
  } catch (error) {
    return next(error);
  }
}
