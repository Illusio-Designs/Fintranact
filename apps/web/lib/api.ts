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
