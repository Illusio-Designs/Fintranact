import { Router } from 'express';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { listLocks, lockPeriod, unlockPeriod } from './periods.service.js';

export const periodsRouter: Router = Router();

/** GET /api/v1/periods — list locked months. */
periodsRouter.get(
  '/periods',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => ok(res, await listLocks(req.session!.companyId))),
);

/** POST /api/v1/periods/lock { period, note? } — close a month. */
periodsRouter.post(
  '/periods/lock',
  requireAuth,
  requirePermission('voucher:approve'),
  asyncHandler(async (req, res) => {
    const { period, note } = req.body ?? {};
    await lockPeriod(req.session!.companyId, String(period ?? ''), note ?? null, {
      companyId: req.session!.companyId, branchId: req.session!.branchId, userId: req.session!.userId, requestId: req.requestId,
    });
    res.status(201);
    ok(res, { period, locked: true });
  }),
);

/** POST /api/v1/periods/unlock { period } — reopen a closed month (privileged, audited). */
periodsRouter.post(
  '/periods/unlock',
  requireAuth,
  requirePermission('voucher:approve'),
  asyncHandler(async (req, res) => {
    const { period } = req.body ?? {};
    await unlockPeriod(req.session!.companyId, String(period ?? ''), {
      companyId: req.session!.companyId, branchId: req.session!.branchId, userId: req.session!.userId, requestId: req.requestId,
    });
    ok(res, { period, locked: false });
  }),
);
