/**
 * Thin API client. In mock mode (default) it returns canned data so the app
 * displays on Vercel with no backend. Set NEXT_PUBLIC_USE_MOCK=false and
 * NEXT_PUBLIC_API_URL to talk to the real @fintranact/api.
 */
import { importEntities, mockValidation, recentVouchers } from './mock';

export const MOCK = (process.env.NEXT_PUBLIC_USE_MOCK ?? 'true') !== 'false';
const API = process.env.NEXT_PUBLIC_API_URL ?? '';

function token(): string {
  return typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') ?? '' : '';
}

export interface Session {
  roles: string[];
  companyId: string;
}

export async function login(email: string, _password: string): Promise<{ accessToken: string; session: Session }> {
  if (MOCK) {
    return { accessToken: 'mock-token', session: { roles: ['controller'], companyId: 'demo' } };
  }
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: _password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Login failed');
  return body.data;
}

export async function listImportEntities(): Promise<{ key: string; label: string }[]> {
  if (MOCK) return importEntities;
  const res = await fetch(`${API}/api/v1/import/entities`, { headers: { Authorization: `Bearer ${token()}` } });
  return (await res.json()).data ?? [];
}

export async function validateImport(entity: string, file: File): Promise<typeof mockValidation> {
  if (MOCK) return { ...mockValidation, entity };
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API}/api/v1/import/${entity}/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}` },
    body: fd,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Validation failed');
  return body.data;
}

// ---- Accounting: ledgers, vouchers, invoice composers ----

export interface Ledger { id: string; name: string; category?: string }
export interface VoucherRow { id: string; voucherNo: string; type: string; date?: string; narration?: string; amount?: number | string; party?: string; status?: string }

const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

export async function listLedgers(): Promise<Ledger[]> {
  if (MOCK) {
    return [
      { id: 'l-mahalaxmi', name: 'Mahalaxmi Traders', category: 'customer' },
      { id: 'l-gujpoly', name: 'Gujarat Poly Pvt Ltd', category: 'supplier' },
      { id: 'l-jobwork', name: 'Job Work / Process Charges', category: 'income' },
      { id: 'l-material', name: 'Purchases / Material', category: 'expense' },
    ];
  }
  const res = await fetch(`${API}/api/v1/ledgers`, { headers: authHeaders() });
  return (await res.json()).data ?? [];
}

export async function listVouchers(): Promise<VoucherRow[]> {
  if (MOCK) {
    return recentVouchers.map((v, i) => ({
      id: String(i + 1), voucherNo: v.no, type: v.type, date: '27 Jul 2026', party: v.party, amount: v.amount, status: v.status,
    }));
  }
  const res = await fetch(`${API}/api/v1/vouchers`, { headers: authHeaders() });
  return (await res.json()).data ?? [];
}

export interface SalesInvoiceInput { partyLedgerId: string; placeOfSupply: 'intra' | 'inter'; date: string; narration?: string; items: { salesLedgerId: string; taxable: number; gstRate: number }[] }
export interface PurchaseInvoiceInput { partyLedgerId: string; placeOfSupply: 'intra' | 'inter'; date: string; narration?: string; tdsRate?: number; items: { purchaseLedgerId: string; taxable: number; gstRate: number }[] }

async function postInvoice(path: string, body: unknown): Promise<{ voucherNo: string; total: number }> {
  const res = await fetch(`${API}/api/v1/invoices/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.[0]?.message ?? 'Post failed');
  return json.data;
}

export async function createSalesInvoice(input: SalesInvoiceInput): Promise<{ voucherNo: string; total: number }> {
  if (MOCK) { const total = input.items.reduce((s, it) => s + it.taxable * (1 + it.gstRate / 100), 0); return { voucherNo: 'SI/26-27/0484', total: Math.round(total) }; }
  return postInvoice('sales', input);
}

export async function createPurchaseInvoice(input: PurchaseInvoiceInput): Promise<{ voucherNo: string; total: number }> {
  if (MOCK) { const total = input.items.reduce((s, it) => s + it.taxable * (1 + it.gstRate / 100), 0); return { voucherNo: 'PB/26-27/0313', total: Math.round(total) }; }
  return postInvoice('purchase', input);
}

/** Unified composer for payment / receipt / contra / journal / credit-note / debit-note. */
export type VoucherComposeInput =
  | { kind: 'payment'; bankLedgerId: string; partyLedgerId: string; amount: number; tdsRate?: number; date: string; narration?: string }
  | { kind: 'receipt'; bankLedgerId: string; partyLedgerId: string; amount: number; date: string; narration?: string }
  | { kind: 'contra'; fromLedgerId: string; toLedgerId: string; amount: number; date: string; narration?: string }
  | { kind: 'journal'; debitLedgerId: string; creditLedgerId: string; amount: number; date: string; narration?: string }
  | { kind: 'credit_note'; partyLedgerId: string; salesLedgerId: string; placeOfSupply: 'intra' | 'inter'; taxable: number; gstRate: number; date: string; narration?: string }
  | { kind: 'debit_note'; partyLedgerId: string; purchaseLedgerId: string; placeOfSupply: 'intra' | 'inter'; taxable: number; gstRate: number; date: string; narration?: string };

const SERIES: Record<string, string> = { payment: 'PMT/26-27/0210', receipt: 'RCP/26-27/0342', contra: 'CTR/26-27/0068', journal: 'JV/26-27/0129', credit_note: 'CN/26-27/0021', debit_note: 'DN/26-27/0013' };

export async function composeVoucher(input: VoucherComposeInput): Promise<{ voucherNo: string; type: string; total: number }> {
  if (MOCK) {
    const total = 'amount' in input ? input.amount : Math.round((input.taxable ?? 0) * (1 + (input.gstRate ?? 0) / 100));
    return { voucherNo: SERIES[input.kind] ?? 'VCH/26-27/0001', type: input.kind, total };
  }
  const res = await fetch(`${API}/api/v1/vouchers/compose`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.[0]?.message ?? 'Post failed');
  return json.data;
}

