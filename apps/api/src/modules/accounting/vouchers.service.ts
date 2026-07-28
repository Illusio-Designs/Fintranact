import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { VoucherCreateInput } from '@fintranact/validation';
import { pool, withTransaction } from '../../common/db.js';
import { Errors } from '../../common/errors.js';
import { audit } from '../../common/audit.js';
import { assertPeriodOpen } from './periods.service.js';

interface Ctx {
  companyId: string;
  branchId?: string | null;
  userId: string;
  requestId?: string;
}

/** Normalise a date string (dd-mm-yyyy / ISO) → YYYY-MM-DD. */
function toDate(s: string): string {
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, '0')}-${dmy[1]!.padStart(2, '0')}`;
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return s.slice(0, 10);
  throw Errors.validation('Invalid date; use YYYY-MM-DD or DD-MM-YYYY', 'date');
}

/** Allocate the next voucher number for (company, type) with a row lock. */
async function nextVoucherNo(conn: PoolConnection, companyId: string, type: string): Promise<string> {
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT id, prefix, next_no, width FROM numbering_series WHERE company_id = :companyId AND voucher_type = :type FOR UPDATE',
    { companyId, type },
  );
  let series = rows[0];
  if (!series) {
    // create a series on the fly if missing
    const id = randomUUID();
    const prefix = `${type.slice(0, 3).toUpperCase()}/`;
    await conn.query(
      'INSERT INTO numbering_series (id, company_id, voucher_type, prefix, next_no, width) VALUES (?, ?, ?, ?, 1, 4)',
      [id, companyId, type, prefix],
    );
    series = { id, prefix, next_no: 1, width: 4 } as RowDataPacket;
  }
  const no = Number(series.next_no);
  const voucherNo = `${series.prefix}${String(no).padStart(Number(series.width), '0')}`;
  await conn.query('UPDATE numbering_series SET next_no = next_no + 1 WHERE id = ?', [series.id]);
  return voucherNo;
}

/**
 * Create & post a balanced double-entry voucher. Schema already guarantees
 * debits === credits; here we allocate the number, persist header + lines, and audit.
 */
export async function createVoucher(
  input: VoucherCreateInput,
  ctx: Ctx,
): Promise<{ id: string; voucherNo: string }> {
  const date = toDate(input.date);
  return withTransaction(async (conn) => {
    await assertPeriodOpen(ctx.companyId, date, conn); // refuse to post into a locked month
    const voucherNo = await nextVoucherNo(conn, ctx.companyId, input.type);
    const id = randomUUID();

    await conn.query(
      `INSERT INTO vouchers (id, company_id, branch_id, type, voucher_no, date, narration, status, created_by)
       VALUES (:id, :companyId, :branchId, :type, :voucherNo, :date, :narration, 'posted', :userId)`,
      {
        id,
        companyId: ctx.companyId,
        branchId: input.branchId ?? ctx.branchId ?? null,
        type: input.type,
        voucherNo,
        date,
        narration: input.narration ?? null,
        userId: ctx.userId,
      },
    );

    for (const line of input.lines) {
      await conn.query(
        `INSERT INTO voucher_lines (id, company_id, voucher_id, ledger_id, dr_amount, cr_amount, narration)
         VALUES (:id, :companyId, :voucherId, :ledgerId, :dr, :cr, :narration)`,
        {
          id: randomUUID(),
          companyId: ctx.companyId,
          voucherId: id,
          ledgerId: line.ledgerId,
          dr: line.drCr === 'dr' ? line.amount : 0,
          cr: line.drCr === 'cr' ? line.amount : 0,
          narration: line.narration ?? null,
        },
      );
    }

    await audit(
      {
        companyId: ctx.companyId,
        branchId: ctx.branchId,
        actorUserId: ctx.userId,
        action: 'voucher.post',
        entityType: 'voucher',
        entityId: id,
        after: { type: input.type, voucherNo, lines: input.lines.length },
        requestId: ctx.requestId,
      },
      conn,
    );

    return { id, voucherNo };
  });
}

export async function listVouchers(
  companyId: string,
  opts: { type?: string; limit?: number } = {},
): Promise<RowDataPacket[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const params: Record<string, string | number> = { companyId, limit };
  let where = 'company_id = :companyId';
  if (opts.type) {
    where += ' AND type = :type';
    params.type = opts.type;
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, type, voucher_no, date, narration, status, created_at
       FROM vouchers WHERE ${where} ORDER BY date DESC, created_at DESC LIMIT :limit`,
    params,
  );
  return rows;
}

export async function getVoucher(companyId: string, id: string): Promise<RowDataPacket | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM vouchers WHERE company_id = :companyId AND id = :id LIMIT 1',
    { companyId, id },
  );
  const voucher = rows[0];
  if (!voucher) return null;
  const [lines] = await pool.query<RowDataPacket[]>(
    `SELECT vl.ledger_id, l.name AS ledger_name, vl.dr_amount, vl.cr_amount, vl.narration
       FROM voucher_lines vl JOIN ledgers l ON l.id = vl.ledger_id
      WHERE vl.voucher_id = :id`,
    { id },
  );
  return { ...voucher, lines } as RowDataPacket;
}
