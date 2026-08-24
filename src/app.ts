import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { corsOrigin } from './utils/cors';
import { logger } from './utils/logger';
import routes from './routes';
import { apiLimiter } from './middlewares/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(cors({ origin: corsOrigin(), credentials: true }));
app.use('/api/v1/livekit/webhook', express.raw({ type: '*/*', limit: '256kb' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: logger.stream }));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'OK',
    data: {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/v1', apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
