import { config } from '../../config.js';
import { Errors } from '../../common/errors.js';

/**
 * Whitebooks (whitebooks.in / Cygnet) GSP client. One credential set (GSP_*) is
 * shared by e-invoice and e-way. Flow: authenticate -> cache AuthToken -> call
 * GENERATE with the token + client headers.
 *
 * NOTE: Whitebooks' production API may require SEK/AES payload encryption; the
 * request shape here follows their documented header/endpoint conventions and is
 * the integration point to finalise against their sandbox once credentials exist.
 */

let cached: { token: string; expiry: number } | null = null;

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const g = config.integrations.gsp;
  return {
    'Content-Type': 'application/json',
    username: g.username,
    password: g.password,
    client_id: g.clientId,
    client_secret: g.clientSecret,
    gstin: g.gstin,
    ...extra,
  };
}

async function authenticate(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiry > now + 60_000) return cached.token;
  const g = config.integrations.gsp;
  if (!g.username || !g.password) throw Errors.validation('Whitebooks GSP credentials (GSP_USERNAME/PASSWORD) not configured');
  const res = await fetch(`${g.baseUrl}/einvoice/authenticate?email=${encodeURIComponent(g.email)}`, { method: 'GET', headers: headers() });
  const body = (await res.json()) as { status_cd?: string; data?: { AuthToken?: string; TokenExpiry?: string } };
  const token = body?.data?.AuthToken;
  if (!res.ok || !token) throw Errors.validation(`Whitebooks auth failed: ${JSON.stringify(body).slice(0, 200)}`);
  cached = { token, expiry: body.data?.TokenExpiry ? Date.parse(body.data.TokenExpiry) : now + 6 * 3600_000 };
  return token;
}

/** Generate an IRN via Whitebooks. Returns IRP fields. */
export async function whitebooksIrn(payload: unknown): Promise<{ irn: string; ack: string; ackDate: string; signedQr: string }> {
  const g = config.integrations.gsp;
  const token = await authenticate();
  const res = await fetch(`${g.baseUrl}/einvoice/type/GENERATE/version/V1_03?email=${encodeURIComponent(g.email)}`, {
    method: 'POST', headers: headers({ 'auth-token': token }), body: JSON.stringify(payload),
  });
  const body = (await res.json()) as { data?: Record<string, string>; error_message?: string };
  const d = body?.data;
  if (!res.ok || !d?.Irn) throw Errors.validation(`Whitebooks IRN error: ${body?.error_message ?? JSON.stringify(body).slice(0, 200)}`);
  return { irn: d.Irn, ack: d.AckNo ?? '', ackDate: d.AckDt ?? new Date().toISOString(), signedQr: d.SignedQRCode ?? '' };
}

/** Generate an e-Way Bill via Whitebooks. */
export async function whitebooksEwb(payload: unknown): Promise<{ ewbNo: string; validTill: string }> {
  const g = config.integrations.gsp;
  const token = await authenticate();
  const res = await fetch(`${g.baseUrl}/ewaybillapi/v1.03/ewayapi/genewaybill?email=${encodeURIComponent(g.email)}`, {
    method: 'POST', headers: headers({ 'auth-token': token }), body: JSON.stringify(payload),
  });
  const body = (await res.json()) as { data?: Record<string, string>; error_message?: string };
  const d = body?.data;
  if (!res.ok || !d?.ewayBillNo) throw Errors.validation(`Whitebooks e-Way error: ${body?.error_message ?? JSON.stringify(body).slice(0, 200)}`);
  return { ewbNo: String(d.ewayBillNo), validTill: d.validUpto ?? '' };
}
