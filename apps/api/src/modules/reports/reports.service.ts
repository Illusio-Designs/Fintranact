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

export interface DayBookEntry {
  voucherId: string;
  voucherNo: string;
  type: string;
  date: string;
  narration: string | null;
  debit: number;
  credit: number;
  particulars: string;
}
export interface DayBook { date: string; entries: DayBookEntry[]; totalDebit: number; totalCredit: number }

/** Day book = every voucher posted on a date, with its total and the ledgers touched. */
export async function getDayBook(companyId: string, date: string): Promise<DayBook> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT v.id AS voucherId, v.voucher_no AS voucherNo, v.type, v.date, v.narration,
            COALESCE(SUM(vl.dr_amount), 0) AS debit,
            COALESCE(SUM(vl.cr_amount), 0) AS credit,
            GROUP_CONCAT(DISTINCT l.name ORDER BY l.name SEPARATOR ', ') AS particulars
       FROM vouchers v
       LEFT JOIN voucher_lines vl ON vl.voucher_id = v.id
       LEFT JOIN ledgers l ON l.id = vl.ledger_id
      WHERE v.company_id = :companyId AND v.date = :date
      GROUP BY v.id, v.voucher_no, v.type, v.date, v.narration
      ORDER BY v.created_at`,
    { companyId, date },
  );
  let totalDebit = 0;
  let totalCredit = 0;
  const entries: DayBookEntry[] = rows.map((r) => {
    const debit = round2(Number(r.debit));
    const credit = round2(Number(r.credit));
    totalDebit += debit;
    totalCredit += credit;
    return {
      voucherId: r.voucherId as string, voucherNo: r.voucherNo as string, type: r.type as string,
      date: String(r.date).slice(0, 10), narration: (r.narration as string) ?? null,
      debit, credit, particulars: (r.particulars as string) ?? '',
    };
  });
  return { date, entries, totalDebit: round2(totalDebit), totalCredit: round2(totalCredit) };
}

export interface PnlRow { name: string; amount: number }
export interface Pnl {
  income: PnlRow[];
  directExpense: PnlRow[];
  indirectExpense: PnlRow[];
  totalIncome: number;
  totalDirect: number;
  totalIndirect: number;
  grossProfit: number;
  netProfit: number;
}

/** Ledger categories treated as cost of sales (above the gross-profit line). */
const DIRECT_CATEGORIES = new Set(['direct_expense', 'cogs', 'purchase', 'material']);

/**
 * Profit & Loss — income ledgers (credit balances) less expenses (debit balances).
 * Gross profit = income − direct (cost of sales); net profit = gross − indirect.
 */
export async function getPnl(companyId: string): Promise<Pnl> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.name, l.category,
            COALESCE(SUM(vl.dr_amount), 0) AS dr,
            COALESCE(SUM(vl.cr_amount), 0) AS cr
       FROM ledgers l
       JOIN voucher_lines vl ON vl.ledger_id = l.id AND vl.company_id = l.company_id
      WHERE l.company_id = :companyId AND l.category IN ('income','expense','direct_expense','indirect_expense','purchase','material','cogs')
      GROUP BY l.id, l.name, l.category
     HAVING dr <> 0 OR cr <> 0
      ORDER BY l.name`,
    { companyId },
  );

  const income: PnlRow[] = [];
  const directExpense: PnlRow[] = [];
  const indirectExpense: PnlRow[] = [];
  for (const r of rows) {
    const cat = (r.category as string) ?? '';
    const creditBal = round2(Number(r.cr) - Number(r.dr)); // income sits credit-positive
    const debitBal = round2(Number(r.dr) - Number(r.cr)); // expenses sit debit-positive
    if (cat === 'income') {
      income.push({ name: r.name as string, amount: creditBal });
    } else if (DIRECT_CATEGORIES.has(cat)) {
      directExpense.push({ name: r.name as string, amount: debitBal });
    } else {
      indirectExpense.push({ name: r.name as string, amount: debitBal });
    }
  }

  const totalIncome = round2(income.reduce((s, r) => s + r.amount, 0));
  const totalDirect = round2(directExpense.reduce((s, r) => s + r.amount, 0));
  const totalIndirect = round2(indirectExpense.reduce((s, r) => s + r.amount, 0));
  const grossProfit = round2(totalIncome - totalDirect);
  const netProfit = round2(grossProfit - totalIndirect);
  return { income, directExpense, indirectExpense, totalIncome, totalDirect, totalIndirect, grossProfit, netProfit };
}
