'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download01Icon, PackageIcon, Alert01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown } from '../../../lib/components';
import { getJobworkPending, type InwardPending } from '../../../lib/api';

const kg = (n: number) => `${n.toLocaleString('en-IN')} kg`;
const statusPill: Record<InwardPending['status'], { label: string; pill: string }> = {
  open: { label: 'Open', pill: 'crit' }, partial: { label: 'Partial', pill: 'warn' }, closed: { label: 'Returned', pill: 'ok' },
};

export default function JobworkPendingPage() {
  const [rows, setRows] = useState<InwardPending[]>([]);
  const [status, setStatus] = useState('open');
  useEffect(() => { getJobworkPending().then(setRows).catch(() => {}); }, []);

  const list = useMemo(() => rows.filter((r) => status === 'all' || r.status === status), [rows, status]);
  const totalPending = rows.filter((r) => r.status !== 'closed').reduce((s, r) => s + r.pending, 0);
  const openCount = rows.filter((r) => r.status !== 'closed').length;

  return (
    <AppShell crumb="Job Work / Pending Inward-Outward">
      <div className="page-head">
        <div>
          <div className="eyebrow">Job work · Rule 45 tracking</div>
          <h1 className="display">Pending Inward / Outward</h1>
          <p>Customer material received for processing against what has been dispatched back. Outward can never exceed the pending quantity.</p>
        </div>
        <button className="btn btn-primary"><Download01Icon size={15} color="currentColor" /> Export</button>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Status</span>
          <Dropdown width={170} value={status} onChange={setStatus} options={[{ value: 'all', label: 'All challans' }, { value: 'open', label: 'Open' }, { value: 'partial', label: 'Partial' }, { value: 'closed', label: 'Returned' }]} />
        </div>
      </div>

      {openCount > 0 && (
        <div className="alert warn"><Alert01Icon size={16} color="currentColor" /> <span><b>{kg(totalPending)}</b> pending return across <b>{openCount}</b> open challans — track ageing to stay within the 1-year Rule 45 window.</span></div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="tile"><div className="label">Inward challans</div><div className="value num">{rows.length}</div></div>
        <div className="tile"><div className="label">Open / partial</div><div className="value num">{openCount}</div><div className="delta down">Awaiting dispatch</div></div>
        <div className="tile accent"><div className="label">Pending to return</div><div className="value num">{kg(totalPending)}</div></div>
      </section>

      <div className="card">
        <div className="card-head"><h3>Inward challans</h3><span className="csub" style={{ marginLeft: 'auto' }}>{list.length} shown</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Challan</th><th>Customer</th><th>Process</th><th style={{ textAlign: 'right' }}>Received</th><th style={{ textAlign: 'right' }}>Dispatched</th><th style={{ textAlign: 'right' }}>Loss</th><th style={{ textAlign: 'right' }}>Pending</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td className="vno">{r.challanNo}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.date} · {r.material}</small></td>
                  <td className="party">{r.customer}</td>
                  <td><span className="tag">{r.process}</span></td>
                  <td className="amt">{kg(r.qtyRecd)}</td>
                  <td className="amt">{kg(r.dispatched)}</td>
                  <td className="amt" style={{ color: r.loss ? 'var(--warn)' : 'var(--text-3)' }}>{r.loss ? kg(r.loss) : '—'}</td>
                  <td className="amt" style={{ color: r.pending > 0 ? 'var(--red-ink)' : 'var(--good)', fontWeight: 700 }}>{kg(r.pending)}</td>
                  <td><span className={`pill ${statusPill[r.status].pill}`}>{statusPill[r.status].label}</span></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8}><div className="empty"><div className="em-ic"><PackageIcon size={22} color="currentColor" /></div>No challans in this status.</div></td></tr>}
            </tbody>
            <tfoot><tr><td colSpan={3}>Total</td><td className="amt">{kg(rows.reduce((s, r) => s + r.qtyRecd, 0))}</td><td className="amt">{kg(rows.reduce((s, r) => s + r.dispatched, 0))}</td><td className="amt">{kg(rows.reduce((s, r) => s + r.loss, 0))}</td><td className="amt">{kg(rows.reduce((s, r) => s + r.pending, 0))}</td><td /></tr></tfoot>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
