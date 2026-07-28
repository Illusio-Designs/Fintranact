import { Router } from 'express';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { getTdsSummary } from './tds.service.js';

export const tdsRouter: Router = Router();

/** GET /api/v1/tds/summary — net TDS payable (deducted, not yet deposited). */
tdsRouter.get(
  '/tds/summary',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => ok(res, await getTdsSummary(req.session!.companyId))),
);
