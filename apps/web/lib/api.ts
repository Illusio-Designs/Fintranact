/**
 * API client for @fintranact/api. The app is backend-driven: every screen reads
 * and writes live data. Set NEXT_PUBLIC_API_URL to point at the API (defaults to
 * same-origin/proxy). Data starts empty on a fresh install and accrues through use.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

function token(): string {
  return typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') ?? '' : '';
}
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API}/api/v1${path}`, { headers: authHeaders() });
    if (!res.ok) return fallback;
    const body = await res.json();
    return (body?.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

async function sendJson<T>(method: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.[0]?.message ?? 'Request failed');
  return json.data as T;
}

// ---- Auth ----
export interface Session { userId?: string; companyId: string; branchId?: string; roles: string[]; permissions?: string[] }

export async function login(email: string, password: string): Promise<{ accessToken: string; session: Session }> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Login failed');
  return body.data;
}

// ---- Import ----
export async function listImportEntities(): Promise<{ key: string; label: string }[]> {
  return getJson('/import/entities', []);
}
export interface ImportRow { rowNo: number; raw: Record<string, unknown>; errors: { field?: string; message: string }[] }
export interface ImportValidation { entity: string; total: number; valid: number; invalid: number; rows: ImportRow[] }
export async function validateImport(entity: string, file: File): Promise<ImportValidation> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API}/api/v1/import/${entity}/validate`, { method: 'POST', headers: authHeaders(), body: fd });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Validation failed');
  return body.data;
}
export async function commitImport(entity: string, file: File, financialYear: string): Promise<{ inserted: number; skipped: number }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('financialYear', financialYear);
  const res = await fetch(`${API}/api/v1/import/${entity}/commit`, { method: 'POST', headers: authHeaders(), body: fd });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Import failed');
  return body.data;
}

// ---- Accounting: ledgers & vouchers ----
export interface Ledger { id: string; name: string; category?: string }
export interface VoucherRow { id: string; voucherNo: string; type: string; date?: string; narration?: string; amount?: number | string; party?: string; status?: string }

export async function listLedgers(): Promise<Ledger[]> { return getJson('/ledgers', []); }
export async function listVouchers(): Promise<VoucherRow[]> {
  const rows = await getJson<Record<string, unknown>[]>('/vouchers', []);
  return rows.map((v) => ({ id: String(v.id), voucherNo: String(v.voucher_no ?? v.voucherNo ?? ''), type: String(v.type ?? ''), date: v.date as string, narration: v.narration as string, status: v.status as string }));
}

export interface SalesInvoiceInput { partyLedgerId: string; placeOfSupply: 'intra' | 'inter'; date: string; narration?: string; items: { salesLedgerId: string; taxable: number; gstRate: number }[] }
export interface PurchaseInvoiceInput { partyLedgerId: string; placeOfSupply: 'intra' | 'inter'; date: string; narration?: string; tdsRate?: number; items: { purchaseLedgerId: string; taxable: number; gstRate: number }[] }

export async function createSalesInvoice(input: SalesInvoiceInput): Promise<{ voucherNo: string; total: number }> {
  return sendJson('POST', '/invoices/sales', input);
}
export async function createPurchaseInvoice(input: PurchaseInvoiceInput): Promise<{ voucherNo: string; total: number }> {
  return sendJson('POST', '/invoices/purchase', input);
}

export type VoucherComposeInput =
  | { kind: 'payment'; bankLedgerId: string; partyLedgerId: string; amount: number; tdsRate?: number; date: string; narration?: string }
  | { kind: 'receipt'; bankLedgerId: string; partyLedgerId: string; amount: number; date: string; narration?: string }
  | { kind: 'contra'; fromLedgerId: string; toLedgerId: string; amount: number; date: string; narration?: string }
  | { kind: 'journal'; debitLedgerId: string; creditLedgerId: string; amount: number; date: string; narration?: string }
  | { kind: 'credit_note'; partyLedgerId: string; salesLedgerId: string; placeOfSupply: 'intra' | 'inter'; taxable: number; gstRate: number; date: string; narration?: string }
  | { kind: 'debit_note'; partyLedgerId: string; purchaseLedgerId: string; placeOfSupply: 'intra' | 'inter'; taxable: number; gstRate: number; date: string; narration?: string };

export async function composeVoucher(input: VoucherComposeInput): Promise<{ voucherNo: string; type: string; total: number }> {
  return sendJson('POST', '/vouchers/compose', input);
}

// ---- Reports ----
export interface TrialBalanceRow { ledgerId: string; name: string; category: string | null; debit: number; credit: number }
export interface TrialBalance { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; balanced: boolean }
export async function getTrialBalance(): Promise<TrialBalance> {
  return getJson('/reports/trial-balance', { rows: [], totalDebit: 0, totalCredit: 0, balanced: true });
}

export interface DayBookEntry { voucherId: string; voucherNo: string; type: string; date: string; narration: string | null; debit: number; credit: number; particulars: string }
export interface DayBook { date: string; entries: DayBookEntry[]; totalDebit: number; totalCredit: number }
export async function getDayBook(date: string): Promise<DayBook> {
  return getJson(`/reports/day-book?date=${encodeURIComponent(date)}`, { date, entries: [], totalDebit: 0, totalCredit: 0 });
}

export interface PnlRow { name: string; amount: number }
export interface Pnl { income: PnlRow[]; directExpense: PnlRow[]; indirectExpense: PnlRow[]; totalIncome: number; totalDirect: number; totalIndirect: number; grossProfit: number; netProfit: number }
export async function getPnl(): Promise<Pnl> {
  return getJson('/reports/pnl', { income: [], directExpense: [], indirectExpense: [], totalIncome: 0, totalDirect: 0, totalIndirect: 0, grossProfit: 0, netProfit: 0 });
}

export interface BsRow { name: string; amount: number }
export interface BalanceSheet { assets: BsRow[]; liabilities: BsRow[]; equity: BsRow[]; totalAssets: number; totalLiabilities: number; totalEquity: number; totalLiabEquity: number; netProfit: number; balanced: boolean }
export async function getBalanceSheet(): Promise<BalanceSheet> {
  return getJson('/reports/balance-sheet', { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0, totalLiabEquity: 0, netProfit: 0, balanced: true });
}

export interface AgeingRow { party: string; total: number; b0: number; b30: number; b60: number; b90: number }
export interface Ageing { rows: AgeingRow[]; totals: { total: number; b0: number; b30: number; b60: number; b90: number } }
export async function getAgeing(kind: 'receivable' | 'payable'): Promise<Ageing> {
  return getJson(`/reports/ageing?kind=${kind}`, { rows: [], totals: { total: 0, b0: 0, b30: 0, b60: 0, b90: 0 } });
}

// ---- GST ----
export interface TaxTriplet { taxable: number; igst: number; cgst: number; sgst: number }
export interface Gstr3b { outward: TaxTriplet; itc: { igst: number; cgst: number; sgst: number }; netPayable: { igst: number; cgst: number; sgst: number; total: number } }
export interface Gstr1Rate { rate: number; taxable: number; igst: number; cgst: number; sgst: number }
export interface Gstr1 { invoices: number; outward: TaxTriplet; totalTax: number; totalValue: number; b2b: Gstr1Rate[]; b2c: Gstr1Rate[] }
export async function getGstr3b(): Promise<Gstr3b> {
  return getJson('/gst/gstr-3b', { outward: { taxable: 0, igst: 0, cgst: 0, sgst: 0 }, itc: { igst: 0, cgst: 0, sgst: 0 }, netPayable: { igst: 0, cgst: 0, sgst: 0, total: 0 } });
}
export async function getGstr1(): Promise<Gstr1> {
  const d = await getJson<Partial<Gstr1>>('/gst/gstr-1', {});
  return { invoices: d.invoices ?? 0, outward: d.outward ?? { taxable: 0, igst: 0, cgst: 0, sgst: 0 }, totalTax: d.totalTax ?? 0, totalValue: d.totalValue ?? 0, b2b: d.b2b ?? [], b2c: d.b2c ?? [] };
}

export type Recon2bStatus = 'matched' | 'mismatch' | 'only_books' | 'only_2b';
export interface Recon2bRow { supplier: string; gstin: string; invoiceNo: string; date: string; booksItc: number; portalItc: number; status: Recon2bStatus }
export interface Gstr2b { rows: Recon2bRow[]; matched: number; mismatch: number; onlyBooks: number; only2b: number; booksTotal: number; portalTotal: number }
export async function getGstr2b(): Promise<Gstr2b> {
  // Books side comes from the API; the portal 2B pull is a separate GSTN job.
  const rows = await getJson<Recon2bRow[]>('/gst/gstr-2b/books', []);
  const by = (s: Recon2bStatus) => rows.filter((r) => r.status === s).length;
  return { rows, matched: by('matched'), mismatch: by('mismatch'), onlyBooks: by('only_books'), only2b: by('only_2b'), booksTotal: rows.reduce((s, r) => s + (r.booksItc || 0), 0), portalTotal: rows.reduce((s, r) => s + (r.portalItc || 0), 0) };
}

export interface EInvoiceRow { voucherId?: string; invoiceNo: string; party: string; date: string; value: number; irn: string | null; ack: string | null; status: 'generated' | 'pending' | 'cancelled' }
export interface EWayRow { ewbNo: string | null; invoiceNo: string; party: string; from: string; to: string; distance: number; value: number; validTill: string | null; status: 'active' | 'pending' | 'expired' }
export async function getEInvoices(): Promise<EInvoiceRow[]> { return getJson('/gst/e-invoice', []); }
export async function getEWayBills(): Promise<EWayRow[]> { return getJson('/gst/e-way', []); }

// ---- Integrations: e-Invoice IRN, e-Way Bill, WhatsApp ----
export interface EInvoiceResult { invoiceNo: string; party: string; date: string; value: number; irn: string; ack: string; ackDate: string; signedQr: string; status: 'generated' }
export async function generateEInvoice(voucherId: string): Promise<EInvoiceResult> {
  return sendJson('POST', '/gst/e-invoice/generate', { voucherId });
}
export interface EwayGenInput { voucherId?: string; invoiceNo: string; party: string; from: string; to: string; distance: number; value: number; vehicleNo?: string; transportMode?: string }
export async function generateEway(input: EwayGenInput): Promise<EWayRow> {
  return sendJson('POST', '/gst/e-way/generate', input);
}
export interface WhatsAppSendInput { to: string; toName?: string; kind?: string; body: string; docUrl?: string }
export async function sendWhatsApp(input: WhatsAppSendInput): Promise<{ id: string; to: string; status: string; provider: string; providerMsgId: string | null }> {
  return sendJson('POST', '/whatsapp/send', input);
}
export interface WhatsAppMsg { id: string; toPhone: string; toName: string | null; kind: string; body: string; status: string; provider: string; createdAt: string }
export async function listWhatsApp(): Promise<WhatsAppMsg[]> { return getJson('/whatsapp/messages', []); }
export async function getIntegrationsStatus(): Promise<{ einvoice: string; eway: string; whatsapp: string }> {
  return getJson('/integrations/status', { einvoice: 'sandbox', eway: 'sandbox', whatsapp: 'sandbox' });
}

// ---- TDS ----
export interface TdsChallan { section: string; description: string; deductees: number; amount: number; challanNo: string | null; bsr: string | null; paidOn: string | null; dueOn: string; status: 'paid' | 'due' }
export interface TdsChallans { rows: TdsChallan[]; totalDeducted: number; totalPaid: number; totalDue: number }
export async function getTdsChallans(): Promise<TdsChallans> {
  return getJson('/tds/challans', { rows: [], totalDeducted: 0, totalPaid: 0, totalDue: 0 });
}
export interface TdsDeductee { name: string; pan: string; section: string; paid: number; rate: number; tds: number; date: string; challan: string | null }
export interface TdsReturn { form: string; quarter: string; rows: TdsDeductee[]; totalPaid: number; totalTds: number }
export async function getTdsReturn(): Promise<TdsReturn> {
  return getJson('/tds/returns', { form: '26Q', quarter: 'Q1 FY 2026-27', rows: [], totalPaid: 0, totalTds: 0 });
}

// ---- TCS ----
export interface TcsRow { party: string; pan: string; section: string; sale: number; rate: number; tcs: number; date: string; challan: string | null }
export interface TcsData { rows: TcsRow[]; totalSale: number; totalTcs: number; totalCollected: number; totalDue: number }
export async function getTcs(): Promise<TcsData> {
  return getJson('/tcs', { rows: [], totalSale: 0, totalTcs: 0, totalCollected: 0, totalDue: 0 });
}

// ---- Job work ----
export interface InwardPending { id: string; challanNo: string; customer: string; process: string; material: string; qtyRecd: number; dispatched: number; loss: number; pending: number; uom: string; date: string; status: 'open' | 'partial' | 'closed' }
export async function getJobworkPending(): Promise<InwardPending[]> { return getJson('/jobwork/pending', []); }
export interface Itc04Summary { inwardChallans: number; outwardChallans: number; qtyReceived: number; qtyReturned: number; qtyPending: number }
export async function getItc04(): Promise<Itc04Summary> {
  return getJson('/jobwork/itc04', { inwardChallans: 0, outwardChallans: 0, qtyReceived: 0, qtyReturned: 0, qtyPending: 0 });
}
export interface LienCase { customer: string; overdue: number; ageingDays: number; material: string; qty: string; assessed: number; expectedSale: number; status: 'notice' | 'held' | 'recovered' }
export async function getLienCases(): Promise<LienCase[]> { return getJson('/jobwork/lien', []); }

// ---- Payroll ----
export interface PayslipRow { name: string; designation: string; basic: number; hra: number; allowances: number; gross: number; pf: number; esi: number; pt: number; tds: number; deductions: number; net: number }
export interface PayrollRun { month: string; rows: PayslipRow[]; gross: number; totalDeductions: number; net: number; statutory: { pfEmployee: number; pfEmployer: number; esiEmployee: number; esiEmployer: number; pt: number; tds: number } }
export async function getPayrollRun(month: string): Promise<PayrollRun> {
  return getJson(`/payroll/run?month=${encodeURIComponent(month)}`, { month, rows: [], gross: 0, totalDeductions: 0, net: 0, statutory: { pfEmployee: 0, pfEmployer: 0, esiEmployee: 0, esiEmployer: 0, pt: 0, tds: 0 } });
}
export interface Form16Row { name: string; pan: string; grossAnnual: number; stdDeduction: number; ptDeduction: number; ded80C: number; taxableIncome: number; tax: number; tds: number }
export async function getForm16(): Promise<Form16Row[]> { return getJson('/payroll/form16', []); }

// ---- Masters ----
export interface ProcessMaster { code: string; name: string; sac: string; uom: string; turnaround: string; active: boolean }
export interface RateMaster { process: string; customer: string; rate: number; effective: string }
export async function getProcessMasters(): Promise<ProcessMaster[]> { return getJson('/masters/process', []); }
export async function addProcessMaster(input: { code: string; name: string; sac: string; uom: string }): Promise<ProcessMaster> {
  return sendJson('POST', '/masters/process', input);
}
export async function getRateMasters(): Promise<RateMaster[]> { return getJson('/masters/rate', []); }
export async function addRateMaster(input: { process: string; customer: string; rate: number; effective?: string }): Promise<RateMaster> {
  return sendJson('POST', '/masters/rate', input);
}

// ---- Documents / compliance / audit ----
export interface DocRow { name: string; type: string; category: string; linkedTo: string | null; size: string; uploadedBy: string; date: string }
export async function getDocuments(): Promise<DocRow[]> { return getJson('/documents', []); }
export interface ComplianceItem { form: string; period: string; due: string; days: number; amount: number | null; kind: 'gst' | 'tds' | 'tcs' | 'pf' | 'roc'; status: 'due' | 'filed' | 'overdue' }
export async function getCompliance(): Promise<ComplianceItem[]> { return getJson('/compliance', []); }
export interface AuditRow { time: string; actor: string; action: string; entity: string; entityId: string; ip: string }
export async function getAuditTrail(): Promise<AuditRow[]> { return getJson('/audit', []); }

// ---- Period locks ----
export interface PeriodLock { period: string; note: string | null; lockedAt: string; lockedBy: string | null }
export async function listPeriodLocks(): Promise<PeriodLock[]> { return getJson('/periods', []); }
export async function lockPeriod(period: string, note: string): Promise<void> { await sendJson('POST', '/periods/lock', { period, note }); }
export async function unlockPeriod(period: string): Promise<void> { await sendJson('POST', '/periods/unlock', { period }); }

// ---- Dashboard / widgets / roles / notifications ----
export interface Kpi { label: string; value: string; sub: string; tone?: 'up' | 'down' | '' }
export interface Dashboard { role: string; name: string; greeting: string; kpis: Kpi[]; recentVouchers: { no: string; type: string; status: string; narration?: string }[]; compliance: { t: string; m: string; when: string; days: number }[]; approvals: unknown[]; pendingInward: unknown[]; pendingOutward: unknown[] }
export async function getDashboard(role: string): Promise<Dashboard> {
  return getJson(`/dashboard?role=${encodeURIComponent(role)}`, { role, name: '', greeting: '', kpis: [], recentVouchers: [], compliance: [], approvals: [], pendingInward: [], pendingOutward: [] });
}
export interface Widget { key: string; name: string; desc: string; group: 'Finance' | 'Compliance' | 'Job Work' | 'Payroll' | 'Audit'; roles: string[]; size: 'S' | 'M' | 'L'; defaultOn?: boolean }
export async function getWidgets(): Promise<Widget[]> { return getJson('/widgets', []); }
export async function getRoleList(): Promise<{ key: string; name: string }[]> { return getJson('/config/roles', []); }
export type Notif = { id: number | string; kind: 'crit' | 'warn' | 'ok' | 'info'; cat: 'task' | 'alert'; day: string; time: string; title: string; body: string; chips: string[]; read: boolean };
export async function getNotifications(): Promise<Notif[]> { return getJson('/notifications', []); }

// ---- Settings: numbering, company, voucher PDF ----
export interface NumberingSeries { voucherType: string; label: string; prefix: string; nextNo: number; width: number }
const SERIES_LABEL: Record<string, string> = {
  payment: 'Payment', receipt: 'Receipt', contra: 'Contra', journal: 'Journal',
  sales: 'Sales Invoice', purchase: 'Purchase Bill', credit_note: 'Credit Note', debit_note: 'Debit Note',
  eway: 'E-Way Bill (internal ref)', einvoice: 'E-Invoice (internal ref)',
  jobwork_inward: 'Job Work — Inward', jobwork_outward: 'Job Work — Outward', lien: 'Lien / Forfeiture', payroll: 'Payroll Run',
};
const labelFor = (t: string): string => SERIES_LABEL[t] ?? t;

export async function getNumberingSeries(): Promise<NumberingSeries[]> {
  const rows = await getJson<NumberingSeries[]>('/settings/numbering', []);
  return rows.map((s) => ({ ...s, label: labelFor(s.voucherType) }));
}
export async function updateNumberingSeries(voucherType: string, patch: { prefix?: string; nextNo?: number; width?: number }): Promise<NumberingSeries> {
  const d = await sendJson<NumberingSeries>('PATCH', `/settings/numbering/${voucherType}`, patch);
  return { ...d, label: labelFor(voucherType) };
}

export interface CompanyProfile {
  name: string; legalName?: string; pan?: string; gstin?: string; tan?: string; cin?: string;
  gstRegType?: string; ptRegn?: string; pfRegn?: string; esiRegn?: string;
  address?: string; city?: string; stateCode?: string; pincode?: string; autoEinvoiceService?: boolean;
}
export async function getCompanyProfile(): Promise<CompanyProfile> {
  const d = await getJson<Record<string, string>>('/settings/company', {} as Record<string, string>);
  return { name: d.name ?? '', legalName: d.legal_name, pan: d.pan, gstin: d.gstin, tan: d.tan, cin: d.cin, gstRegType: d.gst_reg_type, ptRegn: d.pt_regn, pfRegn: d.pf_regn, esiRegn: d.esi_regn, address: d.address, city: d.city, stateCode: d.state_code, pincode: d.pincode, autoEinvoiceService: !!Number(d.auto_einvoice_service) };
}

/** URL to a voucher's server-rendered PDF. */
export function voucherPdfUrl(id: string): string { return `${API}/api/v1/vouchers/${id}/pdf`; }

