import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../common/db.js';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { requirePermission } from '../../common/middleware/rbac.js';

export const dashboardRouter: Router = Router();

const inr = (n: number): string => {
  if (!n) return '₹0';
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};
const num = (v: unknown): number => { const x = parseFloat(String(v ?? '0')); return Number.isFinite(x) ? x : 0; };

/** Live aggregates from the books (all zero until vouchers/masters exist). */
async function metrics(companyId: string) {
  const grpBal = async (group: string): Promise<number> => {
    const [r] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(vl.dr_amount - vl.cr_amount),0) AS bal
         FROM voucher_lines vl JOIN ledgers l ON l.id = vl.ledger_id
         JOIN ledger_groups lg ON lg.id = l.group_id
        WHERE vl.company_id = :companyId AND lg.name = :group`,
      { companyId, group });
    return num(r[0]?.bal);
  };
  const scalar = async (sql: string): Promise<number> => {
    const [r] = await pool.query<RowDataPacket[]>(sql, { companyId });
    return num((r[0] as RowDataPacket)?.v);
  };
  const [bank, cash, debtors, creditors, vouchersMonth, headcount, pendingInward, pendingOutward] = await Promise.all([
    grpBal('Bank Accounts'), grpBal('Cash-in-Hand'), grpBal('Sundry Debtors'), grpBal('Sundry Creditors'),
    scalar('SELECT COUNT(*) AS v FROM vouchers WHERE company_id = :companyId AND date >= DATE_FORMAT(CURDATE(), "%Y-%m-01")'),
    scalar('SELECT COUNT(*) AS v FROM employees WHERE company_id = :companyId AND deleted_at IS NULL'),
    scalar('SELECT COUNT(*) AS v FROM job_work_inward WHERE company_id = :companyId'),
    scalar('SELECT COUNT(*) AS v FROM job_work_outward WHERE company_id = :companyId'),
  ]);
  return { cashBank: bank + cash, receivables: debtors, payables: -creditors, vouchersMonth, headcount, pendingInward, pendingOutward };
}

type Kpi = { label: string; value: string; sub: string; tone?: 'up' | 'down' | '' };

/** Per-role KPI card layout (app config); values filled from live metrics. */
function roleKpis(role: string, m: Awaited<ReturnType<typeof metrics>>): Kpi[] {
  const base: Record<string, Kpi[]> = {
    controller: [
      { label: 'Cash & Bank', value: inr(m.cashBank), sub: 'live balance', tone: '' },
      { label: 'Receivables', value: inr(m.receivables), sub: 'outstanding', tone: '' },
      { label: 'Payables', value: inr(m.payables), sub: 'bills due', tone: '' },
      { label: 'Vouchers · month', value: String(m.vouchersMonth), sub: 'posted', tone: '' },
    ],
    owner: [
      { label: 'Cash & Bank', value: inr(m.cashBank), sub: 'live balance', tone: '' },
      { label: 'Receivables', value: inr(m.receivables), sub: 'outstanding', tone: '' },
      { label: 'Payables', value: inr(m.payables), sub: 'to pay', tone: '' },
      { label: 'Headcount', value: String(m.headcount), sub: 'active', tone: '' },
    ],
    supervisor: [
      { label: 'Pending inward', value: String(m.pendingInward), sub: 'jobs to start', tone: '' },
      { label: 'Pending outward', value: String(m.pendingOutward), sub: 'to dispatch', tone: '' },
      { label: 'Vouchers · month', value: String(m.vouchersMonth), sub: 'posted', tone: '' },
      { label: 'Headcount', value: String(m.headcount), sub: 'active', tone: '' },
    ],
    payroll: [
      { label: 'Headcount', value: String(m.headcount), sub: 'active', tone: '' },
      { label: 'Payroll', value: 'Not run', sub: 'this month', tone: '' },
      { label: 'Leave requests', value: '0', sub: 'to approve', tone: '' },
      { label: 'Present today', value: '0', sub: 'biometric', tone: '' },
    ],
    accountant: [
      { label: 'Vouchers · month', value: String(m.vouchersMonth), sub: 'posted', tone: '' },
      { label: 'Receivables', value: inr(m.receivables), sub: 'outstanding', tone: '' },
      { label: 'Payables', value: inr(m.payables), sub: 'bills due', tone: '' },
      { label: 'Cash & Bank', value: inr(m.cashBank), sub: 'live balance', tone: '' },
    ],
    compliance: [
      { label: 'Vouchers · month', value: String(m.vouchersMonth), sub: 'posted', tone: '' },
      { label: 'Returns due', value: '0', sub: 'this month', tone: '' },
      { label: 'TDS payable', value: '₹0', sub: 'to deposit', tone: '' },
      { label: 'Receivables', value: inr(m.receivables), sub: 'outstanding', tone: '' },
    ],
    auditor: [
      { label: 'Vouchers · month', value: String(m.vouchersMonth), sub: 'posted', tone: '' },
      { label: 'Headcount', value: String(m.headcount), sub: 'active', tone: '' },
      { label: 'Cash & Bank', value: inr(m.cashBank), sub: 'live balance', tone: '' },
      { label: 'Period locks', value: '0', sub: 'locked', tone: '' },
    ],
  };
  return base[role] ?? base.controller!;
}

const ROLE_NAME: Record<string, string> = {
  controller: 'Finance Controller', owner: 'Owner / Director', supervisor: 'Process Supervisor',
  payroll: 'Payroll / HR', accountant: 'Accountant', compliance: 'Compliance Officer', auditor: 'Auditor (read-only)',
};

/** GET /dashboard?role=controller — role KPIs + section lists (live). */
dashboardRouter.get('/dashboard', requireAuth, requirePermission('report:view'), asyncHandler(async (req, res) => {
  const companyId = req.session!.companyId;
  const role = typeof req.query.role === 'string' && ROLE_NAME[req.query.role] ? req.query.role : 'controller';
  const m = await metrics(companyId);
  const [recent] = await pool.query<RowDataPacket[]>(
    `SELECT voucher_no AS no, type, status, narration FROM vouchers WHERE company_id = :companyId ORDER BY created_at DESC LIMIT 6`,
    { companyId });
  const [compliance] = await pool.query<RowDataPacket[]>(
    `SELECT form AS t, period AS m, due AS \`when\`, days, kind, status FROM compliance_items WHERE company_id = :companyId ORDER BY due LIMIT 6`,
    { companyId });
  ok(res, {
    role,
    name: ROLE_NAME[role],
    greeting: 'Live data from the books — figures update as you post vouchers, run payroll and file returns.',
    kpis: roleKpis(role, m),
    metrics: m,
    recentVouchers: recent,
    compliance,
    approvals: [],
    pendingInward: [],
    pendingOutward: [],
  });
}));

