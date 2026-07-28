import { createHash } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from './db.js';

export interface AuditEntry {
  companyId: string;
  branchId?: string | null;
  actorUserId: string | null;
  action: string; // e.g. "login", "voucher.post", "payment.approve"
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Append a tamper-evident audit record. Each row chains the previous row's hash
 * so any tampering is detectable (see PRD §7.5). Best-effort, append-only.
 */
export async function audit(entry: AuditEntry, conn?: PoolConnection): Promise<void> {
  const db = conn ?? pool;
  const [rows] = await db.query(
    'SELECT hash FROM audit_logs WHERE company_id = :companyId ORDER BY id DESC LIMIT 1',
    { companyId: entry.companyId },
  );
  const prevHash = (rows as Array<{ hash: string }>)[0]?.hash ?? '';

  const payload = JSON.stringify({
    companyId: entry.companyId,
    branchId: entry.branchId ?? null,
    actorUserId: entry.actorUserId,
    action: entry.action,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    at: new Date().toISOString(),
  });
  const hash = createHash('sha256').update(prevHash + payload).digest('hex');

  await db.query(
    `INSERT INTO audit_logs
       (company_id, branch_id, actor_user_id, action, entity_type, entity_id,
        before_json, after_json, ip, user_agent, request_id, prev_hash, hash)
     VALUES
       (:companyId, :branchId, :actorUserId, :action, :entityType, :entityId,
        :before, :after, :ip, :userAgent, :requestId, :prevHash, :hash)`,
    {
      companyId: entry.companyId,
      branchId: entry.branchId ?? null,
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      before: entry.before != null ? JSON.stringify(entry.before) : null,
      after: entry.after != null ? JSON.stringify(entry.after) : null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      requestId: entry.requestId ?? null,
      prevHash,
      hash,
    },
  );
}
