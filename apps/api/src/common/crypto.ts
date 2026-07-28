import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';

/**
 * App-level field encryption for sensitive PII (PAN/Aadhaar/bank/salary) — PRD §7.4.
 * AES-256-GCM. Key is derived from the configured passphrase (KMS-managed in prod).
 * Stored layout: iv(12) | authTag(16) | ciphertext.
 */
const KEY = createHash('sha256').update(config.fieldKey).digest();

export function encryptField(plain: string | null | undefined): Buffer | null {
  if (plain == null || plain === '') return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}

export function decryptField(buf: Buffer | null | undefined): string | null {
  if (!buf || buf.length < 28) return null;
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
