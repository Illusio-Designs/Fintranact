import type { RowDataPacket } from 'mysql2';
import { pool } from '../../common/db.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface PayslipRow {
  name: string;
  designation: string | null;
  basic: number;
  hra: number;
  allowances: number;
  gross: number;
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  deductions: number;
  net: number;
}
export interface PayrollRun {
  month: string;
  rows: PayslipRow[];
  gross: number;
  totalDeductions: number;
  net: number;
  statutory: { pfEmployee: number; pfEmployer: number; esiEmployee: number; esiEmployer: number; pt: number; tds: number };
}

/** Annual income-tax (old regime) used to spread monthly TDS u/s 192. */
function annualTax(taxable: number): number {
  let t = 0;
  if (taxable > 1000000) t += (taxable - 1000000) * 0.3, taxable = 1000000;
  if (taxable > 500000) t += (taxable - 500000) * 0.2, taxable = 500000;
  if (taxable > 250000) t += (taxable - 250000) * 0.05;
  return t * 1.04; // 4% health & education cess
}

/** Compute one payslip from the monthly basic (standard 40% HRA, 10% special allowance). */
export function computePayslip(name: string, designation: string | null, basic: number): PayslipRow {
  const hra = round2(basic * 0.4);
  const allowances = round2(basic * 0.1);
  const gross = round2(basic + hra + allowances);
  const pf = round2(0.12 * Math.min(basic, 15000)); // statutory PF wage ceiling
  const esi = gross <= 21000 ? round2(0.0075 * gross) : 0; // employee 0.75%, only up to ₹21k
  const pt = gross > 12000 ? 200 : gross > 9000 ? 150 : 0; // Gujarat PT slab (monthly)
  const annualTaxable = Math.max(0, gross * 12 - 50000 - Math.min(pf * 12, 150000)); // std deduction + 80C(PF)
  const tds = round2(annualTax(annualTaxable) / 12);
  const deductions = round2(pf + esi + pt + tds);
  return { name, designation, basic, hra, allowances, gross, pf, esi, pt, tds, deductions, net: round2(gross - deductions) };
}

export interface Form16Row {
  name: string;
  pan: string;
  grossAnnual: number;
  stdDeduction: number;
  ptDeduction: number;
  ded80C: number;
  taxableIncome: number;
  tax: number;
  tds: number;
}

/** Annual Form 16 (Part B) computation for one employee from the monthly basic. */
export function computeForm16(name: string, pan: string, basic: number): Form16Row {
  const m = computePayslip(name, null, basic);
  const grossAnnual = round2(m.gross * 12);
  const stdDeduction = 50000;
  const ptDeduction = round2(m.pt * 12);
  const ded80C = Math.min(round2(m.pf * 12), 150000);
  const taxableIncome = Math.max(0, round2(grossAnnual - stdDeduction - ptDeduction - ded80C));
  const tax = round2(annualTax(taxableIncome));
  return { name, pan, grossAnnual, stdDeduction, ptDeduction, ded80C, taxableIncome, tax, tds: tax };
}

/** Form 16 list for the year — one row per employee. */
export async function listForm16(companyId: string): Promise<Form16Row[]> {
  const [emps] = await pool.query<RowDataPacket[]>(
    'SELECT name, basic_salary FROM employees WHERE company_id = ? ORDER BY name',
    [companyId],
  );
  return emps.map((e) => computeForm16(e.name as string, 'XXXXXXXXXX', Number(e.basic_salary)));
}

/** Payroll run for a month — reads employees, computes statutory deductions, aggregates. */
export async function computeRun(companyId: string, month: string): Promise<PayrollRun> {
  const [emps] = await pool.query<RowDataPacket[]>(
    'SELECT name, designation, basic_salary FROM employees WHERE company_id = ? ORDER BY name',
    [companyId],
  );
  const rows = emps.map((e) => computePayslip(e.name as string, (e.designation as string) ?? null, Number(e.basic_salary)));
  const gross = round2(rows.reduce((s, r) => s + r.gross, 0));
  const totalDeductions = round2(rows.reduce((s, r) => s + r.deductions, 0));
  const pfEmployee = round2(rows.reduce((s, r) => s + r.pf, 0));
  const esiEmployee = round2(rows.reduce((s, r) => s + r.esi, 0));
  return {
    month,
    rows,
    gross,
    totalDeductions,
    net: round2(gross - totalDeductions),
    statutory: {
      pfEmployee,
      pfEmployer: pfEmployee, // 12% employer share (matching)
      esiEmployee,
      esiEmployer: round2(esiEmployee * (3.25 / 0.75)), // employer 3.25% vs employee 0.75%
      pt: round2(rows.reduce((s, r) => s + r.pt, 0)),
      tds: round2(rows.reduce((s, r) => s + r.tds, 0)),
    },
  };
}
