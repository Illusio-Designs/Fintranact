import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, ok } from '../../common/http.js';
import { Errors } from '../../common/errors.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import * as imp from './import.service.js';

// Accept a single .xlsx up to 10 MB, held in memory (streamed to storage later).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const importRouter: Router = Router();

/** GET /api/v1/import/ledgers/template — download the Excel template. */
importRouter.get(
  '/import/ledgers/template',
  requireAuth,
  requirePermission('data:import'),
  asyncHandler(async (_req, res) => {
    const buf = await imp.ledgerTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="fintranact-ledgers-template.xlsx"');
    res.send(buf);
  }),
);

/** POST /api/v1/import/ledgers/validate — dry run: parse + validate, no writes. */
importRouter.post(
  '/import/ledgers/validate',
  requireAuth,
  requirePermission('data:import'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw Errors.validation('Upload an .xlsx file in the "file" field');
    const rows = await imp.parseWorkbook(req.file.buffer);
    const summary = imp.validateLedgers(rows);
    ok(res, summary);
  }),
);

/** POST /api/v1/import/ledgers/commit — import valid rows into the ledger. */
importRouter.post(
  '/import/ledgers/commit',
  requireAuth,
  requirePermission('data:import'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw Errors.validation('Upload an .xlsx file in the "file" field');
    const financialYear = String(req.body.financialYear ?? '').trim();
    if (!/^\d{4}-\d{2}$/.test(financialYear)) {
      throw Errors.validation('financialYear is required, e.g. 2025-26', 'financialYear');
    }
    const rows = await imp.parseWorkbook(req.file.buffer);
    const summary = imp.validateLedgers(rows);
    const result = await imp.commitLedgers(summary, {
      companyId: req.session!.companyId,
      userId: req.session!.userId,
      financialYear,
      filename: req.file.originalname,
      requestId: req.requestId,
    });
    ok(res, { ...result, validated: summary.valid, invalid: summary.invalid });
  }),
);
