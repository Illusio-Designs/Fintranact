import type { RowDataPacket } from 'mysql2';
import { pool } from '../../common/db.js';

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export interface InwardPending {
  id: string;
  challanNo: string;
  customer: string;
  process: string;
  material: string | null;
  qtyRecd: number;
  dispatched: number;
  loss: number;
  pending: number;
  uom: string;
  date: string;
  status: 'open' | 'partial' | 'closed';
}

/** Inward challans with computed pending-to-return quantity (received − dispatched − loss). */
export async function listInwardWithPending(companyId: string): Promise<InwardPending[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT i.id, i.challan_no AS challanNo, i.customer_name AS customer, i.process, i.material,
            i.qty_recd AS qtyRecd, i.uom, i.date,
            COALESCE(SUM(o.qty_out), 0) AS dispatched,
            COALESCE(SUM(o.loss), 0) AS loss
       FROM job_work_inward i
       LEFT JOIN job_work_outward o ON o.inward_id = i.id
      WHERE i.company_id = ?
      GROUP BY i.id, i.challan_no, i.customer_name, i.process, i.material, i.qty_recd, i.uom, i.date
      ORDER BY i.date DESC`,
    [companyId],
  );
  return rows.map((r) => {
    const qtyRecd = Number(r.qtyRecd);
    const dispatched = Number(r.dispatched);
    const loss = Number(r.loss);
    const pending = round3(qtyRecd - dispatched - loss);
    const status: InwardPending['status'] = pending <= 0 ? 'closed' : dispatched + loss > 0 ? 'partial' : 'open';
    return {
      id: r.id as string, challanNo: r.challanNo as string, customer: r.customer as string,
      process: r.process as string, material: (r.material as string) ?? null,
      qtyRecd, dispatched, loss, pending, uom: (r.uom as string) ?? 'kg',
      date: String(r.date).slice(0, 10), status,
    };
  });
}

export interface Itc04Summary {
  inwardChallans: number;
  outwardChallans: number;
  qtyReceived: number;
  qtyReturned: number;
  qtyPending: number;
}

/** ITC-04 style movement summary: goods received for processing vs returned (Rule 45). */
export async function getItc04Summary(companyId: string): Promise<Itc04Summary> {
  const inward = await listInwardWithPending(companyId);
  const qtyReceived = round3(inward.reduce((s, r) => s + r.qtyRecd, 0));
  const qtyReturned = round3(inward.reduce((s, r) => s + r.dispatched + r.loss, 0));
  const [oc] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS n FROM job_work_outward WHERE company_id = ?',
    [companyId],
  );
  return {
    inwardChallans: inward.length,
    outwardChallans: Number(oc[0]?.n ?? 0),
    qtyReceived,
    qtyReturned,
    qtyPending: round3(qtyReceived - qtyReturned),
  };
}
