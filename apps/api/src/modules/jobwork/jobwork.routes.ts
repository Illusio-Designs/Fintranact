import { Router } from 'express';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { listInwardWithPending, getItc04Summary } from './jobwork.service.js';

export const jobworkRouter: Router = Router();

/** GET /api/v1/jobwork/pending — inward challans with pending-to-return quantity. */
jobworkRouter.get(
  '/jobwork/pending',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => ok(res, await listInwardWithPending(req.session!.companyId))),
);

/** GET /api/v1/jobwork/itc04 — Rule 45 movement summary (received vs returned). */
jobworkRouter.get(
  '/jobwork/itc04',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => ok(res, await getItc04Summary(req.session!.companyId))),
);
