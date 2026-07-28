import { Router } from 'express';
import { voucherCreateSchema } from '@fintranact/validation';
import { asyncHandler, ok } from '../../common/http.js';
import { Errors } from '../../common/errors.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import * as vouchers from './vouchers.service.js';

export const vouchersRouter: Router = Router();

/** GET /api/v1/vouchers?type= */
vouchersRouter.get(
  '/vouchers',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const rows = await vouchers.listVouchers(req.session!.companyId, {
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
    });
    ok(res, rows);
  }),
);

/** GET /api/v1/vouchers/:id — header + lines. */
vouchersRouter.get(
  '/vouchers/:id',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const v = await vouchers.getVoucher(req.session!.companyId, req.params.id!);
    if (!v) throw Errors.notFound('Voucher not found');
    ok(res, v);
  }),
);

/** POST /api/v1/vouchers — create & post a balanced voucher. */
vouchersRouter.post(
  '/vouchers',
  requireAuth,
  requirePermission('voucher:create'),
  asyncHandler(async (req, res) => {
    const input = voucherCreateSchema.parse(req.body);
    const result = await vouchers.createVoucher(input, {
      companyId: req.session!.companyId,
      branchId: req.session!.branchId,
      userId: req.session!.userId,
      requestId: req.requestId,
    });
    res.status(201);
    ok(res, result);
  }),
);
