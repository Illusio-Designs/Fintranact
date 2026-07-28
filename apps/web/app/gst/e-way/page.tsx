'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, TruckIcon, Add01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getEWayBills, type EWayRow } from '../../../lib/api';

const statusPill: Record<EWayRow['status'], { label: string; pill: string }> = {
  active: { label: 'Active', pill: 'ok' }, pending: { label: 'Pending', pill: 'crit' }, expired: { label: 'Expired', pill: 'warn' },
};

export default function EWayPage() {
  const [rows, setRows] = useState<EWayRow[]>([]);
  const [filter, setFilter] = useState('all');
  useEffect(() => { getEWayBills().then(setRows).catch(() => {}); }, []);
  const list = rows.filter((r) => filter === 'all' || r.status === filter);
  const active = rows.filter((r) => r.status === 'active').length;

  return (
    <AppShell crumb="GST / E-Way Bills">
      <div className="page-head">
        <div>
          <div className="eyebrow">GST · e-Way Bill (EWB)</div>
          <h1 className="display">E-Way Bills</h1>
          <p>Transport documents for consignments above ₹50,000 — generated from the invoice, valid by distance slab.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Export</button>
          <button className="btn btn-primary"><Add01Icon size={15} color="currentColor" /> New e-Way bill</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Status</span>
          <Dropdown width={170} value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'expired', label: 'Expired' }]} />
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="tile"><div className="label">Active bills</div><div className="value num">{active}</div><div className="delta up">In transit</div></div>
        <div className="tile"><div className="label">Total EWBs</div><div className="value num">{rows.length}</div></div>
        <div className="tile accent"><div className="label">Consignment value</div><div className="value num">{money(rows.reduce((s, r) => s + r.value, 0))}</div></div>
      </section>

      <div className="card">
        <div className="card-head"><h3>Consignments</h3><span className="csub" style={{ marginLeft: 'auto' }}>{list.length} shown</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>EWB no.</th><th>Invoice</th><th>Party</th><th>Route</th><th style={{ textAlign: 'right' }}>Dist.</th><th style={{ textAlign: 'right' }}>Value</th><th>Valid till</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={i}>
                  <td className="vno">{r.ewbNo ?? '—'}</td>
                  <td className="party" style={{ fontWeight: 600 }}>{r.invoiceNo}</td>
                  <td>{r.party}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}><TruckIcon size={13} color="var(--text-3)" style={{ verticalAlign: '-2px', marginRight: 4 }} />{r.from} → {r.to}</td>
                  <td className="amt">{r.distance} km</td>
                  <td className="amt">{money(r.value)}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.validTill ?? '—'}</td>
                  <td><span className={`pill ${statusPill[r.status].pill}`}>{statusPill[r.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
