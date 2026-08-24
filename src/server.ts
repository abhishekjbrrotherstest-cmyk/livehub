import http from 'http';
import app from './app';
import './types';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { connectRedis, disconnectRedis } from './config/redis';
import { initSocketServer, type AppServer } from './sockets/socket.server';import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  await connectRedis();

  const server = http.createServer(app);
  const io: AppServer = initSocketServer(server);

  server.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`LiveKit server: ${env.LIVEKIT_SERVER_URL}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.warn(`${signal} received - shutting down gracefully`);
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    try {
      io.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await disconnectDatabase();
      await disconnectRedis();
    } catch (err) {
      logger.error(`Error during shutdown: ${err instanceof Error ? err.message : err}`);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
  logger.error(`Unhandled rejection: ${message}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.stack ?? err.message}`);
  process.exit(1);
});

void bootstrap().catch((err) => {
  const message = err instanceof Error ? err.stack : String(err);
  logger.error(`Failed to start server: ${message}`);
  process.exit(1);
});
