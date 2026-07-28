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
