'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, CheckmarkBadge01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown } from '../../../lib/components';
import { getItc04, getJobworkPending, type Itc04Summary, type InwardPending } from '../../../lib/api';

const kg = (n: number) => `${n.toLocaleString('en-IN')} kg`;

export default function Itc04Page() {
  const [s, setS] = useState<Itc04Summary | null>(null);
  const [rows, setRows] = useState<InwardPending[]>([]);
  const [quarter, setQuarter] = useState('q1');
  useEffect(() => { getItc04().then(setS).catch(() => {}); getJobworkPending().then(setRows).catch(() => {}); }, [quarter]);

  return (
    <AppShell crumb="Job Work / ITC-04">
      <div className="page-head">
        <div>
          <div className="eyebrow">Job work · Rule 45 · quarterly</div>
          <h1 className="display">ITC-04</h1>
          <p>Statement of goods received for job-work and returned during the quarter (Rule 45 movement, no GST on the challan).</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Generate JSON</button>
          <button className="btn btn-primary"><CheckmarkBadge01Icon size={15} color="currentColor" /> File ITC-04</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Quarter</span>
          <Dropdown width={180} value={quarter} onChange={setQuarter} options={[{ value: 'q1', label: 'Q1 · Apr–Jun 2026' }, { value: 'q2', label: 'Q2 · Jul–Sep 2026' }]} />
        </div>
      </div>

      {s && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div className="tile"><div className="label">Inward challans</div><div className="value num">{s.inwardChallans}</div><div className="delta">Received for processing</div></div>
          <div className="tile"><div className="label">Outward challans</div><div className="value num">{s.outwardChallans}</div><div className="delta up">Returned to principal</div></div>
          <div className="tile"><div className="label">Qty received</div><div className="value num">{kg(s.qtyReceived)}</div></div>
          <div className="tile accent"><div className="label">Qty pending return</div><div className="value num">{kg(s.qtyPending)}</div><div className="delta down">{kg(s.qtyReturned)} returned</div></div>
        </section>
      )}

      <div className="card">
        <div className="card-head"><h3>Table 4 · Goods received from principal &amp; returned</h3></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Challan</th><th>Principal (customer)</th><th>Nature / process</th><th style={{ textAlign: 'right' }}>Received</th><th style={{ textAlign: 'right' }}>Returned</th><th style={{ textAlign: 'right' }}>Pending</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="vno">{r.challanNo}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.date}</small></td>
                  <td className="party">{r.customer}</td>
                  <td><span className="tag">{r.process}</span> <small style={{ color: 'var(--text-3)' }}>{r.material}</small></td>
                  <td className="amt">{kg(r.qtyRecd)}</td>
                  <td className="amt">{kg(r.dispatched + r.loss)}</td>
                  <td className="amt" style={{ color: r.pending > 0 ? 'var(--red-ink)' : 'var(--good)', fontWeight: 700 }}>{kg(r.pending)}</td>
                </tr>
              ))}
            </tbody>
            {s && (
              <tfoot><tr><td colSpan={3}>Total</td><td className="amt">{kg(s.qtyReceived)}</td><td className="amt">{kg(s.qtyReturned)}</td><td className="amt">{kg(s.qtyPending)}</td></tr></tfoot>
            )}
          </table>
        </div>
      </div>
    </AppShell>
  );
}
