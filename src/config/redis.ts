import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

function createClient(label: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 500, 5000)
  });
  client.on('error', (err) => logger.error(`Redis(${label}) error: ${err.message}`));
  client.on('connect', () => logger.info(`Redis(${label}) connected`));
  return client;
}

export const redis = createClient('main');
export const redisSub = createClient('subscriber');

export async function connectRedis(timeoutMs = 15000): Promise<void> {
  await Promise.all(
    [redis, redisSub].map(async (client) => {
      if (client.status === 'ready' || client.status === 'connecting' || client.status === 'connect') {
        return;
      }
      await Promise.race([
        client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Redis connection timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    })
  );
}

export async function disconnectRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), redisSub.quit()]);
  logger.info('Redis disconnected');
}
