import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthUserPayload } from '../types';

export function signAccessToken(payload: AuthUserPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as unknown as jwt.SignOptions['expiresIn']
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AuthUserPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  const payload = decoded as { id?: unknown; email?: unknown };
  if (typeof payload.id !== 'string' || typeof payload.email !== 'string') {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }
  return { id: payload.id, email: payload.email };
}