export interface TrialBalanceRow { ledgerId: string; name: string; category: string | null; debit: number; credit: number }
export interface TrialBalance { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; balanced: boolean }

export async function getTrialBalance(): Promise<TrialBalance> {
  if (MOCK) {
    const rows: TrialBalanceRow[] = [
      { ledgerId: 'l1', name: 'HDFC Bank — Current', category: 'bank', debit: 4186220, credit: 0 },
      { ledgerId: 'l2', name: 'Cash in Hand', category: 'cash', debit: 184300, credit: 0 },
      { ledgerId: 'l3', name: 'Sundry Debtors', category: 'customer', debit: 14200000, credit: 0 },
      { ledgerId: 'l4', name: 'Plant & Machinery', category: 'asset', debit: 8600000, credit: 0 },
      { ledgerId: 'l5', name: 'Sundry Creditors', category: 'supplier', debit: 0, credit: 3860000 },
      { ledgerId: 'l6', name: 'Output CGST', category: 'tax', debit: 0, credit: 459000 },
      { ledgerId: 'l7', name: 'Output SGST', category: 'tax', debit: 0, credit: 459000 },
      { ledgerId: 'l8', name: 'TDS Payable', category: 'liability', debit: 0, credit: 184300 },
      { ledgerId: 'l9', name: 'Job Work / Process Charges', category: 'income', debit: 0, credit: 21500000 },
      { ledgerId: 'l10', name: 'Furnace Fuel & Gas', category: 'expense', debit: 3860000, credit: 0 },
      { ledgerId: 'l11', name: 'Salaries & Wages', category: 'expense', debit: 5210000, credit: 0 },
      { ledgerId: 'l12', name: 'Capital Account', category: 'equity', debit: 0, credit: 9778220 },
    ];
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
  }
  const res = await fetch(`${API}/api/v1/reports/trial-balance`, { headers: authHeaders() });
  return (await res.json()).data ?? { rows: [], totalDebit: 0, totalCredit: 0, balanced: true };
}

export interface DayBookEntry { voucherId: string; voucherNo: string; type: string; date: string; narration: string | null; debit: number; credit: number; particulars: string }
export interface DayBook { date: string; entries: DayBookEntry[]; totalDebit: number; totalCredit: number }

export async function getDayBook(date: string): Promise<DayBook> {
  if (MOCK) {
    const entries: DayBookEntry[] = [
      { voucherId: '1', voucherNo: 'SI/26-27/0482', type: 'sales', date, narration: 'Heat treatment — Mahalaxmi', debit: 248600, credit: 248600, particulars: 'Mahalaxmi Traders, Job Work Charges, Output CGST, Output SGST' },
      { voucherId: '2', voucherNo: 'RCP/26-27/0341', type: 'receipt', date, narration: 'Against SI/0461', debit: 104200, credit: 104200, particulars: 'HDFC Bank, Shree Balaji Enterprises' },
      { voucherId: '3', voucherNo: 'PB/26-27/0311', type: 'purchase', date, narration: 'HDPE granules', debit: 112000, credit: 112000, particulars: 'Gujarat Poly Pvt Ltd, Purchases, Input CGST, Input SGST' },
      { voucherId: '4', voucherNo: 'PMT/26-27/0209', type: 'payment', date, narration: 'Furnace LPG', debit: 86400, credit: 86400, particulars: 'HDFC Bank, Furnace Fuel & Gas' },
      { voucherId: '5', voucherNo: 'JW/26-27/0052', type: 'journal', date, narration: 'Depreciation — July', debit: 41200, credit: 41200, particulars: 'Depreciation, Accumulated Depreciation' },
    ];
    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
    return { date, entries, totalDebit, totalCredit };
  }
  const res = await fetch(`${API}/api/v1/reports/day-book?date=${encodeURIComponent(date)}`, { headers: authHeaders() });
  return (await res.json()).data ?? { date, entries: [], totalDebit: 0, totalCredit: 0 };
}

export interface PnlRow { name: string; amount: number }
export interface Pnl { income: PnlRow[]; directExpense: PnlRow[]; indirectExpense: PnlRow[]; totalIncome: number; totalDirect: number; totalIndirect: number; grossProfit: number; netProfit: number }

export async function getPnl(): Promise<Pnl> {
  if (MOCK) {
    const income: PnlRow[] = [{ name: 'Job Work / Process Charges', amount: 21500000 }, { name: 'Scrap & Recovered Goods', amount: 480000 }];
    const directExpense: PnlRow[] = [{ name: 'Furnace Fuel & Gas', amount: 3860000 }, { name: 'Consumables & Chemicals', amount: 1240000 }, { name: 'Power & Electricity', amount: 2180000 }];
    const indirectExpense: PnlRow[] = [{ name: 'Salaries & Wages', amount: 5210000 }, { name: 'Rent — Factory Shed', amount: 720000 }, { name: 'Depreciation', amount: 1360000 }, { name: 'Freight Outward', amount: 410000 }];
    const totalIncome = income.reduce((s, r) => s + r.amount, 0);
    const totalDirect = directExpense.reduce((s, r) => s + r.amount, 0);
    const totalIndirect = indirectExpense.reduce((s, r) => s + r.amount, 0);
    const grossProfit = totalIncome - totalDirect;
    const netProfit = grossProfit - totalIndirect;
    return { income, directExpense, indirectExpense, totalIncome, totalDirect, totalIndirect, grossProfit, netProfit };
  }
  const res = await fetch(`${API}/api/v1/reports/pnl`, { headers: authHeaders() });
  return (await res.json()).data ?? { income: [], directExpense: [], indirectExpense: [], totalIncome: 0, totalDirect: 0, totalIndirect: 0, grossProfit: 0, netProfit: 0 };
}

