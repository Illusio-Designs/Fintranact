import { Router } from 'express';
import { z } from 'zod';
import { ledgerCreateSchema } from '@fintranact/validation';
import { asyncHandler, ok } from '../../common/http.js';
import { Errors } from '../../common/errors.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import * as ledgers from './ledgers.service.js';

export const ledgersRouter: Router = Router();

/** GET /api/v1/ledgers?category= */
ledgersRouter.get(
  '/ledgers',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const rows = await ledgers.listLedgers(req.session!.companyId, {
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
    });
    ok(res, rows);
  }),
);

/** GET /api/v1/ledgers/:id */
ledgersRouter.get(
  '/ledgers/:id',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const ledger = await ledgers.getLedger(req.session!.companyId, req.params.id!);
    if (!ledger) throw Errors.notFound('Ledger not found');
    ok(res, ledger);
  }),
);

/** POST /api/v1/ledgers */
ledgersRouter.post(
  '/ledgers',
  requireAuth,
  requirePermission('ledger:manage'),
  asyncHandler(async (req, res) => {
    const input = ledgerCreateSchema.parse(req.body);
    const result = await ledgers.createLedger(input, {
      companyId: req.session!.companyId,
      userId: req.session!.userId,
      requestId: req.requestId,
    });
    res.status(201);
    ok(res, result);
  }),
);

const blacklistSchema = z.object({ blacklisted: z.boolean(), reason: z.string().optional() });

/** POST /api/v1/ledgers/:id/blacklist */
ledgersRouter.post(
  '/ledgers/:id/blacklist',
  requireAuth,
  requirePermission('ledger:manage'),
  asyncHandler(async (req, res) => {
    const { blacklisted, reason } = blacklistSchema.parse(req.body);
    await ledgers.setBlacklist(
      { companyId: req.session!.companyId, userId: req.session!.userId, requestId: req.requestId },
      req.params.id!,
      blacklisted,
      reason,
    );
    ok(res, { id: req.params.id, blacklisted });
  }),
);
