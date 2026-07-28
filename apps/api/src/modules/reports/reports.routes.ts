import { Router } from 'express';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { getTrialBalance, getDayBook, getPnl, getBalanceSheet } from './reports.service.js';

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

/** GET /api/v1/reports/day-book?date=YYYY-MM-DD — vouchers posted on a date. */
reportsRouter.get(
  '/reports/day-book',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const date = String(req.query.date ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10);
    const db = await getDayBook(req.session!.companyId, date);
    ok(res, db);
  }),
);

/** GET /api/v1/reports/pnl — profit & loss (income − direct − indirect expense). */
reportsRouter.get(
  '/reports/pnl',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const pnl = await getPnl(req.session!.companyId);
    ok(res, pnl);
  }),
);

/** GET /api/v1/reports/balance-sheet — assets vs liabilities + equity (incl. period profit). */
reportsRouter.get(
  '/reports/balance-sheet',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const bs = await getBalanceSheet(req.session!.companyId);
    ok(res, bs);
  }),
);
