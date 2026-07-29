import { randomBytes, publicEncrypt, createCipheriv, createDecipheriv, constants } from 'node:crypto';

/**
 * NIC / Cygnet (Whitebooks) e-invoice payload encryption.
 *
 * Flow:
 *  1. Client generates a random 32-byte AppKey (AES-256).
 *  2. Auth request sends the AppKey RSA-encrypted with the GSP's public key.
 *  3. Auth response returns `Sek` = a server session key, AES-ECB-encrypted with the AppKey.
 *     Decrypt it with the AppKey to obtain the session key.
 *  4. Every subsequent request encrypts its JSON payload with the session key (AES-256-ECB,
 *     PKCS7) as base64 in `{ Data }`; the response `Data` is decrypted the same way.
 *
 * All primitives are Node built-ins — no external dependency.
 */

/** Fresh 32-byte AES app key for a session. */
export function newAppKey(): Buffer {
  return randomBytes(32);
}

/** RSA/PKCS1-encrypt the app key (base64) for the auth request. */
export function rsaEncryptAppKey(appKey: Buffer, publicKeyPem: string): string {
  const enc = publicEncrypt({ key: publicKeyPem, padding: constants.RSA_PKCS1_PADDING }, appKey);
  return enc.toString('base64');
}

/** AES-256-ECB encrypt a UTF-8 string, base64 out. */
export function aesEcbEncrypt(plaintext: string, key: Buffer): string {
  const cipher = createCipheriv('aes-256-ecb', key, null);
  return Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]).toString('base64');
}

/** AES-256-ECB decrypt base64 → UTF-8. */
export function aesEcbDecrypt(b64: string, key: Buffer): string {
  const decipher = createDecipheriv('aes-256-ecb', key, null);
  return Buffer.concat([decipher.update(Buffer.from(b64, 'base64')), decipher.final()]).toString('utf8');
}

/** Recover the session key: base64(Sek) is the session key AES-ECB-encrypted with the app key. */
export function decryptSek(sekB64: string, appKey: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-ecb', appKey, null);
  return Buffer.concat([decipher.update(Buffer.from(sekB64, 'base64')), decipher.final()]);
}

/** Encrypt a request payload object with the session key. */
export function encryptPayload(obj: unknown, sessionKey: Buffer): string {
  return aesEcbEncrypt(JSON.stringify(obj), sessionKey);
}

/** Decrypt a response `Data` field with the session key, returning parsed JSON. */
export function decryptResponse<T = unknown>(dataB64: string, sessionKey: Buffer): T {
  return JSON.parse(aesEcbDecrypt(dataB64, sessionKey)) as T;
}
