import { Router } from 'express';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { computeRun, listForm16 } from './payroll.service.js';

export const payrollRouter: Router = Router();

/** GET /api/v1/payroll/run?month=YYYY-MM — computed payroll with statutory deductions. */
payrollRouter.get(
  '/payroll/run',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const month = String(req.query.month ?? '').slice(0, 7) || new Date().toISOString().slice(0, 7);
    ok(res, await computeRun(req.session!.companyId, month));
  }),
);

/** GET /api/v1/payroll/form16 — annual Form 16 (Part B) per employee. */
payrollRouter.get(
  '/payroll/form16',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => ok(res, await listForm16(req.session!.companyId))),
);
