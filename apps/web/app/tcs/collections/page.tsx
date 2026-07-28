'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, CheckmarkBadge01Icon, Alert01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getTcs, type TcsData } from '../../../lib/api';

export default function TcsCollectionsPage() {
  const [d, setD] = useState<TcsData | null>(null);
  const [month, setMonth] = useState('2026-06');
  useEffect(() => { getTcs().then(setD).catch(() => {}); }, [month]);

  return (
    <AppShell crumb="TCS / Collections">
      <div className="page-head">
        <div>
          <div className="eyebrow">TCS · 206C(1H)</div>
          <h1 className="display">TCS Collections</h1>
          <p>Tax collected at source at 0.1% on sale of goods to buyers crossing ₹50L in the year. Deposit by the 7th of the next month.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Export</button>
          <button className="btn btn-primary"><CheckmarkBadge01Icon size={15} color="currentColor" /> Deposit pending</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Month</span>
          <Dropdown width={160} value={month} onChange={setMonth} options={[{ value: '2026-06', label: 'June 2026' }, { value: '2026-05', label: 'May 2026' }]} />
        </div>
        <div className="tb-field"><span>TAN</span><div className="dp-trigger" style={{ cursor: 'default' }}>RKTR02914E</div></div>
      </div>

      {d && (
        <>
          {d.totalDue > 0 && <div className="alert warn"><Alert01Icon size={16} color="currentColor" /> <span><b>{money(d.totalDue)}</b> TCS pending deposit via ITNS-281 — due 07 Jul 2026.</span></div>}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="tile"><div className="label">Sales value</div><div className="value num">{money(d.totalSale)}</div></div>
            <div className="tile"><div className="label">TCS collected</div><div className="value num">{money(d.totalTcs)}</div></div>
            <div className="tile accent"><div className="label">Pending deposit</div><div className="value num">{money(d.totalDue)}</div></div>
          </section>
          <div className="card">
            <div className="card-head"><h3>Collections</h3><span className="csub" style={{ marginLeft: 'auto' }}>{d.rows.length} buyers</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Buyer</th><th>PAN</th><th>Section</th><th style={{ textAlign: 'right' }}>Sale value</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>TCS</th><th>Status</th></tr></thead>
                <tbody>
                  {d.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="party">{r.party}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.date}</small></td>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{r.pan}</td>
                      <td><span className="pill neut">{r.section}</span></td>
                      <td className="amt">{money(r.sale)}</td>
                      <td className="amt">{r.rate}%</td>
                      <td className="amt">{money(r.tcs)}</td>
                      <td>{r.challan ? <span className="pill ok">{r.challan}</span> : <span className="pill crit">pending</span>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>Total</td><td className="amt">{money(d.totalSale)}</td><td /><td className="amt">{money(d.totalTcs)}</td><td /></tr></tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
