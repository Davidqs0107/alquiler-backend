import type { GlobalRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
        globalRole: GlobalRole;
      };
    }
  }
}

export {};
