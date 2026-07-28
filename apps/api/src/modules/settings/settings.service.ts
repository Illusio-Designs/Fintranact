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
    `SELECT id, name, legal_name, pan, gstin, tan, cin, gst_reg_type,
            pt_regn, pf_regn, esi_regn, address, city, state_code, pincode
       FROM companies WHERE id = :companyId LIMIT 1`,
    { companyId },
  );
  return rows[0] ?? null;
}
