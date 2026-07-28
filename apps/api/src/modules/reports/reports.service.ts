import type { RowDataPacket } from 'mysql2';
import { pool } from '../../common/db.js';

export interface TrialBalanceRow {
  ledgerId: string;
  name: string;
  category: string | null;
  debit: number;
  credit: number;
}
export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Trial balance = every ledger with movement, showing its net debit or credit
 * closing balance. A ledger whose debits exceed credits shows a debit balance
 * (and vice-versa). For a set of balanced vouchers, total debit === total credit.
 */
export async function getTrialBalance(companyId: string): Promise<TrialBalance> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.id AS ledgerId, l.name, l.category,
            COALESCE(SUM(vl.dr_amount), 0) AS dr,
            COALESCE(SUM(vl.cr_amount), 0) AS cr
       FROM ledgers l
       LEFT JOIN voucher_lines vl
         ON vl.ledger_id = l.id AND vl.company_id = l.company_id
      WHERE l.company_id = ?
      GROUP BY l.id, l.name, l.category
     HAVING dr <> 0 OR cr <> 0
      ORDER BY l.name`,
    [companyId],
  );

  let totalDebit = 0;
  let totalCredit = 0;
  const out: TrialBalanceRow[] = rows.map((r) => {
    const net = round2(Number(r.dr) - Number(r.cr));
    const debit = net > 0 ? net : 0;
    const credit = net < 0 ? -net : 0;
    totalDebit += debit;
    totalCredit += credit;
    return { ledgerId: r.ledgerId as string, name: r.name as string, category: (r.category as string) ?? null, debit, credit };
  });

  totalDebit = round2(totalDebit);
  totalCredit = round2(totalCredit);
  return { rows: out, totalDebit, totalCredit, balanced: Math.round(totalDebit * 100) === Math.round(totalCredit * 100) };
}
