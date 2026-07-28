import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../common/db.js';
import { asyncHandler, ok } from '../../common/http.js';
import { Errors } from '../../common/errors.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';
import { audit } from '../../common/audit.js';

export const leaveRouter: Router = Router();

const daysBetween = (from: string, to: string): number => {
  const a = new Date(from).getTime(), b = new Date(to).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
};

/** GET /leave — leave applications (newest first). */
leaveRouter.get('/leave', requireAuth, requirePermission('report:view'), asyncHandler(async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, employee_name AS employeeName, type, from_date AS fromDate, to_date AS toDate, days,
            reason, status, approver, decided_at AS decidedAt, created_at AS createdAt
       FROM leave_requests WHERE company_id = :companyId ORDER BY created_at DESC LIMIT 200`,
    { companyId: req.session!.companyId });
  ok(res, rows.map((r) => ({ ...r, days: Number(r.days) })));
}));

const applySchema = z.object({
  employeeId: z.string().optional(),
  employeeName: z.string().trim().min(1),
  type: z.enum(['casual', 'sick', 'earned', 'unpaid']).default('casual'),
  fromDate: z.string().min(8),
  toDate: z.string().min(8),
  reason: z.string().trim().max(500).optional(),
});

/** POST /leave — apply for leave. */
leaveRouter.post('/leave', requireAuth, requirePermission('report:view'), asyncHandler(async (req, res) => {
  const i = applySchema.parse(req.body);
  const days = daysBetween(i.fromDate, i.toDate);
  const id = randomUUID();
  await pool.query(
    `INSERT INTO leave_requests (id, company_id, employee_id, employee_name, type, from_date, to_date, days, reason, status)
     VALUES (:id,:companyId,:employeeId,:employeeName,:type,:fromDate,:toDate,:days,:reason,'pending')`,
    { id, companyId: req.session!.companyId, employeeId: i.employeeId ?? null, employeeName: i.employeeName, type: i.type, fromDate: i.fromDate, toDate: i.toDate, days, reason: i.reason ?? null });
  await audit({ companyId: req.session!.companyId, actorUserId: req.session!.userId, action: 'leave.apply', entityType: 'leave_request', entityId: id, after: { employee: i.employeeName, type: i.type, days }, requestId: req.requestId });
  res.status(201);
  ok(res, { id, ...i, days, status: 'pending' });
}));

const decideSchema = z.object({ decision: z.enum(['approved', 'rejected']), approver: z.string().trim().optional() });

/** PATCH /leave/:id/decision — approve or reject (payroll/manager). */
leaveRouter.patch('/leave/:id/decision', requireAuth, requirePermission('payroll:run'), asyncHandler(async (req, res) => {
  const { decision, approver } = decideSchema.parse(req.body);
  const [r] = await pool.query<RowDataPacket[]>('SELECT id FROM leave_requests WHERE company_id = :companyId AND id = :id LIMIT 1', { companyId: req.session!.companyId, id: req.params.id });
  if (!r[0]) throw Errors.notFound('Leave request not found');
  await pool.query('UPDATE leave_requests SET status = :status, approver = :approver, decided_at = NOW() WHERE id = :id',
    { status: decision, approver: approver ?? 'Manager', id: req.params.id });
  await audit({ companyId: req.session!.companyId, actorUserId: req.session!.userId, action: `leave.${decision}`, entityType: 'leave_request', entityId: req.params.id!, after: { decision }, requestId: req.requestId });
  ok(res, { id: req.params.id, status: decision });
}));