export interface BsRow { name: string; amount: number }
export interface BalanceSheet { assets: BsRow[]; liabilities: BsRow[]; equity: BsRow[]; totalAssets: number; totalLiabilities: number; totalEquity: number; totalLiabEquity: number; netProfit: number; balanced: boolean }

export async function getBalanceSheet(): Promise<BalanceSheet> {
  if (MOCK) {
    const assets: BsRow[] = [
      { name: 'Plant & Machinery', amount: 8600000 },
      { name: 'Sundry Debtors', amount: 14200000 },
      { name: 'HDFC Bank — Current', amount: 4186220 },
      { name: 'Cash in Hand', amount: 184300 },
    ];
    const liabilities: BsRow[] = [
      { name: 'Sundry Creditors', amount: 3860000 },
      { name: 'Output CGST', amount: 459000 },
      { name: 'Output SGST', amount: 459000 },
      { name: 'TDS Payable', amount: 184300 },
    ];
    const equity: BsRow[] = [
      { name: 'Capital Account', amount: 15208220 },
      { name: 'Profit for the period', amount: 7000000 },
    ];
    const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
    const totalEquity = equity.reduce((s, r) => s + r.amount, 0);
    const totalLiabEquity = totalLiabilities + totalEquity;
    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, totalLiabEquity, netProfit: 7000000, balanced: totalAssets === totalLiabEquity };
  }
  const res = await fetch(`${API}/api/v1/reports/balance-sheet`, { headers: authHeaders() });
  return (await res.json()).data ?? { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0, totalLiabEquity: 0, netProfit: 0, balanced: true };
}

// ---- GST returns ----
export interface TaxTriplet { taxable: number; igst: number; cgst: number; sgst: number }
export interface Gstr3b { outward: TaxTriplet; itc: { igst: number; cgst: number; sgst: number }; netPayable: { igst: number; cgst: number; sgst: number; total: number } }
export interface Gstr1Rate { rate: number; taxable: number; igst: number; cgst: number; sgst: number }
export interface Gstr1 { invoices: number; outward: TaxTriplet; totalTax: number; totalValue: number; b2b: Gstr1Rate[]; b2c: Gstr1Rate[] }

export async function getGstr3b(): Promise<Gstr3b> {
  if (MOCK) {
    return {
      outward: { taxable: 21500000, igst: 1290000, cgst: 459000, sgst: 459000 },
      itc: { igst: 246000, cgst: 187000, sgst: 187000 },
      netPayable: { igst: 1044000, cgst: 272000, sgst: 272000, total: 1588000 },
    };
  }
  const res = await fetch(`${API}/api/v1/gst/gstr-3b`, { headers: authHeaders() });
  return (await res.json()).data;
}

export async function getGstr1(): Promise<Gstr1> {
  if (MOCK) {
    const b2b: Gstr1Rate[] = [
      { rate: 18, taxable: 14200000, igst: 1290000, cgst: 306000, sgst: 306000 },
      { rate: 12, taxable: 2550000, igst: 0, cgst: 153000, sgst: 153000 },
    ];
    const b2c: Gstr1Rate[] = [{ rate: 18, taxable: 4750000, igst: 0, cgst: 0, sgst: 0 }];
    const outward = { taxable: 21500000, igst: 1290000, cgst: 459000, sgst: 459000 };
    const totalTax = outward.igst + outward.cgst + outward.sgst;
    return { invoices: 214, outward, totalTax, totalValue: outward.taxable + totalTax, b2b, b2c };
  }
  const res = await fetch(`${API}/api/v1/gst/gstr-1`, { headers: authHeaders() });
  const d = (await res.json()).data;
  return { ...d, b2b: [], b2c: [] };
}

export type Recon2bStatus = 'matched' | 'mismatch' | 'only_books' | 'only_2b';
export interface Recon2bRow { supplier: string; gstin: string; invoiceNo: string; date: string; booksItc: number; portalItc: number; status: Recon2bStatus }
export interface Gstr2b { rows: Recon2bRow[]; matched: number; mismatch: number; onlyBooks: number; only2b: number; booksTotal: number; portalTotal: number }

export async function getGstr2b(): Promise<Gstr2b> {
  const rows: Recon2bRow[] = [
    { supplier: 'Precision Heat Treaters', gstin: '27AABCP…5T1', invoiceNo: 'PHT/2411', date: '12 Jun 2026', booksItc: 11700, portalItc: 11700, status: 'matched' },
    { supplier: 'Gujarat Poly Pvt Ltd', gstin: '24AAGCG…2P3', invoiceNo: 'GP/8821', date: '15 Jun 2026', booksItc: 20160, portalItc: 20160, status: 'matched' },
    { supplier: 'Aarav Metals', gstin: '24AAECA…9Q2', invoiceNo: 'AM/331', date: '18 Jun 2026', booksItc: 9000, portalItc: 8100, status: 'mismatch' },
    { supplier: 'Shakti Traders', gstin: '24AABFS…7R4', invoiceNo: 'ST/77', date: '22 Jun 2026', booksItc: 5400, portalItc: 0, status: 'only_books' },
    { supplier: 'Vishwa Chem', gstin: '24AACCV…1L8', invoiceNo: 'VC/12', date: '25 Jun 2026', booksItc: 0, portalItc: 3600, status: 'only_2b' },
  ];
  if (!MOCK) {
    // real books side; portal rows still need the GSTN 2B pull (client-side or a later job)
    try { await fetch(`${API}/api/v1/gst/gstr-2b/books`, { headers: authHeaders() }); } catch { /* ignore */ }
  }
  const matched = rows.filter((r) => r.status === 'matched').length;
  const mismatch = rows.filter((r) => r.status === 'mismatch').length;
  const onlyBooks = rows.filter((r) => r.status === 'only_books').length;
  const only2b = rows.filter((r) => r.status === 'only_2b').length;
  const booksTotal = rows.reduce((s, r) => s + r.booksItc, 0);
  const portalTotal = rows.reduce((s, r) => s + r.portalItc, 0);
  return { rows, matched, mismatch, onlyBooks, only2b, booksTotal, portalTotal };
}

