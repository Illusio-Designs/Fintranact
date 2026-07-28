import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import type { LedgerCreateInput } from '@fintranact/validation';
import { pool, withTransaction } from '../../common/db.js';
import { audit } from '../../common/audit.js';

interface Ctx {
  companyId: string;
  userId: string;
  requestId?: string;
}

export async function createLedger(input: LedgerCreateInput, ctx: Ctx): Promise<{ id: string }> {
  return withTransaction(async (conn) => {
    const id = randomUUID();
    const defaultAddr = input.addresses.find((a) => a.isDefault) ?? input.addresses[0];
    await conn.query(
      `INSERT INTO ledgers (id, company_id, name, category, pan, gstin, state, blacklisted, blacklist_reason, created_by)
       VALUES (:id, :companyId, :name, :category, :pan, :gstin, :state, :bl, :reason, :userId)`,
      {
        id,
        companyId: ctx.companyId,
        name: input.name,
        category: input.category,
        pan: input.pan ?? null,
        gstin: input.gstin ?? defaultAddr?.gstin ?? null,
        state: defaultAddr?.state ?? null,
        bl: input.blacklisted ? 1 : 0,
        reason: input.blacklisted ? (input.blacklistReason ?? null) : null,
        userId: ctx.userId,
      },
    );

    for (const a of input.addresses) {
      await conn.query(
        `INSERT INTO ledger_addresses (id, company_id, ledger_id, type, line, state, gstin, is_default)
         VALUES (:id, :companyId, :ledgerId, :type, :line, :state, :gstin, :isDefault)`,
        {
          id: randomUUID(),
          companyId: ctx.companyId,
          ledgerId: id,
          type: a.type,
          line: a.line,
          state: a.state,
          gstin: a.gstin ?? null,
          isDefault: a.isDefault ? 1 : 0,
        },
      );
    }

    await audit(
      {
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        action: 'ledger.create',
        entityType: 'ledger',
        entityId: id,
        after: { name: input.name, category: input.category, blacklisted: input.blacklisted },
        requestId: ctx.requestId,
      },
      conn,
    );

    return { id };
  });
}

export async function listLedgers(
  companyId: string,
  opts: { category?: string; limit?: number } = {},
): Promise<RowDataPacket[]> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const params: Record<string, string | number> = { companyId, limit };
  let where = 'company_id = :companyId AND deleted_at IS NULL';
  if (opts.category) {
    where += ' AND category = :category';
    params.category = opts.category;
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, category, pan, gstin, state, blacklisted
       FROM ledgers WHERE ${where} ORDER BY name LIMIT :limit`,
    params,
  );
  return rows;
}

export async function getLedger(companyId: string, id: string): Promise<RowDataPacket | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM ledgers WHERE company_id = :companyId AND id = :id LIMIT 1',
    { companyId, id },
  );
  const ledger = rows[0];
  if (!ledger) return null;
  const [addresses] = await pool.query<RowDataPacket[]>(
    'SELECT type, line, state, gstin, is_default FROM ledger_addresses WHERE ledger_id = :id',
    { id },
  );
  return { ...ledger, addresses } as RowDataPacket;
}

/** Blacklist / un-blacklist a party (approval-gating layered on in a later phase). */
export async function setBlacklist(
  ctx: Ctx,
  id: string,
  blacklisted: boolean,
  reason?: string,
): Promise<void> {
  await pool.query(
    'UPDATE ledgers SET blacklisted = :bl, blacklist_reason = :reason WHERE company_id = :companyId AND id = :id',
    { bl: blacklisted ? 1 : 0, reason: blacklisted ? (reason ?? null) : null, companyId: ctx.companyId, id },
  );
  await audit({
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: blacklisted ? 'ledger.blacklist' : 'ledger.unblacklist',
    entityType: 'ledger',
    entityId: id,
    after: { blacklisted, reason },
    requestId: ctx.requestId,
  }).catch(() => undefined);
}