/** GET /config/roles — role list for the role switcher. */
dashboardRouter.get('/config/roles', requireAuth, asyncHandler(async (req, res) => {
  const [r] = await pool.query<RowDataPacket[]>(
    'SELECT `key`, name FROM roles WHERE company_id = :companyId AND `key` <> "admin" ORDER BY name',
    { companyId: req.session!.companyId });
  ok(res, r.map((x) => ({ key: x.key, name: x.name })));
}));

const WIDGETS = [
  { key: 'kpi-cash', name: 'Cash & Bank', desc: 'Live cash + bank balance with month-on-month trend.', group: 'Finance', roles: ['controller', 'owner'], size: 'S', defaultOn: true },
  { key: 'kpi-receivables', name: 'Receivables', desc: 'Outstanding + overdue ageing (30/60/90).', group: 'Finance', roles: ['controller', 'owner', 'accountant'], size: 'S', defaultOn: true },
  { key: 'kpi-payables', name: 'Payables', desc: 'Bills due this week / this month.', group: 'Finance', roles: ['controller'], size: 'S', defaultOn: true },
  { key: 'kpi-gst', name: 'GST Liability', desc: 'Net GST payable after ITC for the period.', group: 'Compliance', roles: ['controller', 'compliance'], size: 'S', defaultOn: true },
  { key: 'cashflow', name: 'Cash Flow', desc: 'Inflow vs outflow chart, last 6 months.', group: 'Finance', roles: ['controller', 'owner', 'accountant'], size: 'L', defaultOn: true },
  { key: 'pnl', name: 'Profit & Loss', desc: 'Gross & net profit waterfall with GP%/NP% margins.', group: 'Finance', roles: ['owner', 'controller', 'auditor'], size: 'M', defaultOn: true },
  { key: 'compliance', name: 'Compliance Calendar', desc: 'GSTR/TDS/TCS/PF due dates with countdown.', group: 'Compliance', roles: ['controller', 'compliance', 'accountant'], size: 'M', defaultOn: true },
  { key: 'gst2b', name: 'GSTR-2B Reconciliation', desc: 'Matched / mismatch / missing ITC buckets.', group: 'Compliance', roles: ['compliance', 'accountant'], size: 'M' },
  { key: 'vouchers', name: 'Recent Vouchers', desc: 'Latest posted vouchers with status.', group: 'Finance', roles: ['controller', 'accountant', 'auditor'], size: 'L', defaultOn: true },
  { key: 'approvals', name: 'Approvals · You', desc: 'Maker-checker items awaiting your sign-off.', group: 'Finance', roles: ['controller', 'owner'], size: 'M', defaultOn: true },
  { key: 'top-customers', name: 'Top Customers', desc: 'Top parties by job-work revenue.', group: 'Finance', roles: ['owner'], size: 'M' },
  { key: 'pending-inward', name: 'Pending Inward', desc: 'Customer material received, awaiting process.', group: 'Job Work', roles: ['supervisor'], size: 'M', defaultOn: true },
  { key: 'pending-outward', name: 'Pending Outward', desc: 'Processed material ready to dispatch (vs pending qty).', group: 'Job Work', roles: ['supervisor'], size: 'M', defaultOn: true },
  { key: 'material-ageing', name: 'Material Ageing', desc: 'Job-work stock ageing vs 1-year return rule.', group: 'Job Work', roles: ['supervisor', 'compliance'], size: 'S' },
  { key: 'lien', name: 'Overdue Recovery · Lien', desc: 'Forfeit & sell overdue party material to recover dues.', group: 'Job Work', roles: ['controller', 'supervisor', 'owner'], size: 'M' },
  { key: 'attendance', name: 'Biometric Attendance', desc: "Today's device punches, present / leave / OT.", group: 'Payroll', roles: ['payroll'], size: 'M', defaultOn: true },
  { key: 'leave-payroll', name: 'Leave & Payroll', desc: 'Leave approvals + payroll run status.', group: 'Payroll', roles: ['payroll'], size: 'M' },
  { key: 'headcount', name: 'Headcount', desc: 'Active employees, joiners, exits.', group: 'Payroll', roles: ['payroll', 'owner'], size: 'S' },
  { key: 'audit', name: 'Audit Trail', desc: 'Tamper-evident, PIN-signed action log.', group: 'Audit', roles: ['auditor', 'compliance'], size: 'L' },
  { key: 'tds-tcs', name: 'TDS / TCS Register', desc: 'Deductions, challans, return-ready summaries.', group: 'Compliance', roles: ['compliance', 'accountant'], size: 'M' },
];

/** GET /widgets — the dashboard widget catalog (app config). */
dashboardRouter.get('/widgets', requireAuth, asyncHandler(async (_req, res) => {
  ok(res, WIDGETS);
}));
