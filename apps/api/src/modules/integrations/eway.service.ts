import { createHash, randomUUID } from 'node:crypto';
import { pool } from '../../common/db.js';
import { Errors } from '../../common/errors.js';
import { audit } from '../../common/audit.js';
import { config } from '../../config.js';

export interface EwayInput {
  voucherId?: string; invoiceNo: string; party: string; from: string; to: string;
  distance: number; value: number; vehicleNo?: string; transportMode?: string;
}
export interface EwayResult extends EwayInput { ewbNo: string; validTill: string; status: 'active' }

const digits = (hex: string, n: number): string => {
  let out = '';
  for (const ch of hex) { out += (parseInt(ch, 16) % 10).toString(); if (out.length >= n) break; }
  return out.padEnd(n, '0').slice(0, n);
};

/** Sandbox NIC: 12-digit EWB number + distance-slab validity (1 day / 200 km, min 1). */
function sandboxEwb(inv: string, value: number, distance: number): { ewbNo: string; validTill: string } {
  const h = createHash('sha256').update(`${inv}|${value}`).digest('hex');
  const raw = digits(h, 12);
  const ewbNo = `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)}`;
  const days = Math.max(1, Math.ceil((distance || 1) / 200));
  const till = new Date(); till.setDate(till.getDate() + days);
  return { ewbNo, validTill: till.toISOString().slice(0, 10) };
}

async function liveEwb(payload: unknown): Promise<{ ewbNo: string; validTill: string }> {
  const { apiUrl, apiKey } = config.integrations.eway;
  if (!apiUrl) throw Errors.validation('EWAY_API_URL not configured for live mode');
  const res = await fetch(`${apiUrl}/ewayapi/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(payload),
  });
  const body = (await res.json()) as Record<string, string>;
  if (!res.ok) throw Errors.validation(`NIC error: ${body?.message ?? res.status}`);
  return { ewbNo: body.ewayBillNo ?? '', validTill: body.validUpto ?? '' };
}

interface Ctx { companyId: string; userId: string; requestId?: string }

export async function generateEway(input: EwayInput, ctx: Ctx): Promise<EwayResult> {
  if (input.value < 50000) throw Errors.validation('e-Way Bill is required only for consignments above ₹50,000', 'value');
  const mode = config.integrations.eway.mode;
  const gen = mode === 'live' ? await liveEwb(input) : sandboxEwb(input.invoiceNo, input.value, input.distance);

  const id = randomUUID();
  await pool.query(
    `INSERT INTO eway_bills (id, company_id, voucher_id, ewb_no, invoice_no, party, from_place, to_place, vehicle_no, transport_mode, distance, value, valid_till, status)
     VALUES (:id,:companyId,:voucherId,:ewbNo,:invoiceNo,:party,:from,:to,:vehicleNo,:transportMode,:distance,:value,:validTill,'active')`,
    { id, companyId: ctx.companyId, voucherId: input.voucherId ?? null, ewbNo: gen.ewbNo, invoiceNo: input.invoiceNo, party: input.party, from: input.from, to: input.to, vehicleNo: input.vehicleNo ?? null, transportMode: input.transportMode ?? 'Road', distance: input.distance, value: input.value, validTill: gen.validTill },
  );
  await audit({ companyId: ctx.companyId, actorUserId: ctx.userId, action: 'eway.generate', entityType: 'eway_bill', entityId: input.invoiceNo, after: { ewbNo: gen.ewbNo, mode }, requestId: ctx.requestId });
  return { ...input, ewbNo: gen.ewbNo, validTill: gen.validTill, status: 'active' };
}
