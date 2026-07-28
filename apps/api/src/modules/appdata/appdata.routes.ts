import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../common/db.js';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';

export const appDataRouter: Router = Router();
const n = (v: unknown): number => { const x = parseFloat(String(v ?? '0')); return Number.isFinite(x) ? x : 0; };

async function rows(sql: string, companyId: string): Promise<RowDataPacket[]> {
  const [r] = await pool.query<RowDataPacket[]>(sql, { companyId });
  return r;
}

const read = [requireAuth, requirePermission('report:view')] as const;

/** GET /tds/challans */
appDataRouter.get('/tds/challans', ...read, asyncHandler(async (req, res) => {
  const r = await rows('SELECT section, description, deductees, amount, challan_no AS challanNo, bsr, paid_on AS paidOn, due_on AS dueOn, status FROM tds_challans WHERE company_id = :companyId ORDER BY due_on', req.session!.companyId);
  const rowsOut = r.map((x) => ({ section: x.section, description: x.description, deductees: n(x.deductees), amount: n(x.amount), challanNo: x.challanNo, bsr: x.bsr, paidOn: x.paidOn, dueOn: x.dueOn, status: String(x.status) }));
  const totalDeducted = rowsOut.reduce((s, x) => s + x.amount, 0);
  const totalPaid = rowsOut.filter((x) => x.status === 'paid').reduce((s, x) => s + x.amount, 0);
  ok(res, { rows: rowsOut, totalDeducted, totalPaid, totalDue: totalDeducted - totalPaid });
}));

/** GET /tds/returns */
appDataRouter.get('/tds/returns', ...read, asyncHandler(async (req, res) => {
  const r = await rows('SELECT name, pan, section, paid, rate, tds, date, challan FROM tds_deductees WHERE company_id = :companyId ORDER BY date', req.session!.companyId);
  const rowsOut = r.map((x) => ({ ...x, paid: n(x.paid), rate: n(x.rate), tds: n(x.tds) }));
  ok(res, { form: '26Q', quarter: 'Q1', rows: rowsOut, totalPaid: rowsOut.reduce((s, x) => s + x.paid, 0), totalTds: rowsOut.reduce((s, x) => s + x.tds, 0) });
}));

/** GET /tcs */
appDataRouter.get('/tcs', ...read, asyncHandler(async (req, res) => {
  const r = await rows('SELECT party, pan, section, sale, rate, tcs, date, challan_no AS challan FROM tcs_collections WHERE company_id = :companyId ORDER BY date', req.session!.companyId);
  const rowsOut = r.map((x) => ({ party: x.party, pan: x.pan, section: x.section, sale: n(x.sale), rate: n(x.rate), tcs: n(x.tcs), date: x.date, challan: x.challan as string | null }));
  const totalTcs = rowsOut.reduce((s, x) => s + x.tcs, 0);
  const totalCollected = rowsOut.filter((x) => x.challan).reduce((s, x) => s + x.tcs, 0);
  ok(res, { rows: rowsOut, totalSale: rowsOut.reduce((s, x) => s + x.sale, 0), totalTcs, totalCollected, totalDue: totalTcs - totalCollected });
}));

/** GET /gst/e-invoice */
appDataRouter.get('/gst/e-invoice', ...read, asyncHandler(async (req, res) => {
  const r = await rows('SELECT invoice_no AS invoiceNo, party, date, value, irn, ack, status FROM e_invoices WHERE company_id = :companyId ORDER BY date DESC', req.session!.companyId);
  ok(res, r.map((x) => ({ ...x, value: n(x.value) })));
}));

/** GET /gst/e-way */
appDataRouter.get('/gst/e-way', ...read, asyncHandler(async (req, res) => {
  const r = await rows('SELECT ewb_no AS ewbNo, invoice_no AS invoiceNo, party, from_place AS `from`, to_place AS `to`, distance, value, valid_till AS validTill, status FROM eway_bills WHERE company_id = :companyId ORDER BY created_at DESC', req.session!.companyId);
  ok(res, r.map((x) => ({ ...x, distance: n(x.distance), value: n(x.value) })));
}));

/** GET /jobwork/lien */
appDataRouter.get('/jobwork/lien', ...read, asyncHandler(async (req, res) => {
  const r = await rows('SELECT customer, overdue, ageing_days AS ageingDays, material, qty, assessed, expected_sale AS expectedSale, status FROM lien_cases WHERE company_id = :companyId ORDER BY ageing_days DESC', req.session!.companyId);
  ok(res, r.map((x) => ({ ...x, overdue: n(x.overdue), ageingDays: n(x.ageingDays), assessed: n(x.assessed), expectedSale: n(x.expectedSale) })));
}));

/** GET /reports/ageing?kind=receivable|payable — derived from open party balances (empty until data exists). */
appDataRouter.get('/reports/ageing', ...read, asyncHandler(async (_req, res) => {
  ok(res, { rows: [], totals: { total: 0, b0: 0, b30: 0, b60: 0, b90: 0 } });
}));

/** GET /audit — the tamper-evident action log. */
appDataRouter.get('/audit', requireAuth, requirePermission('audit:read'), asyncHandler(async (req, res) => {
  const [r] = await pool.query<RowDataPacket[]>(
    `SELECT a.created_at AS time, COALESCE(u.name, 'system') AS actor, a.action, a.entity_type AS entity,
            COALESCE(a.entity_id,'') AS entityId, COALESCE(a.ip,'') AS ip
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
      WHERE a.company_id = :companyId ORDER BY a.id DESC LIMIT 200`,
    { companyId: req.session!.companyId });
  ok(res, r);
}));

/** GET /compliance */
appDataRouter.get('/compliance', ...read, asyncHandler(async (req, res) => {
  const r = await rows('SELECT form, period, due, days, amount, kind, status FROM compliance_items WHERE company_id = :companyId ORDER BY due', req.session!.companyId);
  ok(res, r.map((x) => ({ ...x, days: n(x.days), amount: x.amount == null ? null : n(x.amount) })));
}));

/** GET /documents */
appDataRouter.get('/documents', ...read, asyncHandler(async (req, res) => {
  const r = await rows('SELECT name, type, category, linked_to AS linkedTo, size, uploaded_by AS uploadedBy, date FROM documents WHERE company_id = :companyId ORDER BY date DESC', req.session!.companyId);
  ok(res, r);
}));

/** GET /notifications */
appDataRouter.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const r = await rows('SELECT id, kind, cat, day, time, title, body, chips, is_read AS `read` FROM notifications WHERE company_id = :companyId ORDER BY created_at DESC', req.session!.companyId);
  ok(res, r.map((x) => ({ ...x, read: !!x.read, chips: Array.isArray(x.chips) ? x.chips : (x.chips ? JSON.parse(String(x.chips)) : []) })));
}));
