import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../common/db.js';
import { Errors } from '../../common/errors.js';
import { audit } from '../../common/audit.js';

export interface NumberingSeries {
  voucherType: string;
  prefix: string;
  nextNo: number;
  width: number;
}

/** All numbering series for a company, ordered by voucher type. */
export async function listNumberingSeries(companyId: string): Promise<NumberingSeries[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT voucher_type, prefix, next_no, width FROM numbering_series WHERE company_id = :companyId ORDER BY voucher_type',
    { companyId },
  );
  return rows.map((r) => ({
    voucherType: String(r.voucher_type),
    prefix: String(r.prefix),
    nextNo: Number(r.next_no),
    width: Number(r.width),
  }));
}

interface Ctx {
  companyId: string;
  branchId?: string | null;
  userId: string;
  requestId?: string;
}

/** Update the prefix / next number / width of one series. */
export async function updateNumberingSeries(
  voucherType: string,
  patch: { prefix?: string; nextNo?: number; width?: number },
  ctx: Ctx,
): Promise<NumberingSeries> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, prefix, next_no, width FROM numbering_series WHERE company_id = :companyId AND voucher_type = :type LIMIT 1',
    { companyId: ctx.companyId, type: voucherType },
  );
  const current = rows[0];
  if (!current) throw Errors.notFound(`No numbering series for "${voucherType}"`);

  const prefix = patch.prefix ?? String(current.prefix);
  const width = patch.width ?? Number(current.width);
  const nextNo = patch.nextNo ?? Number(current.next_no);
  if (width < 1 || width > 12) throw Errors.validation('Width must be between 1 and 12', 'width');
  if (nextNo < 1) throw Errors.validation('Next number must be at least 1', 'nextNo');

  await pool.query(
    'UPDATE numbering_series SET prefix = :prefix, next_no = :nextNo, width = :width WHERE id = :id',
    { prefix, nextNo, width, id: current.id },
  );

  await audit({
    companyId: ctx.companyId,
    branchId: ctx.branchId,
    actorUserId: ctx.userId,
    action: 'settings.numbering.update',
    entityType: 'numbering_series',
    entityId: String(current.id),
    before: { prefix: current.prefix, nextNo: Number(current.next_no), width: Number(current.width) },
    after: { prefix, nextNo, width },
    requestId: ctx.requestId,
  });

  return { voucherType, prefix, nextNo, width };
}

/** Company statutory profile shown on the settings screen & on voucher PDFs. */
export async function getCompanyProfile(companyId: string): Promise<RowDataPacket | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, legal_name, pan, gstin, tan, cin, gst_reg_type, auto_einvoice_service,
            pt_regn, pf_regn, esi_regn, address, city, state_code, pincode
       FROM companies WHERE id = :companyId LIMIT 1`,
    { companyId },
  );
  return rows[0] ?? null;
}

/** Update company print/automation settings (currently: auto-IRN on service invoices). */
export async function updateCompanySettings(companyId: string, patch: { autoEinvoiceService?: boolean }): Promise<void> {
  if (patch.autoEinvoiceService !== undefined) {
    await pool.query('UPDATE companies SET auto_einvoice_service = :v WHERE id = :companyId', { v: patch.autoEinvoiceService ? 1 : 0, companyId });
  }
}

export interface BankAccount { id: string; bankName: string; accountNo: string; ifsc: string | null; branch: string | null; upi: string | null; printDefault: boolean }

export async function listBankAccounts(companyId: string): Promise<BankAccount[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, bank_name AS bankName, account_no AS accountNo, ifsc, branch, upi, print_default AS printDefault FROM bank_accounts WHERE company_id = :companyId ORDER BY print_default DESC, created_at',
    { companyId });
  return rows.map((r) => ({ id: String(r.id), bankName: String(r.bankName), accountNo: String(r.accountNo), ifsc: r.ifsc ?? null, branch: r.branch ?? null, upi: r.upi ?? null, printDefault: !!r.printDefault }));
}

/** The bank account to print on vouchers/invoices (the flagged default, else the first). */
export async function getPrintBank(companyId: string): Promise<BankAccount | null> {
  const banks = await listBankAccounts(companyId);
  return banks.find((b) => b.printDefault) ?? banks[0] ?? null;
}

export async function addBankAccount(companyId: string, input: { bankName: string; accountNo: string; ifsc?: string; branch?: string; upi?: string }): Promise<BankAccount> {
  const id = randomUUID();
  const [existing] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM bank_accounts WHERE company_id = :companyId', { companyId });
  const first = Number((existing[0] as RowDataPacket)?.c ?? 0) === 0;
  await pool.query(
    'INSERT INTO bank_accounts (id, company_id, bank_name, account_no, ifsc, branch, upi, print_default) VALUES (:id,:companyId,:bankName,:accountNo,:ifsc,:branch,:upi,:pd)',
    { id, companyId, bankName: input.bankName, accountNo: input.accountNo, ifsc: input.ifsc ?? null, branch: input.branch ?? null, upi: input.upi ?? null, pd: first ? 1 : 0 });
  return { id, bankName: input.bankName, accountNo: input.accountNo, ifsc: input.ifsc ?? null, branch: input.branch ?? null, upi: input.upi ?? null, printDefault: first };
}

/** Choose which bank account prints on vouchers (exclusive default). */
export async function setPrintBank(companyId: string, bankId: string): Promise<void> {
  await pool.query('UPDATE bank_accounts SET print_default = IF(id = :bankId, 1, 0) WHERE company_id = :companyId', { bankId, companyId });
}
