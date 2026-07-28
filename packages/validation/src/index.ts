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
  'income',
  'tax',
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

/** Item / material master row (job-work model: consumables + customer material). */
export const itemImportRowSchema = z.object({
  name: z.preprocess(emptyToUndef, z.string().min(1, 'Name is required')),
  kind: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.enum(['consumable', 'customer-material', 'finished']).default('consumable'),
  ),
  uom: z.preprocess(emptyToUndef, z.string().default('kg')),
  hsn: z.preprocess(emptyToUndef, z.string().optional()),
  openingQty: z.preprocess((v) => (v == null || v === '' ? 0 : v), z.coerce.number().nonnegative()),
  rate: z.preprocess((v) => (v == null || v === '' ? 0 : v), z.coerce.number().nonnegative()),
});
export type ItemImportRow = z.infer<typeof itemImportRowSchema>;

/** Employee master row for payroll onboarding. */
export const employeeImportRowSchema = z.object({
  empCode: z.preprocess(emptyToUndef, z.string().min(1, 'Emp Code is required')),
  name: z.preprocess(emptyToUndef, z.string().min(1, 'Name is required')),
  email: z.preprocess(emptyToUndef, z.string().email().optional()),
  pan: z.preprocess(emptyToUndef, panSchema.optional()),
  designation: z.preprocess(emptyToUndef, z.string().optional()),
  doj: z.preprocess(emptyToUndef, z.string().optional()), // dd-mm-yyyy or ISO; normalised on commit
  basic: z.preprocess((v) => (v == null || v === '' ? 0 : v), z.coerce.number().nonnegative()),
});
export type EmployeeImportRow = z.infer<typeof employeeImportRowSchema>;

// ---- Vouchers (double-entry) — PRD §5.3 ----
export const voucherType = z.enum([
  'payment',
  'receipt',
  'contra',
  'journal',
  'sales',
  'purchase',
  'credit_note',
  'debit_note',
]);
export type VoucherType = z.infer<typeof voucherType>;

export const voucherLineSchema = z.object({
  ledgerId: z.string().min(1, 'Ledger is required'),
  drCr: z.enum(['dr', 'cr']),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  narration: z.string().optional(),
});

/** A voucher must balance: total debits === total credits, and be non-zero. */
export const voucherCreateSchema = z
  .object({
    type: voucherType,
    date: z.string().min(1), // ISO or dd-mm-yyyy; normalised server-side
    branchId: z.string().optional(),
    narration: z.string().optional(),
    lines: z.array(voucherLineSchema).min(2, 'A voucher needs at least two lines'),
  })
  .refine(
    (v) => {
      const dr = v.lines.filter((l) => l.drCr === 'dr').reduce((s, l) => s + l.amount, 0);
      const cr = v.lines.filter((l) => l.drCr === 'cr').reduce((s, l) => s + l.amount, 0);
      // compare in paise to avoid float drift
      return dr > 0 && Math.round(dr * 100) === Math.round(cr * 100);
    },
    { message: 'Debits must equal credits', path: ['lines'] },
  );
export type VoucherCreateInput = z.infer<typeof voucherCreateSchema>;

// ---- Sales invoice (auto-composes the multi-line GST voucher) — PRD §5.6 ----
export const salesItemSchema = z.object({
  /** the income / service account to credit (e.g. Job Work Charges). */
  salesLedgerId: z.string().min(1, 'Service/income account is required'),
  taxable: z.coerce.number().positive('Taxable amount must be > 0'),
  gstRate: z.coerce.number().min(0).max(28),
  description: z.string().optional(),
});

/**
 * A sales invoice is entered as party + one or more service lines + place of
 * supply; the server derives the balanced voucher (Dr party; Cr service a/c;
 * Cr output CGST/SGST or IGST).
 */
export const salesInvoiceSchema = z.object({
  partyLedgerId: z.string().min(1, 'Customer is required'),
  placeOfSupply: z.enum(['intra', 'inter']),
  date: z.string().min(1),
  narration: z.string().optional(),
  items: z.array(salesItemSchema).min(1, 'Add at least one line'),
});
export type SalesInvoiceInput = z.infer<typeof salesInvoiceSchema>;

// ---- Purchase bill (auto-composes the multi-line GST voucher) — PRD §5.6 ----
export const purchaseItemSchema = z.object({
  /** the expense / purchase account to debit (e.g. Raw Material, Furnace Fuel). */
  purchaseLedgerId: z.string().min(1, 'Expense/purchase account is required'),
  taxable: z.coerce.number().positive('Taxable amount must be > 0'),
  gstRate: z.coerce.number().min(0).max(28),
  description: z.string().optional(),
});

/**
 * A purchase bill is entered as supplier + one or more expense lines + place of
 * supply; the server derives the balanced voucher (Dr expense a/c; Dr input
 * CGST/SGST or IGST; Cr supplier). Optional TDS on the taxable value reduces the
 * supplier credit and books a TDS-payable liability.
 */
export const purchaseInvoiceSchema = z.object({
  partyLedgerId: z.string().min(1, 'Supplier is required'),
  placeOfSupply: z.enum(['intra', 'inter']),
  date: z.string().min(1),
  narration: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'Add at least one line'),
  /** optional TDS deducted on the taxable value (e.g. 194Q @ 0.1%). */
  tdsRate: z.coerce.number().min(0).max(30).optional(),
});
export type PurchaseInvoiceInput = z.infer<typeof purchaseInvoiceSchema>;

// ---- Unified voucher composer for the remaining types — PRD §5.3 ----
const amount = z.coerce.number().positive('Amount must be > 0');
const gstFields = { placeOfSupply: z.enum(['intra', 'inter']), taxable: amount, gstRate: z.coerce.number().min(0).max(28) };

/** One endpoint composes payment / receipt / contra / journal / credit-note / debit-note into a balanced voucher. */
export const voucherComposeSchema = z.discriminatedUnion('kind', [
  // Dr party/expense (gross); Cr TDS payable (if any); Cr bank (net)
  z.object({ kind: z.literal('payment'), bankLedgerId: z.string().min(1), partyLedgerId: z.string().min(1), amount, tdsRate: z.coerce.number().min(0).max(30).optional(), date: z.string().min(1), narration: z.string().optional() }),
  // Dr bank; Cr party
  z.object({ kind: z.literal('receipt'), bankLedgerId: z.string().min(1), partyLedgerId: z.string().min(1), amount, date: z.string().min(1), narration: z.string().optional() }),
  // Dr to-account; Cr from-account (own bank/cash only)
  z.object({ kind: z.literal('contra'), fromLedgerId: z.string().min(1), toLedgerId: z.string().min(1), amount, date: z.string().min(1), narration: z.string().optional() }),
  // Dr one ledger; Cr another (adjustment)
  z.object({ kind: z.literal('journal'), debitLedgerId: z.string().min(1), creditLedgerId: z.string().min(1), amount, date: z.string().min(1), narration: z.string().optional() }),
  // sales return: Dr sales income + Dr output GST; Cr party
  z.object({ kind: z.literal('credit_note'), partyLedgerId: z.string().min(1), salesLedgerId: z.string().min(1), ...gstFields, date: z.string().min(1), narration: z.string().optional() }),
  // purchase return: Dr party; Cr purchase/expense + Cr input GST
  z.object({ kind: z.literal('debit_note'), partyLedgerId: z.string().min(1), purchaseLedgerId: z.string().min(1), ...gstFields, date: z.string().min(1), narration: z.string().optional() }),
]);
export type VoucherComposeInput = z.infer<typeof voucherComposeSchema>;
