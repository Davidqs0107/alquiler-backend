import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { loginHandler, meHandler } from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', loginHandler);
authRouter.get('/me', authMiddleware, meHandler);
