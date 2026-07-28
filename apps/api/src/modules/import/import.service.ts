import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import { ledgerImportRowSchema, type LedgerImportRow } from '@fintranact/validation';
import { withTransaction } from '../../common/db.js';
import { audit } from '../../common/audit.js';

export interface RowError {
  field?: string;
  message: string;
}
export interface ValidatedRow {
  rowNo: number;
  raw: Record<string, unknown>;
  data?: LedgerImportRow;
  errors: RowError[];
}
export interface ValidationSummary {
  entity: 'ledgers';
  total: number;
  valid: number;
  invalid: number;
  rows: ValidatedRow[];
}

/** Column headers accepted in the ledger import template (case-insensitive). */
const LEDGER_COLUMNS = ['Name', 'Category', 'PAN', 'GSTIN', 'State', 'Opening Dr', 'Opening Cr'];

/** Read the first worksheet of an .xlsx buffer into header-keyed row objects. */
export async function parseWorkbook(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headers: Record<number, string> = {};
  const rows: Record<string, unknown>[] = [];

  ws.eachRow((row, rowNumber) => {
    const values = row.values as unknown[]; // 1-indexed; [0] is empty
    if (rowNumber === 1) {
      values.forEach((v, i) => {
        if (i > 0 && v != null) headers[i] = String(v).trim();
      });
      return;
    }
    const obj: Record<string, unknown> = {};
    let hasAny = false;
    for (const [idxStr, header] of Object.entries(headers)) {
      const idx = Number(idxStr);
      const cell = values[idx];
      const val = cell != null && typeof cell === 'object' && 'text' in (cell as object)
        ? (cell as { text: string }).text // rich text / hyperlink cells
        : cell;
      obj[header] = val ?? '';
      if (val !== '' && val != null) hasAny = true;
    }
    if (hasAny) rows.push(obj);
  });
  return rows;
}

function mapLedgerRow(r: Record<string, unknown>): Record<string, unknown> {
  const get = (k: string) => r[k] ?? r[k.toLowerCase()] ?? r[k.toUpperCase()];
  return {
    name: get('Name'),
    category: get('Category'),
    pan: get('PAN'),
    gstin: get('GSTIN'),
    state: get('State'),
    openingDr: get('Opening Dr'),
    openingCr: get('Opening Cr'),
  };
}

/** Validate raw rows against the ledger import schema (no DB writes — dry run). */
export function validateLedgers(rawRows: Record<string, unknown>[]): ValidationSummary {
  const rows: ValidatedRow[] = rawRows.map((raw, i) => {
    const parsed = ledgerImportRowSchema.safeParse(mapLedgerRow(raw));
    if (parsed.success) {
      return { rowNo: i + 2, raw, data: parsed.data, errors: [] }; // +2: header + 1-index
    }
    return {
      rowNo: i + 2,
      raw,
      errors: parsed.error.issues.map((iss) => ({
        field: iss.path.join('.') || undefined,
        message: iss.message,
      })),
    };
  });
  const valid = rows.filter((r) => r.errors.length === 0).length;
  return { entity: 'ledgers', total: rows.length, valid, invalid: rows.length - valid, rows };
}

export interface CommitResult {
  batchId: string;
  inserted: number;
  skipped: number;
}

/**
 * Commit only the valid rows: create ledgers + opening balances, record the
 * import batch + per-row outcome, and audit. Runs in one transaction.
 */
export async function commitLedgers(
  summary: ValidationSummary,
  ctx: { companyId: string; userId: string; financialYear: string; filename?: string; requestId?: string },
): Promise<CommitResult> {
  return withTransaction(async (conn) => {
    const batchId = randomUUID();
    await conn.query(
      `INSERT INTO import_batches (id, company_id, entity, filename, total_rows, valid_rows, committed, created_by)
       VALUES (:id, :companyId, 'ledgers', :filename, :total, :valid, 1, :userId)`,
      { id: batchId, companyId: ctx.companyId, filename: ctx.filename ?? null, total: summary.total, valid: summary.valid, userId: ctx.userId },
    );

    let inserted = 0;
    let skipped = 0;

    for (const row of summary.rows) {
      if (row.errors.length > 0 || !row.data) {
        await conn.query(
          `INSERT INTO import_rows (batch_id, row_no, status, error_json) VALUES (?, ?, 'error', ?)`,
          [batchId, row.rowNo, JSON.stringify(row.errors)],
        );
        skipped++;
        continue;
      }
      const d = row.data;
      const ledgerId = randomUUID();
      try {
        await conn.query(
          `INSERT INTO ledgers (id, company_id, name, category, pan, gstin, state, blacklisted, created_by)
           VALUES (:id, :companyId, :name, :category, :pan, :gstin, :state, 0, :userId)`,
          { id: ledgerId, companyId: ctx.companyId, name: d.name, category: d.category, pan: d.pan ?? null, gstin: d.gstin ?? null, state: d.state ?? null, userId: ctx.userId },
        );
        if (d.openingDr > 0 || d.openingCr > 0) {
          await conn.query(
            `INSERT INTO ledger_opening_balances (id, company_id, ledger_id, financial_year, dr, cr)
             VALUES (:id, :companyId, :ledgerId, :fy, :dr, :cr)`,
            { id: randomUUID(), companyId: ctx.companyId, ledgerId, fy: ctx.financialYear, dr: d.openingDr, cr: d.openingCr },
          );
        }
        await conn.query(
          `INSERT INTO import_rows (batch_id, row_no, status, entity_id) VALUES (?, ?, 'committed', ?)`,
          [batchId, row.rowNo, ledgerId],
        );
        inserted++;
      } catch (err) {
        // e.g. duplicate ledger name — record and continue
        await conn.query(
          `INSERT INTO import_rows (batch_id, row_no, status, error_json) VALUES (?, ?, 'error', ?)`,
          [batchId, row.rowNo, JSON.stringify([{ message: (err as Error).message }])],
        );
        skipped++;
      }
    }

    await audit(
      {
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        action: 'data.import.ledgers',
        entityType: 'import_batch',
        entityId: batchId,
        after: { inserted, skipped, total: summary.total },
        requestId: ctx.requestId,
      },
      conn,
    );

    return { batchId, inserted, skipped };
  });
}

/** Generate a ready-to-fill .xlsx template for ledger import. */
export async function ledgerTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Ledgers');
  ws.columns = LEDGER_COLUMNS.map((h) => ({ header: h, key: h, width: 22 }));
  ws.getRow(1).font = { bold: true };
  // example rows to guide the user
  ws.addRow(['Mahalaxmi Traders', 'customer', 'AACFM1234K', '27AACFM1234K1Z5', 'Maharashtra', 0, 124500]);
  ws.addRow(['Furnace Fuel & Gas', 'expense', '', '', 'Maharashtra', 0, 0]);
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
