import { createHash, randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../common/db.js';
import { Errors } from '../../common/errors.js';
import { audit } from '../../common/audit.js';
import { config } from '../../config.js';
import { getVoucher } from '../accounting/vouchers.service.js';
import { getCompanyProfile } from '../settings/settings.service.js';

export interface EInvoiceResult {
  invoiceNo: string; party: string; date: string; value: number;
  irn: string; ack: string; ackDate: string; signedQr: string; status: 'generated';
}

const digits = (hex: string, n: number): string => {
  let out = '';
  for (const ch of hex) { out += (parseInt(ch, 16) % 10).toString(); if (out.length >= n) break; }
  return out.padEnd(n, '0').slice(0, n);
};

/** Sandbox IRP: deterministic IRN + AckNo + signed-QR from the invoice identity. */
function sandboxIrn(gstin: string, docNo: string, value: number, dateIso: string): Omit<EInvoiceResult, 'invoiceNo' | 'party' | 'date' | 'value' | 'status'> {
  const irn = createHash('sha256').update(`${gstin}|${docNo}|2026-27`).digest('hex'); // 64 hex chars, IRP-shaped
  const ack = digits(irn, 15);
  const qrPayload = { irn, gstin, docNo, val: value, date: dateIso };
  const signedQr = Buffer.from(JSON.stringify(qrPayload)).toString('base64');
  return { irn, ack, ackDate: new Date().toISOString(), signedQr };
}

/** Live IRP/GSP call — used when EINVOICE_MODE=live and an endpoint is configured. */
async function liveIrn(payload: unknown): Promise<{ irn: string; ack: string; ackDate: string; signedQr: string }> {
  const { apiUrl, apiKey } = config.integrations.einvoice;
  if (!apiUrl) throw Errors.validation('EINVOICE_API_URL not configured for live mode');
  const res = await fetch(`${apiUrl}/einvoice/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as Record<string, string>;
  if (!res.ok) throw Errors.validation(`IRP error: ${body?.message ?? res.status}`);
  return { irn: body.Irn ?? '', ack: body.AckNo ?? '', ackDate: body.AckDt ?? new Date().toISOString(), signedQr: body.SignedQRCode ?? '' };
}

interface Ctx { companyId: string; userId: string; requestId?: string }

/** Generate (or return existing) the IRN for a posted sales voucher. */
export async function generateEInvoice(voucherId: string, ctx: Ctx): Promise<EInvoiceResult> {
  const voucher = await getVoucher(ctx.companyId, voucherId);
  if (!voucher) throw Errors.notFound('Voucher not found');
  if (String(voucher.type) !== 'sales') throw Errors.validation('e-Invoice applies to sales invoices only');
  const company = await getCompanyProfile(ctx.companyId);
  const gstin = String(company?.gstin ?? '');
  const docNo = String(voucher.voucher_no);
  const dateIso = new Date(voucher.date as string).toISOString();
  const lines = Array.isArray(voucher.lines) ? voucher.lines : [];
  const value = lines.reduce((s: number, l: RowDataPacket) => s + Number(l.dr_amount || 0), 0);
  // On a sales voucher the party (debtor) carries the largest debit.
  const debitLine = lines.reduce((best: RowDataPacket | null, l: RowDataPacket) =>
    (!best || Number(l.dr_amount || 0) > Number(best.dr_amount || 0)) ? l : best, null);
  const party = debitLine?.ledger_name ? String(debitLine.ledger_name) : '';

  const mode = config.integrations.einvoice.mode;
  const gen = mode === 'live'
    ? await liveIrn({ gstin, docNo, value, date: dateIso })
    : sandboxIrn(gstin, docNo, value, dateIso);

  const id = randomUUID();
  await pool.query(
    `INSERT INTO e_invoices (id, company_id, voucher_id, invoice_no, party, date, value, irn, signed_qr, ack, ack_date, status)
     VALUES (:id,:companyId,:voucherId,:invoiceNo,:party,:date,:value,:irn,:signedQr,:ack,:ackDate,'generated')
     ON DUPLICATE KEY UPDATE irn=VALUES(irn), signed_qr=VALUES(signed_qr), ack=VALUES(ack), ack_date=VALUES(ack_date), status='generated'`,
    { id, companyId: ctx.companyId, voucherId, invoiceNo: docNo, party, date: dateIso.slice(0, 10), value, irn: gen.irn, signedQr: gen.signedQr, ack: gen.ack, ackDate: gen.ackDate.slice(0, 19).replace('T', ' ') },
  );
  await audit({ companyId: ctx.companyId, actorUserId: ctx.userId, action: 'einvoice.generate', entityType: 'e_invoice', entityId: docNo, after: { irn: gen.irn, ack: gen.ack, mode }, requestId: ctx.requestId });
  return { invoiceNo: docNo, party, date: dateIso.slice(0, 10), value, ...gen, status: 'generated' };
}
