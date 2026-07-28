import type { RowDataPacket } from 'mysql2';
import { pool } from '../../common/db.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface TdsSummary {
  payable: number; // net TDS payable (credit balance of TDS Payable), i.e. deducted less deposited
  deductions: number; // number of vouchers that carried a TDS leg
}

/**
 * TDS summary from the books — the credit balance of the TDS Payable ledger is
 * what has been deducted but not yet deposited to the government via ITNS-281.
 * Section-wise / deductee-wise detail is layered on the client for the demo.
 */
export async function getTdsSummary(companyId: string): Promise<TdsSummary> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(vl.cr_amount - vl.dr_amount), 0) AS payable,
            COUNT(DISTINCT vl.voucher_id) AS n
       FROM ledgers l
       JOIN voucher_lines vl ON vl.ledger_id = l.id AND vl.company_id = l.company_id
      WHERE l.company_id = ? AND l.system_key = 'tds_payable'`,
    [companyId],
  );
  return { payable: round2(Number(rows[0]?.payable ?? 0)), deductions: Number(rows[0]?.n ?? 0) };
}
