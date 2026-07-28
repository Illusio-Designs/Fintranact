/**
 * @fintranact/validation — shared zod schemas used by both backend and frontend,
 * so a form and its API endpoint validate against one contract.
 */
import { z } from 'zod';

// ---- India-specific field validators ----
/** GSTIN: 15 chars — 2 state digits, 10-char PAN, entity/Z/checksum. */
export const gstinSchema = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN');

/** PAN: 5 letters, 4 digits, 1 letter. */
export const panSchema = z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN');

/** Indian FY string like "2026-27". */
export const financialYearSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Financial year must look like 2026-27');

/** Money as a non-negative decimal string/number (stored as DECIMAL(19,4)). */
export const moneySchema = z.coerce.number().nonnegative().finite();

// ---- Auth ----
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Secret signing PIN (per-user, step-up) — 4–6 digits (see PRD §5.15). */
export const signingPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
});

// ---- Ledger master (categories, multi-address, blacklist — PRD §5.2) ----
export const addressSchema = z.object({
  type: z.enum(['registered', 'shipping', 'works']),
  line: z.string().min(1),
  state: z.string().min(1),
  gstin: gstinSchema.optional(),
  isDefault: z.boolean().default(false),
});

export const ledgerCategory = z.enum([
  'customer',
  'supplier',
  'jobworker',
  'transporter',
  'expense',
  'bank',
  'cash',
  'statutory',
]);

export const ledgerCreateSchema = z.object({
  name: z.string().min(1),
  category: ledgerCategory,
  pan: panSchema.optional(),
  gstin: gstinSchema.optional(),
  addresses: z.array(addressSchema).default([]),
  blacklisted: z.boolean().default(false),
  blacklistReason: z.string().optional(),
});
export type LedgerCreateInput = z.infer<typeof ledgerCreateSchema>;

// ---- Excel import of legacy/older data (see PRD §5.19) ----
/** Empty cell → undefined; trims strings. Used to tolerate messy spreadsheets. */
const emptyToUndef = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : typeof v === 'string' ? v.trim() : v;

/** One flat ledger row as it appears in the import spreadsheet (opening balance inline). */
export const ledgerImportRowSchema = z
  .object({
    name: z.preprocess(emptyToUndef, z.string().min(1, 'Name is required')),
    category: z.preprocess(
      (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
      ledgerCategory,
    ),
    pan: z.preprocess(emptyToUndef, panSchema.optional()),
    gstin: z.preprocess(emptyToUndef, gstinSchema.optional()),
    state: z.preprocess(emptyToUndef, z.string().optional()),
    openingDr: z.preprocess((v) => (v == null || v === '' ? 0 : v), z.coerce.number().nonnegative()),
    openingCr: z.preprocess((v) => (v == null || v === '' ? 0 : v), z.coerce.number().nonnegative()),
  })
  .refine((r) => !(r.openingDr > 0 && r.openingCr > 0), {
    message: 'A ledger cannot have both a debit and a credit opening balance',
    path: ['openingDr'],
  });
export type LedgerImportRow = z.infer<typeof ledgerImportRowSchema>;
