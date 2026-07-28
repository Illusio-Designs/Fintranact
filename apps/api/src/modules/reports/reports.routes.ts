import { Router } from 'express';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { getTrialBalance } from './reports.service.js';

export const reportsRouter: Router = Router();

/** GET /api/v1/reports/trial-balance — net debit/credit closing balance per ledger. */
reportsRouter.get(
  '/reports/trial-balance',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const tb = await getTrialBalance(req.session!.companyId);
    ok(res, tb);
  }),
);