// ---- Leave applications ----
export interface LeaveRequest { id: string; employeeName: string; type: 'casual' | 'sick' | 'earned' | 'unpaid'; fromDate: string; toDate: string; days: number; reason: string | null; status: 'pending' | 'approved' | 'rejected'; approver: string | null; createdAt: string }
export async function getLeave(): Promise<LeaveRequest[]> { return getJson('/leave', []); }
export async function applyLeave(input: { employeeName: string; type: string; fromDate: string; toDate: string; reason?: string }): Promise<LeaveRequest> {
  return sendJson('POST', '/leave', input);
}
export async function decideLeave(id: string, decision: 'approved' | 'rejected', approver?: string): Promise<{ id: string; status: string }> {
  return sendJson('PATCH', `/leave/${id}/decision`, { decision, approver });
}

// ---- Company bank accounts (voucher printing) ----
export interface BankAccount { id: string; bankName: string; accountNo: string; ifsc: string | null; branch: string | null; upi: string | null; printDefault: boolean }
export async function getBankAccounts(): Promise<BankAccount[]> { return getJson('/settings/banks', []); }
export async function addBankAccount(input: { bankName: string; accountNo: string; ifsc?: string; branch?: string; upi?: string }): Promise<BankAccount> {
  return sendJson('POST', '/settings/banks', input);
}
export async function setPrintBank(id: string): Promise<BankAccount[]> { return sendJson('PATCH', `/settings/banks/${id}/print`, {}); }
export async function updateCompanySettings(patch: { autoEinvoiceService?: boolean }): Promise<CompanyProfile> {
  const d = await sendJson<Record<string, string>>('PATCH', '/settings/company', patch);
  return { name: d.name ?? '', legalName: d.legal_name, pan: d.pan, gstin: d.gstin, tan: d.tan, gstRegType: d.gst_reg_type, address: d.address, city: d.city, stateCode: d.state_code, pincode: d.pincode };
}