// ---- TDS ----
export interface TdsChallan { section: string; description: string; deductees: number; amount: number; challanNo: string | null; bsr: string | null; paidOn: string | null; dueOn: string; status: 'paid' | 'due' }
export interface TdsChallans { rows: TdsChallan[]; totalDeducted: number; totalPaid: number; totalDue: number }

export async function getTdsChallans(): Promise<TdsChallans> {
  const rows: TdsChallan[] = [
    { section: '194C', description: 'Payments to contractors', deductees: 12, amount: 184300, challanNo: 'CIN-2841100', bsr: '0510308', paidOn: '05 Jul 2026', dueOn: '07 Jul 2026', status: 'paid' },
    { section: '194J', description: 'Professional / technical fees', deductees: 4, amount: 45000, challanNo: null, bsr: null, paidOn: null, dueOn: '07 Aug 2026', status: 'due' },
    { section: '194I', description: 'Rent', deductees: 2, amount: 72000, challanNo: null, bsr: null, paidOn: null, dueOn: '07 Aug 2026', status: 'due' },
    { section: '194Q', description: 'Purchase of goods', deductees: 6, amount: 100000, challanNo: null, bsr: null, paidOn: null, dueOn: '07 Aug 2026', status: 'due' },
  ];
  if (!MOCK) { try { await fetch(`${API}/api/v1/tds/summary`, { headers: authHeaders() }); } catch { /* ignore */ } }
  const totalDeducted = rows.reduce((s, r) => s + r.amount, 0);
  const totalPaid = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  return { rows, totalDeducted, totalPaid, totalDue: totalDeducted - totalPaid };
}

export interface TdsDeductee { name: string; pan: string; section: string; paid: number; rate: number; tds: number; date: string; challan: string | null }
export interface TdsReturn { form: string; quarter: string; rows: TdsDeductee[]; totalPaid: number; totalTds: number }

export async function getTdsReturn(): Promise<TdsReturn> {
  const rows: TdsDeductee[] = [
    { name: 'Anand Fabrication', pan: 'AABFA1234C', section: '194C', paid: 4820000, rate: 2, tds: 96400, date: '18 Jun 2026', challan: 'CIN-2841100' },
    { name: 'Precision Heat Treaters', pan: 'AABCP5678T', section: '194C', paid: 2640000, rate: 2, tds: 52800, date: '20 Jun 2026', challan: 'CIN-2841100' },
    { name: 'S. Mehta & Associates', pan: 'AMKPM9012J', section: '194J', paid: 450000, rate: 10, tds: 45000, date: '22 Jun 2026', challan: null },
    { name: 'Rajkot Estates', pan: 'AAACR3456I', section: '194I', paid: 720000, rate: 10, tds: 72000, date: '25 Jun 2026', challan: null },
    { name: 'Gujarat Poly Pvt Ltd', pan: 'AAGCG7890P', section: '194Q', paid: 10000000, rate: 1, tds: 100000, date: '28 Jun 2026', challan: null },
  ];
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalTds = rows.reduce((s, r) => s + r.tds, 0);
  return { form: '26Q', quarter: 'Q1 FY 2026-27', rows, totalPaid, totalTds };
}

// ---- Job work ----
export interface InwardPending { id: string; challanNo: string; customer: string; process: string; material: string; qtyRecd: number; dispatched: number; loss: number; pending: number; uom: string; date: string; status: 'open' | 'partial' | 'closed' }

export async function getJobworkPending(): Promise<InwardPending[]> {
  if (MOCK) {
    const raw = [
      { challanNo: 'JW-IN/0044', customer: 'Mahalaxmi Traders', process: 'Carburising', material: 'Gears', qtyRecd: 1000, dispatched: 600, loss: 0, date: '10 Jul 2026' },
      { challanNo: 'JW-IN/0051', customer: 'Shree Balaji Enterprises', process: 'Hardening & Tempering', material: 'Shafts', qtyRecd: 500, dispatched: 0, loss: 0, date: '14 Jul 2026' },
      { challanNo: 'JW-IN/0039', customer: 'Tata Motors Ltd', process: 'Nitriding', material: 'Pins', qtyRecd: 250, dispatched: 180, loss: 10, date: '08 Jul 2026' },
      { challanNo: 'JW-IN/0055', customer: 'Ganesh Auto Parts', process: 'Annealing', material: 'MS Rounds', qtyRecd: 800, dispatched: 800, loss: 0, date: '02 Jul 2026' },
      { challanNo: 'JW-IN/0058', customer: 'Mahalaxmi Traders', process: 'Induction Hardening', material: 'Cam lobes', qtyRecd: 320, dispatched: 120, loss: 5, date: '18 Jul 2026' },
    ];
    return raw.map((r, i) => {
      const pending = Math.round((r.qtyRecd - r.dispatched - r.loss) * 1000) / 1000;
      const status: InwardPending['status'] = pending <= 0 ? 'closed' : r.dispatched + r.loss > 0 ? 'partial' : 'open';
      return { id: String(i + 1), uom: 'kg', pending, status, ...r };
    });
  }
  const res = await fetch(`${API}/api/v1/jobwork/pending`, { headers: authHeaders() });
  return (await res.json()).data ?? [];
}

export interface Itc04Summary { inwardChallans: number; outwardChallans: number; qtyReceived: number; qtyReturned: number; qtyPending: number }

export async function getItc04(): Promise<Itc04Summary> {
  if (MOCK) {
    return { inwardChallans: 5, outwardChallans: 8, qtyReceived: 2870, qtyReturned: 1715, qtyPending: 1155 };
  }
  const res = await fetch(`${API}/api/v1/jobwork/itc04`, { headers: authHeaders() });
  return (await res.json()).data ?? { inwardChallans: 0, outwardChallans: 0, qtyReceived: 0, qtyReturned: 0, qtyPending: 0 };
}

