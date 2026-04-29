import express from 'express';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { companiesRouter } from './modules/companies/companies.routes';
import { resourcesRouter } from './modules/resources/resources.routes';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/companies', companiesRouter);
  app.use(resourcesRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
