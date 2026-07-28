import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import type { PoolConnection } from 'mysql2/promise';
import { z } from 'zod';
import {
  employeeImportRowSchema,
  itemImportRowSchema,
  ledgerImportRowSchema,
} from '@fintranact/validation';
import { withTransaction } from '../../common/db.js';
import { encryptField } from '../../common/crypto.js';
import { audit } from '../../common/audit.js';

export interface RowError {
  field?: string;
  message: string;
}
export interface ValidatedRow {
  rowNo: number;
  raw: Record<string, unknown>;
  data?: unknown;
  errors: RowError[];
}
export interface ValidationSummary {
  entity: string;
  total: number;
  valid: number;
  invalid: number;
  rows: ValidatedRow[];
}
export interface CommitContext {
  companyId: string;
  userId: string;
  financialYear: string;
  filename?: string;
  requestId?: string;
}

interface EntityDef {
  key: string;
  label: string;
  columns: string[];
  templateRows: (string | number)[][];
  map: (raw: Record<string, unknown>) => Record<string, unknown>;
  schema: z.ZodTypeAny;
  insert: (conn: PoolConnection, ctx: CommitContext, data: Record<string, unknown>) => Promise<string>;
}

// ---------- helpers ----------
const col = (raw: Record<string, unknown>, name: string): unknown =>
  raw[name] ?? raw[name.toLowerCase()] ?? raw[name.toUpperCase()];