// ---- Payroll ----
export interface PayslipRow { name: string; designation: string; basic: number; hra: number; allowances: number; gross: number; pf: number; esi: number; pt: number; tds: number; deductions: number; net: number }
export interface PayrollRun { month: string; rows: PayslipRow[]; gross: number; totalDeductions: number; net: number; statutory: { pfEmployee: number; pfEmployer: number; esiEmployee: number; esiEmployer: number; pt: number; tds: number } }

const r2 = (n: number) => Math.round(n * 100) / 100;
function annualTax(t: number): number { let x = 0; if (t > 1e6) { x += (t - 1e6) * 0.3; t = 1e6; } if (t > 5e5) { x += (t - 5e5) * 0.2; t = 5e5; } if (t > 25e4) x += (t - 25e4) * 0.05; return x * 1.04; }
function slip(name: string, designation: string, basic: number): PayslipRow {
  const hra = r2(basic * 0.4), allowances = r2(basic * 0.1), gross = r2(basic + hra + allowances);
  const pf = r2(0.12 * Math.min(basic, 15000)), esi = gross <= 21000 ? r2(0.0075 * gross) : 0;
  const pt = gross > 12000 ? 200 : gross > 9000 ? 150 : 0;
  const tds = r2(annualTax(Math.max(0, gross * 12 - 50000 - Math.min(pf * 12, 150000))) / 12);
  const deductions = r2(pf + esi + pt + tds);
  return { name, designation, basic, hra, allowances, gross, pf, esi, pt, tds, deductions, net: r2(gross - deductions) };
}

export async function getPayrollRun(month: string): Promise<PayrollRun> {
  if (MOCK) {
    const rows = [
      slip('Rajesh Joshi', 'Plant Manager', 60000),
      slip('Priya Rao', 'Accountant', 32000),
      slip('Suresh Patel', 'Shift Supervisor', 28000),
      slip('Meena Iyer', 'HR Executive', 25000),
      slip('Kiran Desai', 'QC Inspector', 22000),
      slip('Amit Shah', 'Furnace Operator', 18000),
      slip('Ravi Chauhan', 'Helper', 13000),
    ];
    const gross = r2(rows.reduce((s, r) => s + r.gross, 0));
    const totalDeductions = r2(rows.reduce((s, r) => s + r.deductions, 0));
    const pfEmployee = r2(rows.reduce((s, r) => s + r.pf, 0));
    const esiEmployee = r2(rows.reduce((s, r) => s + r.esi, 0));
    return {
      month, rows, gross, totalDeductions, net: r2(gross - totalDeductions),
      statutory: { pfEmployee, pfEmployer: pfEmployee, esiEmployee, esiEmployer: r2(esiEmployee * (3.25 / 0.75)), pt: r2(rows.reduce((s, r) => s + r.pt, 0)), tds: r2(rows.reduce((s, r) => s + r.tds, 0)) },
    };
  }
  const res = await fetch(`${API}/api/v1/payroll/run?month=${encodeURIComponent(month)}`, { headers: authHeaders() });
  return (await res.json()).data;
}

export interface Form16Row { name: string; pan: string; grossAnnual: number; stdDeduction: number; ptDeduction: number; ded80C: number; taxableIncome: number; tax: number; tds: number }

function form16(name: string, pan: string, basic: number): Form16Row {
  const s = slip(name, '', basic);
  const grossAnnual = r2(s.gross * 12), stdDeduction = 50000, ptDeduction = r2(s.pt * 12), ded80C = Math.min(r2(s.pf * 12), 150000);
  const taxableIncome = Math.max(0, r2(grossAnnual - stdDeduction - ptDeduction - ded80C));
  const tax = r2(annualTax(taxableIncome));
  return { name, pan, grossAnnual, stdDeduction, ptDeduction, ded80C, taxableIncome, tax, tds: tax };
}

export async function getForm16(): Promise<Form16Row[]> {
  if (MOCK) {
    return [
      form16('Rajesh Joshi', 'AJKPJ4021K', 60000),
      form16('Priya Rao', 'BQRPR7788L', 32000),
      form16('Suresh Patel', 'CDMPP1120M', 28000),
      form16('Meena Iyer', 'DEFPI9034N', 25000),
      form16('Kiran Desai', 'EFGPD2245P', 22000),
      form16('Amit Shah', 'FGHPS6677Q', 18000),
      form16('Ravi Chauhan', 'GHJPC3390R', 13000),
    ];
  }
  const res = await fetch(`${API}/api/v1/payroll/form16`, { headers: authHeaders() });
  return (await res.json()).data ?? [];
}

// ---- TCS (206C) ----
export interface TcsRow { party: string; pan: string; section: string; sale: number; rate: number; tcs: number; date: string; challan: string | null }
export interface TcsData { rows: TcsRow[]; totalSale: number; totalTcs: number; totalCollected: number; totalDue: number }

export async function getTcs(): Promise<TcsData> {
  const rows: TcsRow[] = [
    { party: 'Mahalaxmi Traders', pan: 'AACFM9021K', section: '206C(1H)', sale: 7200000, rate: 0.1, tcs: 7200, date: '12 Jun 2026', challan: 'CIN-27EQ-441' },
    { party: 'Tata Motors Ltd', pan: 'AAACT9M004', section: '206C(1H)', sale: 12500000, rate: 0.1, tcs: 12500, date: '18 Jun 2026', challan: 'CIN-27EQ-441' },
    { party: 'Rajkot Steel Co', pan: 'AAECR5540Q', section: '206C(1H)', sale: 6400000, rate: 0.1, tcs: 6400, date: '24 Jun 2026', challan: null },
    { party: 'Shree Balaji Enterprises', pan: 'AABFS2210Z', section: '206C(1H)', sale: 5100000, rate: 0.1, tcs: 5100, date: '28 Jun 2026', challan: null },
  ];
  const totalSale = rows.reduce((s, r) => s + r.sale, 0);
  const totalTcs = rows.reduce((s, r) => s + r.tcs, 0);
  const totalCollected = rows.filter((r) => r.challan).reduce((s, r) => s + r.tcs, 0);
  return { rows, totalSale, totalTcs, totalCollected, totalDue: totalTcs - totalCollected };
}

