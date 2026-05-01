import express from 'express';
import cors from 'cors';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { companiesRouter } from './modules/companies/companies.routes';
import { resourcesRouter } from './modules/resources/resources.routes';
import { operationsRouter } from './modules/operations/operations.routes';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware';

const CORS_LOCAL = 'http://localhost:5173';
const CORS_PROD = process.env.CORS_ORIGIN || 'https://alquiler-frontend.vercel.app';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: [CORS_LOCAL, CORS_PROD],
    credentials: true,
  }));

  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/companies', companiesRouter);
  app.use(resourcesRouter);
  app.use(operationsRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
