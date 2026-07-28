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
