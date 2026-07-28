import { Router } from 'express';
import { voucherComposeSchema } from '@fintranact/validation';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { composeVoucher } from './compose.service.js';

export const composeRouter: Router = Router();

/**
 * POST /api/v1/vouchers/compose
 * One endpoint for the simple vouchers + GST notes. Body is a discriminated
 * union keyed by `kind`: payment | receipt | contra | journal | credit_note | debit_note.
 */
composeRouter.post(
  '/vouchers/compose',
  requireAuth,
  requirePermission('voucher:create'),
  asyncHandler(async (req, res) => {
    const input = voucherComposeSchema.parse(req.body);
    const result = await composeVoucher(input, {
      companyId: req.session!.companyId,
      branchId: req.session!.branchId,
      userId: req.session!.userId,
      requestId: req.requestId,
    });
    res.status(201);
    ok(res, result);
  }),
);
