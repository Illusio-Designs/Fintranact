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
import { ledgersRouter } from './modules/accounting/ledgers.routes.js';
import { vouchersRouter } from './modules/accounting/vouchers.routes.js';
import { periodsRouter } from './modules/accounting/periods.routes.js';
import { salesRouter } from './modules/sales/sales.routes.js';
import { purchaseRouter } from './modules/purchase/purchase.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { composeRouter } from './modules/vouchers/compose.routes.js';
import { gstRouter } from './modules/gst/gst.routes.js';
import { tdsRouter } from './modules/tds/tds.routes.js';
import { jobworkRouter } from './modules/jobwork/jobwork.routes.js';
import { payrollRouter } from './modules/payroll/payroll.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';

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
  app.use('/api/v1', ledgersRouter);
  app.use('/api/v1', vouchersRouter);
  app.use('/api/v1', periodsRouter);
  app.use('/api/v1', salesRouter);
  app.use('/api/v1', purchaseRouter);
  app.use('/api/v1', reportsRouter);
  app.use('/api/v1', composeRouter);
  app.use('/api/v1', gstRouter);
  app.use('/api/v1', tdsRouter);
  app.use('/api/v1', jobworkRouter);
  app.use('/api/v1', payrollRouter);
  app.use('/api/v1', settingsRouter);
  // Future modules mount here: compliance, jobwork, payroll, documents…

  app.use(errorHandler);
  return app;
}
