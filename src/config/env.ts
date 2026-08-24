import 'dotenv/config';
import { z } from 'zod';
import { logger } from '../utils/logger';

const DEV_JWT_SECRET = 'dev_only_jwt_secret_change_me_in_production';
const DEV_LIVEKIT_SECRET = 'dev_only_livekit_secret_change_me_in_production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.string().default('*'),
  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/livehub'),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
  JWT_SECRET: z.string().min(16).default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('7d'),
  LIVEKIT_API_KEY: z.string().min(1).default('devkey'),
  LIVEKIT_API_SECRET: z.string().min(16).default(DEV_LIVEKIT_SECRET),
  LIVEKIT_SERVER_URL: z.string().min(1).default('ws://localhost:7880'),
  LOG_LEVEL: z.enum(['debug', 'http', 'info', 'warn', 'error']).default('info')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    logger.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET === DEV_JWT_SECRET) {
    logger.error('JWT_SECRET must be overridden in production');
    process.exit(1);
  }
  if (env.LIVEKIT_API_SECRET === DEV_LIVEKIT_SECRET) {
    logger.warn('Using default LIVEKIT_API_SECRET in production - override it');
  }
} else if (env.JWT_SECRET === DEV_JWT_SECRET) {
  logger.warn('Using development JWT secret. Do not use in production.');
}
