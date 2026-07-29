import { config } from '../../config.js';
import { Errors } from '../../common/errors.js';
import { newAppKey, rsaEncryptAppKey, decryptSek, encryptPayload, decryptResponse } from './whitebooks-crypto.js';

/**
 * Whitebooks (whitebooks.in / Cygnet) GSP client. One credential set (GSP_*) is
 * shared by e-invoice and e-way. Flow: authenticate -> cache AuthToken (+ session
 * key when GSP_ENCRYPTION=on) -> call GENERATE with the token + client headers.
 *
 * With GSP_ENCRYPTION=on the NIC SEK scheme is used: a random AppKey is RSA-encrypted
 * with GSP_PUBLIC_KEY on auth, the returned Sek is decrypted to a session key, and each
 * request payload is AES-256-ECB encrypted as { Data } (response `Data` decrypted back).
 * With it off, plain JSON is exchanged (many GSP tenants handle the crypto server-side).
 */

let cached: { token: string; expiry: number; sessionKey: Buffer | null } | null = null;

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

async function authenticate(): Promise<{ token: string; sessionKey: Buffer | null }> {
  const now = Date.now();
  if (cached && cached.expiry > now + 60_000) return cached;
  const g = config.integrations.gsp;
  if (!g.username || !g.password) throw Errors.validation('Whitebooks GSP credentials (GSP_USERNAME/PASSWORD) not configured');

  let appKey: Buffer | null = null;
  const authBody: Record<string, unknown> = { UserName: g.username, Password: g.password, ForceRefreshAccessToken: true };
  if (g.encryption) {
    if (!g.publicKey) throw Errors.validation('GSP_ENCRYPTION=on but GSP_PUBLIC_KEY is not set');
    appKey = newAppKey();
    authBody.AppKey = rsaEncryptAppKey(appKey, g.publicKey);
  }

  const res = await fetch(`${g.baseUrl}/einvoice/authenticate?email=${encodeURIComponent(g.email)}`, {
    method: g.encryption ? 'POST' : 'GET', headers: headers(), body: g.encryption ? JSON.stringify(authBody) : undefined,
  });
  const body = (await res.json()) as { data?: { AuthToken?: string; TokenExpiry?: string; Sek?: string } };
  const token = body?.data?.AuthToken;
  if (!res.ok || !token) throw Errors.validation(`Whitebooks auth failed: ${JSON.stringify(body).slice(0, 200)}`);

  let sessionKey: Buffer | null = null;
  if (g.encryption && appKey && body.data?.Sek) sessionKey = decryptSek(body.data.Sek, appKey);

  cached = { token, expiry: body.data?.TokenExpiry ? Date.parse(body.data.TokenExpiry) : now + 6 * 3600_000, sessionKey };
  return cached;
}

/** POST a payload to a GSP endpoint, encrypting/decrypting when SEK is active. */
async function call(path: string, payload: unknown): Promise<Record<string, string>> {
  const g = config.integrations.gsp;
  const { token, sessionKey } = await authenticate();
  const body = g.encryption && sessionKey ? JSON.stringify({ Data: encryptPayload(payload, sessionKey) }) : JSON.stringify(payload);
  const res = await fetch(`${g.baseUrl}${path}?email=${encodeURIComponent(g.email)}`, { method: 'POST', headers: headers({ 'auth-token': token }), body });
  const raw = (await res.json()) as { data?: unknown; error_message?: string };
  if (!res.ok) throw Errors.validation(`Whitebooks error: ${raw?.error_message ?? JSON.stringify(raw).slice(0, 200)}`);
  // Encrypted responses return `data` as a base64 blob to decrypt; plain returns an object.
  if (g.encryption && sessionKey && typeof raw.data === 'string') return decryptResponse<Record<string, string>>(raw.data, sessionKey);
  return (raw.data ?? {}) as Record<string, string>;
}

/** Generate an IRN via Whitebooks. */
export async function whitebooksIrn(payload: unknown): Promise<{ irn: string; ack: string; ackDate: string; signedQr: string }> {
  const d = await call('/einvoice/type/GENERATE/version/V1_03', payload);
  if (!d?.Irn) throw Errors.validation(`Whitebooks IRN error: ${JSON.stringify(d).slice(0, 200)}`);
  return { irn: d.Irn, ack: d.AckNo ?? '', ackDate: d.AckDt ?? new Date().toISOString(), signedQr: d.SignedQRCode ?? '' };
}

/** Generate an e-Way Bill via Whitebooks. */
export async function whitebooksEwb(payload: unknown): Promise<{ ewbNo: string; validTill: string }> {
  const d = await call('/ewaybillapi/v1.03/ewayapi/genewaybill', payload);
  if (!d?.ewayBillNo) throw Errors.validation(`Whitebooks e-Way error: ${JSON.stringify(d).slice(0, 200)}`);
  return { ewbNo: String(d.ewayBillNo), validTill: d.validUpto ?? '' };
}
