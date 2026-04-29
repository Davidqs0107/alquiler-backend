import jwt, { type SignOptions } from 'jsonwebtoken';
import type { GlobalRole } from '@prisma/client';
import { env } from '../config/env';

type JwtPayload = {
  sub: string;
  email: string;
  globalRole: GlobalRole;
};

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
