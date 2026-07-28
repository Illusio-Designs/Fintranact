import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../common/db.js';
import { Errors } from '../../common/errors.js';
import { audit } from '../../common/audit.js';

interface Ctx { companyId: string; branchId?: string | null; userId: string; requestId?: string }

export interface PeriodLock { period: string; note: string | null; lockedAt: string; lockedBy: string | null }

/** True when the given YYYY-MM-DD falls in a locked month. Accepts an optional txn conn. */
export async function isPeriodLocked(companyId: string, date: string, conn?: PoolConnection): Promise<boolean> {
  const period = date.slice(0, 7);
  const runner = conn ?? pool;
  const [rows] = await runner.query<RowDataPacket[]>(
    'SELECT 1 FROM period_locks WHERE company_id = ? AND period = ? LIMIT 1',
    [companyId, period],
  );
  return rows.length > 0;
}

/** Throws if the period is locked — call before posting/editing a voucher. */
export async function assertPeriodOpen(companyId: string, date: string, conn?: PoolConnection): Promise<void> {
  if (await isPeriodLocked(companyId, date, conn)) {
    throw Errors.validation(`Period ${date.slice(0, 7)} is locked — unlock it before posting.`, 'date');
  }
}

export async function listLocks(companyId: string): Promise<PeriodLock[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT period, note, locked_at AS lockedAt, locked_by AS lockedBy FROM period_locks WHERE company_id = ? ORDER BY period DESC',
    [companyId],
  );
  return rows.map((r) => ({ period: r.period as string, note: (r.note as string) ?? null, lockedAt: String(r.lockedAt), lockedBy: (r.lockedBy as string) ?? null }));
}

export async function lockPeriod(companyId: string, period: string, note: string | null, ctx: Ctx): Promise<void> {
  if (!/^\d{4}-\d{2}$/.test(period)) throw Errors.validation('Period must be YYYY-MM', 'period');
  await pool.query(
    'INSERT IGNORE INTO period_locks (id, company_id, period, note, locked_by) VALUES (?, ?, ?, ?, ?)',
    [randomUUID(), companyId, period, note, ctx.userId],
  );
  await audit({ companyId, branchId: ctx.branchId, actorUserId: ctx.userId, action: 'period.lock', entityType: 'period', entityId: period, after: { period, note }, requestId: ctx.requestId });
}

/** Unlocking a closed period is a privileged, fully-audited action. */
export async function unlockPeriod(companyId: string, period: string, ctx: Ctx): Promise<void> {
  await pool.query('DELETE FROM period_locks WHERE company_id = ? AND period = ?', [companyId, period]);
  await audit({ companyId, branchId: ctx.branchId, actorUserId: ctx.userId, action: 'period.unlock', entityType: 'period', entityId: period, before: { period }, requestId: ctx.requestId });
}
