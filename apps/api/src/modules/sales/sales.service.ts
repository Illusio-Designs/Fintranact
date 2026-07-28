import type { RowDataPacket } from 'mysql2';
import type { SalesInvoiceInput, VoucherCreateInput } from '@fintranact/validation';
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

/** Map of system_key → ledger id for a company (Output CGST/SGST/IGST, etc.). */
async function systemLedgers(companyId: string): Promise<Record<string, string>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT system_key, id FROM ledgers WHERE company_id = ? AND system_key IS NOT NULL',
    [companyId],
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.system_key as string] = r.id as string;
  return map;
}

export interface SalesInvoiceResult {
  id: string;
  voucherNo: string;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

/**
 * Compose a balanced sales voucher from a high-level invoice:
 *   Dr Party (total)
 *   Cr each service/income account (taxable)
 *   Cr Output CGST + SGST (intra-state)  OR  Cr Output IGST (inter-state)
 * Amounts are rounded to paise per line, and the party debit is the exact sum
 * of the credits, so the entry always balances.
 */
export async function createSalesInvoice(
  input: SalesInvoiceInput,
  ctx: Ctx,
): Promise<SalesInvoiceResult> {
  const sys = await systemLedgers(ctx.companyId);
  const need = input.placeOfSupply === 'intra' ? ['output_cgst', 'output_sgst'] : ['output_igst'];
  for (const k of need) {
    if (!sys[k]) throw Errors.validation(`Missing system ledger "${k}" — run migrations/seed`);
  }

  // aggregate service credits by ledger, and GST by head
  const salesByLedger = new Map<string, number>();
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  for (const it of input.items) {
    const taxable = round2(it.taxable);
    salesByLedger.set(it.salesLedgerId, round2((salesByLedger.get(it.salesLedgerId) ?? 0) + taxable));
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

  const lines: VoucherCreateInput['lines'] = [];
  for (const [ledgerId, amount] of salesByLedger) {
    lines.push({ ledgerId, drCr: 'cr', amount });
  }
  if (cgst > 0) lines.push({ ledgerId: sys.output_cgst!, drCr: 'cr', amount: cgst });
  if (sgst > 0) lines.push({ ledgerId: sys.output_sgst!, drCr: 'cr', amount: sgst });
  if (igst > 0) lines.push({ ledgerId: sys.output_igst!, drCr: 'cr', amount: igst });

  const taxableTotal = round2([...salesByLedger.values()].reduce((s, a) => s + a, 0));
  const total = round2(taxableTotal + cgst + sgst + igst);

  // party debit first — equals the sum of all credit lines (balanced by construction)
  lines.unshift({ ledgerId: input.partyLedgerId, drCr: 'dr', amount: total });

  const voucher = await createVoucher(
    { type: 'sales', date: input.date, narration: input.narration, lines },
    ctx,
  );

  return { id: voucher.id, voucherNo: voucher.voucherNo, taxable: taxableTotal, cgst, sgst, igst, total };
}
