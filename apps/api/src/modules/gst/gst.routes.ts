import { Router } from 'express';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { getGstr1, getGstr3b, getGstr2bBooks } from './gst.service.js';

export const gstRouter: Router = Router();

/** GET /api/v1/gst/gstr-1 — outward supplies summary. */
gstRouter.get(
  '/gst/gstr-1',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => ok(res, await getGstr1(req.session!.companyId))),
);

/** GET /api/v1/gst/gstr-3b — summary return (output tax vs ITC, net payable). */
gstRouter.get(
  '/gst/gstr-3b',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => ok(res, await getGstr3b(req.session!.companyId))),
);

/** GET /api/v1/gst/gstr-2b/books — books-side ITC summary for reconciliation. */
gstRouter.get(
  '/gst/gstr-2b/books',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => ok(res, await getGstr2bBooks(req.session!.companyId))),
);
