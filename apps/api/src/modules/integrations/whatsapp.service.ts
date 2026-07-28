import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../common/db.js';
import { Errors } from '../../common/errors.js';
import { audit } from '../../common/audit.js';
import { config } from '../../config.js';

export interface WhatsAppInput { to: string; toName?: string; kind?: string; body: string; docUrl?: string }
export interface WhatsAppResult { id: string; to: string; status: string; provider: string; providerMsgId: string | null }

/** Normalise to E.164-ish digits (Meta wants country-coded, no +). */
function normPhone(p: string): string {
  const d = p.replace(/[^\d]/g, '');
  if (d.length === 10) return `91${d}`;        // assume India if 10 digits
  return d;
}

/** Live Meta Cloud API send (text or document). */
async function liveSend(input: WhatsAppInput): Promise<string> {
  const { apiUrl, token, phoneId } = config.integrations.whatsapp;
  if (!token || !phoneId) throw Errors.validation('WHATSAPP_TOKEN / WHATSAPP_PHONE_ID not configured for live mode');
  const to = normPhone(input.to);
  const message = input.docUrl
    ? { messaging_product: 'whatsapp', to, type: 'document', document: { link: input.docUrl, caption: input.body } }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body: input.body } };
  const res = await fetch(`${apiUrl}/${phoneId}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(message),
  });
  const data = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
  if (!res.ok) throw Errors.validation(`WhatsApp error: ${data?.error?.message ?? res.status}`);
  return data.messages?.[0]?.id ?? '';
}

interface Ctx { companyId: string; userId: string; requestId?: string }

export async function sendWhatsApp(input: WhatsAppInput, ctx: Ctx): Promise<WhatsAppResult> {
  if (!input.to?.trim()) throw Errors.validation('Recipient phone is required', 'to');
  if (!input.body?.trim()) throw Errors.validation('Message body is required', 'body');
  const mode = config.integrations.whatsapp.mode;
  const id = randomUUID();
  let providerMsgId: string | null = null;
  let status: WhatsAppResult['status'] = 'sent';
  let error: string | null = null;
  try {
    providerMsgId = mode === 'live' ? await liveSend(input) : `wamid.SANDBOX${id.replace(/-/g, '').slice(0, 20)}`;
  } catch (e) {
    status = 'failed';
    error = (e as Error).message;
  }
  await pool.query(
    `INSERT INTO whatsapp_messages (id, company_id, to_phone, to_name, kind, body, doc_url, provider, provider_msg_id, status, error)
     VALUES (:id,:companyId,:to,:toName,:kind,:body,:docUrl,:provider,:providerMsgId,:status,:error)`,
    { id, companyId: ctx.companyId, to: normPhone(input.to), toName: input.toName ?? null, kind: input.kind ?? 'text', body: input.body, docUrl: input.docUrl ?? null, provider: mode, providerMsgId, status, error },
  );
  await audit({ companyId: ctx.companyId, actorUserId: ctx.userId, action: 'whatsapp.send', entityType: 'whatsapp_message', entityId: id, after: { to: normPhone(input.to), kind: input.kind, status, mode }, requestId: ctx.requestId });
  if (status === 'failed') throw Errors.validation(error ?? 'WhatsApp send failed');
  return { id, to: normPhone(input.to), status, provider: mode, providerMsgId };
}

export async function listWhatsApp(companyId: string): Promise<RowDataPacket[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, to_phone AS toPhone, to_name AS toName, kind, body, doc_url AS docUrl, provider, provider_msg_id AS providerMsgId, status, created_at AS createdAt
       FROM whatsapp_messages WHERE company_id = :companyId ORDER BY created_at DESC LIMIT 100`,
    { companyId });
  return rows;
}
