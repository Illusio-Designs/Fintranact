/** Mock data so the app displays with no backend (Vercel demo). */

export interface Kpi {
  label: string;
  value: string;
  sub: string;
  tone?: 'up' | 'down' | '';
}

export const ROLES: Record<string, { name: string; greeting: string; kpis: Kpi[] }> = {
  controller: {
    name: 'Finance Controller',
    greeting: '3 approvals awaiting you · GSTR-3B for Jun due in 4 days · TDS challan pending deposit.',
    kpis: [
      { label: 'Cash & Bank', value: '₹84.62 L', sub: '▲ 6.4% vs last month', tone: 'up' },
      { label: 'Receivables', value: '₹1.42 Cr', sub: '₹38.1L overdue · 30+ days', tone: 'down' },
      { label: 'Payables', value: '₹67.90 L', sub: '12 bills · 5 due this week', tone: '' },
      { label: 'GST Liability · Jun', value: '₹9.18 L', sub: 'Net payable after ITC ₹6.4L', tone: 'down' },
    ],
  },
  owner: {
    name: 'Owner / Director',
    greeting: 'Job-work revenue up 6% this month · top customer Tata Motors · 2 compliance items due.',
    kpis: [
      { label: 'Job-work revenue · Jul', value: '₹38.6 L', sub: '▲ 6.1% vs Jun', tone: 'up' },
      { label: 'Gross profit', value: '₹17.45 L', sub: 'GP 45.2%', tone: 'up' },
      { label: 'Receivables', value: '₹1.42 Cr', sub: 'collection 22 days', tone: '' },
      { label: 'Cash & Bank', value: '₹84.62 L', sub: 'healthy runway', tone: 'up' },
    ],
  },
  supervisor: {
    name: 'Process Supervisor',
    greeting: '6 pending inward · 4 pending outward · 3 jobs overdue for return.',
    kpis: [
      { label: 'Pending inward', value: '6', sub: 'jobs to start', tone: '' },
      { label: 'Pending outward', value: '4', sub: 'ready to dispatch', tone: '' },
      { label: 'Under process', value: '11', sub: 'on the floor', tone: '' },
      { label: 'Overdue return', value: '3', sub: '1-yr rule', tone: 'down' },
    ],
  },
  payroll: {
    name: 'Payroll / HR',
    greeting: '142 mapped on biometric · 138 present today · 4 leave requests · payroll not run.',
    kpis: [
      { label: 'Headcount', value: '142', sub: 'active', tone: '' },
      { label: 'Present today', value: '138', sub: 'biometric', tone: 'up' },
      { label: 'Leave requests', value: '4', sub: 'to approve', tone: '' },
      { label: 'Payroll · Jul', value: 'Not run', sub: 'due 31 Jul', tone: 'down' },
    ],
  },
  accountant: {
    name: 'Accountant',
    greeting: '12 vouchers pending · bank reco 2 unmatched · GSTR-2B mismatch on 7 invoices.',
    kpis: [
      { label: 'Vouchers today', value: '48', sub: 'entered by you', tone: '' },
      { label: 'Pending approval', value: '5', sub: 'awaiting controller', tone: '' },
      { label: 'Bank unmatched', value: '2', sub: 'needs reconciling', tone: 'down' },
      { label: '2B mismatches', value: '7', sub: 'ITC ₹1.12L at risk', tone: 'down' },
    ],
  },
  compliance: {
    name: 'Compliance Officer',
    greeting: 'GSTR-3B due in 4 days · TDS challan pending · 7 GSTR-2B mismatches to resolve.',
    kpis: [
      { label: 'GST liability · Jun', value: '₹9.18 L', sub: 'file by 31 Jul', tone: 'down' },
      { label: 'TDS payable', value: '₹1.84 L', sub: 'deposit by 07 Aug', tone: 'down' },
      { label: 'Returns due', value: '3', sub: 'this month', tone: '' },
      { label: '2B mismatches', value: '7', sub: 'ITC ₹1.12L', tone: 'down' },
    ],
  },
  auditor: {
    name: 'Auditor (read-only)',
    greeting: 'Read-only · 486 vouchers this month · 24 signed approvals · 2 blacklist changes.',
    kpis: [
      { label: 'Vouchers · month', value: '486', sub: 'posted', tone: '' },
      { label: 'Signed approvals', value: '24', sub: 'PIN-signed', tone: 'up' },
      { label: 'Blacklist changes', value: '2', sub: 'audited', tone: '' },
      { label: 'Period locks', value: '1', sub: 'Jun locked', tone: '' },
    ],
  },
};

export const approvals = [
  { who: 'SP', title: 'Vendor payment batch', sub: 'Raised by Suresh P. · maker-checker · 8 bills', amt: '₹9.74L' },
  { who: 'PK', title: 'Payroll run · July', sub: '142 employees · net ₹41.8L · PF/ESI/TDS ok', amt: '₹41.8L' },
  { who: 'PR', title: 'Credit note · ₹1.2L', sub: 'Raised by Priya R. · above ₹1L threshold', amt: '₹1.18L' },
];

