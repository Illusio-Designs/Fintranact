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

/** PATCH /api/v1/settings/company — print/automation flags. */
settingsRouter.patch('/settings/company', requireAuth, requirePermission('settings:manage'), asyncHandler(async (req, res) => {
  const patch = z.object({ autoEinvoiceService: z.boolean().optional() }).parse(req.body);
  await settings.updateCompanySettings(req.session!.companyId, patch);
  ok(res, await settings.getCompanyProfile(req.session!.companyId));
}));

/** GET /api/v1/settings/banks — company bank accounts. */
settingsRouter.get('/settings/banks', requireAuth, requirePermission('report:view'), asyncHandler(async (req, res) => {
  ok(res, await settings.listBankAccounts(req.session!.companyId));
}));

/** POST /api/v1/settings/banks — add a bank account. */
settingsRouter.post('/settings/banks', requireAuth, requirePermission('settings:manage'), asyncHandler(async (req, res) => {
  const input = z.object({ bankName: z.string().trim().min(1), accountNo: z.string().trim().min(4), ifsc: z.string().trim().optional(), branch: z.string().trim().optional(), upi: z.string().trim().optional() }).parse(req.body);
  res.status(201);
  ok(res, await settings.addBankAccount(req.session!.companyId, input));
}));

/** PATCH /api/v1/settings/banks/:id/print — set the bank that prints on vouchers. */
settingsRouter.patch('/settings/banks/:id/print', requireAuth, requirePermission('settings:manage'), asyncHandler(async (req, res) => {
  await settings.setPrintBank(req.session!.companyId, req.params.id!);
  ok(res, await settings.listBankAccounts(req.session!.companyId));
}));
