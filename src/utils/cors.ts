import { env } from '../config/env';

export function corsOrigin(): boolean | string[] {
  if (env.CORS_ORIGIN === '*') return true;
  return env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
}