// ---- e-Invoice / e-Way ----
export interface EInvoiceRow { invoiceNo: string; party: string; date: string; value: number; irn: string | null; ack: string | null; status: 'generated' | 'pending' | 'cancelled' }
export interface EWayRow { ewbNo: string | null; invoiceNo: string; party: string; from: string; to: string; distance: number; value: number; validTill: string | null; status: 'active' | 'pending' | 'expired' }

export async function getEInvoices(): Promise<EInvoiceRow[]> {
  return [
    { invoiceNo: 'SI/26-27/0482', party: 'Mahalaxmi Traders', date: '27 Jul 2026', value: 248600, irn: '35b2…a91f', ack: '112026', status: 'generated' },
    { invoiceNo: 'SI/26-27/0483', party: 'Rajkot Steel Co', date: '27 Jul 2026', value: 504200, irn: '9ac4…10de', ack: '112031', status: 'generated' },
    { invoiceNo: 'SI/26-27/0484', party: 'Tata Motors Ltd', date: '28 Jul 2026', value: 320000, irn: null, ack: null, status: 'pending' },
    { invoiceNo: 'SI/26-27/0480', party: 'Shree Balaji Enterprises', date: '26 Jul 2026', value: 104200, irn: '4f7e…88ba', ack: '111998', status: 'cancelled' },
  ];
}

// ---- Lien / forfeiture ----
export interface LienCase { customer: string; overdue: number; ageingDays: number; material: string; qty: string; assessed: number; expectedSale: number; status: 'notice' | 'held' | 'recovered' }
export async function getLienCases(): Promise<LienCase[]> {
  return [
    { customer: 'Shree Balaji Enterprises', overdue: 104200, ageingDays: 95, material: 'JW-IN/0051 · shafts', qty: '500 kg', assessed: 90000, expectedSale: 115000, status: 'held' },
    { customer: 'Ganesh Auto Parts', overdue: 61000, ageingDays: 72, material: 'JW-IN/0033 · brackets', qty: '260 kg', assessed: 48000, expectedSale: 55000, status: 'notice' },
    { customer: 'Deep Engineering', overdue: 38400, ageingDays: 120, material: 'JW-IN/0027 · gears', qty: '180 kg', assessed: 41000, expectedSale: 44000, status: 'recovered' },
  ];
}

// ---- Masters: process + rate ----
export interface ProcessMaster { code: string; name: string; sac: string; uom: string; turnaround: string; active: boolean }
export interface RateMaster { process: string; customer: string; rate: number; effective: string }
export async function getProcessMasters(): Promise<ProcessMaster[]> {
  return [
    { code: 'CARB', name: 'Carburising', sac: '9988', uom: 'Per kg', turnaround: '3 days', active: true },
    { code: 'HARD', name: 'Hardening & Tempering', sac: '9988', uom: 'Per kg', turnaround: '2 days', active: true },
    { code: 'ANNL', name: 'Annealing', sac: '9988', uom: 'Per kg', turnaround: '2 days', active: true },
    { code: 'NITR', name: 'Nitriding', sac: '9988', uom: 'Per kg', turnaround: '4 days', active: true },
    { code: 'INDH', name: 'Induction Hardening', sac: '9988', uom: 'Per piece', turnaround: '1 day', active: false },
  ];
}
export async function getRateMasters(): Promise<RateMaster[]> {
  return [
    { process: 'Carburising', customer: 'All customers (standard)', rate: 18, effective: '01 Apr 2026' },
    { process: 'Carburising', customer: 'Tata Motors Ltd', rate: 16.5, effective: '01 Apr 2026' },
    { process: 'Hardening & Tempering', customer: 'All customers (standard)', rate: 22, effective: '01 Apr 2026' },
    { process: 'Annealing', customer: 'All customers (standard)', rate: 14, effective: '01 Apr 2026' },
    { process: 'Nitriding', customer: 'Mahalaxmi Traders', rate: 26, effective: '01 Apr 2026' },
  ];
}

// ---- Documents ----
export interface DocRow { name: string; type: string; category: string; linkedTo: string | null; size: string; uploadedBy: string; date: string }
export async function getDocuments(): Promise<DocRow[]> {
  return [
    { name: 'PO-Mahalaxmi-Jun.pdf', type: 'PDF', category: 'Purchase Order', linkedTo: 'SI/26-27/0482', size: '184 KB', uploadedBy: 'Priya R.', date: '27 Jul 2026' },
    { name: 'GRN-Gujarat-Poly.pdf', type: 'PDF', category: 'Goods Receipt', linkedTo: 'PB/26-27/0311', size: '96 KB', uploadedBy: 'Suresh P.', date: '25 Jul 2026' },
    { name: 'EWB-3910442188.pdf', type: 'PDF', category: 'e-Way Bill', linkedTo: 'SI/26-27/0483', size: '58 KB', uploadedBy: 'System', date: '27 Jul 2026' },
    { name: 'Bank-stmt-HDFC-Jun.xlsx', type: 'SHEET', category: 'Bank Statement', linkedTo: null, size: '412 KB', uploadedBy: 'Rajesh J.', date: '02 Jul 2026' },
    { name: 'Lien-notice-Balaji.pdf', type: 'PDF', category: 'Legal', linkedTo: 'JW-IN/0051', size: '72 KB', uploadedBy: 'Rajesh J.', date: '20 Jul 2026' },
  ];
}