/** Normalise a date cell (dd-mm-yyyy, dd/mm/yyyy, ISO, or Excel Date) → YYYY-MM-DD | null. */
function toDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, '0')}-${dmy[1]!.padStart(2, '0')}`;
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  return iso ? s.slice(0, 10) : null;
}

// ---------- entity registry ----------
const ENTITIES: Record<string, EntityDef> = {
  ledgers: {
    key: 'ledgers',
    label: 'Ledgers / parties',
    columns: ['Name', 'Category', 'PAN', 'GSTIN', 'State', 'Opening Dr', 'Opening Cr'],
    templateRows: [
      ['Mahalaxmi Traders', 'customer', 'AACFM1234K', '27AACFM1234K1Z5', 'Maharashtra', 0, 124500],
      ['Furnace Fuel & Gas', 'expense', '', '', 'Maharashtra', 0, 0],
    ],
    map: (r) => ({
      name: col(r, 'Name'),
      category: col(r, 'Category'),
      pan: col(r, 'PAN'),
      gstin: col(r, 'GSTIN'),
      state: col(r, 'State'),
      openingDr: col(r, 'Opening Dr'),
      openingCr: col(r, 'Opening Cr'),
    }),
    schema: ledgerImportRowSchema,
    insert: async (conn, ctx, d) => {
      const id = randomUUID();
      await conn.query(
        `INSERT INTO ledgers (id, company_id, name, category, pan, gstin, state, blacklisted, created_by)
         VALUES (:id, :companyId, :name, :category, :pan, :gstin, :state, 0, :userId)`,
        { id, companyId: ctx.companyId, name: d.name, category: d.category, pan: d.pan ?? null, gstin: d.gstin ?? null, state: d.state ?? null, userId: ctx.userId },
      );
      const dr = Number(d.openingDr) || 0;
      const cr = Number(d.openingCr) || 0;
      if (dr > 0 || cr > 0) {
        await conn.query(
          `INSERT INTO ledger_opening_balances (id, company_id, ledger_id, financial_year, dr, cr)
           VALUES (:id, :companyId, :ledgerId, :fy, :dr, :cr)`,
          { id: randomUUID(), companyId: ctx.companyId, ledgerId: id, fy: ctx.financialYear, dr, cr },
        );
      }
      return id;
    },
  },

  items: {
    key: 'items',
    label: 'Items / materials',
    columns: ['Name', 'Kind', 'UoM', 'HSN', 'Opening Qty', 'Rate'],
    templateRows: [
      ['Furnace LPG', 'consumable', 'kg', '2711', 120, 56],
      ['Customer Gears (Tata)', 'customer-material', 'kg', '', 0, 0],
    ],
    map: (r) => ({
      name: col(r, 'Name'),
      kind: col(r, 'Kind'),
      uom: col(r, 'UoM'),
      hsn: col(r, 'HSN'),
      openingQty: col(r, 'Opening Qty'),
      rate: col(r, 'Rate'),
    }),
    schema: itemImportRowSchema,
    insert: async (conn, ctx, d) => {
      const id = randomUUID();
      await conn.query(
        `INSERT INTO items (id, company_id, name, kind, uom, hsn, created_by)
         VALUES (:id, :companyId, :name, :kind, :uom, :hsn, :userId)`,
        { id, companyId: ctx.companyId, name: d.name, kind: d.kind, uom: d.uom, hsn: d.hsn ?? null, userId: ctx.userId },
      );
      const qty = Number(d.openingQty) || 0;
      const rate = Number(d.rate) || 0;
      if (qty > 0 || rate > 0) {
        await conn.query(
          `INSERT INTO item_opening_stock (id, company_id, item_id, financial_year, qty, rate)
           VALUES (:id, :companyId, :itemId, :fy, :qty, :rate)`,
          { id: randomUUID(), companyId: ctx.companyId, itemId: id, fy: ctx.financialYear, qty, rate },
        );
      }
      return id;
    },
  },

  employees: {
    key: 'employees',
    label: 'Employees',
    columns: ['Emp Code', 'Name', 'Email', 'PAN', 'Designation', 'DOJ', 'Basic'],
    templateRows: [
      ['RMT-0087', 'Amit Kumar', 'amit@ravimetal.local', 'ABCPK1234M', 'Furnace Operator', '12-07-2021', 24000],
    ],
    map: (r) => ({
      empCode: col(r, 'Emp Code'),
      name: col(r, 'Name'),
      email: col(r, 'Email'),
      pan: col(r, 'PAN'),
      designation: col(r, 'Designation'),
      doj: col(r, 'DOJ'),
      basic: col(r, 'Basic'),
    }),
    schema: employeeImportRowSchema,
    insert: async (conn, ctx, d) => {
      const id = randomUUID();
      await conn.query(
        `INSERT INTO employees (id, company_id, emp_code, name, email, pan_enc, designation, date_of_joining, basic_salary, created_by)
         VALUES (:id, :companyId, :empCode, :name, :email, :panEnc, :designation, :doj, :basic, :userId)`,
        {
          id,
          companyId: ctx.companyId,
          empCode: d.empCode,
          name: d.name,
          email: d.email ?? null,
          panEnc: encryptField(d.pan as string | undefined),
          designation: d.designation ?? null,
          doj: toDate(d.doj),
          basic: Number(d.basic) || 0,
          userId: ctx.userId,
        },
      );
      return id;
    },
  },
};

export function entityDef(key: string): EntityDef | undefined {
  return ENTITIES[key];
}
export function entityList(): { key: string; label: string; columns: string[] }[] {
  return Object.values(ENTITIES).map((e) => ({ key: e.key, label: e.label, columns: e.columns }));
}

/** Read the first worksheet of an .xlsx buffer into header-keyed row objects. */
export async function parseWorkbook(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headers: Record<number, string> = {};
  const rows: Record<string, unknown>[] = [];

  ws.eachRow((row, rowNumber) => {
    const values = row.values as unknown[];
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
      const val =
        cell != null && typeof cell === 'object' && 'text' in (cell as object)
          ? (cell as { text: string }).text
          : cell;
      obj[header] = val ?? '';
      if (val !== '' && val != null) hasAny = true;
    }
    if (hasAny) rows.push(obj);
  });
  return rows;
}

/** Validate raw rows for an entity against its schema (dry run — no writes). */
export function validate(entity: string, rawRows: Record<string, unknown>[]): ValidationSummary {
  const def = ENTITIES[entity];
  if (!def) throw new Error(`Unknown import entity: ${entity}`);
  const rows: ValidatedRow[] = rawRows.map((raw, i) => {
    const parsed = def.schema.safeParse(def.map(raw));
    if (parsed.success) return { rowNo: i + 2, raw, data: parsed.data, errors: [] };
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
  return { entity, total: rows.length, valid, invalid: rows.length - valid, rows };
}

export interface CommitResult {
  batchId: string;
  inserted: number;
  skipped: number;
}

/** Commit valid rows for an entity in one transaction, recording an audited batch. */
export async function commit(
  entity: string,
  summary: ValidationSummary,
  ctx: CommitContext,
): Promise<CommitResult> {
  const def = ENTITIES[entity];
  if (!def) throw new Error(`Unknown import entity: ${entity}`);

  return withTransaction(async (conn) => {
    const batchId = randomUUID();
    await conn.query(
      `INSERT INTO import_batches (id, company_id, entity, filename, total_rows, valid_rows, committed, created_by)
       VALUES (:id, :companyId, :entity, :filename, :total, :valid, 1, :userId)`,
      { id: batchId, companyId: ctx.companyId, entity, filename: ctx.filename ?? null, total: summary.total, valid: summary.valid, userId: ctx.userId },
    );

    let inserted = 0;
    let skipped = 0;

    for (const row of summary.rows) {
      if (row.errors.length > 0 || row.data == null) {
        await conn.query(
          `INSERT INTO import_rows (batch_id, row_no, status, error_json) VALUES (?, ?, 'error', ?)`,
          [batchId, row.rowNo, JSON.stringify(row.errors)],
        );
        skipped++;
        continue;
      }
      try {
        const entityId = await def.insert(conn, ctx, row.data as Record<string, unknown>);
        await conn.query(
          `INSERT INTO import_rows (batch_id, row_no, status, entity_id) VALUES (?, ?, 'committed', ?)`,
          [batchId, row.rowNo, entityId],
        );
        inserted++;
      } catch (err) {
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
        action: `data.import.${entity}`,
        entityType: 'import_batch',
        entityId: batchId,
        after: { entity, inserted, skipped, total: summary.total },
        requestId: ctx.requestId,
      },
      conn,
    );

    return { batchId, inserted, skipped };
  });
}

/** Generate a ready-to-fill .xlsx template for an entity. */
export async function template(entity: string): Promise<Buffer> {
  const def = ENTITIES[entity];
  if (!def) throw new Error(`Unknown import entity: ${entity}`);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(def.label);
  ws.columns = def.columns.map((h) => ({ header: h, key: h, width: 22 }));
  ws.getRow(1).font = { bold: true };
  for (const r of def.templateRows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