export const pendingInward = [
  { t: 'Tata Motors · Gears', m: 'Carburising · recd 27 Jul', qty: '1,000 kg', tag: 'start', tone: 'crit' },
  { t: 'Mahalaxmi · Shafts', m: 'Hardening · recd 26 Jul', qty: '500 kg', tag: 'queued', tone: 'warn' },
  { t: 'Ganesh Auto · Pins', m: 'Annealing', qty: '250 kg', tag: 'queued', tone: 'neut' },
];
export const pendingOutward = [
  { t: 'JW-IN/0044 · Gears', m: 'Carburising done', qty: '400 kg', tag: 'ready', tone: 'ok' },
  { t: 'JW-IN/0039 · Pins', m: 'Annealing done', qty: '60 kg', tag: 'ready', tone: 'ok' },
  { t: 'JW-IN/0051 · Shafts', m: 'overdue · 1-yr rule', qty: '500 kg', tag: 'overdue', tone: 'crit' },
];

/** Catalog of every dashboard widget — used by the Widgets gallery page. */
export interface Widget {
  key: string;
  name: string;
  desc: string;
  group: 'Finance' | 'Compliance' | 'Job Work' | 'Payroll' | 'Audit';
  roles: string[];
  size: 'S' | 'M' | 'L';
  defaultOn?: boolean;
}

export const WIDGETS: Widget[] = [
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
  { key: 'attendance', name: 'Biometric Attendance', desc: 'Today’s device punches, present / leave / OT.', group: 'Payroll', roles: ['payroll'], size: 'M', defaultOn: true },
  { key: 'leave-payroll', name: 'Leave & Payroll', desc: 'Leave approvals + payroll run status.', group: 'Payroll', roles: ['payroll'], size: 'M' },
  { key: 'headcount', name: 'Headcount', desc: 'Active employees, joiners, exits.', group: 'Payroll', roles: ['payroll', 'owner'], size: 'S' },
  { key: 'audit', name: 'Audit Trail', desc: 'Tamper-evident, PIN-signed action log.', group: 'Audit', roles: ['auditor', 'compliance'], size: 'L' },
  { key: 'tds-tcs', name: 'TDS / TCS Register', desc: 'Deductions, challans, return-ready summaries.', group: 'Compliance', roles: ['compliance', 'accountant'], size: 'M' },
];

export const recentVouchers = [
  { no: 'SI/26-27/0482', party: 'Mahalaxmi Traders', type: 'Sales · IRN ✓', status: 'Posted', amount: '₹2,48,600' },
  { no: 'PB/26-27/0311', party: 'Gujarat Poly Pvt Ltd', type: 'Purchase · TDS 194C', status: 'Pending', amount: '₹1,12,000' },
  { no: 'PY/26-27/0208', party: 'HDFC Bank · Vendor Batch', type: 'Payment', status: 'Awaiting You', amount: '₹9,74,250' },
  { no: 'JW/26-27/0044', party: 'Anand Fabrication', type: 'Job Work · Inward', status: 'Reconciled', amount: '₹64,800' },
  { no: 'CN/26-27/0019', party: 'Shree Balaji Enterprises', type: 'Credit Note', status: 'Draft', amount: '₹18,340' },
];

export const compliance = [
  { t: 'GSTR-3B · June', m: 'Net payable ₹6.42L', when: '31 Jul', tag: '4 days', tone: 'crit' },
  { t: 'TDS Challan · 194C', m: 'ITNS 281 · ₹1,84,300', when: '07 Aug', tag: '11 days', tone: 'warn' },
  { t: 'GSTR-1 · July', m: 'B2B 214 · HSN ready', when: '11 Aug', tag: '15 days', tone: 'neut' },
  { t: 'PF ECR + ESI · July', m: '142 employees', when: '15 Aug', tag: 'Ready', tone: 'ok' },
];

export const importEntities = [
  { key: 'ledgers', label: 'Ledgers / parties' },
  { key: 'items', label: 'Items / materials' },
  { key: 'employees', label: 'Employees' },
];

/** A canned validation result so /import shows the per-row grid without a backend. */
export const mockValidation = {
  entity: 'ledgers',
  total: 4,
  valid: 3,
  invalid: 1,
  rows: [
    { rowNo: 2, raw: { Name: 'Mahalaxmi Traders', Category: 'customer' }, errors: [] },
    { rowNo: 3, raw: { Name: 'Furnace Fuel & Gas', Category: 'expense' }, errors: [] },
    { rowNo: 4, raw: { Name: 'Tata Motors Ltd', Category: 'customer' }, errors: [] },
    { rowNo: 5, raw: { Name: '', Category: 'customerr' }, errors: [
      { field: 'name', message: 'Name is required' },
      { field: 'category', message: 'Invalid category' },
    ] },
  ],
};
