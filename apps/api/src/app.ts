import './common/context.js'; // register Express Request augmentation
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { config } from './config.js';
import { logger } from './common/logger.js';
import { requestId } from './common/middleware/requestId.js';
import { errorHandler } from './common/middleware/errorHandler.js';
import { asyncHandler, ok } from './common/http.js';
import { ping } from './common/db.js';
import { iamRouter } from './modules/iam/iam.routes.js';
import { importRouter } from './modules/import/import.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.webOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestId);
  app.use(pinoHttp({ logger }));

  // Health / readiness
  app.get(
    '/health',
    asyncHandler(async (_req, res) => {
      const db = await ping().catch(() => false);
      ok(res, { status: 'ok', db });
    }),
  );

  // API v1
  app.use('/api/v1', iamRouter);
  app.use('/api/v1', importRouter);
  // Future modules mount here: accounting, compliance, jobwork, payroll, documents…

  app.use(errorHandler);
  return app;
}
