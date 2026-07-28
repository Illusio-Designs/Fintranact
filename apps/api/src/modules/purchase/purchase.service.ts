import type { RowDataPacket } from 'mysql2';
import type { PurchaseInvoiceInput, VoucherCreateInput } from '@fintranact/validation';
import { pool } from '../../common/db.js';
import { Errors } from '../../common/errors.js';
import { createVoucher } from '../accounting/vouchers.service.js';

interface Ctx {
  companyId: string;
  branchId?: string | null;
  userId: string;
  requestId?: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Map of system_key → ledger id for a company (Input CGST/SGST/IGST, TDS payable…). */
async function systemLedgers(companyId: string): Promise<Record<string, string>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT system_key, id FROM ledgers WHERE company_id = ? AND system_key IS NOT NULL',
    [companyId],
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.system_key as string] = r.id as string;
  return map;
}

export interface PurchaseInvoiceResult {
  id: string;
  voucherNo: string;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tds: number;
  total: number;
  payable: number;
}

/**
 * Compose a balanced purchase voucher from a high-level bill:
 *   Dr each expense/purchase account (taxable)
 *   Dr Input CGST + SGST (intra-state)  OR  Dr Input IGST (inter-state)
 *   Cr TDS Payable          (when TDS is deducted on the taxable value)
 *   Cr Supplier             (bill total less TDS)
 * Debits (taxable + input GST) always equal credits (supplier payable + TDS),
 * so the entry balances by construction.
 */
export async function createPurchaseInvoice(
  input: PurchaseInvoiceInput,
  ctx: Ctx,
): Promise<PurchaseInvoiceResult> {
  const sys = await systemLedgers(ctx.companyId);
  const need = input.placeOfSupply === 'intra' ? ['input_cgst', 'input_sgst'] : ['input_igst'];
  for (const k of need) {
    if (!sys[k]) throw Errors.validation(`Missing system ledger "${k}" — run migrations/seed`);
  }

  // aggregate expense debits by ledger, and input GST by head
  const expenseByLedger = new Map<string, number>();
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  for (const it of input.items) {
    const taxable = round2(it.taxable);
    expenseByLedger.set(it.purchaseLedgerId, round2((expenseByLedger.get(it.purchaseLedgerId) ?? 0) + taxable));
    const tax = (taxable * it.gstRate) / 100;
    if (input.placeOfSupply === 'intra') {
      cgst += tax / 2;
      sgst += tax / 2;
    } else {
      igst += tax;
    }
  }
  cgst = round2(cgst);
  sgst = round2(sgst);
  igst = round2(igst);

  const taxableTotal = round2([...expenseByLedger.values()].reduce((s, a) => s + a, 0));
  const total = round2(taxableTotal + cgst + sgst + igst);

  // optional TDS on the taxable value reduces the supplier credit
  const tds = input.tdsRate ? round2((taxableTotal * input.tdsRate) / 100) : 0;
  if (tds > 0 && !sys.tds_payable) {
    throw Errors.validation('Missing system ledger "tds_payable" — run migrations/seed');
  }
  const payable = round2(total - tds);

  const lines: VoucherCreateInput['lines'] = [];
  // debits: expense heads + input GST
  for (const [ledgerId, amount] of expenseByLedger) {
    lines.push({ ledgerId, drCr: 'dr', amount });
  }
  if (cgst > 0) lines.push({ ledgerId: sys.input_cgst!, drCr: 'dr', amount: cgst });
  if (sgst > 0) lines.push({ ledgerId: sys.input_sgst!, drCr: 'dr', amount: sgst });
  if (igst > 0) lines.push({ ledgerId: sys.input_igst!, drCr: 'dr', amount: igst });
  // credits: TDS payable (if any) + supplier
  if (tds > 0) lines.push({ ledgerId: sys.tds_payable!, drCr: 'cr', amount: tds });
  lines.push({ ledgerId: input.partyLedgerId, drCr: 'cr', amount: payable });

  const voucher = await createVoucher(
    { type: 'purchase', date: input.date, narration: input.narration, lines },
    ctx,
  );

  return { id: voucher.id, voucherNo: voucher.voucherNo, taxable: taxableTotal, cgst, sgst, igst, tds, total, payable };
}
