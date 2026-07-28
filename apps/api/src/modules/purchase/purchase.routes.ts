import { Router } from 'express';
import { purchaseInvoiceSchema } from '@fintranact/validation';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { createPurchaseInvoice } from './purchase.service.js';

export const purchaseRouter: Router = Router();

/**
 * POST /api/v1/invoices/purchase
 * Body: { partyLedgerId, placeOfSupply: 'intra'|'inter', date, items: [{ purchaseLedgerId, taxable, gstRate }], tdsRate? }
 * Auto-composes and posts the balanced multi-line purchase voucher (Dr expense + input GST; Cr supplier − TDS).
 */
purchaseRouter.post(
  '/invoices/purchase',
  requireAuth,
  requirePermission('voucher:create'),
  asyncHandler(async (req, res) => {
    const input = purchaseInvoiceSchema.parse(req.body);
    const result = await createPurchaseInvoice(input, {
      companyId: req.session!.companyId,
      branchId: req.session!.branchId,
      userId: req.session!.userId,
      requestId: req.requestId,
    });
    res.status(201);
    ok(res, result);
  }),
);
