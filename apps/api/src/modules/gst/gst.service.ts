import type { RowDataPacket } from 'mysql2';
import { pool } from '../../common/db.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** system_key → { debit balance, credit balance } for the GST + income ledgers. */
async function gstBalances(companyId: string): Promise<Record<string, { dr: number; cr: number }>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.system_key AS k,
            COALESCE(SUM(vl.dr_amount), 0) AS dr,
            COALESCE(SUM(vl.cr_amount), 0) AS cr
       FROM ledgers l
       LEFT JOIN voucher_lines vl ON vl.ledger_id = l.id AND vl.company_id = l.company_id
      WHERE l.company_id = ? AND l.system_key IN
            ('output_cgst','output_sgst','output_igst','input_cgst','input_sgst','input_igst')
      GROUP BY l.system_key`,
    [companyId],
  );
  const map: Record<string, { dr: number; cr: number }> = {};
  for (const r of rows) map[r.k as string] = { dr: Number(r.dr), cr: Number(r.cr) };
  return map;
}

async function incomeTaxable(companyId: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(vl.cr_amount - vl.dr_amount), 0) AS net
       FROM ledgers l JOIN voucher_lines vl ON vl.ledger_id = l.id AND vl.company_id = l.company_id
      WHERE l.company_id = ? AND l.category = 'income'`,
    [companyId],
  );
  return round2(Number(rows[0]?.net ?? 0));
}

export interface TaxTriplet { taxable: number; igst: number; cgst: number; sgst: number }
export interface Gstr3b {
  outward: TaxTriplet;
  itc: { igst: number; cgst: number; sgst: number };
  netPayable: { igst: number; cgst: number; sgst: number; total: number };
}

/** GSTR-3B — summary: output tax (3.1) vs eligible ITC (4), net cash payable (5.1). */
export async function getGstr3b(companyId: string): Promise<Gstr3b> {
  const b = await gstBalances(companyId);
  const outCgst = round2((b.output_cgst?.cr ?? 0) - (b.output_cgst?.dr ?? 0));
  const outSgst = round2((b.output_sgst?.cr ?? 0) - (b.output_sgst?.dr ?? 0));
  const outIgst = round2((b.output_igst?.cr ?? 0) - (b.output_igst?.dr ?? 0));
  const itcCgst = round2((b.input_cgst?.dr ?? 0) - (b.input_cgst?.cr ?? 0));
  const itcSgst = round2((b.input_sgst?.dr ?? 0) - (b.input_sgst?.cr ?? 0));
  const itcIgst = round2((b.input_igst?.dr ?? 0) - (b.input_igst?.cr ?? 0));
  const netIgst = round2(Math.max(0, outIgst - itcIgst));
  const netCgst = round2(Math.max(0, outCgst - itcCgst));
  const netSgst = round2(Math.max(0, outSgst - itcSgst));
  return {
    outward: { taxable: await incomeTaxable(companyId), igst: outIgst, cgst: outCgst, sgst: outSgst },
    itc: { igst: itcIgst, cgst: itcCgst, sgst: itcSgst },
    netPayable: { igst: netIgst, cgst: netCgst, sgst: netSgst, total: round2(netIgst + netCgst + netSgst) },
  };
}

export interface Gstr1 {
  invoices: number;
  outward: TaxTriplet;
  totalTax: number;
  totalValue: number;
}

/** GSTR-1 — outward supplies summary (taxable value + output tax + invoice count). */
export async function getGstr1(companyId: string): Promise<Gstr1> {
  const b = await gstBalances(companyId);
  const cgst = round2((b.output_cgst?.cr ?? 0) - (b.output_cgst?.dr ?? 0));
  const sgst = round2((b.output_sgst?.cr ?? 0) - (b.output_sgst?.dr ?? 0));
  const igst = round2((b.output_igst?.cr ?? 0) - (b.output_igst?.dr ?? 0));
  const taxable = await incomeTaxable(companyId);
  const [cnt] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM vouchers WHERE company_id = ? AND type IN ('sales','credit_note')",
    [companyId],
  );
  const totalTax = round2(cgst + sgst + igst);
  return { invoices: Number(cnt[0]?.n ?? 0), outward: { taxable, igst, cgst, sgst }, totalTax, totalValue: round2(taxable + totalTax) };
}
