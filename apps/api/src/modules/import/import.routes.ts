import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, ok } from '../../common/http.js';
import { Errors } from '../../common/errors.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import * as imp from './import.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const importRouter: Router = Router();

const guard = [requireAuth, requirePermission('data:import')] as const;

/** GET /api/v1/import/entities — list importable entities + their columns. */
importRouter.get(
  '/import/entities',
  ...guard,
  asyncHandler(async (_req, res) => ok(res, imp.entityList())),
);

/** GET /api/v1/import/:entity/template — download the Excel template. */
importRouter.get(
  '/import/:entity/template',
  ...guard,
  asyncHandler(async (req, res) => {
    const entity = req.params.entity!;
    if (!imp.entityDef(entity)) throw Errors.notFound(`Unknown import entity: ${entity}`);
    const buf = await imp.template(entity);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="fintranact-${entity}-template.xlsx"`);
    res.send(buf);
  }),
);

/** POST /api/v1/import/:entity/validate — dry run: parse + validate, no writes. */
importRouter.post(
  '/import/:entity/validate',
  ...guard,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const entity = req.params.entity!;
    if (!imp.entityDef(entity)) throw Errors.notFound(`Unknown import entity: ${entity}`);
    if (!req.file) throw Errors.validation('Upload an .xlsx file in the "file" field');
    const rows = await imp.parseWorkbook(req.file.buffer);
    ok(res, imp.validate(entity, rows));
  }),
);

/** POST /api/v1/import/:entity/commit — import valid rows (transactional, audited). */
importRouter.post(
  '/import/:entity/commit',
  ...guard,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const entity = req.params.entity!;
    if (!imp.entityDef(entity)) throw Errors.notFound(`Unknown import entity: ${entity}`);
    if (!req.file) throw Errors.validation('Upload an .xlsx file in the "file" field');
    const financialYear = String(req.body.financialYear ?? '').trim();
    if (!/^\d{4}-\d{2}$/.test(financialYear)) {
      throw Errors.validation('financialYear is required, e.g. 2025-26', 'financialYear');
    }
    const rows = await imp.parseWorkbook(req.file.buffer);
    const summary = imp.validate(entity, rows);
    const result = await imp.commit(entity, summary, {
      companyId: req.session!.companyId,
      userId: req.session!.userId,
      financialYear,
      filename: req.file.originalname,
      requestId: req.requestId,
    });
    ok(res, { ...result, validated: summary.valid, invalid: summary.invalid });
  }),
);