// ---- Ageing ----
export interface AgeingRow { party: string; total: number; b0: number; b30: number; b60: number; b90: number }
export interface Ageing { rows: AgeingRow[]; totals: { total: number; b0: number; b30: number; b60: number; b90: number } }
export async function getAgeing(kind: 'receivable' | 'payable'): Promise<Ageing> {
  const rec: AgeingRow[] = [
    { party: 'Tata Motors Ltd', total: 3200000, b0: 3200000, b30: 0, b60: 0, b90: 0 },
    { party: 'Mahalaxmi Traders', total: 2486000, b0: 1486000, b30: 1000000, b60: 0, b90: 0 },
    { party: 'Rajkot Steel Co', total: 1042000, b0: 0, b30: 642000, b60: 400000, b90: 0 },
    { party: 'Shree Balaji Enterprises', total: 1042000, b0: 0, b30: 0, b60: 0, b90: 1042000 },
    { party: 'Ganesh Auto Parts', total: 610000, b0: 0, b30: 0, b60: 0, b90: 610000 },
  ];
  const pay: AgeingRow[] = [
    { party: 'Gujarat Poly Pvt Ltd', total: 1120000, b0: 1120000, b30: 0, b60: 0, b90: 0 },
    { party: 'Precision Heat Treaters', total: 648000, b0: 448000, b30: 200000, b60: 0, b90: 0 },
    { party: 'MSEB — Electricity', total: 380000, b0: 0, b30: 380000, b60: 0, b90: 0 },
    { party: 'Furnace Fuel & Gas', total: 264000, b0: 0, b30: 0, b60: 264000, b90: 0 },
  ];
  const rows = kind === 'receivable' ? rec : pay;
  const totals = rows.reduce((a, r) => ({ total: a.total + r.total, b0: a.b0 + r.b0, b30: a.b30 + r.b30, b60: a.b60 + r.b60, b90: a.b90 + r.b90 }), { total: 0, b0: 0, b30: 0, b60: 0, b90: 0 });
  return { rows, totals };
}

// ---- Compliance calendar ----
export interface ComplianceItem { form: string; period: string; due: string; days: number; amount: number | null; kind: 'gst' | 'tds' | 'tcs' | 'pf' | 'roc'; status: 'due' | 'filed' | 'overdue' }
export async function getCompliance(): Promise<ComplianceItem[]> {
  return [
    { form: 'GSTR-3B', period: 'June 2026', due: '20 Jul 2026', days: -7, amount: 642000, kind: 'gst', status: 'filed' },
    { form: 'GSTR-1', period: 'July 2026', due: '11 Aug 2026', days: 14, amount: null, kind: 'gst', status: 'due' },
    { form: 'TDS Challan 281', period: 'July 2026', due: '07 Aug 2026', days: 10, amount: 184300, kind: 'tds', status: 'due' },
    { form: 'PF ECR + ESI', period: 'July 2026', due: '15 Aug 2026', days: 18, amount: 780000, kind: 'pf', status: 'due' },
    { form: 'GSTR-3B', period: 'July 2026', due: '20 Aug 2026', days: 23, amount: null, kind: 'gst', status: 'due' },
    { form: '26Q / 27EQ', period: 'Q1 FY26-27', due: '31 Jul 2026', days: 3, amount: null, kind: 'tds', status: 'due' },
    { form: 'PT (Gujarat)', period: 'July 2026', due: '15 Aug 2026', days: 18, amount: 1400, kind: 'tds', status: 'due' },
  ];
}

// ---- Audit trail ----
export interface AuditRow { time: string; actor: string; action: string; entity: string; entityId: string; ip: string }
export async function getAuditTrail(): Promise<AuditRow[]> {
  return [
    { time: '28 Jul 2026 18:42', actor: 'Rajesh J.', action: 'voucher.post', entity: 'Sales Invoice', entityId: 'SI/26-27/0484', ip: '10.0.4.21' },
    { time: '28 Jul 2026 18:31', actor: 'Priya R.', action: 'payment.approve', entity: 'Payment', entityId: 'PMT/26-27/0209', ip: '10.0.4.32' },
    { time: '28 Jul 2026 17:58', actor: 'Rajesh J.', action: 'period.lock', entity: 'Period', entityId: '2026-05', ip: '10.0.4.21' },
    { time: '28 Jul 2026 16:10', actor: 'Suresh P.', action: 'jobwork.inward', entity: 'JW Inward', entityId: 'JW-IN/0058', ip: '10.0.4.44' },
    { time: '28 Jul 2026 15:02', actor: 'System', action: 'einvoice.irn', entity: 'e-Invoice', entityId: 'SI/26-27/0483', ip: '—' },
    { time: '28 Jul 2026 12:20', actor: 'Rajesh J.', action: 'ledger.blacklist', entity: 'Ledger', entityId: 'Ganesh Auto Parts', ip: '10.0.4.21' },
  ];
}

export async function getEWayBills(): Promise<EWayRow[]> {
  return [
    { ewbNo: '3910 4421 8890', invoiceNo: 'SI/26-27/0483', party: 'Rajkot Steel Co', from: 'Rajkot', to: 'Ahmedabad', distance: 216, value: 504200, validTill: '29 Jul 2026', status: 'active' },
    { ewbNo: '3910 4422 0021', invoiceNo: 'SI/26-27/0482', party: 'Mahalaxmi Traders', from: 'Rajkot', to: 'Morbi', distance: 62, value: 248600, validTill: '28 Jul 2026', status: 'active' },
    { ewbNo: null, invoiceNo: 'SI/26-27/0484', party: 'Tata Motors Ltd', from: 'Rajkot', to: 'Pune', distance: 742, value: 320000, validTill: null, status: 'pending' },
  ];
}

// ---- Period locks ----
export interface PeriodLock { period: string; note: string | null; lockedAt: string; lockedBy: string | null }

