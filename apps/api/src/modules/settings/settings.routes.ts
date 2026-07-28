import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import * as settings from './settings.service.js';

export const settingsRouter: Router = Router();

/** GET /api/v1/settings/numbering — all numbering series for the company. */
settingsRouter.get(
  '/settings/numbering',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    ok(res, await settings.listNumberingSeries(req.session!.companyId));
  }),
);

const numberingPatch = z.object({
  prefix: z.string().trim().min(1).max(30).optional(),
  nextNo: z.number().int().min(1).optional(),
  width: z.number().int().min(1).max(12).optional(),
});

/** PATCH /api/v1/settings/numbering/:type — edit prefix / next no / width. */
settingsRouter.patch(
  '/settings/numbering/:type',
  requireAuth,
  requirePermission('settings:manage'),
  asyncHandler(async (req, res) => {
    const patch = numberingPatch.parse(req.body);
    const updated = await settings.updateNumberingSeries(req.params.type!, patch, {
      companyId: req.session!.companyId,
      branchId: req.session!.branchId,
      userId: req.session!.userId,
      requestId: req.requestId,
    });
    ok(res, updated);
  }),
);

/** GET /api/v1/settings/company — company statutory profile. */
settingsRouter.get(
  '/settings/company',
  requireAuth,
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    ok(res, await settings.getCompanyProfile(req.session!.companyId));
  }),
);
