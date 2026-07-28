import { Router } from 'express';
import { salesInvoiceSchema } from '@fintranact/validation';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { createSalesInvoice } from './sales.service.js';
import { getCompanyProfile } from '../settings/settings.service.js';
import { generateEInvoice } from '../integrations/einvoice.service.js';

export const salesRouter: Router = Router();

/**
 * POST /api/v1/invoices/sales
 * Body: { partyLedgerId, placeOfSupply: 'intra'|'inter', date, items: [{ salesLedgerId, taxable, gstRate }] }
 * Auto-composes and posts the balanced multi-line sales voucher.
 */
salesRouter.post(
  '/invoices/sales',
  requireAuth,
  requirePermission('voucher:create'),
  asyncHandler(async (req, res) => {
    const input = salesInvoiceSchema.parse(req.body);
    const result = await createSalesInvoice(input, {
      companyId: req.session!.companyId,
      branchId: req.session!.branchId,
      userId: req.session!.userId,
      requestId: req.requestId,
    });
    // If enabled in Settings, auto-generate the IRN for this service invoice.
    let einvoice = null;
    const company = await getCompanyProfile(req.session!.companyId);
    if (company?.auto_einvoice_service) {
      try {
        einvoice = await generateEInvoice(result.id, { companyId: req.session!.companyId, userId: req.session!.userId, requestId: req.requestId });
      } catch { /* non-blocking: invoice is posted; IRN can be generated later */ }
    }
    res.status(201);
    ok(res, { ...result, einvoice });
  }),
);
