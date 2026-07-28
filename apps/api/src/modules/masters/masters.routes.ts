import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../common/db.js';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { audit } from '../../common/audit.js';

export const mastersRouter: Router = Router();
const num = (v: unknown): number => { const x = parseFloat(String(v ?? '0')); return Number.isFinite(x) ? x : 0; };
const read = [requireAuth, requirePermission('report:view')] as const;

/** GET /masters/process */
mastersRouter.get('/masters/process', ...read, asyncHandler(async (req, res) => {
  const [r] = await pool.query<RowDataPacket[]>(
    'SELECT code, name, sac, uom, turnaround, active FROM process_masters WHERE company_id = :companyId ORDER BY code',
    { companyId: req.session!.companyId });
  ok(res, r.map((x) => ({ code: x.code, name: x.name, sac: x.sac ?? '', uom: x.uom, turnaround: x.turnaround ?? '—', active: !!x.active })));
}));

const processSchema = z.object({ code: z.string().trim().min(1), name: z.string().trim().min(1), sac: z.string().trim().default('9988'), uom: z.string().trim().default('Per kg') });

/** POST /masters/process */
mastersRouter.post('/masters/process', requireAuth, requirePermission('ledger:manage'), asyncHandler(async (req, res) => {
  const input = processSchema.parse(req.body);
  const id = randomUUID();
  await pool.query('INSERT INTO process_masters (id, company_id, code, name, sac, uom) VALUES (:id,:companyId,:code,:name,:sac,:uom)',
    { id, companyId: req.session!.companyId, ...input });
  await audit({ companyId: req.session!.companyId, actorUserId: req.session!.userId, action: 'master.process.create', entityType: 'process_master', entityId: id, after: input, requestId: req.requestId });
  res.status(201);
  ok(res, { ...input, turnaround: '—', active: true });
}));

/** GET /masters/rate */
mastersRouter.get('/masters/rate', ...read, asyncHandler(async (req, res) => {
  const [r] = await pool.query<RowDataPacket[]>(
    'SELECT process, customer, rate, effective FROM rate_masters WHERE company_id = :companyId ORDER BY created_at DESC',
    { companyId: req.session!.companyId });
  ok(res, r.map((x) => ({ process: x.process, customer: x.customer, rate: num(x.rate), effective: x.effective ?? '' })));
}));

const rateSchema = z.object({ process: z.string().trim().min(1), customer: z.string().trim().min(1), rate: z.number().nonnegative(), effective: z.string().trim().optional() });

/** POST /masters/rate */
mastersRouter.post('/masters/rate', requireAuth, requirePermission('ledger:manage'), asyncHandler(async (req, res) => {
  const input = rateSchema.parse(req.body);
  const id = randomUUID();
  await pool.query('INSERT INTO rate_masters (id, company_id, process, customer, rate, effective) VALUES (:id,:companyId,:process,:customer,:rate,:effective)',
    { id, companyId: req.session!.companyId, process: input.process, customer: input.customer, rate: input.rate, effective: input.effective ?? null });
  await audit({ companyId: req.session!.companyId, actorUserId: req.session!.userId, action: 'master.rate.create', entityType: 'rate_master', entityId: id, after: input, requestId: req.requestId });
  res.status(201);
  ok(res, { ...input, effective: input.effective ?? '' });
}));