let mockLocks: PeriodLock[] = [{ period: '2026-04', note: 'FY opening — audited', lockedAt: '2026-05-08', lockedBy: 'Rajesh J.' }, { period: '2026-05', note: 'Filed GSTR-3B & 1', lockedAt: '2026-06-14', lockedBy: 'Rajesh J.' }];

export async function listPeriodLocks(): Promise<PeriodLock[]> {
  if (MOCK) return [...mockLocks];
  const res = await fetch(`${API}/api/v1/periods`, { headers: authHeaders() });
  return (await res.json()).data ?? [];
}

export async function lockPeriod(period: string, note: string): Promise<void> {
  if (MOCK) { if (!mockLocks.some((l) => l.period === period)) mockLocks = [...mockLocks, { period, note, lockedAt: '2026-07-28', lockedBy: 'Rajesh J.' }]; return; }
  await fetch(`${API}/api/v1/periods/lock`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ period, note }) });
}

export async function unlockPeriod(period: string): Promise<void> {
  if (MOCK) { mockLocks = mockLocks.filter((l) => l.period !== period); return; }
  await fetch(`${API}/api/v1/periods/unlock`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ period }) });
}

export async function commitImport(entity: string, file: File, financialYear: string): Promise<{ inserted: number; skipped: number }> {
  if (MOCK) return { inserted: mockValidation.valid, skipped: mockValidation.invalid };
  const fd = new FormData();
  fd.append('file', file);
  fd.append('financialYear', financialYear);
  const res = await fetch(`${API}/api/v1/import/${entity}/commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}` },
    body: fd,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Import failed');
  return body.data;
}

// ---- Settings: numbering series, company statutory profile, geo masters, voucher PDF ----
export interface NumberingSeries { voucherType: string; label: string; prefix: string; nextNo: number; width: number }

const SERIES_LABEL: Record<string, string> = {
  payment: 'Payment', receipt: 'Receipt', contra: 'Contra', journal: 'Journal',
  sales: 'Sales Invoice', purchase: 'Purchase Bill', credit_note: 'Credit Note', debit_note: 'Debit Note',
  eway: 'E-Way Bill (internal ref)', einvoice: 'E-Invoice (internal ref)',
  jobwork_inward: 'Job Work — Inward', jobwork_outward: 'Job Work — Outward', lien: 'Lien / Forfeiture', payroll: 'Payroll Run',
};
const labelFor = (t: string): string => SERIES_LABEL[t] ?? t;

let mockSeries: NumberingSeries[] = [
  ['payment', 'PMT/26-27/', 211], ['receipt', 'RCP/26-27/', 341], ['contra', 'CTR/26-27/', 47],
  ['journal', 'JV/26-27/', 96], ['sales', 'SI/26-27/', 485], ['purchase', 'PB/26-27/', 372],
  ['credit_note', 'CN/26-27/', 20], ['debit_note', 'DN/26-27/', 12],
  ['eway', 'EWB/26-27/', 22], ['einvoice', 'EINV/26-27/', 461],
  ['jobwork_inward', 'JW-IN/26-27/', 53], ['jobwork_outward', 'JW-OUT/26-27/', 62],
  ['lien', 'LIEN/26-27/', 3], ['payroll', 'PAY/26-27/', 4],
].map(([voucherType, prefix, nextNo]) => ({ voucherType: voucherType as string, label: labelFor(voucherType as string), prefix: prefix as string, nextNo: nextNo as number, width: 4 }));

export async function getNumberingSeries(): Promise<NumberingSeries[]> {
  if (MOCK) return mockSeries.map((s) => ({ ...s }));
  const res = await fetch(`${API}/api/v1/settings/numbering`, { headers: authHeaders() });
  const rows = (await res.json()).data ?? [];
  return (rows as NumberingSeries[]).map((s) => ({ ...s, label: labelFor(s.voucherType) }));
}

export async function updateNumberingSeries(voucherType: string, patch: { prefix?: string; nextNo?: number; width?: number }): Promise<NumberingSeries> {
  if (MOCK) {
    mockSeries = mockSeries.map((s) => (s.voucherType === voucherType ? { ...s, ...patch } : s));
    return { ...mockSeries.find((s) => s.voucherType === voucherType)! };
  }
  const res = await fetch(`${API}/api/v1/settings/numbering/${voucherType}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(patch),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Update failed');
  return { ...body.data, label: labelFor(voucherType) };
}

export interface CompanyProfile {
  name: string; legalName?: string; pan?: string; gstin?: string; tan?: string; cin?: string;
  gstRegType?: string; ptRegn?: string; pfRegn?: string; esiRegn?: string;
  address?: string; city?: string; stateCode?: string; pincode?: string;
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  if (MOCK) return {
    name: 'RAVI Metal Treatment', legalName: 'RAVI Metal Treatment', pan: 'AABCS1429P', gstin: '24AABCS1429P1Z5',
    tan: 'RKTR02914E', cin: '', gstRegType: 'regular', ptRegn: 'PT/24/RAJ/0009142', pfRegn: 'GJRAJ0456789000',
    esiRegn: '37000123450000901', address: 'Aji Deam Unit 3, GIDC, Rajkot', city: 'Rajkot', stateCode: '24', pincode: '360003',
  };
  const res = await fetch(`${API}/api/v1/settings/company`, { headers: authHeaders() });
  const d = (await res.json()).data ?? {};
  return { name: d.name, legalName: d.legal_name, pan: d.pan, gstin: d.gstin, tan: d.tan, cin: d.cin, gstRegType: d.gst_reg_type, ptRegn: d.pt_regn, pfRegn: d.pf_regn, esiRegn: d.esi_regn, address: d.address, city: d.city, stateCode: d.state_code, pincode: d.pincode };
}

/** URL to a voucher's server-rendered PDF (empty in mock mode — needs the API). */
export function voucherPdfUrl(id: string): string {
  return MOCK ? '' : `${API}/api/v1/vouchers/${id}/pdf`;
}
